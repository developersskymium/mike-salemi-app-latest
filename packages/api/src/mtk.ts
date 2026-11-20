import type { MtkPlanDay } from "@ms/core";
import type { DB } from "./client";

/**
 * Mastering the Kettlebell personalisation (migration 0012): the member's assessment
 * (intake form `mtk-intake`) and their plan versions in `mtk_plans`. Plans are created only
 * through `create_mtk_plan` (archives the active version, validates every lesson id).
 */

export interface MtkPlanSchedule {
  weeks: number;
  daysPerWeek: number;
  minutes: number;
  weeksNeeded: number;
}

export interface MtkPlanRow {
  id: string;
  version: number;
  status: "active" | "archived";
  responseId: string | null;
  schedule: MtkPlanSchedule;
  result: Record<string, unknown>;
  lessonIds: string[];
  days: MtkPlanDay[];
  createdAt: string;
}

// mtk_plans / create_mtk_plan are newer than the generated types: a narrow untyped view.
type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: string) => {
        eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: { message: string } | null }> };
      };
    };
  };
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};
const loose = (sb: DB) => sb as unknown as Loose;

type Raw = {
  id: string; version: number; status: "active" | "archived"; response_id: string | null; created_at: string;
  schedule: { weeks?: number; days_per_week?: number; minutes?: number; weeks_needed?: number } | null;
  result: Record<string, unknown> | null; lesson_ids: string[] | null;
  days: { day: number; week: number; title: string; lesson_ids: string[]; minutes: number }[] | null;
};

function toPlan(r: Raw): MtkPlanRow {
  return {
    id: r.id, version: r.version, status: r.status, responseId: r.response_id, createdAt: r.created_at,
    schedule: {
      weeks: r.schedule?.weeks ?? 8, daysPerWeek: r.schedule?.days_per_week ?? 3,
      minutes: r.schedule?.minutes ?? 20, weeksNeeded: r.schedule?.weeks_needed ?? 1,
    },
    result: r.result ?? {},
    lessonIds: r.lesson_ids ?? [],
    days: (r.days ?? []).map((d) => ({ day: d.day, week: d.week, title: d.title, lessonIds: d.lesson_ids ?? [], minutes: d.minutes })),
  };
}

/** Every MTK plan version of the member for a program, newest first. */
export async function mtkPlans(sb: DB, userId: string, programId: string): Promise<MtkPlanRow[]> {
  const { data, error } = await loose(sb)
    .from("mtk_plans")
    .select("id, version, status, response_id, schedule, result, lesson_ids, days, created_at")
    .eq("user_id", userId)
    .eq("program_id", programId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Raw[]).map(toPlan);
}

/** Creates the next plan version (the active one is archived). Returns its id and version. */
export async function createMtkPlan(
  sb: DB,
  input: { responseId: string; schedule: { weeks: number; daysPerWeek: number; minutes: number }; result: Record<string, unknown>; days: MtkPlanDay[] },
): Promise<{ id: string; version: number }> {
  const { data, error } = await loose(sb).rpc("create_mtk_plan", {
    p_response: input.responseId,
    p_schedule: { weeks: input.schedule.weeks, days_per_week: input.schedule.daysPerWeek, minutes: input.schedule.minutes },
    p_result: input.result,
    p_days: input.days.map((d) => ({ day: d.day, week: d.week, title: d.title, lesson_ids: d.lessonIds, minutes: d.minutes })),
  });
  if (error) throw new Error(error.message);
  return data as { id: string; version: number };
}

