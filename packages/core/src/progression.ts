/**
 * Progression rules: lesson/section/path completion, step locking and lesson
 * unlocking. Mirrors the SQL helpers in supabase/migrations/0004_functions.sql
 * (`private.lesson_done`, `private.lesson_unlocked`, `public.lesson_state`,
 * `public.complete_step`, `private.after_lesson_complete`) and ports the legacy
 * `summarise` / `dayUnlocked` (hooks/use-progress.ts), milestones and the day
 * player's step locking.
 */
import type { CompletedSteps, Curriculum, LessonProgress, LessonWithSteps, Step, Uuid } from "./types";

const required = (steps: readonly Step[]) => steps.filter((s) => s.isRequired);

/** Required steps done / total for one lesson. A lesson with no required steps is complete (SQL semantics). */
export function lessonProgress(lesson: LessonWithSteps, completed: CompletedSteps): LessonProgress {
  const req = required(lesson.steps);
  const done = req.filter((s) => completed.has(s.id)).length;
  return { lessonId: lesson.id, done, total: req.length, complete: done === req.length };
}

/** All required steps done (`private.lesson_done`). */
export function isLessonComplete(lesson: LessonWithSteps, completed: CompletedSteps): boolean {
  return lesson.steps.every((s) => !s.isRequired || completed.has(s.id));
}

/**
 * Index of the first incomplete required step: everything before it is open
 * (`public.lesson_state` → open). Equals `steps.length` when all required steps are done.
 * Steps must be in position order.
 */
export function openThrough(steps: readonly Step[], completed: CompletedSteps): number {
  const index = steps.findIndex((s) => s.isRequired && !completed.has(s.id));
  return index < 0 ? steps.length : index;
}

/**
 * A step can be opened/completed when no earlier required step is incomplete
 * (`public.complete_step` in locked order). Steps already completed stay open
 * so members can revisit them.
 */
export function isStepOpen(steps: readonly Step[], index: number, completed: CompletedSteps): boolean {
  const step = steps[index];
  if (!step) return false;
  return index <= openThrough(steps, completed) || completed.has(step.id);
}

/**
 * `private.lesson_unlocked`: when the order is not locked every lesson is open;
 * when locked, every earlier lesson of the curriculum (sections by position,
 * then lessons by position) must be complete. Unknown lessons are closed.
 */
export function isLessonUnlocked(
  curriculum: Curriculum,
  lessonId: Uuid,
  completed: CompletedSteps,
  lockedOrder: boolean,
): boolean {
  const index = curriculum.lessons.findIndex((l) => l.id === lessonId);
  if (index < 0) return false;
  if (!lockedOrder) return true;
  return curriculum.lessons.slice(0, index).every((l) => isLessonComplete(l, completed));
}

/** First incomplete lesson in curriculum order; null when everything is done. */
export function currentLesson(curriculum: Curriculum, completed: CompletedSteps): LessonWithSteps | null {
  return curriculum.lessons.find((l) => !isLessonComplete(l, completed)) ?? null;
}

/** The lesson after `lessonId` in curriculum order, if any. */
export function nextLesson(curriculum: Curriculum, lessonId: Uuid): LessonWithSteps | null {
  const index = curriculum.lessons.findIndex((l) => l.id === lessonId);
  return index < 0 ? null : (curriculum.lessons[index + 1] ?? null);
}

/** The lesson before `lessonId` in curriculum order, if any. */
export function previousLesson(curriculum: Curriculum, lessonId: Uuid): LessonWithSteps | null {
  const index = curriculum.lessons.findIndex((l) => l.id === lessonId);
  return index <= 0 ? null : (curriculum.lessons[index - 1] ?? null);
}

export interface ProgressSummary {
  /** Required steps done / total, across every page (overview and transition pages included). */
  stepsDone: number;
  stepsTotal: number;
  /** Percent of required steps done, rounded. */
  percent: number;
  /** Completed pages (lessons) of any kind / all pages. */
  pages: number;
  pagesTotal: number;
  /** Training days only: overview/transition pages excluded from the day counters. */
  days: number;
  daysTotal: number;
  daysPercent: number;
  /** Every page done (overview/transition pages are required for completion). */
  complete: boolean;
  started: boolean;
}

function summarise(lessons: readonly LessonWithSteps[], completed: CompletedSteps): ProgressSummary {
  let stepsDone = 0;
  let stepsTotal = 0;
  let pages = 0;
  let days = 0;
  let daysTotal = 0;
  for (const lesson of lessons) {
    const p = lessonProgress(lesson, completed);
    stepsDone += p.done;
    stepsTotal += p.total;
    if (p.complete) pages++;
    if (!lesson.pageType) {
      daysTotal++;
      if (p.complete) days++;
    }
  }
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  return {
    stepsDone,
    stepsTotal,
    percent: pct(stepsDone, stepsTotal),
    pages,
    pagesTotal: lessons.length,
    days,
    daysTotal,
    daysPercent: pct(days, daysTotal),
    complete: lessons.length > 0 && pages === lessons.length,
    started: lessons.some((l) => l.steps.some((s) => completed.has(s.id))),
  };
}

/** Progress of one section (phase / week / module). */
export function sectionProgress(curriculum: Curriculum, sectionId: Uuid, completed: CompletedSteps): ProgressSummary & { sectionId: Uuid } {
  return { sectionId, ...summarise(curriculum.lessons.filter((l) => l.sectionId === sectionId), completed) };
}

/** Progress of the whole path (one level / course run). */
export function pathProgress(curriculum: Curriculum, completed: CompletedSteps): ProgressSummary {
  return summarise(curriculum.lessons, completed);
}

/** Training days (not overview/transition pages) in the lesson's section that are still to do, excluding the lesson itself. */
export function trainingDaysLeftInSection(curriculum: Curriculum, lessonId: Uuid, completed: CompletedSteps): number {
  const lesson = curriculum.lessons.find((l) => l.id === lessonId);
  if (!lesson) return 0;
  return curriculum.lessons.filter(
    (l) => l.sectionId === lesson.sectionId && !l.pageType && l.id !== lessonId && !isLessonComplete(l, completed),
  ).length;
}

export interface Milestones {
  /** Lessons that became complete. */
  lessons: Uuid[];
  /** Sections that became complete. */
  sections: Uuid[];
  /** The whole path became complete (certificate). */
  path: boolean;
  /** The biggest thing just completed, for a single celebration surface. */
  highest: "path" | "section" | "lesson" | null;
}

/** What completing steps (before → after) just finished: lessons, sections, the path. */
export function milestonesFor(curriculum: Curriculum, completedBefore: CompletedSteps, completedAfter: CompletedSteps): Milestones {
  const lessons = curriculum.lessons
    .filter((l) => !isLessonComplete(l, completedBefore) && isLessonComplete(l, completedAfter))
    .map((l) => l.id);
  const sections = curriculum.sections
    .map((s) => s.id)
    .filter((id) => {
      const inSection = curriculum.lessons.filter((l) => l.sectionId === id);
      if (!inSection.length) return false;
      return (
        !inSection.every((l) => isLessonComplete(l, completedBefore)) &&
        inSection.every((l) => isLessonComplete(l, completedAfter))
      );
    });
  const path = !pathProgress(curriculum, completedBefore).complete && pathProgress(curriculum, completedAfter).complete;
  return {
    lessons,
    sections,
    path,
    highest: path ? "path" : sections.length ? "section" : lessons.length ? "lesson" : null,
  };
}
