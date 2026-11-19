/**
 * Editorial overrides applied on top of the untouched source export.
 *
 * The source data in immersion-source.json keeps the original titles. Each
 * override here is explicit, documented and keyed by the stable day id so it
 * can be reviewed or removed without re-importing.
 */

export type DayTitleOverride = {
  dayId: string;
  sourceTitle: string;
  title: string;
  reason: string;
};

const NUMBERING_REASON =
  "Source export repeats 'Day 57' and ends at 'Day 60' for the 61st day; renumbered to match the sequential day order.";

export const DAY_TITLE_OVERRIDES: DayTitleOverride[] = [
  { dayId: "l1-phase-3-d58", sourceTitle: "Day 57 - Recovery Day", title: "Day 58 - Recovery Day", reason: NUMBERING_REASON },
  { dayId: "l1-phase-3-d59", sourceTitle: "Day 58 - Workout I Day", title: "Day 59 - Workout I Day", reason: NUMBERING_REASON },
  { dayId: "l1-phase-3-d60", sourceTitle: "Day 59 - Recovery Day", title: "Day 60 - Recovery Day", reason: NUMBERING_REASON },
  { dayId: "l1-phase-3-d61", sourceTitle: "Day 60 - Challenge Day", title: "Day 61 - Challenge Day", reason: NUMBERING_REASON },
];

const byId = new Map(DAY_TITLE_OVERRIDES.map((o) => [o.dayId, o]));

/** Returns the student-facing title, applying an override only when the source title matches. */
export function overrideDayTitle(dayId: string, sourceTitle: string): string {
  const o = byId.get(dayId);
  if (!o) return sourceTitle;
  const norm = (s: string) => s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  return norm(o.sourceTitle) === norm(sourceTitle) ? o.title : sourceTitle;
}
