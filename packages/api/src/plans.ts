import { addDays, weekday, type IsoDate } from "@ms/core";
import type { DB } from "./client";
import type { Database } from "./database.types";

export type GoalKind = "strength" | "technique" | "mobility" | "conditioning" | "mindset" | "retreat_prep" | "custom";
export type PlanItemKind = "training" | "recovery" | "rest";

type Fns = Database["public"]["Functions"];
async function rpc<T, F extends keyof Fns & string = keyof Fns & string>(sb: DB, fn: F, args?: Fns[F]["Args"]): Promise<T> {
  const { data, error } = await sb.rpc(fn, (args ?? {}) as never);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Untyped call for functions added after database.types.ts was generated (0013). */
async function rpcAny<T>(sb: DB, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (sb.rpc as unknown as (f: string, a: unknown) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------------------------------------------------------------- reads
export async function myGoals(sb: DB, userId: string) {
  const { data, error } = await sb.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function planTemplates(sb: DB, goalKind?: GoalKind) {
  let q = sb.from("plan_templates").select("*").eq("is_published", true);
  if (goalKind) q = q.eq("goal_kind", goalKind);
  const { data, error } = await q.order("position");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function myPlans(sb: DB, userId: string, status: "active" | "draft" | "paused" | "archived" = "active") {
  const { data, error } = await sb
    .from("member_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function planItems(sb: DB, planId: string) {
  const { data, error } = await sb
    .from("plan_items")
    .select("*, lessons(id, title, key, program_id, page_type)")
    .eq("plan_id", planId)
    .order("on_date")
    .order("position");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ---------------------------------------------------------------- writes (server functions)
/** Copy a template onto the member's weekdays (0=Sun…6=Sat). Lessons the member can't open are skipped. */
export function startPlanFromTemplate(sb: DB, templateId: string, startsOn: IsoDate | null, days: number[]) {
  return rpc<string>(sb, "start_plan_from_template", { p_template: templateId, p_starts_on: startsOn ?? undefined, p_days: days });
}

/** Immersion "Scheduled pace": places the remaining lessons on training days (archives any earlier schedule). */
export function scheduleImmersion(sb: DB, enrollmentId: string, days: number[], startsOn?: IsoDate | null) {
  return rpc<string>(sb, "schedule_immersion", { p_enrollment: enrollmentId, p_days: days, p_starts_on: startsOn ?? undefined });
}

/** "Fix my plan": shift / skip / weekend (the enrollment's rule for immersion schedules, shift otherwise). */
export function applyMissedDayRule(sb: DB, planId: string, today?: IsoDate) {
  return rpc<{ rule: "shift" | "skip" | "weekend"; missed: number; changed: number; offset_days?: number }>(
    sb, "apply_missed_day_rule", { p_plan: planId, p_today: today ?? undefined },
  );
}

/** Guided schedule: re-flow the plan's remaining sessions, in order, onto these weekdays (0=Sun) from a date. */
export function reflowPlan(sb: DB, planId: string, days: number[], from?: IsoDate | null) {
  return rpcAny<{ moved: number; days: number[]; ends_on: IsoDate }>(sb, "reflow_plan", { p_plan: planId, p_days: days, p_from: from ?? null });
}

/** "If you miss a day" rule for one plan (also stored on the enrollment for Immersion schedules). */
export function setMissedDayRule(sb: DB, planId: string, rule: "shift" | "skip" | "weekend") {
  return rpcAny<string>(sb, "set_missed_day_rule", { p_plan: planId, p_rule: rule });
}

export interface WeekEntry {
  kind: "plan" | "run_session" | "coaching";
  on_date: IsoDate;
  starts_at: string | null;
  title: string;
  subtitle: string | null;
  plan_id: string | null;
  plan_item_id: string | null;
  item_kind: PlanItemKind | null;
  lesson_id: string | null;
  program_id: string | null;
  program_name: string | null;
  program_slug: string | null;
  ref_id: string | null;
  done: boolean;
  skipped: boolean;
  sort_order: number;
  /** Set by the web app (not the database): the member no longer has access to this program. */
  locked?: boolean;
}

/** One calendar feed: plan items, booked live sessions and coaching between two dates (≤ 92 days). */
export function myWeek(sb: DB, from: IsoDate, to: IsoDate) {
  return rpc<WeekEntry[]>(sb, "my_week", { p_from: from, p_to: to });
}

export async function markPlanItem(sb: DB, itemId: string, patch: { done?: boolean; skipped?: boolean; onDate?: IsoDate }) {
  const now = new Date().toISOString();
  const { error } = await sb
    .from("plan_items")
    .update({
      ...(patch.done !== undefined ? { done_at: patch.done ? now : null } : {}),
      ...(patch.skipped !== undefined ? { skipped_at: patch.skipped ? now : null } : {}),
      ...(patch.onDate ? { on_date: patch.onDate } : {}),
    })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function setPlanStatus(sb: DB, planId: string, status: "active" | "paused" | "archived") {
  const { error } = await sb.from("member_plans").update({ status }).eq("id", planId);
  if (error) throw new Error(error.message);
}

/** Save a draft (e.g. from generatePlanDraft, later AI-enriched) as a member plan with items. */
export async function savePlanDraft(
  sb: DB,
  userId: string,
  draft: PlanDraft,
  meta: { name: string; goalId?: string | null; source?: "custom" | "ai"; overview?: string | null; status?: "draft" | "active" },
) {
  const { data: plan, error } = await sb
    .from("member_plans")
    .insert({
      user_id: userId,
      goal_id: meta.goalId ?? null,
      name: meta.name,
      source: meta.source ?? "custom",
      status: meta.status ?? "active",
      starts_on: draft.startsOn,
      inputs: draft.inputs as never,
      overview: meta.overview ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const rows = draft.items.map((it, i) => ({
    plan_id: plan.id,
    user_id: userId,
    on_date: it.date,
    kind: it.kind,
    lesson_id: it.lessonId,
    title: it.title,
    note: it.note ?? null,
    position: i + 1,
  }));
  if (rows.length) {
    const { error: e2 } = await sb.from("plan_items").insert(rows);
    if (e2) throw new Error(e2.message);
  }
  return plan.id as string;
}

// ---------------------------------------------------------------- deterministic draft builder (pure)
export interface DraftLesson {
  id: string;
  title: string;
  programId: string;
  /** Curriculum order inside its program. */
  order: number;
  pageType?: string | null;
  dayType?: string | null;
  focus?: string | null;
  tags?: string[];
  /** Typical length in minutes, when known. */
  minutes?: number | null;
}

export interface PlanDraftInput {
  goal: GoalKind;
  /** Programs the member picked; empty = every program in `lessons`. */
  programIds?: string[];
  /** All candidate lessons (any program). */
  lessons: DraftLesson[];
  /** Lesson ids the member can open; omit to treat all as accessible. */
  accessible?: ReadonlySet<string>;
  /** Lessons already completed (left out). */
  done?: ReadonlySet<string>;
  weeks: number;
  /** Training weekdays, 0=Sun…6=Sat. Their count is the sessions per week. */
  trainingDays: number[];
  startDate: IsoDate;
  /** Insert a recovery session after this many consecutive training sessions (default 2). */
  recoveryEvery?: number;
  /** The member's usual session length: lessons far longer than this go to the back of the queue. */
  sessionMinutes?: number | null;
}

export interface PlanDraftItem {
  date: IsoDate;
  week: number;
  session: number;
  kind: PlanItemKind;
  lessonId: string | null;
  title: string;
  /** Why this session is here (shown in the plan creator). */
  note?: string;
  programId?: string | null;
  /** The lesson's own length when known. */
  minutes?: number | null;
  /** Against the member's session length: "fits", or "long" when it runs far over. Absent when unknown. */
  fit?: "fits" | "long";
}

/**
 * A lesson "fits" when it is at most 5 minutes over the member's session; it runs "long" (far longer) when it is
 * half as long again and 15+ minutes over. In between it is neither praised nor flagged.
 */
export function lessonFit(minutes: number | null | undefined, sessionMinutes: number | null | undefined): "fits" | "long" | undefined {
  if (!minutes || !sessionMinutes) return undefined;
  if (minutes <= sessionMinutes + 5) return "fits";
  return minutes >= Math.max(sessionMinutes * 1.5, sessionMinutes + 15) ? "long" : undefined;
}

export interface PlanDraft {
  startsOn: IsoDate;
  items: PlanDraftItem[];
  inputs: Record<string, unknown>;
}

/** Keywords that mark a lesson as serving a goal (matched against title, focus, day type and tags). */
export const GOAL_KEYWORDS: Record<GoalKind, string[]> = {
  strength: ["strength", "press", "squat", "deadlift", "row", "lunge", "get up", "workout"],
  technique: ["technique", "pre-check", "precheck", "error", "clean", "snatch", "swing", "jerk", "skill", "drill"],
  mobility: ["mobility", "stretch", "flexib", "joint", "posture", "flow", "myofascial", "release"],
  conditioning: ["conditioning", "swing", "snatch", "circuit", "interval", "complex", "workout", "cardio"],
  mindset: ["mind", "breath", "meditat", "inner", "awareness", "presence", "stress", "inspired", "intention"],
  retreat_prep: ["breath", "meditat", "movement", "mobility", "preparation", "grounding", "qi gong"],
  custom: [],
};

export const GOAL_LABEL: Record<GoalKind, string> = {
  strength: "strength", technique: "technique", mobility: "mobility", conditioning: "conditioning", mindset: "mindset", retreat_prep: "retreat preparation", custom: "own",
};

const RECOVERY_WORDS = ["recovery", "rest", "mobility", "stretch", "breath", "restore", "working in"];

function text(l: DraftLesson) {
  return [l.title, l.focus ?? "", l.dayType ?? "", ...(l.tags ?? [])].join(" ").toLowerCase();
}

function score(l: DraftLesson, goal: GoalKind) {
  const t = text(l);
  return GOAL_KEYWORDS[goal].reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0);
}

function isRecovery(l: DraftLesson) {
  const t = text(l);
  return RECOVERY_WORDS.some((k) => t.includes(k));
}

/**
 * Pure, deterministic plan builder: picks accessible, not-yet-done lessons that serve the goal from the
 * chosen programs (curriculum order kept within each program, programs interleaved round-robin), then
 * spreads them over `weeks` × training days with a recovery session after every `recoveryEvery`
 * training sessions. AI enrichment happens later in a server route.
 */
export function generatePlanDraft(input: PlanDraftInput): PlanDraft {
  const days = [...new Set(input.trainingDays.map((d) => ((d % 7) + 7) % 7))].sort((a, b) => a - b);
  if (!days.length) throw new Error("Choose at least one training day");
  const weeks = Math.max(1, Math.min(input.weeks, 26));
  const recoveryEvery = Math.max(1, input.recoveryEvery ?? 2);
  const programFilter = input.programIds?.length ? new Set(input.programIds) : null;

  const pool = input.lessons
    .filter((l) => !l.pageType)
    .filter((l) => !programFilter || programFilter.has(l.programId))
    .filter((l) => !input.accessible || input.accessible.has(l.id))
    .filter((l) => !input.done?.has(l.id));

  const ranked = (list: DraftLesson[]) => {
    const scored = list.map((l) => ({ l, s: input.goal === "custom" ? 1 : score(l, input.goal) }));
    const hits = scored.filter((x) => x.s > 0);
    return (hits.length ? hits : scored).map((x) => x.l);
  };
  const byProgram = new Map<string, DraftLesson[]>();
  for (const l of pool) byProgram.set(l.programId, [...(byProgram.get(l.programId) ?? []), l]);
  const programOrder = [...byProgram.keys()].sort((a, b) =>
    programFilter && input.programIds ? input.programIds.indexOf(a) - input.programIds.indexOf(b) : a.localeCompare(b),
  );
  // Prefer lessons that fit the member's session length; far longer ones stay available, at the back (order kept otherwise).
  const fitsFirst = (list: DraftLesson[]) =>
    input.sessionMinutes ? [...list.filter((l) => lessonFit(l.minutes, input.sessionMinutes) !== "long"), ...list.filter((l) => lessonFit(l.minutes, input.sessionMinutes) === "long")] : list;
  const queues = programOrder.map((p) => {
    const list = [...byProgram.get(p)!].sort((a, b) => a.order - b.order);
    const goalList = ranked(list);
    const hard = goalList.filter((l) => !isRecovery(l));
    // Mobility/mindset goals may consist only of "recovery-like" lessons: then those are the training.
    return { training: fitsFirst(hard.length ? hard : goalList), recovery: fitsFirst(list.filter(isRecovery)) };
  });
  const sized = (l: DraftLesson | null) => {
    const fit = lessonFit(l?.minutes, input.sessionMinutes);
    return l?.minutes ? { minutes: l.minutes, ...(fit ? { fit } : {}) } : {};
  };

  const takeTraining = (() => {
    let i = 0;
    const used = new Set<string>();
    return (): DraftLesson | null => {
      for (let n = 0; n < queues.length; n++) {
        const q = queues[(i + n) % queues.length]!;
        const next = q.training.find((l) => !used.has(l.id));
        if (next) {
          used.add(next.id);
          i = (i + n + 1) % queues.length;
          return next;
        }
      }
      return null;
    };
  })();
  const takeRecovery = (() => {
    const used = new Set<string>();
    const all = queues.flatMap((q) => q.recovery);
    let i = 0;
    return (): DraftLesson | null => {
      if (!all.length) return null;
      for (let n = 0; n < all.length; n++) {
        const l = all[(i + n) % all.length]!;
        if (!used.has(l.id)) {
          used.add(l.id);
          i = (i + n + 1) % all.length;
          return l;
        }
      }
      // Recovery sessions may repeat once the list runs out.
      const l = all[i % all.length]!;
      i++;
      return l;
    };
  })();

  const items: PlanDraftItem[] = [];
  let cursor = input.startDate;
  let streak = 0;
  for (let week = 1; week <= weeks; week++) {
    for (let session = 1; session <= days.length; session++) {
      while (!days.includes(weekday(cursor))) cursor = addDays(cursor, 1);
      const wantRecovery = streak >= recoveryEvery;
      if (wantRecovery) {
        const r = takeRecovery();
        items.push({
          date: cursor, week, session, kind: "recovery", lessonId: r?.id ?? null, programId: r?.programId ?? null, ...sized(r),
          title: r?.title ?? "Recovery: easy walk, breathing and mobility",
          note: `Recovery after ${recoveryEvery} training ${recoveryEvery === 1 ? "day" : "days"}`,
        });
        streak = 0;
      } else {
        const t = takeTraining();
        if (!t) {
          items.push({ date: cursor, week, session, kind: "recovery", lessonId: null, title: "Recovery: easy walk, breathing and mobility", note: "Every lesson that fits is placed — easy movement day" });
          streak = 0;
        } else {
          items.push({
            date: cursor, week, session, kind: "training", lessonId: t.id, title: t.title, programId: t.programId, ...sized(t),
            note: input.goal !== "custom" && score(t, input.goal) > 0 ? `Serves your ${GOAL_LABEL[input.goal]} goal` : "Next in the program's order",
          });
          streak++;
        }
      }
      cursor = addDays(cursor, 1);
    }
  }
  return {
    startsOn: input.startDate,
    items,
    inputs: { goal: input.goal, programIds: input.programIds ?? [], weeks, trainingDays: days, recoveryEvery, ...(input.sessionMinutes ? { sessionMinutes: input.sessionMinutes } : {}) },
  };
}
