import type { DayType } from "@/components/graphics";
import type { LearningMode } from "@ms/core";
import type { LessonLite, ProgressRow, SectionLite } from "@/lib/loaders/training";

/** Map authored day types ("Workout II Day", "Recovery Day") onto the glyph set. */
export function dayGlyph(dayType: string | null | undefined, pageType?: string | null): DayType {
  const t = (dayType ?? "").toLowerCase();
  if (pageType === "overview" || pageType === "transition" || t.includes("overview") || t.includes("preparation")) return "overview";
  if (t.includes("workout iii")) return "workout-3";
  if (t.includes("workout ii")) return "workout-2";
  if (t.includes("workout")) return "workout-1";
  if (t.includes("recovery")) return "recovery";
  if (t.includes("skill")) return "skill";
  if (t.includes("challenge")) return "challenge";
  if (t.includes("on ramp")) return "on-ramp";
  return "overview";
}

/** "Recovery" from "Day 24 - Recovery Day"; the day type without the trailing "Day". */
export function dayTypeShort(dayType: string | null | undefined) {
  return (dayType ?? "").replace(/\s+day$/i, "").trim();
}

/** Title without the "Day N - " prefix. */
export function lessonName(l: { title: string; dayNumber: number | null; dayType?: string | null }) {
  const stripped = l.title.replace(/^day\s*\d+\s*[-–—:]\s*/i, "").trim();
  if (!stripped || /^day\s*\d+$/i.test(stripped)) return dayTypeShort(l.dayType) || l.title;
  return stripped.replace(/\s+day$/i, "");
}

export function lessonLabel(l: { title: string; dayNumber: number | null; pageType: string | null }, word = "Day") {
  if (l.pageType || l.dayNumber == null) return l.title;
  return `${word} ${l.dayNumber}`;
}

export function lessonHref(slug: string, key: string | null, id: string, mode: LearningMode | "immersion" | "self_guided" = "immersion") {
  return `/programs/${slug}/${mode === "self_guided" ? "guide" : "learn"}/${encodeURIComponent(key ?? id)}`;
}

export interface MapSection extends SectionLite {
  lessons: (LessonLite & { progress: ProgressRow | undefined })[];
  done: number;
  total: number;
  days: number;
  firstDay: number | null;
  lastDay: number | null;
}

/** Sections with their lessons and the server's progress rows. */
export function buildMap(sections: SectionLite[], lessons: LessonLite[], progress: ProgressRow[]): MapSection[] {
  const byId = new Map(progress.map((p) => [p.lessonId, p]));
  return sections.map((s) => {
    const ls = lessons.filter((l) => l.sectionId === s.id).map((l) => ({ ...l, progress: byId.get(l.id) }));
    const days = ls.filter((l) => l.dayNumber != null);
    return {
      ...s,
      lessons: ls,
      done: ls.filter((l) => l.progress?.complete).length,
      total: ls.length,
      days: days.length,
      firstDay: days[0]?.dayNumber ?? null,
      lastDay: days[days.length - 1]?.dayNumber ?? null,
    };
  });
}

/** The first lesson not yet complete (server order), or null when the path is done. */
export function currentFrom(lessons: LessonLite[], progress: ProgressRow[]) {
  const done = new Set(progress.filter((p) => p.complete).map((p) => p.lessonId));
  const ordered = progress.length ? [...progress].sort((a, b) => a.ord - b.ord).map((p) => lessons.find((l) => l.id === p.lessonId)).filter(Boolean) as LessonLite[] : lessons;
  return ordered.find((l) => !done.has(l.id)) ?? null;
}

/** Seconds → "1:48". */
export function clock(s: number) {
  const t = Math.max(0, Math.round(s));
  const m = Math.floor(t / 60);
  return `${m}:${String(t % 60).padStart(2, "0")}`;
}

/** Sum of "8 min" style duration labels. */
export function minutesOf(labels: (string | null | undefined)[]) {
  return labels.reduce((n, l) => n + (parseInt(String(l ?? ""), 10) || 0), 0);
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Library thumbnails carry baked-in titles: video posters show Mike's text-free photography instead. */
export function summitPoster(src: string | null, step: { title: string; special?: string | null }): string | null {
  if (src && !/\/media\/(library|l5e)\//.test(src)) return src;
  const t = `${step.title} ${step.special ?? ""}`.toLowerCase();
  if (step.special === "workout" || /workout|kettlebell prep/.test(t)) return "/media/summit/mike-coaching.jpg";
  if (/stretch|mobility|recovery|working in/.test(t)) return "/media/summit/mike-windmill.jpg";
  if (/readiness/.test(t)) return "/media/summit/working-in.jpg";
  if (/warm/.test(t)) return "/media/summit/mike-squat.jpg";
  return "/media/summit/mike-standing.jpg";
}
