import { describe, expect, it } from "vitest";
import { addDays, applyMissedDayRule, daysBetween, isoDate, missedEntries, placeLessons, planScheduleDays, weekday, type ScheduleEntry } from "./schedule";

const lessons = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `d${i + 1}` }));

describe("date helpers", () => {
  it("adds days across DST changes without drifting", () => {
    // US DST starts 2026-03-08, ends 2026-11-01; EU 2026-03-29 / 2026-10-25.
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2026-03-01", "2026-04-01")).toBe(31);
    expect(daysBetween("2026-10-20", "2026-11-05")).toBe(16);
    expect(weekday("2026-10-07")).toBe(3); // Wednesday
    expect(isoDate(new Date(2026, 9, 7))).toBe("2026-10-07");
    expect(() => addDays("2026-1-1", 1)).toThrow();
  });
});

describe("planScheduleDays (legacy schedule-sync)", () => {
  it("Mon/Wed/Fri for 4 weeks gives 12 sessions starting the next matching day", () => {
    const dates = planScheduleDays("2026-10-07", [1, 3, 5], 4); // Wed Oct 7 2026
    expect(dates.length).toBe(12);
    expect(dates[0]).toBe("2026-10-09");
  });
  it("crosses DST transitions with correct weekdays", () => {
    const dates = planScheduleDays("2026-10-20", [0], 3); // Sundays across Oct 25 and Nov 1
    expect(dates).toEqual(["2026-10-25", "2026-11-01", "2026-11-08"]);
  });
});

describe("placeLessons (legacy autofill)", () => {
  it("places each lesson on the next training weekday from the start date (inclusive)", () => {
    const entries = placeLessons({ lessons: lessons(5), startDate: "2026-10-07", trainingDays: [1, 3, 5] });
    expect(entries.map((e) => e.date)).toEqual(["2026-10-07", "2026-10-09", "2026-10-12", "2026-10-14", "2026-10-16"]);
  });
  it("accepts ISO weekday 7 as Sunday and skips done lessons", () => {
    const entries = placeLessons({ lessons: lessons(3), startDate: "2026-03-01", trainingDays: [7], done: new Set(["d1"]) });
    expect(entries).toEqual([
      { lessonId: "d2", date: "2026-03-01", status: "planned" },
      { lessonId: "d3", date: "2026-03-08", status: "planned" },
    ]);
  });
  it("rejects an empty week", () => {
    expect(() => placeLessons({ lessons: lessons(1), startDate: "2026-03-01", trainingDays: [] })).toThrow();
  });
});

describe("applyMissedDayRule", () => {
  // Today: Wed 2026-10-28. Mon 26 missed, Tue 27 done, Thu 29 + Sat 31 planned.
  const today = "2026-10-28";
  const entries: ScheduleEntry[] = [
    { lessonId: "a", date: "2026-10-26" },
    { lessonId: "b", date: "2026-10-27", status: "done" },
    { lessonId: "c", date: "2026-10-29" },
    { lessonId: "d", date: "2026-10-31" },
    { lessonId: "z", date: "2026-10-20", status: "skipped" },
  ];
  it("finds missed days", () => {
    expect(missedEntries(entries, today).map((e) => e.lessonId)).toEqual(["a"]);
  });
  it("shift: moves everything from the earliest missed day forward so it lands today", () => {
    const out = applyMissedDayRule(entries, today, "shift");
    const by = Object.fromEntries(out.map((e) => [e.lessonId, e.date]));
    expect(by).toEqual({ z: "2026-10-20", a: "2026-10-28", b: "2026-10-29", c: "2026-10-31", d: "2026-11-02" });
  });
  it("skip: removes missed days, the rest stands", () => {
    expect(applyMissedDayRule(entries, today, "skip").map((e) => e.lessonId)).toEqual(["z", "b", "c", "d"]);
  });
  it("weekend: queues missed days onto the next free weekend slots after today", () => {
    const two: ScheduleEntry[] = [...entries, { lessonId: "e", date: "2026-10-27" }];
    const out = applyMissedDayRule(two, today, "weekend");
    const by = Object.fromEntries(out.map((e) => [e.lessonId, e.date]));
    // Sat 31 is taken by d → a gets Sun Nov 1, e gets Sat Nov 7.
    expect(by.a).toBe("2026-11-01");
    expect(by.e).toBe("2026-11-07");
    expect(by.c).toBe("2026-10-29");
  });
  it("leaves the plan alone when nothing was missed, and never mutates the input", () => {
    const copy = JSON.parse(JSON.stringify(entries));
    expect(applyMissedDayRule(entries, "2026-10-01", "shift").map((e) => e.date).sort()).toEqual(entries.map((e) => e.date).sort());
    applyMissedDayRule(entries, today, "shift");
    expect(entries).toEqual(copy);
  });
});
