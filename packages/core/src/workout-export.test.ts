import { describe, expect, it } from "vitest";
import source from "./__fixtures__/original-tables-39-42.json";
import tables from "./__fixtures__/workout-tables-39-42.json";
import { formatWorkoutCsv, workoutCsvFilename } from "./workout-export";
import type { WorkoutTable } from "./types";

const TABLES = tables.tables as unknown as Record<string, WorkoutTable>;

describe("authored workout export", () => {
  it("retains source table 39's two circuit rest breaks in their original order", () => {
    const original = source.tables.find((table) => table.id === "39")!;
    const breaks = original.data
      .filter((row) => row[1] === "#colspan#")
      .map((row) => row[0]!.replace(/<[^>]+>/g, "").trim());
    const csv = formatWorkoutCsv(TABLES["39"]!);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split("\n")[0]).toBe('﻿"Type","Exercise","Rest","Intensity","Reps","Sets","Tempo"');
    expect(breaks).toHaveLength(2);
    for (const text of breaks) expect(csv).toContain(text);
    expect(csv.indexOf(breaks[0]!)).toBeGreaterThan(csv.indexOf('"Staggered Stance Deadlift"'));
    expect(csv.indexOf(breaks[0]!)).toBeLessThan(csv.indexOf('"Alternating Halo - Squat"'));
    expect(csv.indexOf(breaks[1]!)).toBeLessThan(csv.indexOf('"Modified Butterflies"'));
    expect(csv).toContain("↑");
    expect(csv).toContain("↓");
  });

  it("retains source table 42's full multiline recovery instructions", () => {
    const original = source.tables.find((table) => table.id === "42")!;
    const notes = original.description.replace(/<[^>]+>/g, "").trim();
    const csv = formatWorkoutCsv(TABLES["42"]!);
    expect(csv).toContain(`"Notes","${notes.replace(/"/g, '""')}"`);
    expect(csv).toContain("allow for more full recovery in between sets");
  });

  it("supports inline separator rows and row notes, and escapes quotes", () => {
    const csv = formatWorkoutCsv({
      rows: [
        { circuit: "C1", exercise: 'Swing "Russian"', rest: "20s", restArrow: true, restDir: "up", note: "Keep it crisp" },
        { separator: "[1 min Rest]" },
        { circuit: "C2", exercise: "Squat", rest: "30s" },
      ],
    });
    const lines = csv.slice(1).split("\n");
    expect(lines[1]).toBe('"C1","Swing ""Russian""","↑ 20s","","","",""');
    expect(lines[2]).toBe('"","Keep it crisp","","","","",""');
    expect(lines[3]).toBe('"","[1 min Rest]","","","","",""');
    expect(lines[4]).toBe('"C2","Squat","30s","","","",""');
    expect(workoutCsvFilename({ id: "39", title: "(#1 Full) Workout III, Level I" })).toBe("1-full-workout-iii-level-i.csv");
  });
});
