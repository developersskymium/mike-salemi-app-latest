import type { WorkoutRow, WorkoutTable } from "@ms/core";

/* Pure helpers for Mike's 7-column table: circuits, durations and the Workout-mode timeline. */

const text = (v: unknown) => (v == null ? "" : String(v));

/** Seconds in "40s", "30s (15sL/15sR)", "60 sec", "1 min", "[1 min Rest Before Next Circuit]", "1:30". Null for reps ("8", "5 each side"). */
export function parseSeconds(v: unknown): number | null {
  const s = text(v).toLowerCase();
  if (!s.trim()) return null;
  const mmss = /(\d+):(\d{2})/.exec(s);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const min = /(\d+(?:\.\d+)?)\s*(?:min|minute)/.exec(s);
  if (min) return Math.round(Number(min[1]) * 60);
  const sec = /(\d+)\s*(?:s\b|sec|second|s\s*\(|s$)/.exec(s);
  if (sec) return Number(sec[1]);
  return null;
}

export interface Circuit {
  key: string;
  circuit: string;
  icon: string | null;
  rows: WorkoutRow[];
  sets: number;
  /** The break after the circuit ("[1 min Rest Before Next Circuit]"). */
  after: string | null;
}

function separatorOnly(row: WorkoutRow): string | null {
  if (!row.separator || row.exercise) return null;
  return typeof row.separator === "string" ? row.separator : text(row.note ?? row.label);
}

/** Consecutive rows with the same circuit label, with their rounds and the break after. */
export function circuitsOf(table: Pick<WorkoutTable, "rows" | "separators">): Circuit[] {
  const out: Circuit[] = [];
  for (const row of table.rows ?? []) {
    const only = separatorOnly(row);
    if (only !== null) {
      const last = out[out.length - 1];
      if (last) last.after = only;
      continue;
    }
    const c = text(row.circuit) || "—";
    let g = out[out.length - 1];
    if (!g || g.circuit !== c || g.after) {
      g = { key: `${c}-${out.length}`, circuit: c, icon: row.circuitIcon ? text(row.circuitIcon) : null, rows: [], sets: 1, after: null };
      out.push(g);
    }
    g.rows.push(row);
    g.sets = Math.max(g.sets, parseInt(text(row.sets), 10) || 1);
    if (typeof row.separator === "string" && row.separator) g.after = row.separator;
  }
  for (const g of out) {
    if (!g.after) g.after = table.separators?.find((s) => s.after === g.circuit)?.label ?? null;
  }
  return out;
}

export const cleanBreak = (s: string) => s.replace(/^\[|\]$/g, "").trim();

/** Rest arrow: "up" = rest, then repeat the circuit; otherwise rest, then the next move. */
export const restUp = (row: WorkoutRow) => text(row.restDir) === "up" || text(row.restDir) === "loop" || /rest-up/.test(text(row.restIcon));

export type Phase =
  | { kind: "work"; circuit: Circuit; ci: number; row: WorkoutRow; ri: number; round: number; secs: number | null }
  | { kind: "rest"; circuit: Circuit; ci: number; round: number; secs: number; label: string; nextName: string | null };

/** The whole session in order: every move of every round, with the rests and breaks between. */
export function timeline(table: Pick<WorkoutTable, "rows" | "separators">): Phase[] {
  const cs = circuitsOf(table);
  const out: Phase[] = [];
  cs.forEach((c, ci) => {
    for (let round = 1; round <= c.sets; round++) {
      c.rows.forEach((row, ri) => {
        out.push({ kind: "work", circuit: c, ci, row, ri, round, secs: parseSeconds(row.reps) });
        const lastMove = ri === c.rows.length - 1;
        const lastRound = round === c.sets;
        const rest = parseSeconds(row.rest);
        if (lastMove && lastRound) {
          const nextC = cs[ci + 1];
          if (!nextC) return;
          const brk = c.after ? parseSeconds(c.after) : null;
          const secs = brk ?? rest;
          if (secs) out.push({ kind: "rest", circuit: c, ci, round, secs, label: c.after ? cleanBreak(c.after) : "Rest, then the next circuit", nextName: text(nextC.rows[0]?.exercise) || null });
          return;
        }
        if (rest) {
          const next = lastMove ? c.rows[0] : c.rows[ri + 1];
          out.push({ kind: "rest", circuit: c, ci, round, secs: rest, label: lastMove ? "Rest, then repeat the circuit" : "Rest, then the next move", nextName: text(next?.exercise) || null });
        }
      });
    }
  });
  return out;
}

/** Rough session length in minutes (manual sets count 40 s). */
export function estimateMinutes(table: Pick<WorkoutTable, "rows" | "separators">): number {
  const s = timeline(table).reduce((n, p) => n + (p.secs ?? 40), 0);
  return Math.max(1, Math.round(s / 60));
}

export const circuitWord = (cs: Circuit[]) => {
  const multi = cs.filter((c) => c.rows.length > 1).length;
  const n = cs.length;
  if (multi === n) return `${n} ${n === 1 ? "circuit" : "circuits"}`;
  return `${n} ${n === 1 ? "block" : "blocks"}`;
};

export const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
