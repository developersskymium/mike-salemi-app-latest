import { describe, expect, it } from "vitest";
import { KBL_CASES, KBL_POOL } from "./__fixtures__/selfguided-kbl-pool";
import {
  assembleQuickSession, buildTrainingPlan, heatLevel, heatmapGrid, INTENTS, lessonIntent, lessonMatchesFilter, matchesIntent,
  quickSessionTitle, rotate, rotationAfter, sessionMinutes, smartNext, stepMinutes, stepRole, streaks, totalMinutes,
  type Intent, type NextLesson,
} from "./selfguided";

describe("classification", () => {
  it("reads KBL day types", () => {
    expect(lessonIntent("Workout II Day", null)).toBe("workout");
    expect(lessonIntent("Challenge Day", null)).toBe("workout");
    expect(lessonIntent("On Ramp", null)).toBe("workout");
    expect(lessonIntent("Recovery Day", null)).toBe("recovery");
    expect(lessonIntent("Skill Development Day", null)).toBe("skill");
    expect(lessonIntent("Preparation Day", null)).toBe("overview");
    expect(lessonIntent("Workout I Day", "transition")).toBe("overview");
  });
  it("reads course lessons by title and section", () => {
    expect(lessonIntent("general", null, "Home", "Home")).toBe("overview");
    expect(lessonIntent("general", null, "Week 2 Call Recording", "Week 2")).toBe("overview");
    expect(lessonIntent("general", null, "Eagle Breath", "Week 1")).toBe("recovery");
    expect(lessonIntent("general", null, "Energy Push", "Energy Push - Explained and Demonstrated")).toBe("recovery");
    expect(lessonIntent("general", null, "Butterfly Series", "Mobility")).toBe("mobility");
    expect(lessonIntent("general", null, "Two Week Swing Program", "Bonus 3 - Two Week Swing Program")).toBe("workout");
    expect(lessonIntent("general", null, "Step 1 - Feet", "7 Steps")).toBe("skill");
  });
  it("gives steps a session role", () => {
    expect(stepRole("warmup", "none")).toBe("warmup");
    expect(stepRole("lifestyle", "workout")).toBe("workout");
    expect(stepRole("lifestyle", "none")).toBeNull();
    expect(stepRole("lifestyle", "readiness")).toBeNull();
    expect(stepRole("video", "none", "Pre-Training Warm Up", "Home")).toBe("warmup");
    expect(stepRole("video", "none", "Halos with Counter Balance", "Mobility")).toBe("mobility");
    expect(stepRole("video", "none", "Download", "Ebook PDF")).toBeNull();
    expect(stepRole("video", "none", "Russian vs. Pendulum Swing Technique", "Choosing Your Swing Technique")).toBe("skill");
  });
  it("minutes from label, video length or role default", () => {
    expect(stepMinutes("9 min", null, "mobility")).toBe(9);
    expect(stepMinutes(null, 61, "skill")).toBe(2);
    expect(stepMinutes("Overview", null, "workout")).toBe(20);
    expect(stepMinutes(null, null, null)).toBe(5);
  });
  it("intent matching and filters", () => {
    expect(matchesIntent("mobility", "recovery")).toBe(true);
    expect(matchesIntent("recovery", "mobility")).toBe(true);
    expect(matchesIntent("workout", "skill")).toBe(false);
    expect(lessonMatchesFilter("all", "overview")).toBe(true);
    expect(lessonMatchesFilter("mobility", "recovery")).toBe(true);
    expect(lessonMatchesFilter("workout", "overview")).toBe(false);
  });
});

