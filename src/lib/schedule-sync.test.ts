import { describe, expect, it } from "vitest";
import { planScheduleDays } from "./schedule-sync";

describe("planScheduleDays", () => {
  it("Mon/Wed/Fri for 4 weeks gives 12 sessions starting the next matching day", () => {
    const dates = planScheduleDays(new Date(2026, 9, 7), [1, 3, 5], 4); // Wed Oct 7 2026
    expect(dates.length).toBe(12);
    expect(dates[0]).toBe("2026-10-09");
  });
});
