"use server";

import { generatePlanDraft, GOAL_LABEL, reflowPlan, saveTrainingPlan, setMissedDayRule, type DB, type GoalKind, type PlanDraftItem } from "@ms/api";
import { isoDate, type IsoDate } from "@ms/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fixture, MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import type { LessonCatalog } from "@/lib/loaders/today-plan-you";

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: (sb: DB, userId: string) => Promise<T>): Promise<Result<T>> {
  if (MOCK) return { ok: false, error: "offline" };
  try {
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, error: "Sign in first" };
    const data = await fn(supabase as unknown as DB, user.id);
    revalidatePath("/plan");
    revalidatePath("/today");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

const uuid = z.string().uuid();
const days = z.array(z.number().int().min(0).max(6)).min(1).max(7);

/** Guided schedule: 3 / 4 / 5 days a week or every day, from today. */
export async function applyGuidedPattern(planId: string, weekdays: number[]): Promise<Result<{ moved: number; ends_on: string }>> {
  if (!uuid.safeParse(planId).success || !days.safeParse(weekdays).success) return { ok: false, error: "Choose a plan and its days" };
  return run((sb) => reflowPlan(sb, planId, weekdays));
}

export async function chooseMissedRule(planId: string, rule: "shift" | "skip" | "weekend"): Promise<Result<string>> {
  if (!uuid.safeParse(planId).success || !["shift", "skip", "weekend"].includes(rule)) return { ok: false, error: "Unknown rule" };
  return run((sb) => setMissedDayRule(sb, planId, rule));
}

/* ------------------------------------------------------------- plan creator */

const creatorInput = z.object({
  goal: z.enum(["strength", "technique", "mobility", "conditioning", "mindset", "retreat_prep", "custom"]),
  title: z.string().trim().min(2, "Name your goal").max(120),
  weeks: z.number().int().min(2).max(8),
  daysPerWeek: z.number().int().min(2).max(6),
  minutes: z.number().int().min(10).max(120),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  programIds: z.array(uuid).min(1, "Pick at least one program").max(8),
  trainingDays: days,
  equipment: z.string().max(200).default(""),
  recovery: z.string().max(500).default(""),
  constraints: z.string().max(1000).default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type CreatorInput = z.input<typeof creatorInput>;

export interface CreatedSession extends PlanDraftItem {
  programName: string | null;
  programSlug: string | null;
  minutes: number;
}
export interface CreatedPlan {
  name: string;
  overview: string;
  sessions: CreatedSession[];
  weeks: number;
}

async function catalogFor(): Promise<LessonCatalog> {
  if (MOCK) return fixture<LessonCatalog>("tpy-lessons");
  const { loadLessonCatalog } = await import("@/lib/loaders/today-plan-you");
  return loadLessonCatalog();
}

/** Deterministic plan from real, open lessons only (AI enrichment can replace the overview later). */
async function build(raw: CreatorInput): Promise<Result<CreatedPlan>> {
  const parsed = creatorInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  const f = parsed.data;
  const catalog = await catalogFor();
  const programs = catalog.programs.filter((p) => f.programIds.includes(p.id));
  if (!programs.length) return { ok: false, error: "Those programs aren't open to you yet" };
  const lessons = programs.flatMap((p) =>
    p.lessons.map((l, i) => ({ id: l.id, title: l.title, programId: p.id, order: i, dayType: l.dayType, focus: l.section })),
  );
  const trainingDays = f.trainingDays.slice(0, f.daysPerWeek).length === f.daysPerWeek ? f.trainingDays.slice(0, f.daysPerWeek) : f.trainingDays;
  const draft = generatePlanDraft({
    goal: f.goal as GoalKind,
    programIds: f.programIds,
    lessons,
    weeks: f.weeks,
    trainingDays,
    startDate: f.startDate as IsoDate,
    recoveryEvery: f.experience === "advanced" ? 3 : f.recovery.trim() ? 1 : 2,
  });
  const byId = new Map(programs.map((p) => [p.id, p]));
  const sessions: CreatedSession[] = draft.items.map((it) => {
    const p = it.programId ? byId.get(it.programId) : undefined;
    return { ...it, programName: p?.name ?? null, programSlug: p?.slug ?? null, minutes: it.kind === "recovery" ? Math.min(f.minutes, 25) : f.minutes };
  });
  const training = sessions.filter((s) => s.kind === "training").length;
  const names = programs.map((p) => p.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  const overview = [
    `${f.weeks} weeks, ${trainingDays.length} sessions a week of about ${f.minutes} minutes, built from ${list}.`,
    `${training} lessons chosen for your ${GOAL_LABEL[f.goal as GoalKind]} goal stay in each program's order, with recovery ${f.experience === "advanced" ? "after every three" : f.recovery.trim() ? "after every" : "after every two"} training ${f.experience === "advanced" || !f.recovery.trim() ? "days" : "day"}.`,
    f.constraints.trim() ? `Keep in mind: ${f.constraints.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return { ok: true, data: { name: `${f.weeks}-week plan · ${f.title}`, overview, sessions, weeks: f.weeks } };
}

export async function previewCreatedPlan(input: CreatorInput): Promise<Result<CreatedPlan>> {
  return build(input);
}

/** Saves the created plan (server re-builds it; the database re-checks every lesson). */
export async function saveCreatedPlan(input: CreatorInput): Promise<Result<string>> {
  const built = await build(input);
  if (!built.ok) return built;
  const plan = built.data;
  return run(async (sb) => {
    const items = plan.sessions
      .filter((s): s is CreatedSession & { lessonId: string } => !!s.lessonId)
      .map((s) => ({ lesson_id: s.lessonId, on_date: s.date, kind: s.kind === "recovery" ? ("recovery" as const) : ("training" as const), note: s.note }));
    const id = await saveTrainingPlan(sb, plan.name, { ...input, overview: plan.overview, created: isoDate(new Date()) }, items.map((i) => ({ date: i.on_date, lessonId: i.lesson_id, kind: i.kind, note: i.note })), input.startDate as IsoDate);
    // Mark it as a created ("Suggested") plan; the row is the member's own.
    await sb.from("member_plans").update({ source: "ai", overview: plan.overview }).eq("id", id);
    return id;
  });
}
