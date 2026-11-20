/**
 * Advanced Self-Guided rules: day/step classification, smart "Up next" rotation,
 * quick-session assembly, streaks and the training heatmap, and the plan builder.
 *
 * The database runs the same rules (supabase/migrations/0011_self_guided.sql:
 * private.sg_lesson_intent, sg_step_role, sg_step_minutes, smart_next, sg_assemble,
 * sg_streak). Change both together; these tests are the specification.
 */
import { addDays, daysBetween, planScheduleDays, weekday, type IsoDate } from "./schedule";
import type { StepSpecial, Uuid } from "./types";

export type Intent = "workout" | "recovery" | "skill" | "mobility";
export type LessonIntent = Intent | "overview";
export type StepRole = "warmup" | "mobility" | "recovery" | "skill" | "workout";
export type SessionSource = "day" | "quick" | "custom" | "library" | "repeat";

export const INTENTS: readonly Intent[] = ["workout", "recovery", "skill", "mobility"];
export const QUICK_MINUTES = [10, 20, 30, 45] as const;

export const INTENT_LABEL: Record<LessonIntent, string> = {
  workout: "Workout",
  recovery: "Recovery",
  skill: "Skill",
  mobility: "Mobility",
  overview: "Overview",
};

/* ------------------------------------------------------------------ classification */

const has = (re: RegExp, s: string | null | undefined) => re.test(s ?? "");

/** Intent of a lesson from its authored day type; courses ('general') by keywords. */
export function lessonIntent(dayType: string | null | undefined, pageType: string | null | undefined, title?: string | null, section?: string | null): LessonIntent {
  if (pageType) return "overview";
  if (has(/overview|preparation/i, dayType)) return "overview";
  if (has(/recovery/i, dayType)) return "recovery";
  if (has(/skill/i, dayType)) return "skill";
  if (has(/workout|challenge|on ramp/i, dayType)) return "workout";
  if (has(/^(home|intro|introduction|download|ebook pdf|playlist|book recommendations|want to learn more\?)$/i, title) || has(/call recording|q ?& ?a|archive|pre-course|certification/i, title)) return "overview";
  const text = `${title ?? ""} ${section ?? ""}`;
  if (/breath|meditat|working in|recovery|energy push|rest/i.test(text)) return "recovery";
  if (/mobility|stretch|flexib|halo|roll down|butterfly/i.test(text)) return "mobility";
  if (/workout|program|circuit|challenge/i.test(text)) return "workout";
  return "skill";
}

/** Role of a step inside an assembled session; null = not usable on its own. */
export function stepRole(kind: string | null | undefined, special: StepSpecial, title?: string | null, section?: string | null): StepRole | null {
  if (special === "readiness" || special === "completion" || special === "overview") return null;
  if (special === "workout" || kind === "workout") return "workout";
  if (kind === "warmup" || kind === "mobility" || kind === "recovery" || kind === "skill") return kind;
  if (kind === "lifestyle" || kind === "text") return null;
  if (has(/^(home|download|review checklist|additional resources)$|call recording|q ?& ?a|playwork/i, title)) return null;
  const text = `${title ?? ""} ${section ?? ""}`;
  if (/warm|pre-check|preparation/i.test(text)) return "warmup";
  if (/breath|meditat|working in|recovery|energy push/i.test(text)) return "recovery";
  if (/mobility|stretch|flexib|halo|roll down|butterfly/i.test(text)) return "mobility";
  if (/workout|circuit/i.test(text)) return "workout";
  return "skill";
}

const ROLE_MINUTES: Record<StepRole, number> = { warmup: 6, mobility: 8, recovery: 6, skill: 8, workout: 20 };

/** "9 min" label, else the video length, else a default by role. */
export function stepMinutes(label: string | null | undefined, seconds: number | null | undefined, role: StepRole | null): number {
  const m = /^\s*(\d+)\s*min/i.exec(label ?? "");
  if (m) return Number(m[1]);
  if (seconds && seconds > 0) return Math.max(1, Math.ceil(seconds / 60));
  return role ? ROLE_MINUTES[role] : 5;
}

