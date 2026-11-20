/**
 * Self-Guided planning wizard: turns a level's real day order (Day 1…61 with its day types)
 * into dated sessions on the member's chosen weekdays. Pure, platform-neutral.
 */

export type WizardIntent = "workout" | "recovery" | "skill" | "mobility" | "overview";
export type WizardFocus = "program" | "balanced" | "strength" | "recovery";

export interface WizardDay {
  id: string;
  dayNumber: number;
  title: string;
  dayType: string | null;
  intent: WizardIntent;
  minutes: number | null;
  done: boolean;
}

export interface WizardItem {
  date: string;
  week: number;
  day: WizardDay;
  kind: "training" | "recovery";
  note: string;
}

export const FOCUS_COPY: Record<WizardFocus, { title: string; line: string }> = {
  program: { title: "Follow Mike's order", line: "Every day in sequence, exactly as the program is written." },
  balanced: { title: "Balanced", line: "Mike's order, but never two hard workouts back to back." },
  strength: { title: "Strength first", line: "Workout and skill days lead; recovery lands after hard days." },
  recovery: { title: "Easy does it", line: "More space between workouts. Good when life is busy or you're sore." },
};

/** Default weekdays (0 = Sunday) for N sessions a week. */
export function defaultWeekdays(n: number): number[] {
  const sets: Record<number, number[]> = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };
  return sets[Math.max(1, Math.min(7, n))]!;
}

export function intentOf(dayType: string | null | undefined): WizardIntent {
  const t = dayType ?? "";
  if (/overview|preparation/i.test(t)) return "overview";
  if (/recovery/i.test(t)) return "recovery";
  if (/skill/i.test(t)) return "skill";
  if (/mobility|stretch/i.test(t)) return "mobility";
  return "workout";
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const weekdayOf = (s: string) => new Date(`${s}T12:00:00Z`).getUTCDay();
const gap = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
const hard = (i: WizardIntent) => i === "workout";
const easy = (i: WizardIntent) => i === "recovery" || i === "mobility";

/**
 * Lay the days out. `days` is the level in order from the chosen start day. Stops when every day
 * is placed, at `maxItems` (the save limit), or after `maxWeeks`.
 */
export function buildWizardPlan(input: { days: WizardDay[]; weekdays: number[]; start: string; focus: WizardFocus; maxItems?: number; maxWeeks?: number }): { items: WizardItem[]; skipped: number; endsOn: string | null } {
  const queue = input.days.filter((d) => d.intent !== "overview");
  const wd = new Set(input.weekdays);
  const maxItems = input.maxItems ?? 120;
  const maxWeeks = input.maxWeeks ?? 26;
  const items: WizardItem[] = [];
  let skipped = 0;
  if (!wd.size || !queue.length) return { items, skipped, endsOn: null };
  let date = input.start;
  const last = addDays(input.start, maxWeeks * 7);
  while (queue.length && items.length < maxItems && date <= last) {
    if (wd.has(weekdayOf(date))) {
      const prev = items[items.length - 1];
      const since = prev ? gap(prev.date, date) : 99;
      const prevHard = prev ? hard(prev.day.intent) : false;
      let idx = 0;
      let note = "Next in Mike's order.";
      const findEasy = (within: number) => queue.findIndex((d, i) => i < within && easy(d.intent));
      if (input.focus === "balanced" && prevHard && since <= 1 && hard(queue[0]!.intent)) {
        const e = findEasy(4);
        if (e > 0) {
          idx = e;
          note = "Pulled forward so you don't stack two workouts.";
        }
      } else if (input.focus === "recovery" && prevHard && since <= 2 && hard(queue[0]!.intent)) {
        const e = findEasy(5);
        if (e > 0) {
          idx = e;
          note = "Recovery first — your last workout was recent.";
        }
      } else if (input.focus === "strength") {
        if (prevHard && since <= 1) {
          const e = findEasy(4);
          if (e >= 0) {
            idx = e;
            note = "Recovery right after a hard day.";
          }
        } else {
          // Drop recovery days that don't follow a workout: strength days lead.
          while (queue.length > 1 && easy(queue[0]!.intent)) {
            queue.shift();
            skipped++;
          }
          note = "Workout days lead in Strength first.";
        }
      }
      const [day] = queue.splice(idx, 1);
      if (day) {
        if (input.focus === "program") note = day.done ? "A repeat: you've done this one, now own it." : "Next in Mike's order.";
        items.push({ date, week: Math.floor(gap(input.start, date) / 7) + 1, day, kind: easy(day.intent) ? "recovery" : "training", note });
      }
    }
    date = addDays(date, 1);
  }
  return { items, skipped, endsOn: items.length ? items[items.length - 1]!.date : null };
}
