import type { WeekEntry } from "@ms/api";
import { daysBetween, type IsoDate } from "@ms/core";
import type { DayType } from "@/components/graphics";
import type { IconName } from "@/components/ui";
import type { PhotoKey } from "./photos";
import { lessonHrefOf } from "@/lib/hrefs";

/** Day type from a lesson's day_type or title ("Day 24 - Recovery Day"). */
export function dayTypeOf(dayType?: string | null, title?: string | null, itemKind?: string | null): DayType | null {
  const t = `${dayType ?? ""} ${title ?? ""}`.toLowerCase();
  if (/workout iii/.test(t)) return "workout-3";
  if (/workout ii/.test(t)) return "workout-2";
  if (/workout i/.test(t)) return "workout-1";
  if (/recovery/.test(t)) return "recovery";
  if (/skill/.test(t)) return "skill";
  if (/challenge/.test(t)) return "challenge";
  if (/on.?ramp/.test(t)) return "on-ramp";
  if (/overview|what's next/.test(t)) return "overview";
  if (itemKind === "recovery") return "recovery";
  return null;
}

/** "Day 24 - Recovery Day" → { day: 24, name: "Recovery Day" } */
export function splitDayTitle(title: string): { day: number | null; name: string } {
  const m = /^day\s+(\d+)\s*[-–—:]\s*(.+)$/i.exec(title.trim());
  return m ? { day: Number(m[1]), name: m[2]!.trim() } : { day: null, name: title.replace(/\s{2,}/g, " ").trim() };
}

/** Day number from a lesson title: "Day 24 - Recovery Day" or a bare "Day 3". */
export function dayNumberOf(title: string | null | undefined): number | null {
  const m = /^day\s+(\d+)\b/i.exec((title ?? "").trim());
  return m ? Number(m[1]) : null;
}

/** Phase or section name for a one-line read: "On Ramp Phase" → "On Ramp", "Phase 2" stays. */
export function phaseLabel(section: string | null | undefined): string | null {
  const s = (section ?? "").replace(/\s+phase$/i, "").trim();
  return s && !/^home$/i.test(s) ? s : null;
}

/** Plain day type from a lesson's day_type: "Recovery Day" → "Recovery day", "On Ramp" → "Movement prep day". */
export function dayKindLabel(dayType: string | null | undefined): string | null {
  const t = (dayType ?? "").trim();
  if (!t || /^general$/i.test(t)) return null;
  if (/^on.?ramp$/i.test(t)) return "Movement prep day";
  if (/^overview$/i.test(t)) return "Phase overview";
  if (/^preparation/i.test(t)) return "Prep day";
  if (/^skill/i.test(t)) return "Skill day";
  const m = /^workout\s+(i{1,3})\b/i.exec(t);
  if (m) return `Workout ${m[1]!.toUpperCase()} day`;
  const base = t.replace(/\s+day$/i, "");
  return `${base.charAt(0).toUpperCase()}${base.slice(1).toLowerCase()} day`;
}

export function photoFor(dayType: DayType | null, programSlug?: string | null): PhotoKey {
  switch (dayType) {
    case "recovery":
      return "breathwork";
    case "skill":
      return "getup";
    case "workout-1":
      return "coaching";
    case "workout-2":
      return "press";
    case "workout-3":
      return "squat";
    case "challenge":
      return "redgym";
    default:
      if (programSlug === "mastering-the-kettlebell") return "deadlift";
      if (programSlug === "athleticism-4-life") return "wideStance";
      if (programSlug?.startsWith("men-of-movement")) return "shastaRidge";
      return "coaching";
  }
}

export const GOAL_PHOTO: Record<string, PhotoKey> = {
  strength: "deadlift",
  technique: "getup",
  mobility: "wideStance",
  conditioning: "squat",
  mindset: "breathwork",
  retreat_prep: "shastaRidge",
  custom: "coaching",
};

export const GOAL_ICON: Record<string, IconName> = {
  strength: "kettlebell",
  technique: "repeat",
  mobility: "leaf",
  conditioning: "flame",
  mindset: "wind",
  retreat_prep: "mountain",
  custom: "sparkle",
};

/** A lesson's final URL (course player for courses, day player for day programs; no redirect hop). */
export function lessonHref(programSlug: string | null | undefined, lessonId: string | null | undefined, opts?: { type?: string | null; mode?: string | null }) {
  if (!programSlug) return "/programs";
  return lessonHrefOf(programSlug, lessonId, opts);
}

/** A schedule entry's final URL. `typeOf` maps a program slug to its type (course lessons open the course player). */
export function entryHref(e: WeekEntry, typeOf?: (slug: string) => string | null | undefined) {
  if (e.kind === "coaching") return "/coaching";
  if (e.kind === "run_session") return e.program_slug ? `/programs/${e.program_slug}` : "/programs";
  return lessonHref(e.program_slug, e.lesson_id, { type: e.program_slug ? typeOf?.(e.program_slug) : null });
}

/** Plan items before today that were neither done nor skipped (rest days don't count). */
export function missedEntries(entries: WeekEntry[], today: IsoDate) {
  return entries.filter((e) => e.kind === "plan" && e.on_date < today && !e.done && !e.skipped && e.item_kind !== "rest");
}

export function missedByPlan(entries: WeekEntry[], today: IsoDate) {
  const m = new Map<string, { planId: string; planName: string; count: number; oldest: IsoDate }>();
  for (const e of missedEntries(entries, today)) {
    if (!e.plan_id) continue;
    const c = m.get(e.plan_id) ?? { planId: e.plan_id, planName: e.subtitle ?? "Your plan", count: 0, oldest: e.on_date };
    c.count++;
    if (e.on_date < c.oldest) c.oldest = e.on_date;
    m.set(e.plan_id, c);
  }
  return [...m.values()];
}

/** "Today", "Tomorrow", "In 3 days", "Yesterday" */
export function relDay(d: IsoDate, today: IsoDate) {
  const n = daysBetween(today, d);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

export function greeting(hour: number) {
  return hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