/** Does a lesson of `intent` satisfy a wish for `want`? Recovery and mobility stand in for each other. */
export function matchesIntent(want: Intent, intent: LessonIntent): boolean {
  return want === intent || (want === "mobility" && intent === "recovery") || (want === "recovery" && intent === "mobility");
}

/** Filter chips: does a lesson belong under this intent? */
export function lessonMatchesFilter(filter: Intent | "all", intent: LessonIntent): boolean {
  if (filter === "all") return true;
  if (intent === "overview") return false;
  return filter === "mobility" ? intent === "mobility" || intent === "recovery" : intent === filter;
}

/* ------------------------------------------------------------------ smart next */

export interface NextLesson {
  id: Uuid;
  ord: number;
  intent: LessonIntent;
  done: boolean;
  completions: number;
}

export type NextKind = "start" | "readiness" | "rotation" | "order" | "repeat";

export interface SmartNextInput {
  lessons: readonly NextLesson[];
  lastLessonId: Uuid | null;
  /** Day programs rotate day types and read readiness; courses go in order. */
  rotate: boolean;
  /** Latest readiness within 3 days. */
  readiness?: { score: number; band: "green" | "amber" | "red"; bandName: string; outcome: "workout" | "recovery" | "rest" } | null;
  lessonLabel?: string;
}

export interface SmartNext {
  lessonId: Uuid;
  kind: NextKind;
  intent: LessonIntent;
  want: Intent | null;
  reason: string;
}

/** Rotation after a day of this intent: workout → recovery → skill → workout. */
export function rotationAfter(intent: LessonIntent): Intent | null {
  if (intent === "workout") return "recovery";
  if (intent === "recovery") return "skill";
  if (intent === "skill" || intent === "mobility") return "workout";
  return null;
}

export function smartNext(input: SmartNextInput): SmartNext | null {
  const ls = [...input.lessons].sort((a, b) => a.ord - b.ord);
  const n = ls.length;
  if (!n) return null;
  const last = input.lastLessonId ? ls.find((l) => l.id === input.lastLessonId) ?? null : null;
  const lastOrd = last?.ord ?? 0;
  const r = input.rotate ? input.readiness ?? null : null;
  let kind: NextKind;
  let want: Intent | null = null;
  if (!last) kind = "start";
  else if (r && (r.band === "red" || r.outcome === "recovery" || r.outcome === "rest")) {
    kind = "readiness";
    want = "recovery";
  } else if (r && r.band === "amber") {
    kind = "readiness";
    want = "mobility";
  } else if (input.rotate && rotationAfter(last.intent)) {
    kind = "rotation";
    want = rotationAfter(last.intent);
  } else kind = "order";

  // Order from just after the last trained lesson, wrapping around (SQL: (ord - last - 1 + n) % n).
  const after = [...ls].sort((a, b) => (((a.ord - lastOrd - 1) % n) + n) % n - ((((b.ord - lastOrd - 1) % n) + n) % n));
  let pick: NextLesson | undefined;
  if (kind === "start") pick = ls.find((l) => !l.done);
  else {
    if (want) pick = after.find((l) => !l.done && l.intent !== "overview" && matchesIntent(want!, l.intent));
    if (!pick) {
      if (kind === "rotation") kind = "order";
      pick = after.find((l) => !l.done && l.intent !== "overview") ?? after.find((l) => !l.done);
    }
  }
  if (!pick) {
    kind = "repeat";
    const pool = ls.filter((l) => l.intent !== "overview");
    pick = [...pool].sort((a, b) => {
      const ma = want && matchesIntent(want, a.intent) ? 0 : 1;
      const mb = want && matchesIntent(want, b.intent) ? 0 : 1;
      return ma - mb || a.completions - b.completions || a.ord - b.ord;
    })[0];
  }
  if (!pick) return null;
  const word = (input.lessonLabel ?? "Day").toLowerCase();
  const reason =
    kind === "start"
      ? "A good place to begin."
      : kind === "readiness"
        ? `Your last check-in scored ${r!.score} (${r!.bandName}). A ${pick.intent} day lets you bounce back.`
        : kind === "rotation"
          ? `You did a ${last!.intent} day last. A ${pick.intent} day keeps the week balanced.`
          : kind === "repeat"
            ? "Everything's done. This is the one you've repeated least."
            : `The next ${word} you haven't done yet.`;
  return { lessonId: pick.id, kind, intent: pick.intent, want, reason };
}

