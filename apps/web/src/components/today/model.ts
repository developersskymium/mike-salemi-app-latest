import type { WeekEntry } from "@ms/api";
import { daysBetween, type IsoDate } from "@ms/core";
import type { DayType } from "@/components/graphics";
import type { IconName } from "@/components/ui";
import type { PhotoKey } from "./photos";

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

export function lessonHref(programSlug: string | null | undefined, lessonId: string | null | undefined) {
  if (!programSlug) return "/programs";
  return lessonId ? `/programs/${programSlug}/learn/${lessonId}` : `/programs/${programSlug}`;
}

export function entryHref(e: WeekEntry) {
  if (e.kind === "coaching") return "/coaching";
  if (e.kind === "run_session") return e.program_slug ? `/programs/${e.program_slug}` : "/programs";
  return lessonHref(e.program_slug, e.lesson_id);
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