describe("smartNext", () => {
  const L = (id: string, ord: number, intent: NextLesson["intent"], done = false, completions = done ? 1 : 0): NextLesson => ({ id, ord, intent, done, completions });
  const week = [L("o", 1, "overview"), L("w1", 2, "workout"), L("r1", 3, "recovery"), L("w2", 4, "workout"), L("s1", 5, "skill"), L("w3", 6, "workout"), L("r2", 7, "recovery")];

  it("starts at the beginning when nothing is trained", () => {
    expect(smartNext({ lessons: week, lastLessonId: null, rotate: true })).toMatchObject({ lessonId: "o", kind: "start", reason: "A good place to begin." });
  });
  it("rotates workout → recovery → skill → workout from just after the last day", () => {
    const done = week.map((l) => (l.ord <= 2 ? { ...l, done: true } : l));
    expect(smartNext({ lessons: done, lastLessonId: "w1", rotate: true })).toMatchObject({ lessonId: "r1", kind: "rotation", want: "recovery" });
    const after = week.map((l) => (l.ord <= 3 ? { ...l, done: true } : l));
    const r = smartNext({ lessons: after, lastLessonId: "r1", rotate: true })!;
    expect(r).toMatchObject({ lessonId: "s1", kind: "rotation", want: "skill" });
    expect(r.reason).toBe("You did a recovery day last. A skill day keeps the week balanced.");
    expect(rotationAfter("skill")).toBe("workout");
    expect(rotationAfter("overview")).toBeNull();
  });
  it("falls back to order when the wanted type is all done", () => {
    const ls = [L("w1", 1, "workout", true), L("w2", 2, "workout"), L("w3", 3, "workout")];
    expect(smartNext({ lessons: ls, lastLessonId: "w1", rotate: true, lessonLabel: "Day" })).toMatchObject({ lessonId: "w2", kind: "order", reason: "The next day you haven't done yet." });
  });
  it("low readiness steers to recovery, amber to mobility (recovery stands in)", () => {
    const done = week.map((l) => (l.ord <= 2 ? { ...l, done: true } : l));
    const red = smartNext({ lessons: done, lastLessonId: "w1", rotate: true, readiness: { score: 38, band: "red", bandName: "Recovery Day", outcome: "recovery" } })!;
    expect(red).toMatchObject({ lessonId: "r1", kind: "readiness", want: "recovery" });
    expect(red.reason).toBe("Your last check-in scored 38 (Recovery Day). A recovery day lets you bounce back.");
    expect(smartNext({ lessons: done, lastLessonId: "w1", rotate: true, readiness: { score: 22, band: "amber", bandName: "Chart 2", outcome: "workout" } })).toMatchObject({ kind: "readiness", want: "mobility", lessonId: "r1" });
  });
  it("courses ignore rotation and readiness", () => {
    const ls = [L("a", 1, "skill", true), L("b", 2, "recovery"), L("c", 3, "skill")];
    expect(smartNext({ lessons: ls, lastLessonId: "a", rotate: false, readiness: { score: 40, band: "red", bandName: "x", outcome: "rest" }, lessonLabel: "Lesson" })).toMatchObject({ lessonId: "b", kind: "order" });
  });
  it("wraps around and suggests the least repeated day when everything is done", () => {
    const ls = [L("w1", 1, "workout", true, 3), L("r1", 2, "recovery", true, 2), L("w2", 3, "workout", true, 1), L("r2", 4, "recovery", true, 1)];
    expect(smartNext({ lessons: ls, lastLessonId: "w2", rotate: true })).toMatchObject({ lessonId: "r2", kind: "repeat" });
    const open = [L("w1", 1, "workout"), L("r1", 2, "recovery", true), L("w2", 3, "workout", true)];
    expect(smartNext({ lessons: open, lastLessonId: "w2", rotate: true })).toMatchObject({ lessonId: "w1", kind: "order" });
  });
  it("empty curriculum", () => {
    expect(smartNext({ lessons: [], lastLessonId: null, rotate: true })).toBeNull();
  });
});

