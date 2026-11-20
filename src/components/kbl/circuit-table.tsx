import { Fragment } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { WorkoutTable } from "@/content/readiness-table";
import { cn } from "@/lib/utils";

/** The workout table: circuit badges, rest direction signs, reps/sets/tempo. */
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
              <th scope="col" className="px-4 py-3 font-bold">
                Type
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Exercise
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Rest
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Intensity
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Reps
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Sets
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Tempo
              </th>
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
                      <CircuitBadge circuit={row.circuit} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.exercise}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-semibold",
                          row.restDir === "up" ? "text-primary" : "text-foreground",
                        )}
                      >
                        {row.restArrow === false ||
                        (!row.rest && row.restArrow !== true) ? null : row.restDir === "up" ? (
                          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                        ) : (
                          <ArrowDown className="h-4 w-4" strokeWidth={2.5} />
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

/** Circuit marker: the bracketed C1 / C2 sign used in the program tables. */
export function CircuitBadge({ circuit }: { circuit: string }) {
  return (
    <span className="relative inline-block px-[0.3rem] py-[0.15rem] font-mono text-[0.8125rem] font-bold leading-none tracking-tight text-success">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[3px] border-2 border-success [clip-path:polygon(0_0,35%_0,35%_12%,12%_12%,12%_88%,35%_88%,35%_100%,0_100%,0_0,100%_0,100%_100%,65%_100%,65%_88%,88%_88%,88%_12%,65%_12%,65%_0,100%_0)]"
      />
      {circuit}
    </span>
  );
}
