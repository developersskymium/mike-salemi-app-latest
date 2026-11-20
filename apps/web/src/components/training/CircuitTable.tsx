"use client";

import { useEffect, useRef, useState } from "react";
import { formatWorkoutCsv, workoutCsvFilename, type WorkoutRow, type WorkoutTable } from "@ms/core";
import { Icon } from "@/components/ui";

/** Column headings with the source TablePress tooltips (same order as the original app). */
const COLUMNS = [
  { label: "Type", hint: "(S) Station Exercise or (C) Circuit" },
  { label: "Exercise", hint: "Movement" },
  { label: "Rest", hint: "The time interval in between sets" },
  { label: "Intensity", hint: "Related to the load being lifted" },
  { label: "Reps", hint: "Number of times you perform a specific movement" },
  { label: "Sets", hint: "Number of repetition cycles" },
  { label: "Tempo", hint: "The rhythm/speed at which you move a given weight" },
] as const;

const text = (v: unknown) => (v == null ? "" : String(v));

/** A row that only carries a break label (no exercise): rendered as a separator in place. */
function separatorOnly(row: WorkoutRow): string | null {
  if (!row.separator || row.exercise) return null;
  return typeof row.separator === "string" ? row.separator : text(row.note ?? row.label);
}

type Line = { kind: "row"; row: WorkoutRow; index: number } | { kind: "sep"; label: string };

/**
 * Rows and circuit breaks in display order. Breaks come from the source data only:
 * a `separator` label on the row it follows, a separator-only row, or the legacy
 * `table.separators` ({after, label}: after the last row of circuit `after`).
 */
export function tableLines(table: Pick<WorkoutTable, "rows" | "separators">): Line[] {
  const out: Line[] = [];
  const rows = table.rows ?? [];
  let n = 0;
  rows.forEach((row, i) => {
    const only = separatorOnly(row);
    if (only !== null) {
      out.push({ kind: "sep", label: only });
      return;
    }
    out.push({ kind: "row", row, index: n++ });
    if (typeof row.separator === "string" && row.separator) out.push({ kind: "sep", label: row.separator });
    const following = rows.slice(i + 1).find((r) => separatorOnly(r) === null);
    if (!following || following.circuit !== row.circuit) {
      const s = table.separators?.find((x) => x.after === row.circuit);
      if (s && !(typeof row.separator === "string" && row.separator === s.label)) out.push({ kind: "sep", label: s.label });
    }
  });
  return out;
}

function download(table: WorkoutTable) {
  const blob = new Blob([formatWorkoutCsv(table)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = workoutCsvFilename(table);
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/**
 * The KBL workout table, as in the original app: one table, seven columns
 * (Type | Exercise | Rest | Intensity | Reps | Sets | Tempo), the original TablePress
 * circuit badges and rest arrows from /kbl/icons, circuit breaks centred across the row,
 * alternating tint, then the table notes and images. On a phone the same table scrolls
 * sideways with Type and Exercise pinned.
 */
export function CircuitTable({ table, csv = true }: { table: WorkoutTable; csv?: boolean }) {
  const lines = tableLines(table);
  const scroller = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const on = () => setScrolled(el.scrollLeft > 2);
    // Break labels stay centred in the visible part of the table while it scrolls sideways.
    const size = () => el.style.setProperty("--kd-vis", `${el.clientWidth}px`);
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    el.addEventListener("scroll", on, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", on);
    };
  }, []);

  return (
    <div className="kd-ct" data-workout-table={table.id}>
      <div className="kd-ct-scroll" ref={scroller} data-scrolled={scrolled ? "" : undefined}>
        <table className="kd-ct-table">
          <caption className="lq-sr">{table.title}</caption>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.label} scope="col" title={c.hint}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) =>
              line.kind === "sep" ? (
                <tr key={`s${i}`} className="kd-ct-sep">
                  <td colSpan={7}>
                    <span>{line.label}</span>
                  </td>
                </tr>
              ) : (
                <tr key={`r${i}`} data-alt={line.index % 2 === 1 ? "" : undefined}>
                  <td className="kd-ct-type">
                    <CircuitBadge circuit={text(line.row.circuit)} icon={line.row.circuitIcon ? text(line.row.circuitIcon) : undefined} />
                  </td>
                  <td className="kd-ct-ex">
                    {text(line.row.exercise)}
                    {line.row.note ? <span className="kd-ct-note">{text(line.row.note)}</span> : null}
                  </td>
                  <td className="kd-ct-rest">
                    <span>
                      {line.row.restIcon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={text(line.row.restIcon)} alt="" width={20} className="kd-ct-arrow" loading="lazy" />
                      ) : null}
                      {text(line.row.rest)}
                    </span>
                  </td>
                  <td className="kd-ct-c2">{text(line.row.intensity)}</td>
                  <td className="lq-num">{text(line.row.reps)}</td>
                  <td className="lq-num">{text(line.row.sets)}</td>
                  <td className="kd-ct-c2">{text(line.row.tempo)}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      {table.notes ? <p className="kd-ct-notes">{table.notes}</p> : null}
      {table.images?.map((img) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={img.url} src={img.url} alt={img.alt ?? ""} className="kd-ct-img" loading="lazy" />
      ))}
      {csv && (
        <div className="kd-ct-foot">
          <button type="button" className="kd-link" onClick={() => download(table)}>
            <Icon name="down" size="xs" />
            Download CSV
          </button>
        </div>
      )}
    </div>
  );
}

/** Type cell: the original TablePress symbol (C, C1–C3, S1–S5); plain label only when a row has no image. */
export function CircuitBadge({ circuit, icon }: { circuit: string; icon?: string }) {
  if (!icon) return <span className="kd-ct-badge-t">{circuit}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={icon} alt={circuit} title={circuit} className="kd-ct-badge" loading="lazy" />;
}
