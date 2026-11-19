/**
 * Shared achievement rules.
 *
 * Both the profile page and the live in-app awarder use these so a badge can
 * never appear in one place and not the other.
 */

import { courses } from "@/content/program";
import type { ProgressRow } from "@/hooks/use-progress";
import { XP_PER_DAY, XP_PER_LESSON, XP_PER_PHASE } from "@/content/badges";

type Summary = {
  completedCount: number;
  completedDays: number;
  dayCompletion: (dayId: string) => { done: number; total: number; complete: boolean };
};

/** Longest run of consecutive calendar days with at least one completion. */
export function computeStreakFromRows(rows: ProgressRow[] | undefined) {
  const days = Array.from(
    new Set((rows ?? []).map((r) => new Date(r.completed_at).toISOString().slice(0, 10))),
  ).sort();
  if (!days.length) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    const prev = new Date(days[i - 1]).getTime();
    const cur = new Date(days[i]).getTime();
    run = cur - prev === 86_400_000 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export function completedPhases(summary: Summary) {
  const out: { courseId: string; phaseId: string; label: string }[] = [];
  for (const course of courses) {
    for (const phase of course.phases) {
      if (phase.days.length && phase.days.every((d) => summary.dayCompletion(d.id).complete)) {
        out.push({ courseId: course.id, phaseId: phase.id, label: phase.label });
      }
    }
  }
  return out;
}

export function completedCourses(summary: Summary) {
  return courses.filter(
    (course) =>
      course.phases.length &&
      course.phases.every(
        (phase) =>
          phase.days.length && phase.days.every((d) => summary.dayCompletion(d.id).complete),
      ),
  );
}

export function deservedBadgeIds({
  summary,
  streak,
  toolIdCount,
  toolTotal,
}: {
  summary: Summary;
  streak: number;
  toolIdCount: number;
  toolTotal: number;
}) {
  const out: string[] = [];
  if (summary.completedDays >= 1) out.push("first-day");
  if (summary.completedDays >= 7) out.push("day-7");
  if (summary.completedDays >= 30) out.push("day-30");
  if (streak >= 3) out.push("streak-3");
  if (streak >= 7) out.push("streak-7");
  if (streak >= 30) out.push("streak-30");
  if (toolIdCount >= 1) out.push("tool-first");
  if (toolTotal > 0 && toolIdCount >= toolTotal) out.push("tool-all");

  for (const phase of completedPhases(summary)) {
    const label = phase.label.toLowerCase();
    if (label.includes("on ramp")) out.push("on-ramp");
    else if (/\b(?:iii|3)\b/i.test(phase.label)) out.push("phase-3");
    else if (/\b(?:ii|2)\b/i.test(phase.label)) out.push("phase-2");
    else if (/\b(?:i|1)\b/i.test(phase.label)) out.push("phase-1");
  }

  for (const course of completedCourses(summary)) {
    out.push(course.id === courses[0]?.id ? "level-1" : "level-2");
  }

  return Array.from(new Set(out));
}

/** XP is derived, never stored, so it can never drift from real progress. */
export function computeXp(summary: Summary) {
  const phases = completedPhases(summary).length;
  return (
    summary.completedCount * XP_PER_LESSON +
    summary.completedDays * XP_PER_DAY +
    phases * XP_PER_PHASE
  );
}
