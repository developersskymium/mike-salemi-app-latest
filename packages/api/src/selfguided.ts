/**
 * Advanced Self-Guided data layer (supabase/migrations/0011_self_guided.sql).
 * Every write is a server function; members only read their own training_sessions and day_notes.
 */
import type { HeatEntry, Intent, LessonIntent, PoolItem, SessionSource, Slot, StepRole } from "@ms/core";
import type { DB } from "./client";

const err = (what: string, e: { message: string } | null) => {
  if (e) throw new Error(`${what}: ${e.message}`);
};

/* ------------------------------------------------------------------ shapes */

export interface SmartNextDTO {
  lessonId: string;
  key: string | null;
  title: string;
  dayNumber: number | null;
  dayType: string | null;
  pageType: string | null;
  sectionTitle: string | null;
  intent: LessonIntent;
  kind: "start" | "readiness" | "rotation" | "order" | "repeat";
  reason: string;
  want: Intent | null;
  lastIntent: LessonIntent | null;
  completions: number;
  readiness: { score: number; band: "green" | "amber" | "red"; bandName: string } | null;
}

export interface ContinuePoint {
  kind: "lesson" | "session";
  programId: string;
  programSlug: string;
  programName: string;
  programType: string;
  mode: "immersion" | "self_guided" | "library" | null;
  pathId: string | null;
  pathName: string | null;
  lessonId: string | null;
  lessonKey: string | null;
  lessonTitle: string | null;
  dayNumber: number | null;
  dayType: string | null;
  sectionTitle: string | null;
  sessionId: string | null;
  sessionTitle: string | null;
  stepId: string | null;
  stepTitle: string | null;
  stepIndex: number;
  stepCount: number;
  stepsDone: number;
  videoProviderId: string | null;
  videoSeconds: number;
  videoDuration: number | null;
  poster: string | null;
  updatedAt: string | null;
}

export interface PhaseStat {
  sectionId: string;
  title: string;
  done: number;
  total: number;
  pct: number;
}

export interface ProgramStat {
  programId: string;
  slug: string;
  name: string;
  pathId: string | null;
  pathName: string | null;
  done: number;
  total: number;
  pct: number;
  minutes: number;
  phases: PhaseStat[];
}

export interface TrainingStatsDTO {
  today: string;
  from: string;
  timezone: string;
  minutes: number;
  sessions: number;
  completions: number;
  activeDays: number;
  week: { minutes: number; sessions: number; starts: string };
  streak: { current: number; best: number };
  heatmap: HeatEntry[];
  programs: ProgramStat[];
  completionsByLesson: Record<string, { count: number; lastAt: string }>;
  readiness: { at: string; score: number; band: "green" | "amber" | "red"; bandName: string }[];
  intents: Partial<Record<LessonIntent, number>>;
}

export interface HistoryRow {
  sessionId: string;
  source: SessionSource;
  title: string;
  intent: LessonIntent | null;
  programId: string;
  programSlug: string;
  programName: string;
  lessonId: string | null;
  lessonKey: string | null;
  lessonTitle: string | null;
  dayNumber: number | null;
  startedAt: string;
  endedAt: string | null;
  minutes: number;
  plannedMinutes: number | null;
  items: number;
  itemsDone: number;
  notes: string | null;
  favourite: boolean;
  dayCompleted: boolean;
  readiness: { score: number; band: "green" | "amber" | "red"; name: string } | null;
}

export interface SessionPlanItem extends Partial<PoolItem> {
  stepId?: string;
  videoId?: string;
  role: StepRole;
  minutes: number;
  title: string;
  slot: Slot;
}

export interface CreatedSession {
  sessionId: string;
  minutes: number;
  items?: SessionPlanItem[];
}

/* ------------------------------------------------------------------ mapping */

type J = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : null);
const n = (v: unknown) => (typeof v === "number" ? v : v == null ? null : Number(v));

