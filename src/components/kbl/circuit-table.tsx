import { Fragment } from "react";
import type { WorkoutTable } from "@/content/readiness-table";
import { cn } from "@/lib/utils";

/** Column headings and their source TablePress tooltips. */
const COLUMNS = [
  { label: "Type", hint: "(S) Station Exercise or (C) Circuit" },
  { label: "Exercise", hint: "Movement" },
  { label: "Rest", hint: "The time interval in between sets" },
  { label: "Intensity", hint: "Related to the load being lifted" },
  { label: "Reps", hint: "Number of times you perform a specific movement" },
  { label: "Sets", hint: "Number of repetition cycles" },
  { label: "Tempo", hint: "The rhythm/speed at which you move a given weight" },
];

/**
 * The KBL workout table. Every icon is the original TablePress image from
 * /kbl/icons (Type symbols and rest arrows) — none are drawn by the app.
 */
export function CircuitTable({ table }: { table: WorkoutTable }) {
  const separators = table.separators ?? [];

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-workout-table={table.id}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <caption className="sr-only">{table.title}</caption>
          <thead>
            <tr className="bg-primary/10 text-[0.625rem] uppercase tracking-[0.12em] text-foreground">
              {COLUMNS.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  title={column.hint}
                  className="cursor-help px-4 py-3 font-bold"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => {
              const next = table.rows[i + 1];
              const separator =
                !next || next.circuit !== row.circuit
                  ? separators.find((s) => s.after === row.circuit)
                  : undefined;
              return (
                <Fragment key={`${table.id}-${i}`}>
                  <tr className={cn("border-t border-border", i % 2 === 1 && "bg-muted/30")}>
                    <td className="px-4 py-3">
                      <CircuitBadge circuit={row.circuit} icon={row.circuitIcon} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.exercise}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                        {row.restIcon && (
                          <img
                            src={row.restIcon}
                            alt=""
                            width={20}
                            className="h-auto w-5 shrink-0"
                            loading="lazy"
                          />
                        )}
                        {row.rest}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.intensity}</td>
                    <td className="px-4 py-3 text-foreground">{row.reps}</td>
                    <td className="px-4 py-3 text-foreground">{row.sets}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.tempo}</td>
                  </tr>
                  {separator && (
                    <tr className="border-t border-border">
                      <td
                        colSpan={7}
                        className="px-4 py-3 text-center text-xs font-semibold text-primary"
                      >
                        {separator.label}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {table.notes && (
        <p className="whitespace-pre-line border-t border-border p-4 text-sm leading-relaxed text-foreground">
          {table.notes}
        </p>
      )}
      {table.images?.map((image) => (
        <img
          key={image.url}
          src={image.url}
          alt={image.alt}
          className="m-4 h-auto max-w-[calc(100%_-_2rem)] rounded-lg"
          loading="lazy"
        />
      ))}
    </div>
  );
}

/**
 * Type cell: the original TablePress symbol image (C1, C2, C3, C, S1–S5).
 * Falls back to the plain label only if a row has no source image.
 */
export function CircuitBadge({ circuit, icon }: { circuit: string; icon?: string }) {
  if (!icon) return <span className="font-mono text-sm font-bold text-foreground">{circuit}</span>;
  return (
    <img src={icon} alt={circuit} title={circuit} className="h-10 w-auto max-w-none" loading="lazy" />
  );
}
