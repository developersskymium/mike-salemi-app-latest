import { describe, expect, it } from "vitest";
import { allSteps, buildCurriculum, stepsOf } from "./__fixtures__/curriculum";
import {
  currentLesson,
  isLessonComplete,
  isLessonUnlocked,
  isStepOpen,
  lessonProgress,
  milestonesFor,
  nextLesson,
  openThrough,
  pathProgress,
  sectionProgress,
  trainingDaysLeftInSection,
} from "./progression";

// Level I: overview + 3 days | overview + 2 days + transition
const l1 = buildCurriculum("l1", [["o", 3, 2, 4], ["o", 2, 3, "t"]]);
const l2 = buildCurriculum("l2", [["o", 2, 2]]);
const set = (...ids: string[]) => new Set(ids);

describe("lesson completion and step locking", () => {
  const day1 = l1.lessons[1]!;
  it("counts required steps", () => {
    expect(lessonProgress(day1, set())).toEqual({ lessonId: "l1-d1", done: 0, total: 3, complete: false });
    expect(lessonProgress(day1, set(...stepsOf(l1, "l1-d1")))).toMatchObject({ done: 3, complete: true });
  });
  it("ignores optional steps for completion", () => {
    const c = buildCurriculum("x", [[3]], { optionalLast: true });
    const lesson = c.lessons[0]!;
    expect(isLessonComplete(lesson, set("x-d1-step1", "x-d1-step2"))).toBe(true);
    expect(openThrough(lesson.steps, set("x-d1-step1", "x-d1-step2"))).toBe(3);
  });
  it("a lesson with no required steps is complete (SQL lesson_done)", () => {
    expect(isLessonComplete({ ...day1, steps: [] }, set())).toBe(true);
  });
  it("opens steps up to the first incomplete required step", () => {
    expect(openThrough(day1.steps, set())).toBe(0);
    expect(openThrough(day1.steps, set("l1-d1-step1"))).toBe(1);
    expect(isStepOpen(day1.steps, 1, set("l1-d1-step1"))).toBe(true);
    expect(isStepOpen(day1.steps, 2, set("l1-d1-step1"))).toBe(false);
    // Undoing an earlier step keeps already-completed later steps reachable.
    expect(isStepOpen(day1.steps, 2, set("l1-d1-step3"))).toBe(true);
    expect(isStepOpen(day1.steps, 9, set())).toBe(false);
  });
});

describe("lesson unlocking (private.lesson_unlocked)", () => {
  it("lets a member start either level independently, overview first", () => {
    for (const c of [l1, l2]) {
      expect(isLessonUnlocked(c, c.lessons[0]!.id, set(), true)).toBe(true);
      expect(isLessonUnlocked(c, c.lessons[1]!.id, set(), true)).toBe(false);
    }
    // Progress in Level I never unlocks Level II.
    expect(isLessonUnlocked(l2, "l2-d1", set(...allSteps(l1)), true)).toBe(false);
  });
  it("requires every earlier lesson, across sections", () => {
    const done = set(...stepsOf(l1, "l1-s1-overview", "l1-d1", "l1-d2"));
    expect(isLessonUnlocked(l1, "l1-d3", done, true)).toBe(true);
    expect(isLessonUnlocked(l1, "l1-s2-overview", done, true)).toBe(false);
    expect(isLessonUnlocked(l1, "l1-s2-overview", set(...done, ...stepsOf(l1, "l1-d3")), true)).toBe(true);
  });
  it("opens everything when the order is not locked; unknown lessons are closed", () => {
    expect(isLessonUnlocked(l1, "l1-d5", set(), false)).toBe(true);
    expect(isLessonUnlocked(l1, "nope", set(), false)).toBe(false);
  });
});

describe("current lesson and progress", () => {
  it("current lesson is the first incomplete; null when all done", () => {
    expect(currentLesson(l1, set())?.id).toBe("l1-s1-overview");
    expect(currentLesson(l1, set(...stepsOf(l1, "l1-s1-overview")))?.id).toBe("l1-d1");
    expect(currentLesson(l1, set(...allSteps(l1)))).toBeNull();
    expect(nextLesson(l1, "l1-d3")?.id).toBe("l1-s2-overview");
    expect(nextLesson(l1, "l1-s2-transition")).toBeNull();
  });

  it("counts training days without overview/transition pages, but requires them for completion", () => {
    const trainingOnly = set(...l1.lessons.filter((l) => !l.pageType).flatMap((l) => l.steps.map((s) => s.id)));
    const p = pathProgress(l1, trainingOnly);
    expect(p).toMatchObject({ days: 5, daysTotal: 5, daysPercent: 100, pages: 5, pagesTotal: 8, complete: false, started: true });
    expect(p.stepsTotal).toBe(17);
    expect(p.percent).toBe(Math.round((14 / 17) * 100));
    const all = pathProgress(l1, set(...allSteps(l1)));
    expect(all).toMatchObject({ percent: 100, complete: true, pages: 8 });
    expect(pathProgress(l1, set())).toMatchObject({ percent: 0, started: false, complete: false });
  });

  it("section progress follows the same rules", () => {
    const s2 = sectionProgress(l1, "l1-s2", set(...stepsOf(l1, "l1-d4", "l1-d5")));
    expect(s2).toMatchObject({ sectionId: "l1-s2", days: 2, daysTotal: 2, pagesTotal: 4, complete: false });
  });

  it("counts training days left in the section, excluding the current one", () => {
    expect(trainingDaysLeftInSection(l1, "l1-d1", set())).toBe(2);
    expect(trainingDaysLeftInSection(l1, "l1-d1", set(...stepsOf(l1, "l1-d2")))).toBe(1);
    expect(trainingDaysLeftInSection(l1, "l1-d3", set(...stepsOf(l1, "l1-d1", "l1-d2")))).toBe(0);
  });
});

describe("milestones", () => {
  it("reports lesson, then section, then path at the right boundaries", () => {
    const beforeDay = set(...stepsOf(l1, "l1-s1-overview", "l1-d1"));
    const step = (before: Set<string>, ...ids: string[]) => milestonesFor(l1, before, set(...before, ...ids));

    expect(step(beforeDay, "l1-d2-step1")).toEqual({ lessons: [], sections: [], path: false, highest: null });
    expect(step(beforeDay, ...stepsOf(l1, "l1-d2"))).toMatchObject({ lessons: ["l1-d2"], highest: "lesson" });

    const almostSection = set(...stepsOf(l1, "l1-s1-overview", "l1-d1", "l1-d2"), "l1-d3-step1", "l1-d3-step2", "l1-d3-step3");
    expect(step(almostSection, "l1-d3-step4")).toMatchObject({ lessons: ["l1-d3"], sections: ["l1-s1"], path: false, highest: "section" });

    const all = allSteps(l1);
    const almostAll = set(...all.filter((id) => id !== "l1-s2-transition-step1"));
    expect(step(almostAll, "l1-s2-transition-step1")).toEqual({
      lessons: ["l1-s2-transition"],
      sections: ["l1-s2"],
      path: true,
      highest: "path",
    });
    // Already complete → nothing new.
    expect(milestonesFor(l1, set(...all), set(...all)).highest).toBeNull();
  });
});
