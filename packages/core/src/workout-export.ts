/**
 * Spreadsheet export of an authored workout table. Port of legacy
 * src/lib/workout-export.ts: circuit rest breaks, notes and rest arrows are kept,
 * and the file starts with a UTF-8 byte-order mark so spreadsheets show the arrows.
 *
 * Circuit breaks may be authored either as `table.separators` ({after, label}:
 * shown after the last row of circuit `after`) or as rows with `separator`
 * set to the break label.
 */
import type { WorkoutRow, WorkoutTable } from "./types";

export const CSV_HEADER = ["Type", "Exercise", "Rest", "Intensity", "Reps", "Sets", "Tempo"] as const;

const str = (v: unknown) => (v == null ? "" : String(v));

function restCell(row: WorkoutRow) {
  const arrow = row.restArrow ? (row.restDir === "up" ? "↑ " : "↓ ") : "";
  return `${arrow}${str(row.rest)}`.trim();
}

function separatorLabel(row: WorkoutRow): string | null {
  if (!row.separator) return null;
  if (typeof row.separator === "string") return row.separator;
  return str(row.exercise || row.note || row.label);
}

/** Rows of cells (header, exercises, breaks, notes) in export order. */
export function workoutCsvRows(table: Pick<WorkoutTable, "rows" | "notes" | "separators">): string[][] {
  const blank = (label: string, first = "") => [first, label, "", "", "", "", ""];
  const out: string[][] = [[...CSV_HEADER]];
  table.rows.forEach((row, index, rows) => {
    const inline = separatorLabel(row);
    if (inline !== null) {
      out.push(blank(inline));
      return;
    }
    out.push([str(row.circuit), str(row.exercise), restCell(row), str(row.intensity), str(row.reps), str(row.sets), str(row.tempo)]);
    if (row.note) out.push(blank(str(row.note)));
    const following = rows.slice(index + 1).find((r) => separatorLabel(r) === null);
    const lastOfCircuit = !following || following.circuit !== row.circuit;
    const separator = lastOfCircuit ? table.separators?.find((s) => s.after === row.circuit) : undefined;
    if (separator) out.push(blank(separator.label));
  });
  if (table.notes) out.push(blank(table.notes, "Notes"));
  return out;
}

/** CSV text with a UTF-8 BOM; every cell quoted, quotes doubled. */
export function formatWorkoutCsv(table: Pick<WorkoutTable, "rows" | "notes" | "separators">): string {
  return (
    "﻿" +
    workoutCsvRows(table)
      .map((cells) => cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n")
  );
}

/** A safe download file name for a table. */
export function workoutCsvFilename(table: Pick<WorkoutTable, "title" | "id">): string {
  const base = (table.title || `workout-${table.id}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "workout"}.csv`;
}
