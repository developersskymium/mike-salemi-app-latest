/**
 * KBL levels in Self-Guided. Level I and Level II both run Day 1, Day 2 …, so every day the member sees
 * carries its level. The level comes from the lesson key (`l1-…`, `l2-…`) or the path name ("Level II · …").
 */
export type LevelN = 1 | 2 | 3;

const ROMAN = ["", "I", "II", "III"] as const;

export function levelOf(key?: string | null, pathName?: string | null): LevelN | null {
  const k = key?.match(/^l([1-3])-/i);
  if (k) return Number(k[1]) as LevelN;
  const n = pathName?.match(/level\s+(iii|ii|i|[1-3])\b/i)?.[1]?.toLowerCase();
  if (!n) return null;
  return (({ i: 1, ii: 2, iii: 3, "1": 1, "2": 2, "3": 3 }) as Record<string, LevelN>)[n] ?? null;
}

export const levelShort = (n: LevelN) => `L${n}`;
export const levelLong = (n: LevelN) => `Level ${ROMAN[n]}`;

/** "Level II · Day 12 · Workout III" — the rest is the lesson title with its "Day 12 -" prefix dropped. */
export function levelDayTitle(n: LevelN | null, dayNumber: number | null | undefined, title: string, word = "Day") {
  const rest = title.replace(/^Day\s*\d+\s*[-–·:]?\s*/i, "").trim();
  return [n ? levelLong(n) : null, dayNumber != null ? `${word} ${dayNumber}` : null, rest || (dayNumber == null ? title : null)].filter(Boolean).join(" · ");
}