export function toPlanItem(e: J): SessionPlanItem {
  return {
    stepId: s(e.step_id) ?? undefined,
    videoId: s(e.video_id) ?? undefined,
    lessonId: s(e.lesson_id) ?? undefined,
    lessonTitle: s(e.lesson_title) ?? undefined,
    lessonKey: s(e.lesson_key),
    role: (s(e.role) ?? "skill") as StepRole,
    minutes: n(e.minutes) ?? 0,
    title: s(e.title) ?? "",
    slot: (s(e.slot) ?? "main") as Slot,
  };
}

function toNext(j: J | null): SmartNextDTO | null {
  if (!j || !j.lesson_id) return null;
  const r = j.readiness as J | null;
  return {
    lessonId: String(j.lesson_id), key: s(j.key), title: String(j.title ?? ""), dayNumber: n(j.day_number), dayType: s(j.day_type),
    pageType: s(j.page_type), sectionTitle: s(j.section_title), intent: (s(j.intent) ?? "workout") as LessonIntent,
    kind: (s(j.kind) ?? "order") as SmartNextDTO["kind"], reason: String(j.reason ?? ""), want: s(j.want) as Intent | null,
    lastIntent: s(j.last_intent) as LessonIntent | null, completions: n(j.completions) ?? 0,
    readiness: r ? { score: Number(r.score), band: r.band as "green", bandName: String(r.band_name ?? "") } : null,
  };
}

export function toStats(j: J): TrainingStatsDTO {
  const week = (j.week ?? {}) as J;
  const streak = (j.streak ?? {}) as J;
  return {
    today: String(j.today), from: String(j.from), timezone: String(j.timezone ?? "UTC"),
    minutes: n(j.minutes) ?? 0, sessions: n(j.sessions) ?? 0, completions: n(j.completions) ?? 0, activeDays: n(j.active_days) ?? 0,
    week: { minutes: n(week.minutes) ?? 0, sessions: n(week.sessions) ?? 0, starts: String(week.starts ?? j.today) },
    streak: { current: n(streak.current) ?? 0, best: n(streak.best) ?? 0 },
    heatmap: ((j.heatmap ?? []) as J[]).map((h) => ({ date: String(h.date), minutes: n(h.minutes) ?? 0, sessions: n(h.sessions) ?? 0, steps: n(h.steps) ?? 0 })),
    programs: ((j.programs ?? []) as J[]).map((p) => ({
      programId: String(p.program_id), slug: String(p.slug), name: String(p.name), pathId: s(p.path_id), pathName: s(p.path_name),
      done: n(p.done) ?? 0, total: n(p.total) ?? 0, pct: n(p.pct) ?? 0, minutes: n(p.minutes) ?? 0,
      phases: ((p.phases ?? []) as J[]).map((x) => ({ sectionId: String(x.section_id), title: String(x.title), done: n(x.done) ?? 0, total: n(x.total) ?? 0, pct: n(x.pct) ?? 0 })),
    })),
    completionsByLesson: Object.fromEntries(((j.completions_by_lesson ?? []) as J[]).map((c) => [String(c.lesson_id), { count: n(c.count) ?? 0, lastAt: String(c.last_at) }])),
    readiness: ((j.readiness ?? []) as J[]).map((r) => ({ at: String(r.at), score: n(r.score) ?? 0, band: r.band as "green", bandName: String(r.band_name ?? "") })),
    intents: (j.intents ?? {}) as TrainingStatsDTO["intents"],
  };
}

/* ------------------------------------------------------------------ reads */

export async function smartNextLesson(sb: DB, programId: string, pathId: string | null) {
  const { data, error } = await sb.rpc("smart_next", { p_program: programId, p_path: pathId ?? undefined });
  err("smart next", error);
  return toNext(data as J | null);
}

