import { describe, expect, it } from "vitest";
import source from "./__fixtures__/kbl-original-tables.json";
import { WORKOUT_TABLES } from "@/content/readiness-table";
import { formatWorkoutCsv } from "./workout-export";

describe("authored workout export", () => {
  it("retains source table 39's two circuit rest breaks in their original order", () => {
    const original = source.tables.find((table) => table.id === "39")!;
    const breaks = original.data
      .filter((row) => row[1] === "#colspan#")
      .map((row) => row[0].replace(/<[^>]+>/g, "").trim());
    const csv = formatWorkoutCsv(WORKOUT_TABLES["39"]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split("\n")[0]).toBe(
      '\ufeff"Type","Exercise","Rest","Intensity","Reps","Sets","Tempo"',
    );
    expect(breaks).toHaveLength(2);
    for (const text of breaks) expect(csv).toContain(text);
    expect(csv.indexOf(breaks[0])).toBeGreaterThan(csv.indexOf('"Staggered Stance Deadlift"'));
    expect(csv.indexOf(breaks[0])).toBeLessThan(csv.indexOf('"Alternating Halo - Squat"'));
    expect(csv.indexOf(breaks[1])).toBeLessThan(csv.indexOf('"Modified Butterflies"'));
    expect(csv).toContain("↑");
    expect(csv).toContain("↓");
  });

  it("retains source table 42's full multiline recovery instructions", () => {
    const original = source.tables.find((table) => table.id === "42")!;
    const notes = original.description.replace(/<[^>]+>/g, "").trim();
    const csv = formatWorkoutCsv(WORKOUT_TABLES["42"]);
    expect(csv).toContain(`"Notes","${notes.replace(/"/g, '""')}"`);
    expect(csv).toContain("allow for more full recovery in between sets");
  });
});