describe("quick sessions", () => {
  it("rotate starts at seed × 3 mod n", () => {
    expect(rotate([1, 2, 3, 4], 1)).toEqual([4, 1, 2, 3]);
    expect(rotate([], 3)).toEqual([]);
    expect(rotate([1, 2], 0)).toEqual([1, 2]);
  });

  it("matches the database's sg_assemble for every seed, time and intent (real KBL pool)", () => {
    let checked = 0;
    for (const [key, expected] of Object.entries(KBL_CASES)) {
      const [seed, minutes, intent] = key.split(" ");
      const intents: Intent[] = intent === "*" ? [...INTENTS] : [intent as Intent];
      for (const i of intents) {
        const got = assembleQuickSession(KBL_POOL, Number(minutes), i, Number(seed)).map((x) => `${x.stepId}:${x.slot[0]}`).join(" ");
        expect(got, `${seed} ${minutes} ${i}`).toBe(expected);
        checked++;
      }
    }
    expect(checked).toBe(80);
  });

  it("stays near the time budget and never repeats a step", () => {
    for (const m of [10, 20, 30, 45]) {
      for (const i of INTENTS) {
        const items = assembleQuickSession(KBL_POOL, m, i, 7);
        const t = totalMinutes(items);
        expect(t).toBeGreaterThan(m * 0.6);
        expect(t).toBeLessThanOrEqual(m + 3);
        expect(new Set(items.map((x) => x.stepId)).size).toBe(items.length);
        expect(items[0]!.slot).toBe("warmup");
      }
    }
  });

  it("titles", () => {
    expect(quickSessionTitle("skill", 20)).toBe("20-minute skill session");
    expect(quickSessionTitle("recovery", 10)).toBe("10-minute recovery");
  });

  it("works with an empty or tiny pool", () => {
    expect(assembleQuickSession([], 20)).toEqual([]);
    const one = [{ stepId: "a", lessonId: "l", role: "skill" as const, minutes: 8, title: "Swing" }];
    expect(assembleQuickSession(one, 10).map((x) => x.slot)).toEqual(["main"]);
  });
});

