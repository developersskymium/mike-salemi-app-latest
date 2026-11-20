"use client";

import { formatWorkoutCsv, workoutCsvFilename, type WorkoutRow, type WorkoutTable as Table } from "@ms/core";
import { Button, Chip, ExerciseRow, Glass, Icon, RestRow, WorkoutTable } from "@/components/ui";
import { cleanBreak, groupRows, type RowGroup } from "./model";

type Load = "heavy" | "moderate" | "light" | "bodyweight";
function load(intensity: unknown): Load | undefined {
  const t = String(intensity ?? "").toLowerCase();
  if (t.includes("heavy")) return "heavy";
  if (t.includes("light")) return "light";
  if (t.includes("body")) return "bodyweight";
  if (t.includes("mod")) return "moderate";
  return undefined;
}

/** "40s (20sL/20sR)" → reps "40s", note "20s L / 20s R". */
function splitReps(reps: unknown): [string, string | undefined] {
  const s = String(reps ?? "");
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(s);
  return m ? [m[1]!, m[2]!.replace(/(\d+s?)([LR])/g, "$1 $2").replace("/", " / ")] : [s, undefined];
}

function groupTitle(g: RowGroup) {
  if (g.kind === "station") return `Station ${g.number}`;
  if (g.kind === "circuit") return `Circuit ${g.number}`;
  return g.circuit || "Exercises";
}

function groupMeta(g: RowGroup) {
  const sets = g.rows[0]?.sets;
  const n = Number(sets);
  if (g.kind === "circuit") return Number.isFinite(n) && n > 0 ? `${n} round${n === 1 ? "" : "s"}, ${g.rows.length} moves` : `${g.rows.length} moves`;
  return Number.isFinite(n) && n > 0 ? `${n} set${n === 1 ? "" : "s"}` : "";
}

function Rest({ row, last, circuit }: { row: WorkoutRow; last: boolean; circuit: boolean }) {
  const rest = String(row.rest ?? "");
  if (!rest) return null;
  if (circuit && last) return <RestRow end>Rest {rest}, then back to the top</RestRow>;
  if (circuit) return <RestRow>Rest {rest}</RestRow>;
  return <RestRow end>Rest {rest} between sets</RestRow>;
}

function download(table: Table) {
  const blob = new Blob([formatWorkoutCsv(table)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = workoutCsvFilename(table);
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/**
 * Today's workout on a thick glass sheet: stations and circuits with their KBL symbols,
 * rest arrows, intensity, reps, sets and tempo, the coach's notes and images, CSV export.
 */
export function WorkoutPanel({ table, band, score, compact }: { table: Table; band?: string | null; score?: number | null; compact?: boolean }) {
  const groups = groupRows(table.rows);
  return (
    <Glass as="section" level="thick" radius="card" className="trn-table" data-compact={compact ? "" : undefined} aria-label="Today's workout">
      <header className="trn-table-h">
        <div style={{ minWidth: 0 }}>
          <p className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>
            Today&apos;s workout
          </p>
          <h3 className="lq-t22">{band ?? table.title.replace(/^\(.*?\)\s*/, "")}</h3>
        </div>
        {score != null && <Chip score={score}>Readiness</Chip>}
      </header>

      {groups.map((g, gi) => (
        <div key={gi} className="trn-group">
          <div className="trn-group-h">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {g.rows[0]?.circuitIcon ? <img src={String(g.rows[0].circuitIcon)} alt="" className="trn-group-ic" width={36} height={36} /> : <span className="trn-group-ic trn-group-ph">{g.circuit}</span>}
            <div>
              <h4 className="lq-t17">{groupTitle(g)}</h4>
              <p className="lq-t13 lq-c2">{groupMeta(g)}</p>
            </div>
          </div>
          <WorkoutTable label={groupTitle(g)}>
            {g.rows.map((r, i) => {
              const [reps, note] = splitReps(r.reps);
              return (
                <div key={i} className="trn-row-wrap" role="rowgroup">
                  <ExerciseRow name={String(r.exercise ?? "")} load={load(r.intensity)} loadLabel={r.intensity ? String(r.intensity) : undefined} reps={reps} repsNote={note} sets={String(r.sets ?? "")} tempo={String(r.tempo ?? "")} />
                  {r.note && <p className="lq-t13 lq-c2 trn-row-note">{String(r.note)}</p>}
                  <Rest row={r} last={i === g.rows.length - 1} circuit={g.kind === "circuit"} />
                </div>
              );
            })}
          </WorkoutTable>
          {g.breakAfter && gi < groups.length - 1 && (
            <div className="trn-break lq-t13">
              <Icon name="timer" size="xs" />
              {cleanBreak(g.breakAfter)}
            </div>
          )}
        </div>
      ))}

      {table.notes && <p className="lq-t15 trn-table-notes">{table.notes}</p>}
      {table.images?.map((img) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={img.url} src={img.url} alt={img.alt ?? ""} className="trn-table-img" loading="lazy" />
      ))}

      <div className="trn-table-foot">
        <Button variant="tint" size="sm" icon="down" onClick={() => download(table)}>
          Download CSV
        </Button>
      </div>
    </Glass>
  );
}