/* ------------------------------------------------------------------ quick sessions */

export interface PoolItem {
  stepId: Uuid;
  lessonId: Uuid;
  role: StepRole;
  minutes: number;
  title: string;
  lessonTitle?: string;
  lessonKey?: string | null;
}

export type Slot = "warmup" | "main" | "stretch";
export type SessionItem = PoolItem & { slot: Slot };

/** A role's pool rotated to start at (seed × 3) mod n, so each new session varies. */
export function rotate<T>(list: readonly T[], seed: number): T[] {
  const n = list.length;
  if (!n) return [];
  const k = (seed * 3) % n;
  return [...list.slice(k), ...list.slice(0, k)];
}

function rotatedRole(pool: readonly PoolItem[], role: StepRole, seed: number) {
  return rotate(pool.filter((p) => p.role === role), seed);
}

function pickFirst(list: readonly PoolItem[], budget: number, used: Set<string>) {
  return list.find((p) => p.minutes <= budget && !used.has(p.stepId));
}

/**
 * Warm-up (~30%) + main (fills the rest, up to 6 items) + stretch (~25%, 20+ min sessions),
 * drawn from the program's usable steps (one per video, curriculum order).
 */
export function assembleQuickSession(pool: readonly PoolItem[], minutes: number, intent: Intent = "workout", seed = 0): SessionItem[] {
  const t = Math.min(90, Math.max(5, minutes));
  const R = (role: StepRole, s = seed) => rotatedRole(pool, role, s);
  const mainPool =
    intent === "workout" ? [...R("workout"), ...R("skill")]
    : intent === "skill" ? [...R("skill"), ...R("workout")]
    : intent === "recovery" ? [...R("recovery"), ...R("mobility")]
    : [...R("mobility"), ...R("recovery")];
  const stretchPool = intent === "recovery" || intent === "mobility" ? R("recovery", seed + 1) : [...R("recovery"), ...R("mobility")];
  const used = new Set<string>();
  const warmPool = [...R("warmup"), ...R("mobility")];
  let warm = pickFirst(warmPool, t * 0.35, used);
  if (!warm && t >= 10) warm = pickFirst(warmPool, t * 0.6, used);
  if (warm) used.add(warm.stepId);
  let stretch: PoolItem | undefined;
  if (t >= 20) {
    stretch = pickFirst(stretchPool, t * 0.25, used);
    if (stretch) used.add(stretch.stepId);
  }
  let left = t - (warm?.minutes ?? 0) - (stretch?.minutes ?? 0);
  const main: PoolItem[] = [];
  while (left >= 3 && main.length < 6) {
    const c = pickFirst(mainPool, left + 2, used);
    if (!c) break;
    main.push(c);
    used.add(c.stepId);
    left -= c.minutes;
  }
  if (!main.length) {
    const all = [...mainPool, ...R("recovery"), ...R("mobility"), ...R("skill"), ...R("warmup")];
    const c = pickFirst(all, Math.max(left, 0) + 3, used);
    if (c) main.push(c);
  }
  return [
    ...(warm ? [{ ...warm, slot: "warmup" as const }] : []),
    ...main.map((m) => ({ ...m, slot: "main" as const })),
    ...(stretch ? [{ ...stretch, slot: "stretch" as const }] : []),
  ];
}

