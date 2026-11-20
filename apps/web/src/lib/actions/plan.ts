"use server";

import { enroll, generatePlanDraft, GOAL_LABEL, reflowPlan, scheduleImmersion, saveTrainingPlan, setMissedDayRule, type DB, type GoalKind, type PlanDraftItem } from "@ms/api";
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
    p.lessons.map((l, i) => ({ id: l.id, title: l.title, programId: p.id, order: i, dayType: l.dayType, focus: l.section, minutes: l.minutes ?? null })),
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
    sessionMinutes: f.minutes,
  });
  const byId = new Map(programs.map((p) => [p.id, p]));
  const sessions: CreatedSession[] = draft.items.map((it) => {
    const p = it.programId ? byId.get(it.programId) : undefined;
    // The lesson's own length when known; otherwise the member's session length (shorter for recovery).
    return { ...it, programName: p?.name ?? null, programSlug: p?.slug ?? null, minutes: it.minutes ?? (it.kind === "recovery" ? Math.min(f.minutes, 25) : f.minutes) };
  });
  const training = sessions.filter((s) => s.kind === "training").length;
  const long = sessions.filter((s) => s.fit === "long").length;
  const names = programs.map((p) => p.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  const overview = [
    `${f.weeks} weeks, ${trainingDays.length} sessions a week of about ${f.minutes} minutes, built from ${list}.`,
    `${training} lessons chosen for your ${GOAL_LABEL[f.goal as GoalKind]} goal stay in each program's order, with recovery ${f.experience === "advanced" ? "after every three" : f.recovery.trim() ? "after every" : "after every two"} training ${f.experience === "advanced" || !f.recovery.trim() ? "days" : "day"}.`,
    long ? `${long === 1 ? "One session runs" : `${long} sessions run`} longer than your ${f.minutes} minutes; ${long === 1 ? "it's" : "they're"} marked below.` : "",
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

/* ------------------------------------------------------------- one schedule */

/** "Move to the next free day" or "Keep both" for a plan whose sessions clash with another plan's. */
export async function resolveConflictsAction(planId: string, mode: "next_free" | "keep"): Promise<Result<{ moved: number }>> {
  if (!uuid.safeParse(planId).success || !["next_free", "keep"].includes(mode)) return { ok: false, error: "Choose a plan" };
  const { resolveScheduleConflicts } = await import("@ms/api");
  return run(async (sb) => ({ moved: (await resolveScheduleConflicts(sb, planId, mode)).moved }));
}

/** Put the member's MTK learning plan on the main schedule on these weekdays (0 = Sunday). */
export async function scheduleMtkPlanAction(mtkPlanId: string, weekdays: number[], startsOn?: string): Promise<Result<string>> {
  if (!uuid.safeParse(mtkPlanId).success || !days.safeParse(weekdays).success) return { ok: false, error: "Choose your training days" };
  const { scheduleMtkPlan } = await import("@ms/api");
  return run((sb) => scheduleMtkPlan(sb, mtkPlanId, weekdays, startsOn ?? null));
}

/** Save shared training-profile answers (profile editor; Settings embeds the same component). */
export async function saveTrainingProfileAction(patch: import("@ms/api").TrainingProfile): Promise<Result<import("@ms/api").TrainingProfile>> {
  const { saveTrainingProfile } = await import("@ms/api");
  const clean = profilePatch.safeParse(patch);
  if (!clean.success) return { ok: false, error: clean.error.issues[0]?.message ?? "Check your answers" };
  return run((sb) => saveTrainingProfile(sb, clean.data, "profile"));
}

const profilePatch = z.object({
  goal_kind: z.enum(["strength", "technique", "mobility", "conditioning", "mindset", "retreat_prep", "custom"]).optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days_per_week: z.number().int().min(1).max(7).optional(),
  training_days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  session_minutes: z.number().int().min(10).max(120).optional(),
  equipment: z.array(z.string().max(80)).max(12).optional(),
  bell_weights: z.string().max(120).optional(),
  kb_experience: z.number().int().min(0).max(3).optional(),
  kb_level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  focus_areas: z.array(z.string().max(80)).max(12).optional(),
  limitations: z.string().max(1000).optional(),
});

/**
 * "Schedule <program>" on /plan: the whole level, day by day (Immersion). Enrolls the chosen level (Level I or
 * Level II) in Immersion if needed, then `schedule_immersion` puts every day not done yet on the member's
 * training weekdays from the start date (an earlier schedule of that level is archived by the function).
 */
export async function scheduleProgramAction(programId: string, pathId: string | null, weekdays: number[], startsOn: string | null, slug: string): Promise<Result<string>> {
  if (!uuid.safeParse(programId).success || (pathId !== null && !uuid.safeParse(pathId).success)) return { ok: false, error: "Choose a program and level" };
  if (!days.safeParse(weekdays).success) return { ok: false, error: "Pick at least one training day" };
  if (startsOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) return { ok: false, error: "Pick a start date" };
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return { ok: false, error: "Unknown program" };
  return run(async (sb) => {
    const enrollmentId = await enroll(sb, programId, pathId, "immersion");
    const planId = await scheduleImmersion(sb, enrollmentId, weekdays, (startsOn as IsoDate | null) ?? null);
    revalidatePath(`/programs/${slug}`);
    return planId;
  });
}