describe("streaks and heatmap", () => {
  it("counts consecutive days ending today or yesterday", () => {
    expect(streaks(["2026-11-18", "2026-11-19", "2026-11-20"], "2026-11-20")).toEqual({ current: 3, best: 3 });
    expect(streaks(["2026-11-18", "2026-11-19"], "2026-11-20")).toEqual({ current: 2, best: 2 });
    expect(streaks(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-18"], "2026-11-20")).toEqual({ current: 0, best: 4 });
    expect(streaks([], "2026-11-20")).toEqual({ current: 0, best: 0 });
  });
  it("handles month and DST boundaries", () => {
    expect(streaks(["2026-10-31", "2026-11-01", "2026-11-02"], "2026-11-02")).toEqual({ current: 3, best: 3 });
    expect(streaks(["2026-03-28", "2026-03-29", "2026-03-30"], "2026-03-30").current).toBe(3);
  });
  it("heat levels", () => {
    expect(heatLevel(null)).toBe(0);
    expect(heatLevel({ minutes: 0, sessions: 0, steps: 3 })).toBe(1);
    expect(heatLevel({ minutes: 12, sessions: 1, steps: 0 })).toBe(2);
    expect(heatLevel({ minutes: 30, sessions: 1, steps: 0 })).toBe(3);
    expect(heatLevel({ minutes: 60, sessions: 2, steps: 0 })).toBe(4);
  });
  it("grid: Monday-first weeks ending this week, future flagged", () => {
    const g = heatmapGrid([{ date: "2026-11-20", minutes: 30, sessions: 1, steps: 4 }, { date: "2026-11-16", minutes: 5, sessions: 1, steps: 0 }], "2026-11-20", 4);
    expect(g.columns).toHaveLength(4);
    expect(g.columns[0]![0]!.date).toBe("2026-10-26");
    const last = g.columns[3]!;
    expect(last[0]!.date).toBe("2026-11-16");
    expect(last[0]!.level).toBe(1);
    expect(last[4]).toMatchObject({ date: "2026-11-20", level: 3, today: true, future: false });
    expect(last[6]).toMatchObject({ date: "2026-11-22", future: true, level: 0 });
    expect(g.months.map((m) => m.label)).toEqual(["Oct", "Nov"]);
  });
  it("session minutes: logged, else elapsed capped at 3 hours", () => {
    expect(sessionMinutes({ minutes: 22, startedAt: "2026-11-20T10:00:00Z" })).toBe(22);
    expect(sessionMinutes({ startedAt: "2026-11-20T10:00:00Z", lastActivityAt: "2026-11-20T10:30:10Z" })).toBe(31);
    expect(sessionMinutes({ startedAt: "2026-11-20T10:00:00Z", lastActivityAt: "2026-11-20T18:00:00Z" })).toBe(180);
    expect(sessionMinutes({ startedAt: "2026-11-20T10:00:00Z", lastActivityAt: "2026-11-20T10:00:00Z" })).toBe(0);
  });
});

describe("buildTrainingPlan (legacy creator)", () => {
  const kbl = {
    id: "kbl", slug: "kettlebell-lifestyle", name: "Kettlebell Lifestyle", rotate: true,
    lessons: [
      { id: "ov", title: "Overview", intent: "overview" as const, done: false },
      { id: "w1", title: "Day 1", intent: "workout" as const, done: true },
      { id: "w2", title: "Day 2", intent: "workout" as const, done: false },
      { id: "r1", title: "Day 3 - Recovery", intent: "recovery" as const, done: false },
      { id: "s1", title: "Day 4 - Skill", intent: "skill" as const, done: false },
      { id: "w3", title: "Day 5", intent: "workout" as const, done: false },
    ],
  };
  const mtk = { id: "mtk", slug: "mastering-the-kettlebell", name: "Mastering the Kettlebell", rotate: false, lessons: [{ id: "m1", title: "Swing", intent: "skill" as const, done: false, sectionTitle: "Swing" }, { id: "m2", title: "Clean", intent: "skill" as const, done: false }] };

  it("places sessions on the chosen weekdays from the day after the start", () => {
    const { items, overview } = buildTrainingPlan({ programs: [kbl], weeks: 2, weekdays: [1, 3, 5], startDate: "2026-11-22", minutes: 30 });
    expect(items.map((i) => i.date)).toEqual(["2026-11-23", "2026-11-25", "2026-11-27", "2026-11-30", "2026-12-02", "2026-12-04"]);
    expect(items.map((i) => i.week)).toEqual([1, 1, 1, 2, 2, 2]);
    expect(items.slice(0, 3).map((i) => i.lessonId)).toEqual(["w2", "r1", "s1"]);
    expect(items[1]!.kind).toBe("recovery");
    expect(items.every((i) => i.lessonId !== "ov")).toBe(true);
    expect(overview).toContain("2 weeks, 3 sessions a week from Kettlebell Lifestyle");
  });
  it("interleaves programs, runs courses in order, then repeats", () => {
    const { items } = buildTrainingPlan({ programs: [kbl, mtk], weeks: 2, weekdays: [1, 4], startDate: "2026-11-22", minutes: 20, focus: "skill" });
    expect(items.map((i) => i.programSlug)).toEqual(["kettlebell-lifestyle", "mastering-the-kettlebell", "kettlebell-lifestyle", "mastering-the-kettlebell"]);
    expect(items.filter((i) => i.programSlug === "mastering-the-kettlebell").map((i) => i.lessonId)).toEqual(["m1", "m2"]);
    expect(items[0]!.lessonId).toBe("s1");
    const long = buildTrainingPlan({ programs: [mtk], weeks: 2, weekdays: [1, 3], startDate: "2026-11-22", minutes: 20 }).items;
    expect(long.map((i) => i.lessonId)).toEqual(["m1", "m2", "m1", "m2"]);
  });
  it("no programs → no items", () => {
    expect(buildTrainingPlan({ programs: [], weeks: 2, weekdays: [1], startDate: "2026-11-22", minutes: 20 }).items).toEqual([]);
  });
});