export async function continuePoints(sb: DB, programId?: string | null, limit = 8): Promise<ContinuePoint[]> {
  const { data, error } = await sb.rpc("my_continue", { p_program: programId ?? undefined, p_limit: limit });
  err("continue", error);
  return (data ?? []).map((r) => ({
    kind: r.kind as "lesson", programId: r.program_id, programSlug: r.program_slug, programName: r.program_name, programType: r.program_type,
    mode: r.mode ?? null, pathId: r.path_id ?? null, pathName: r.path_name ?? null, lessonId: r.lesson_id ?? null, lessonKey: r.lesson_key ?? null,
    lessonTitle: r.lesson_title ?? null, dayNumber: r.day_number ?? null, dayType: r.day_type ?? null, sectionTitle: r.section_title ?? null,
    sessionId: r.session_id ?? null, sessionTitle: r.session_title ?? null, stepId: r.step_id ?? null, stepTitle: r.step_title ?? null,
    stepIndex: r.step_index ?? 0, stepCount: r.step_count ?? 0, stepsDone: r.steps_done ?? 0, videoProviderId: r.video_provider_id ?? null,
    videoSeconds: r.video_seconds ?? 0, videoDuration: r.video_duration ?? null, poster: r.poster ?? null, updatedAt: r.updated_at ?? null,
  }));
}

export async function trainingStats(sb: DB, programId?: string | null, weeks = 26): Promise<TrainingStatsDTO | null> {
  const { data, error } = await sb.rpc("my_training_stats", { p_program: programId ?? undefined, p_weeks: weeks });
  err("stats", error);
  return data ? toStats(data as J) : null;
}

export async function trainingHistory(sb: DB, opts: { programId?: string | null; before?: string | null; limit?: number } = {}): Promise<HistoryRow[]> {
  const { data, error } = await sb.rpc("training_history", { p_program: opts.programId ?? undefined, p_before: opts.before ?? undefined, p_limit: opts.limit ?? 20 });
  err("history", error);
  return (data ?? []).map((r) => ({
    sessionId: r.session_id, source: r.source as SessionSource, title: r.title, intent: (r.intent ?? null) as LessonIntent | null,
    programId: r.program_id, programSlug: r.program_slug, programName: r.program_name, lessonId: r.lesson_id ?? null, lessonKey: r.lesson_key ?? null,
    lessonTitle: r.lesson_title ?? null, dayNumber: r.day_number ?? null, startedAt: r.started_at, endedAt: r.ended_at ?? null, minutes: r.minutes ?? 0,
    plannedMinutes: r.planned_minutes ?? null, items: r.items ?? 0, itemsDone: r.items_done ?? 0, notes: r.notes ?? null, favourite: Boolean(r.favourite),
    dayCompleted: Boolean(r.day_completed),
    readiness: r.readiness_score != null ? { score: r.readiness_score, band: r.readiness_band as "green", name: r.readiness_name ?? "" } : null,
  }));
}

/** Usable steps of a program (one per video) for quick and custom sessions. */
export async function sessionPool(sb: DB, programId: string, pathId?: string | null): Promise<(PoolItem & { ord: number })[]> {
  const { data, error } = await sb.rpc("session_pool", { p_program: programId, p_path: pathId ?? undefined });
  err("session pool", error);
  return (data ?? []).map((r) => ({
    stepId: r.step_id, lessonId: r.lesson_id, role: r.role as StepRole, minutes: r.minutes, title: r.title, lessonTitle: r.lesson_title, lessonKey: r.lesson_key, ord: Number(r.ord),
  }));
}

export async function dayNotes(sb: DB, userId: string, lessonIds: string[]) {
  if (!lessonIds.length) return {} as Record<string, { body: string; updatedAt: string }>;
  const { data, error } = await sb.from("day_notes").select("lesson_id, body, updated_at").eq("user_id", userId).in("lesson_id", lessonIds);
  err("notes", error);
  return Object.fromEntries((data ?? []).filter((d) => d.body.trim()).map((d) => [d.lesson_id, { body: d.body, updatedAt: d.updated_at }]));
}

export async function getTrainingSession(sb: DB, sessionId: string) {
  const { data, error } = await sb.from("training_sessions").select("*").eq("id", sessionId).maybeSingle();
  err("session", error);
  return data;
}

/* ------------------------------------------------------------------ writes (server functions) */

