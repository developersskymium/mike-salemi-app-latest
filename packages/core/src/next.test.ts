import { describe, expect, it } from "vitest";
import { buildCurriculum, stepsOf } from "./__fixtures__/curriculum";
import { lessonLabel, nextForLesson, recommendNext } from "./next";

const day = { id: "d9", title: "Day 9", pageType: null, dayNumber: 9 } as const;

describe("recommendNext", () => {
  it("path complete when there is no next lesson", () => {
    const r = recommendNext({ next: null, band: "green", daysLeftInSection: 0 });
    expect(r).toMatchObject({ eyebrow: "Level complete", primary: { kind: "progress" }, secondary: { kind: "catalog" } });
  });
  it("overview and transition pages get their own copy", () => {
    const o = recommendNext({ next: { id: "o", title: "Phase II Overview", pageType: "overview", dayNumber: null }, band: "red", daysLeftInSection: 0 });
    expect(o.title).toBe("Phase II Overview");
    expect(o.detail).toContain("Watch the overview");
    expect(o.primary).toEqual({ label: "Open Phase II Overview", kind: "lesson", lessonId: "o" });
    const t = recommendNext({ next: { id: "t", title: "Transition", pageType: "transition", dayNumber: null }, band: null, daysLeftInSection: 0 });
    expect(t.detail).toContain("prepare for the next phase");
  });
  it("red steers into recovery with the next day as secondary", () => {
    const r = recommendNext({ next: day, band: "red", daysLeftInSection: 3 });
    expect(r.tone).toBe("calm");
    expect(r.primary).toEqual({ label: "Open the stretch test", kind: "tool", toolSlug: "stretch-test" });
    expect(r.secondary).toEqual({ label: "Go to Day 9", kind: "lesson", lessonId: "d9" });
  });
  it("amber and green mention days left in the section", () => {
    expect(recommendNext({ next: day, band: "amber", daysLeftInSection: 1 }).detail).toContain("1 day left in this phase.");
    expect(recommendNext({ next: day, band: "amber", daysLeftInSection: 0 }).detail).toContain("This phase wraps");
    expect(recommendNext({ next: day, band: "green", daysLeftInSection: 2 }).detail).toMatch(/^2 days left in this phase/);
    expect(recommendNext({ next: day, band: null, daysLeftInSection: 0 }).detail).toContain("last day of the phase");
  });
  it("titles combine label and title unless the title already starts with the label", () => {
    expect(recommendNext({ next: day, band: null, daysLeftInSection: 0 }).title).toBe("Day 9");
    expect(recommendNext({ next: { ...day, title: "Swing focus" }, band: null, daysLeftInSection: 0 }).title).toBe("Day 9 — Swing focus");
    expect(lessonLabel({ title: "Intro", pageType: null, dayNumber: 2 }, "Lesson")).toBe("Lesson 2");
  });
  it("supports other program vocabularies", () => {
    const r = recommendNext({ next: day, band: "green", daysLeftInSection: 2, labels: { lessonLabel: "Lesson", sectionLabel: "week" } });
    expect(r.detail).toContain("2 lessons left in this week");
  });
});

describe("nextForLesson", () => {
  const c = buildCurriculum("l1", [["o", 1, 1, 1], ["o", 1]]);
  it("uses the following lesson and the section's remaining days", () => {
    const r = nextForLesson(c, "l1-d1", new Set(stepsOf(c, "l1-s1-overview", "l1-d1")), "green");
    expect(r.primary).toMatchObject({ kind: "lesson", lessonId: "l1-d2" });
    expect(r.detail).toContain("2 days left in this phase");
  });
  it("the final lesson only reports completion when nothing else is left", () => {
    const done = new Set(stepsOf(c, "l1-d4"));
    expect(nextForLesson(c, "l1-d4", done, null).primary).toMatchObject({ kind: "lesson", lessonId: "l1-s1-overview" });
    const all = new Set(c.lessons.flatMap((l) => l.steps.map((s) => s.id)));
    expect(nextForLesson(c, "l1-d4", all, null).eyebrow).toBe("Level complete");
  });
});
