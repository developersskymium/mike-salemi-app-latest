import type { WorkoutTable } from "@/content/readiness-table";

/** Include the complete authored prescription in a spreadsheet-compatible file. */
export function formatWorkoutCsv(table: WorkoutTable) {
  const rows = [
    ["Type", "Exercise", "Rest", "Intensity", "Reps", "Sets", "Tempo"],
    ...table.rows.flatMap((row, index, entries) => {
      const cells = [
        row.circuit,
        row.exercise,
        `${row.restArrow ? (row.restDir === "up" ? "↑ " : "↓ ") : ""}${row.rest}`.trim(),
        row.intensity,
        row.reps,
        row.sets,
        row.tempo,
      ];
      const separator =
        !entries[index + 1] || entries[index + 1].circuit !== row.circuit
          ? table.separators?.find((entry) => entry.after === row.circuit)
          : undefined;
      return separator ? [cells, ["", separator.label, "", "", "", "", ""]] : [cells];
    }),
    ...(table.notes ? [["Notes", table.notes, "", "", "", "", ""]] : []),
  ];
  return (
    "\ufeff" +
    rows
      .map((cells) => cells.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")
  );
}