export const totalMinutes = (items: readonly { minutes: number }[]) => items.reduce((n, i) => n + i.minutes, 0);

export function quickSessionTitle(intent: Intent, minutes: number) {
  return `${minutes}-minute ${intent === "skill" ? "skill session" : intent}`;
}

/* ------------------------------------------------------------------ sessions, streaks, heatmap */

/** Minutes a session counts for: logged, else elapsed (capped at 3 hours). */
export function sessionMinutes(s: { minutes?: number | null; startedAt: string; lastActivityAt?: string | null }): number {
  if (s.minutes != null) return s.minutes;
  if (!s.lastActivityAt) return 0;
  const ms = Date.parse(s.lastActivityAt) - Date.parse(s.startedAt);
  return ms <= 0 ? 0 : Math.min(180, Math.max(1, Math.ceil(ms / 60000)));
}

/** Current (ending today or yesterday) and best run of consecutive active days. */
export function streaks(days: readonly IsoDate[], today: IsoDate): { current: number; best: number } {
  const sorted = [...new Set(days)].filter((d) => d <= today).sort();
  let best = 0;
  let run = 0;
  let prev: IsoDate | null = null;
  for (const d of sorted) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const current = prev && daysBetween(prev, today) <= 1 ? run : 0;
  return { current, best };
}

export interface HeatEntry {
  date: IsoDate;
  minutes: number;
  sessions: number;
  steps: number;
}

/** 0 = rest, 1 = steps only or < 10 min, 2 = < 25, 3 = < 45, 4 = 45+. */
export function heatLevel(e: Pick<HeatEntry, "minutes" | "sessions" | "steps"> | null | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!e || (e.minutes <= 0 && e.sessions <= 0 && e.steps <= 0)) return 0;
  if (e.minutes < 10) return 1;
  if (e.minutes < 25) return 2;
  if (e.minutes < 45) return 3;
  return 4;
}

export interface HeatCell extends HeatEntry {
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
  today: boolean;
}

/**
 * Calendar heatmap: `weeks` columns of Monday→Sunday ending with the current week.
 * Sparse entries in, every day out (rest days level 0, future days flagged).
 */
export function heatmapGrid(entries: readonly HeatEntry[], today: IsoDate, weeks = 26): { columns: HeatCell[][]; months: { col: number; label: string }[] } {
  const by = new Map(entries.map((e) => [e.date, e]));
  const isoDow = (weekday(today) + 6) % 7; // Monday = 0
  const start = addDays(today, -isoDow - (weeks - 1) * 7);
  const columns: HeatCell[][] = [];
  const months: { col: number; label: string }[] = [];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const e = by.get(date);
      const base = e ?? { date, minutes: 0, sessions: 0, steps: 0 };
      col.push({ ...base, date, level: heatLevel(base), future: date > today, today: date === today });
      if (d === 0 && (w === 0 || date.slice(8, 10) <= "07")) {
        const label = MONTHS[Number(date.slice(5, 7)) - 1]!;
        if (!months.length || months[months.length - 1]!.label !== label) months.push({ col: w, label });
      }
    }
    columns.push(col);
  }
  return { columns, months };
}

/* ------------------------------------------------------------------ plan builder (legacy "creator") */

export type PlanFocus = "balanced" | "strength" | "skill" | "mobility";

export interface PlanLesson {
  id: Uuid;
  title: string;
  intent: LessonIntent;
  done: boolean;
  sectionTitle?: string | null;
  minutes?: number | null;
}

export interface PlanProgram {
  id: Uuid;
  slug: string;
  name: string;
  /** Day programs rotate day types; courses run in order. */
  rotate: boolean;
  lessons: readonly PlanLesson[];
}

export interface PlanItem {
  date: IsoDate;
  week: number;
  lessonId: Uuid;
  title: string;
  programSlug: string;
  programName: string;
  sectionTitle: string | null;
  intent: LessonIntent;
  kind: "training" | "recovery";
  minutes: number;
  note: string;
}

