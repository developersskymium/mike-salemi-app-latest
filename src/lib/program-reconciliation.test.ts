import { describe, expect, it } from "vitest";
import { courseDays, courses } from "@/content/program";
import { DAY_TITLE_OVERRIDES } from "@/content/editorial-overrides";

const steps = (courseId: string) =>
  courseDays(courseId).reduce((n, d) => n + d.day.lessons.length, 0);

describe("Kettlebell Lifestyle source-to-live reconciliation", () => {
  it("ends both levels with KBL guidance instead of the legacy subscription promotion", () => {
    for (const course of courses) {
      const days = courseDays(course.id);
      const last = days[days.length - 1].day.lessons.at(-1)!;
      expect(last.title).toBe("What's Next?");
      expect(last.notes).toContain("Kettlebell Lifestyle");
      expect(last.notes).not.toMatch(/LIVE50|50%|first month/i);
    }
  });
  it("Beginner includes its 355 existing steps, four overviews and ten phase-transition steps", () => {
    expect(steps("beginner")).toBe(369);
  });

  it("Intermediate includes its 357 existing steps, four overviews and ten phase-transition steps", () => {
    expect(steps("intermediate")).toBe(371);
  });

  it("keeps 62 source Completion steps per level including phase transitions, each last on its page", () => {
    const counts: Record<string, number> = {};
    for (const c of courses) {
      for (const { day } of courseDays(c.id)) {
        const i = day.lessons.findIndex((l) => l.special === "completion");
        if (i >= 0) {
          counts[c.id] = (counts[c.id] ?? 0) + 1;
          expect(i, day.id).toBe(day.lessons.length - 1);
        }
      }
    }
    expect(counts).toEqual({ beginner: 62, intermediate: 62 });
  });

  it("Beginner days are titled sequentially Day 1-61", () => {
    const days = courseDays("beginner").filter(({ day }) => !day.pageType);
    expect(days).toHaveLength(61);
    days.forEach(({ day }, i) => {
      expect(day.number).toBe(i + 1);
      const m = day.title.match(/^Day (\d+)/);
      if (m) expect(Number(m[1]), day.id).toBe(i + 1);
    });
    expect(DAY_TITLE_OVERRIDES).toHaveLength(4);
  });

  it("no workout step depends on a missing readiness assessment without a table", () => {
    for (const c of courses) {
      for (const { day } of courseDays(c.id)) {
        const hasReadiness = day.lessons.some((l) => l.special === "readiness");
        for (const l of day.lessons) {
          if (
            l.special === "workout" &&
            !hasReadiness &&
            l.tableId === undefined &&
            day.type === "On Ramp"
          ) {
            // On Ramp workout steps without a table simply show their video.
            expect(l.vimeoId, l.id).toBeTruthy();
          }
        }
      }
    }
  });
});
