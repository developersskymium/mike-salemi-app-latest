/**
 * Training calendars: Immersion "Scheduled pace" and Self-Guided plans.
 * Ports legacy src/routes/_authenticated/schedule.index.tsx (autofill + catch-up
 * rules) and src/lib/schedule-sync.ts. Dates are `YYYY-MM-DD` strings; all
 * arithmetic is done on UTC calendar days, so DST changes never shift a date.
 */
import type { Uuid } from "./types";

export type IsoDate = string;
export type MissedDayRule = "shift" | "skip" | "weekend";
export type ScheduleStatus = "planned" | "done" | "skipped";

export interface ScheduleEntry {
  lessonId: Uuid;
  date: IsoDate;
  status?: ScheduleStatus;
}

const DAY_MS = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toDay(date: IsoDate): number {
  const m = ISO_RE.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
}
function fromDay(day: number): IsoDate {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Add whole calendar days to a `YYYY-MM-DD` date. */
export function addDays(date: IsoDate, n: number): IsoDate {
  return fromDay(toDay(date) + n);
}
/** Whole calendar days from `a` to `b`. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return toDay(b) - toDay(a);
}
/** 0 = Sunday … 6 = Saturday (JS `getDay`). */
export function weekday(date: IsoDate): number {
  return new Date(toDay(date) * DAY_MS).getUTCDay();
}
/** A local calendar date (device time zone) as `YYYY-MM-DD`. */
export function isoDate(d: Date): IsoDate {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Accepts JS weekdays (0=Sun…6=Sat) or ISO weekdays (1=Mon…7=Sun); 7 is read as Sunday. */
const normaliseWeekdays = (days: readonly number[]) => new Set(days.map((d) => ((d % 7) + 7) % 7));

/**
 * Place lessons, in order, on the chosen training weekdays from `startDate`
 * (inclusive), one per training day — the legacy autofill. Lessons already
 * done are left off the calendar.
 */
export function placeLessons(input: {
  lessons: readonly { id: Uuid }[];
  startDate: IsoDate;
  trainingDays: readonly number[];
  done?: ReadonlySet<Uuid>;
}): ScheduleEntry[] {
  const days = normaliseWeekdays(input.trainingDays);
  if (!days.size) throw new Error("Choose at least one training day");
  const out: ScheduleEntry[] = [];
  let cursor = input.startDate;
  for (const lesson of input.lessons) {
    if (input.done?.has(lesson.id)) continue;
    while (!days.has(weekday(cursor))) cursor = addDays(cursor, 1);
    out.push({ lessonId: lesson.id, date: cursor, status: "planned" });
    cursor = addDays(cursor, 1);
  }
  return out;
}

/**
 * Training dates on the chosen weekdays for `weeks` weeks, starting the day
 * after `start` (legacy `planScheduleDays`, used for Self-Guided plans).
 */
export function planScheduleDays(start: IsoDate, trainingDays: readonly number[], weeks: number): IsoDate[] {
  const days = normaliseWeekdays(trainingDays);
  const out: IsoDate[] = [];
  const first = addDays(start, 1);
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(first, i);
    if (days.has(weekday(date))) out.push(date);
  }
  return out;
}

/** Entries before today that are neither done nor skipped. */
export function missedEntries(entries: readonly ScheduleEntry[], today: IsoDate): ScheduleEntry[] {
  return entries.filter((e) => e.date < today && e.status !== "done" && e.status !== "skipped");
}

/**
 * Catch-up for missed days (legacy schedule page):
 * - `shift`: move every entry from the earliest missed day onwards forward so
 *   the earliest missed day lands on today.
 * - `skip`: take the missed days off the calendar; the rest of the plan stands.
 * - `weekend`: queue missed days, in order, onto the next free Saturday/Sunday
 *   slots after today (a slot is free when no entry from today onwards uses it).
 * Returns a new list sorted by date; entries that were not missed keep their place.
 */
export function applyMissedDayRule(entries: readonly ScheduleEntry[], today: IsoDate, rule: MissedDayRule): ScheduleEntry[] {
  const missed = missedEntries(entries, today);
  const sort = (list: ScheduleEntry[]) => list.sort((a, b) => a.date.localeCompare(b.date));
  if (!missed.length) return sort(entries.map((e) => ({ ...e })));

  if (rule === "skip") {
    const gone = new Set(missed);
    return sort(entries.filter((e) => !gone.has(e)).map((e) => ({ ...e })));
  }

  if (rule === "weekend") {
    const taken = new Set(entries.filter((e) => e.date >= today).map((e) => e.date));
    const moved = new Map<ScheduleEntry, IsoDate>();
    let cursor = today;
    for (const m of [...missed].sort((a, b) => a.date.localeCompare(b.date))) {
      do cursor = addDays(cursor, 1);
      while (!((weekday(cursor) === 6 || weekday(cursor) === 0) && !taken.has(cursor)));
      taken.add(cursor);
      moved.set(m, cursor);
    }
    return sort(entries.map((e) => ({ ...e, date: moved.get(e) ?? e.date })));
  }

  const earliest = missed.reduce((min, m) => (m.date < min ? m.date : min), missed[0]!.date);
  const offset = daysBetween(earliest, today);
  if (offset <= 0) return sort(entries.map((e) => ({ ...e })));
  return sort(entries.map((e) => ({ ...e, date: e.date >= earliest ? addDays(e.date, offset) : e.date })));
}