export async function startSession(sb: DB, lessonId: string, source?: "day" | "repeat") {
  const { data, error } = await sb.rpc("start_session", { p_lesson: lessonId, p_source: source });
  err("start session", error);
  return data as string;
}

export async function endSession(sb: DB, sessionId: string, minutes?: number | null, notes?: string | null) {
  const { data, error } = await sb.rpc("end_session", { p_session: sessionId, p_minutes: minutes ?? undefined, p_notes: notes ?? undefined });
  err("end session", error);
  const j = data as J;
  return { sessionId: String(j.session_id), minutes: n(j.minutes) ?? 0, notes: s(j.notes), sessionsToday: n(j.sessions_today) ?? 0, streak: n(j.streak) ?? 0, bestStreak: n(j.best_streak) ?? 0 };
}

export async function logDayCompletion(sb: DB, lessonId: string, sessionId?: string | null) {
  const { data, error } = await sb.rpc("log_day_completion", { p_lesson: lessonId, p_session: sessionId ?? undefined });
  err("log completion", error);
  const j = data as J;
  return { logged: Boolean(j.logged), count: n(j.count) ?? 0, first: Boolean(j.first), sessionId: String(j.session_id) };
}

export async function sessionProgress(sb: DB, sessionId: string, item: string, patch: { done?: boolean; video?: string; seconds?: number }) {
  const { data, error } = await sb.rpc("session_progress", {
    p_session: sessionId, p_item: item, p_done: patch.done, p_video: patch.video, p_seconds: patch.seconds == null ? undefined : Math.round(patch.seconds),
  });
  err("session progress", error);
  return data as { done?: string[]; active?: string; seconds?: Record<string, number> };
}

export async function setSessionFavourite(sb: DB, sessionId: string, on: boolean) {
  const { error } = await sb.rpc("set_session_favourite", { p_session: sessionId, p_on: on });
  err("favourite", error);
}

export async function saveDayNote(sb: DB, lessonId: string, body: string) {
  const { data, error } = await sb.rpc("save_day_note", { p_lesson: lessonId, p_body: body });
  err("note", error);
  return data as string;
}

const created = (j: J): CreatedSession => ({
  sessionId: String(j.session_id), minutes: n(j.minutes) ?? 0, items: Array.isArray(j.items) ? (j.items as J[]).map(toPlanItem) : undefined,
});

export async function quickSession(sb: DB, programId: string, minutes: number, intent?: Intent | null, pathId?: string | null) {
  const { data, error } = await sb.rpc("quick_session", { p_program: programId, p_minutes: minutes, p_intent: intent ?? undefined, p_path: pathId ?? undefined });
  err("quick session", error);
  return created(data as J);
}

export async function customSession(sb: DB, programId: string, stepIds: string[], title?: string | null) {
  const { data, error } = await sb.rpc("custom_session", { p_program: programId, p_steps: stepIds, p_title: title ?? undefined });
  err("custom session", error);
  return created(data as J);
}

export async function librarySession(sb: DB, videoId: string) {
  const { data, error } = await sb.rpc("library_session", { p_video: videoId });
  err("library session", error);
  return created(data as J);
}

export async function repeatSession(sb: DB, sessionId: string) {
  const { data, error } = await sb.rpc("repeat_session", { p_session: sessionId });
  err("repeat", error);
  const j = data as J;
  return { sessionId: s(j.session_id), lessonId: s(j.lesson_id), lessonKey: s(j.lesson_key) };
}

export async function saveTrainingPlan(
  sb: DB,
  name: string,
  inputs: Record<string, unknown>,
  items: { date: string; lessonId: string; kind: "training" | "recovery"; note?: string }[],
  startsOn?: string | null,
) {
  const { data, error } = await sb.rpc("save_training_plan", {
    p_name: name,
    p_inputs: inputs as never,
    p_items: items.map((i) => ({ on_date: i.date, lesson_id: i.lessonId, kind: i.kind, note: i.note ?? null })) as never,
    p_starts_on: startsOn ?? undefined,
  });
  err("save plan", error);
  return data as string;
}
