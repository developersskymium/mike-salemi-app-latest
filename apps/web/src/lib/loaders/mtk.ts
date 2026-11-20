import "server-only";
import { getIntakeForm, getProgram, intakeHistory, mtkPlans, type DB, type IntakeResult, type MtkPlanRow } from "@ms/api";
import { MTK_SLUG, mtkResult, type DbLesson, type MtkAnswers, type MtkResult } from "@ms/core";
import { coverFor } from "@/lib/covers";
import { mockable } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/** Lesson facts the MTK pages need (titles in curriculum order, section names for "where it lives"). */
export interface MtkLessonInfo {
  title: string;
  section: string;
  group: string | null;
}

export interface MtkProgramInfo {
  id: string;
  slug: string;
  name: string;
  image: string | null;
}

export interface MtkResultsData {
  program: MtkProgramInfo;
  /** null = no assessment yet. */
  assessment: {
    responseId: string;
    createdAt: string;
    attempt: number;
    /** Recommended focus path from the intake rules (label, reasons, pace, initial focus). */
    path: Pick<IntakeResult, "label" | "reasons" | "pace" | "initial_focus" | "bucket"> | null;
    result: MtkResult;
  } | null;
  lessons: Record<string, MtkLessonInfo>;
  /** Active plan, so the page can say "Update my plan" and preselect its schedule. */
  activePlan: { version: number; responseId: string | null; weeks: number; daysPerWeek: number; minutes: number } | null;
}

export interface MtkPlanData {
  program: MtkProgramInfo;
  plan: MtkPlanRow | null;
  assessmentDone: boolean;
  /** The latest assessment is newer than the active plan (results are waiting). */
  newerAssessment: boolean;
  archivedVersions: number;
  /** Completed lesson ids (all their required steps done). */
  completed: string[];
  lessons: Record<string, MtkLessonInfo>;
}

export async function mtkBase(sb: DB) {
  const program = await getProgram(sb, MTK_SLUG);
  if (!program) return null;
  const [{ data: sections }, { data: lessons }] = await Promise.all([
    sb.from("sections").select("id, title, subtitle, position").eq("program_id", program.id).is("path_id", null).order("position"),
    sb.from("lessons").select("id, title, section_id, position").eq("program_id", program.id),
  ]);
  const sec = new Map((sections ?? []).map((s) => [s.id, s]));
  const intro = (sections ?? [])[0] && /^home$/i.test((sections ?? [])[0]!.title) ? (sections ?? [])[0]!.id : null;
  const db: DbLesson[] = [];
  const info: Record<string, MtkLessonInfo> = {};
  for (const l of lessons ?? []) {
    const s = sec.get(l.section_id);
    if (!s || s.id === intro) continue;
    db.push({ id: l.id, sectionSeq: s.position, lessonSeq: l.position });
    info[l.id] = { title: l.title, section: s.title, group: s.subtitle };
  }
  const image = coverFor(program.slug, program.media.find((m) => m.role === "hero")?.url ?? program.media[0]?.url ?? null, program.cover).src;
  return { program: { id: program.id, slug: program.slug, name: program.name, image }, db, info };
}

/** MTK results for the latest assessment. Preview fixture: `mtk-results`. */
export const loadMtkResults = mockable("mtk-results", async (): Promise<MtkResultsData | null> => {
  const { supabase: sb, user } = await getUser();
  if (!user) return null;
  const base = await mtkBase(sb);
  if (!base) return null;
  const form = await getIntakeForm(sb, "mtk-intake");
  const [history, plans] = await Promise.all([
    form ? intakeHistory(sb, user.id, form.id) : Promise.resolve([]),
    mtkPlans(sb, user.id, base.program.id).catch(() => []),
  ]);
  const latest = history[0];
  const active = plans.find((p) => p.status === "active");
  const r = (latest?.result ?? {}) as IntakeResult;
  return {
    program: base.program,
    lessons: base.info,
    assessment: latest
      ? {
          responseId: latest.id,
          createdAt: latest.created_at,
          attempt: history.length,
          path: r.label ? { label: r.label, reasons: r.reasons, pace: r.pace, initial_focus: r.initial_focus, bucket: r.bucket } : null,
          result: mtkResult((latest.answers ?? {}) as MtkAnswers, base.db),
        }
      : null,
    activePlan: active
      ? { version: active.version, responseId: active.responseId, weeks: active.schedule.weeks, daysPerWeek: active.schedule.daysPerWeek, minutes: active.schedule.minutes }
      : null,
  };
});

/** My Plan. Preview fixture: `mtk-plan`. */
export const loadMtkPlan = mockable("mtk-plan", async (): Promise<MtkPlanData | null> => {
  const { supabase: sb, user } = await getUser();
  if (!user) return null;
  const base = await mtkBase(sb);
  if (!base) return null;
  const form = await getIntakeForm(sb, "mtk-intake");
  const [history, plans, progress] = await Promise.all([
    form ? intakeHistory(sb, user.id, form.id) : Promise.resolve([]),
    mtkPlans(sb, user.id, base.program.id).catch(() => []),
    sb.rpc("curriculum_progress", { p_program: base.program.id }),
  ]);
  const plan = plans.find((p) => p.status === "active") ?? null;
  return {
    program: base.program,
    plan,
    assessmentDone: history.length > 0,
    newerAssessment: Boolean(plan && history[0] && history[0].id !== plan.responseId && history[0].created_at > plan.createdAt),
    archivedVersions: plans.filter((p) => p.status === "archived").length,
    completed: ((progress.data ?? []) as { lesson_id: string; complete: boolean; total_steps: number }[]).filter((r) => r.complete && r.total_steps > 0).map((r) => r.lesson_id),
    lessons: base.info,
  };
});
