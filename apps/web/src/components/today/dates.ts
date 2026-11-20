import { addDays, weekday, type IsoDate } from "@ms/core";

/** Monday of the week containing `d` (weeks run Monday to Sunday). */
export function startOfWeek(d: IsoDate): IsoDate {
  return addDays(d, -((weekday(d) + 6) % 7));
}

export function weekDates(start: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Six-week grid (Monday first) for the month containing `d`. */
export function monthGrid(d: IsoDate): IsoDate[] {
  const first = `${d.slice(0, 8)}01`;
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

const utc = (d: IsoDate) => new Date(`${d}T12:00:00Z`);

export function fmt(d: IsoDate, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(utc(d));
}

/** "Friday, 20 November" */
export const longDay = (d: IsoDate) => fmt(d, { weekday: "long", day: "numeric", month: "long" });
/** "20 Nov" */
export const shortDate = (d: IsoDate) => fmt(d, { day: "numeric", month: "short" });
/** "Fri" */
export const dayShort = (d: IsoDate) => fmt(d, { weekday: "short" });
/** "F" */
export const dayLetter = (d: IsoDate) => fmt(d, { weekday: "narrow" });
export const dayNum = (d: IsoDate) => Number(d.slice(8, 10));
export const monthName = (d: IsoDate) => fmt(d, { month: "long", year: "numeric" });

/** "16 – 22 Nov" or "30 Nov – 6 Dec" */
export function weekRange(start: IsoDate) {
  const end = addDays(start, 6);
  return start.slice(5, 7) === end.slice(5, 7) ? `${dayNum(start)} – ${shortDate(end)}` : `${shortDate(start)} – ${shortDate(end)}`;
}

export const WEEKDAYS = [
  { value: 1, short: "Mon", letter: "M" },
  { value: 2, short: "Tue", letter: "T" },
  { value: 3, short: "Wed", letter: "W" },
  { value: 4, short: "Thu", letter: "T" },
  { value: 5, short: "Fri", letter: "F" },
  { value: 6, short: "Sat", letter: "S" },
  { value: 0, short: "Sun", letter: "S" },
] as const;

/** Sensible default training weekdays for a number of sessions a week. */
export function defaultDays(n: number): number[] {
  return ({ 1: [3], 2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] } as Record<number, number[]>)[Math.max(1, Math.min(7, n))]!;
}

/** The next Monday after `d` (or `d` itself when it is a Monday). */
export function nextMonday(d: IsoDate): IsoDate {
  const w = weekday(d);
  return w === 1 ? d : addDays(d, (8 - w) % 7);
}
