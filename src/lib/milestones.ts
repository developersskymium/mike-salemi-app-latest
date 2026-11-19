import {
  dayLabel,
  courses,
  dayOrder,
  type Course,
  type DayLocation,
  type Phase,
} from "@/content/program";
import type { summarise } from "@/hooks/use-progress";

export type Summary = ReturnType<typeof summarise>;

export type Milestone =
  | { kind: "phase-complete"; phase: Phase; course: Course; next?: DayLocation }
  | { kind: "level-complete"; course: Course; nextCourse?: Course; next?: DayLocation }
  | { kind: "program-complete"; course: Course }
  | null;

/**
 * What the athlete just finished, based purely on progress. Used to keep the
 * "continue" language honest everywhere: a finished phase or level should never
 * be described as "up next".
 */
export function currentMilestone(s: Summary): Milestone {
  const current = s.currentDay;
  if (!current) return null;

  // Everything done — the last day of the last level is still "current".
  if (s.allComplete) {
    const course = dayOrder[dayOrder.length - 1].course;
    return { kind: "program-complete", course };
  }

  const previous = dayOrder[current.index - 1];
  if (!previous || !s.dayCompletion(previous.day.id).complete) return null;

  if (previous.course.id !== current.course.id && s.courseCompletion(previous.course.id).complete) {
    return {
      kind: "level-complete",
      course: previous.course,
      nextCourse: current.course,
      next: current,
    };
  }

  // Finishing a phase is intentionally silent — no celebration surface for it.

  return null;
}

/** One-line headline + supporting copy for continue surfaces. */
export function milestoneCopy(milestone: Milestone) {
  if (!milestone) return null;
  if (milestone.kind === "phase-complete") {
    return {
      eyebrow: "Phase complete",
      title: `${milestone.phase.label} is done`,
      body: milestone.next
        ? `Every day of ${milestone.phase.label} is finished. ${milestone.next.phase.label} opens with ${dayLabel(milestone.next.day)}.`
        : "Every day of this phase is finished.",
      cta: milestone.next ? `Start ${milestone.next.phase.label}` : "Keep going",
    };
  }
  if (milestone.kind === "level-complete") {
    return {
      eyebrow: "Level complete",
      title: `${milestone.course.title} is complete`,
      body: "Claim your certificate, then either move up a level or restart this one from day one.",
      cta: "Get your certificate",
    };
  }
  return {
    eyebrow: "Program complete",
    title: "You finished Kettlebell Lifestyle",
    body: "Every level, every phase, every day. Claim your certificate, or restart a level to run it again.",
    cta: "Get your certificate",
  };
}

/** The level a restart button should target for a given day/level context. */
export function levelById(courseId: string) {
  return courses.find((c) => c.id === courseId);
}
