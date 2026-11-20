"use client";

import { useEffect, useRef, useState } from "react";
import { formatWorkoutCsv, workoutCsvFilename, type WorkoutRow, type WorkoutTable } from "@ms/core";
import { Icon } from "@/components/ui";
import { circuitsOf, cleanBreak } from "./workout";
import { TempoPulse, WeightChip, usesBell } from "./TableBits";
import "./circuit.css";

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

/** Saves the table as CSV (the original app's export). */
export function downloadWorkoutCsv(table: WorkoutTable) {
  const blob = new Blob([formatWorkoutCsv(table)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = workoutCsvFilename(table);
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/**
 * The KBL workout table, as in the original app: seven columns (Type | Exercise | Rest |
 * Intensity | Reps | Sets | Tempo) with the original TablePress circuit badges and rest arrows
 * from /kbl/icons — set as a compact training card: small tabular type, tight rows, a light
 * header, one group per circuit (badge once, hairline between circuits, the break after it as a
 * quiet caption). On a phone it scrolls sideways with the Type and Exercise columns pinned.
 * `demoFor` returns a player action for an exercise that has a demo clip today.
 */
export function CircuitTable({ table, csv = true, demoFor, training }: { table: WorkoutTable; csv?: boolean; demoFor?: (exercise: string) => (() => void) | null; /** Day view: weight memory, tempo pulse, stacked rows on a phone. */ training?: boolean }) {
  const groups = circuitsOf(table);
  const scroller = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const on = () => setScrolled(el.scrollLeft > 2);
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);

  return (
    <div className="ct" data-workout-table={table.id} data-training={training ? "" : undefined}>
      <div className="ct-scroll" ref={scroller} data-scrolled={scrolled ? "" : undefined}>
        <table className="ct-table">
          <caption className="lq-sr">{table.title}</caption>
          <colgroup>
            <col className="ct-col-type" />
            <col className="ct-col-ex" />
            <col span={5} />
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.label} scope="col" title={c.hint}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.key} className="ct-group">
              {g.rows.map((row, ri) => {
                const ex = text(row.exercise);
                const demo = demoFor && ex ? demoFor(ex) : null;
                return (
                  <tr key={ri}>
                    {ri === 0 && (
                      <td className="ct-type" rowSpan={g.rows.length}>
                        <CircuitBadge circuit={text(row.circuit)} icon={row.circuitIcon ? text(row.circuitIcon) : undefined} />
                      </td>
                    )}
                    <td className="ct-ex">
                      {demo ? (
                        <button type="button" className="ct-demo" onClick={demo} title={`Play the ${ex} demo`}>
                          <span>{ex}</span>
                          <Icon name="play" size="xs" />
                        </button>
                      ) : (
                        <span>{ex}</span>
                      )}
                      {row.note ? <span className="ct-note">{text(row.note)}</span> : null}
                      {training && ex && usesBell(row.intensity) ? <WeightChip exercise={ex} /> : null}
                    </td>
                    <td className="ct-rest">
                      <span>
                        {row.restIcon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={text(row.restIcon)} alt="" width={14} height={14} className="ct-arrow" loading="lazy" />
                        ) : null}
                        {text(row.rest)}
                      </span>
                    </td>
                    <td>{text(row.intensity)}</td>
                    <td className="lq-num">{text(row.reps)}</td>
                    <td className="lq-num ct-sets">{text(row.sets)}</td>
                    <td>{training ? <TempoPulse tempo={text(row.tempo)} /> : text(row.tempo)}</td>
                  </tr>
                );
              })}
              {g.after && (
                <tr className="ct-break">
                  <td colSpan={7}>
                    <span>{cleanBreak(g.after)}</span>
                  </td>
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </div>
      {training && (
        <ol className="ct-stack" aria-label={table.title}>
          {groups.map((g) => (
            <li key={g.key} className="ct-sg">
              <p className="ct-sg-h">
                <CircuitBadge circuit={g.circuit} icon={g.icon ?? undefined} />
                <b className="lq-num">
                  {g.sets} {g.sets === 1 ? "set" : "sets"}
                </b>
              </p>
              {g.rows.map((row, ri) => {
                const ex = text(row.exercise);
                const demo = demoFor && ex ? demoFor(ex) : null;
                return (
                  <div key={ri} className="ct-sm">
                    {demo ? (
                      <button type="button" className="ct-demo ct-sm-n" onClick={demo}>
                        <span>{ex}</span>
                        <Icon name="play" size="xs" />
                      </button>
                    ) : (
                      <b className="ct-sm-n">{ex}</b>
                    )}
                    <span className="ct-sm-d lq-num">
                      <span>{text(row.reps)}</span>
                      {row.rest ? (
                        <span>
                          {row.restIcon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={text(row.restIcon)} alt="" width={12} height={12} className="ct-arrow" loading="lazy" />
                          ) : null}
                          {text(row.rest)} rest
                        </span>
                      ) : null}
                      {row.intensity ? <span>{text(row.intensity)}</span> : null}
                    </span>
                    <span className="ct-sm-x">
                      <TempoPulse tempo={text(row.tempo)} />
                      {ex && usesBell(row.intensity) ? <WeightChip exercise={ex} /> : null}
                    </span>
                  </div>
                );
              })}
              {g.after && <p className="ct-sg-b">{cleanBreak(g.after)}</p>}
            </li>
          ))}
        </ol>
      )}
      {table.notes ? <p className="ct-notes">{table.notes}</p> : null}
      {table.images?.map((img) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={img.url} src={img.url} alt={img.alt ?? ""} className="ct-img" loading="lazy" />
      ))}
      {csv && (
        <div className="ct-foot">
          <button type="button" className="kd-link" onClick={() => downloadWorkoutCsv(table)}>
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
  return <img src={icon} alt={circuit} title={circuit} className="kd-ct-badge ct-badge" width={28} height={28} loading="lazy" />;
}