export const DEFAULT_WEEKDAYS: Record<number, number[]> = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };

const FOCUS_ORDER: Record<PlanFocus, Intent[]> = {
  balanced: ["workout", "recovery", "skill"],
  strength: ["workout", "skill", "workout", "recovery"],
  skill: ["skill", "workout", "recovery"],
  mobility: ["mobility", "workout", "recovery"],
};

/**
 * Build a multi-week plan from real lessons the member can open: training days on the chosen
 * weekdays (starting the day after `startDate`), programs interleaved, day types rotated by focus,
 * lessons not done yet first, then the least recent repeats. Pure; the server re-checks access.
 */
export function buildTrainingPlan(input: {
  programs: readonly PlanProgram[];
  weeks: number;
  weekdays: readonly number[];
  startDate: IsoDate;
  minutes: number;
  focus?: PlanFocus;
}): { items: PlanItem[]; overview: string } {
  const progs = input.programs.filter((p) => p.lessons.some((l) => l.intent !== "overview"));
  const dates = planScheduleDays(input.startDate, input.weekdays, Math.min(12, Math.max(1, input.weeks)));
  const focus = input.focus ?? "balanced";
  const queues = progs.map((p) => {
    const ls = p.lessons.filter((l) => l.intent !== "overview");
    return [...ls.filter((l) => !l.done), ...ls.filter((l) => l.done)];
  });
  const used = progs.map(() => new Set<string>());
  const items: PlanItem[] = [];
  const order = FOCUS_ORDER[focus];
  dates.forEach((date, i) => {
    if (!progs.length) return;
    const pi = i % progs.length;
    const p = progs[pi]!;
    const q = queues[pi]!;
    const want = order[Math.floor(i / progs.length) % order.length]!;
    const available = q.filter((l) => !used[pi]!.has(l.id));
    if (!available.length) used[pi]!.clear();
    const pool = available.length ? available : q;
    const l = (p.rotate ? pool.find((x) => matchesIntent(want, x.intent)) : undefined) ?? pool[0]!;
    used[pi]!.add(l.id);
    const week = Math.floor(daysBetween(addDays(input.startDate, 1), date) / 7) + 1;
    const recovery = l.intent === "recovery" || l.intent === "mobility";
    items.push({
      date,
      week,
      lessonId: l.id,
      title: l.title,
      programSlug: p.slug,
      programName: p.name,
      sectionTitle: l.sectionTitle ?? null,
      intent: l.intent,
      kind: recovery ? "recovery" : "training",
      minutes: Math.min(input.minutes, l.minutes ?? input.minutes),
      note: rationale(l, i, p.rotate, l.done),
    });
  });
  const weeks = Math.max(1, Math.min(12, input.weeks));
  const names = progs.map((p) => p.name).join(" and ");
  const overview = items.length
    ? `${weeks} week${weeks === 1 ? "" : "s"}, ${input.weekdays.length} session${input.weekdays.length === 1 ? "" : "s"} a week from ${names}. ${
        focus === "balanced" ? "Workout, recovery and skill days rotate so you never stack hard days." : `Weighted toward ${focus}, with recovery kept in the week.`
      }`
    : "Pick at least one program with lessons to build a plan.";
  return { items, overview };
}

function rationale(l: PlanLesson, i: number, rotate: boolean, done: boolean) {
  if (done) return "A repeat: you've done this one before, now own it.";
  if (!rotate) return i === 0 ? `Start with ${l.sectionTitle ?? "the first section"}.` : "Next in order, so each lesson builds on the last.";
  if (l.intent === "recovery" || l.intent === "mobility") return "Recovery after load keeps you fresh for the next workout.";
  if (l.intent === "skill") return "Skill work between workouts sharpens technique without fatigue.";
  return "The week's load: follow the table your readiness sets.";
}
