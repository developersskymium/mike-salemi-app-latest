"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { deleteRecord, moveRecord, saveRecord } from "@/lib/studio/actions";
import { useRun } from "./forms";

type Opt = { label: string; value: string; weight: number };
type Q = { form_id: string; key: string; prompt: string; options: Opt[]; position: number };

/** One question: prompt and option weights. */
export function QuestionEditor({ q, first, last }: { q: Q; first: boolean; last: boolean }) {
  const [prompt, setPrompt] = useState(q.prompt);
  const [opts, setOpts] = useState<Opt[]>(Array.isArray(q.options) ? q.options : []);
  const { run, pending } = useRun();
  const pk = { form_id: q.form_id, key: q.key };
  const upd = (i: number, p: Partial<Opt>) => setOpts((o) => o.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const maxW = Math.max(0, ...opts.map((o) => Number(o.weight) || 0));
  return (
    <div style={{ padding: "14px 0", borderTop: "1px solid var(--sep)", display: "grid", gap: 10 }}>
      <div className="st-row" style={{ justifyContent: "space-between" }}>
        <span className="st-faint">{q.key} · max {maxW} points</span>
        <span className="st-row" style={{ gap: 2 }}>
          <button type="button" className="st-iconbtn" aria-label="Move question up" disabled={first || pending} onClick={() => run(() => moveRecord("form_questions", pk, "up"), "Moved")}>↑</button>
          <button type="button" className="st-iconbtn" aria-label="Move question down" disabled={last || pending} onClick={() => run(() => moveRecord("form_questions", pk, "down"), "Moved")}>↓</button>
          <button type="button" className="st-iconbtn" aria-label="Delete question" disabled={pending} onClick={() => confirm("Delete this question?") && run(() => deleteRecord("form_questions", pk), "Deleted")}>×</button>
        </span>
      </div>
      <textarea className="st-in" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} aria-label="Question prompt" />
      {opts.map((o, i) => (
        <div key={i} className="st-row" style={{ flexWrap: "nowrap" }}>
          <input className="st-in" style={{ flex: 2 }} value={o.label} aria-label="Option label" onChange={(e) => upd(i, { label: e.target.value, value: o.value || e.target.value.toLowerCase().replace(/\W+/g, "_") })} />
          <input className="st-in" style={{ flex: 1 }} value={o.value} aria-label="Option value" onChange={(e) => upd(i, { value: e.target.value })} />
          <input className="st-in" style={{ width: 84 }} type="number" value={o.weight} aria-label="Weight" onChange={(e) => upd(i, { weight: Number(e.target.value) })} />
          <button type="button" className="st-iconbtn" aria-label="Remove option" onClick={() => setOpts(opts.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <div className="st-row">
        <Button variant="glass" size="sm" icon="plus" onClick={() => setOpts([...opts, { label: "", value: "", weight: 0 }])}>Option</Button>
        <Button variant="fill" size="sm" disabled={pending} onClick={() => run(() => saveRecord("form_questions", pk, { prompt, options: JSON.stringify(opts) }), "Question saved")}>Save question</Button>
      </div>
    </div>
  );
}

type B = { id: string; form_id: string; name: string; band: string; outcome: string; min_score: number; max_score: number; table_id: string | null; message: string; position: number };
const COLOURS = ["green", "amber", "red", "blue"];

/** Bands with a live 0–max range bar: edit a number and the bar moves. Flags gaps and overlaps. */
export function BandsEditor({ formId, maxScore, bands, tables }: { formId: string; maxScore: number; bands: B[]; tables: { id: string; title: string }[] }) {
  const [list, setList] = useState(bands);
  const { run, pending } = useRun();
  const upd = (id: string, p: Partial<B>) => setList((l) => l.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const max = Math.max(maxScore, ...list.map((b) => b.max_score), 1);
  const sorted = [...list].sort((a, b) => a.min_score - b.min_score);
  const issues: string[] = [];
  let cursor = 0;
  for (const b of sorted) {
    if (b.min_score > cursor) issues.push(`Scores ${cursor}–${b.min_score - 1} are not covered by any band.`);
    else if (b.min_score < cursor) issues.push(`“${b.name}” overlaps the band before it.`);
    cursor = Math.max(cursor, b.max_score + 1);
  }
  if (sorted.length && cursor <= maxScore) issues.push(`Scores ${cursor}–${maxScore} are not covered by any band.`);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <div className="st-range" role="img" aria-label={`Score bands from 0 to ${max}`}>
          {sorted.map((b) => (
            <i key={b.id} style={{ left: `${(b.min_score / (max + 1)) * 100}%`, width: `${Math.max(0.6, ((b.max_score - b.min_score + 1) / (max + 1)) * 100)}%`, background: "var(--fill-2)" }}>
              <span><span className={`st-swatch st-sw-${b.band}`} />{b.name}</span>
            </i>
          ))}
        </div>
        <div className="st-range-axis"><span>0</span><span>{Math.round(max / 2)}</span><span>{max}</span></div>
      </div>
      {issues.map((m, i) => <div key={i} className="st-note" data-tone="warn">{m}</div>)}
      {list.map((b, i) => (
        <div key={b.id} className="st-form" data-cols="3" style={{ padding: "14px 0", borderTop: "1px solid var(--sep)" }}>
          <div className="st-field"><label className="st-label">Name</label><input className="st-in" value={b.name} onChange={(e) => upd(b.id, { name: e.target.value })} /></div>
          <div className="st-field"><label className="st-label">Colour</label><select className="st-in" value={b.band} onChange={(e) => upd(b.id, { band: e.target.value })}>{[...new Set([...COLOURS, b.band])].map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="st-field"><label className="st-label">Outcome</label><select className="st-in" value={b.outcome} onChange={(e) => upd(b.id, { outcome: e.target.value })}><option>workout</option><option>recovery</option><option>rest</option></select></div>
          <div className="st-field"><label className="st-label">Min score</label><input className="st-in" type="number" value={b.min_score} onChange={(e) => upd(b.id, { min_score: Number(e.target.value) })} /></div>
          <div className="st-field"><label className="st-label">Max score</label><input className="st-in" type="number" value={b.max_score} onChange={(e) => upd(b.id, { max_score: Number(e.target.value) })} /></div>
          <div className="st-field"><label className="st-label">Workout table</label><select className="st-in" value={b.table_id ?? ""} onChange={(e) => upd(b.id, { table_id: e.target.value || null })}><option value="">None</option>{tables.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
          <div className="st-field" data-wide=""><label className="st-label">Message to member</label><textarea className="st-in" rows={2} value={b.message} onChange={(e) => upd(b.id, { message: e.target.value })} /></div>
          <div className="st-bar">
            <button type="button" className="st-iconbtn" aria-label="Move band up" disabled={i === 0 || pending} onClick={() => run(() => moveRecord("form_bands", { id: b.id }, "up"), "Moved")}>↑</button>
            <button type="button" className="st-iconbtn" aria-label="Move band down" disabled={i === list.length - 1 || pending} onClick={() => run(() => moveRecord("form_bands", { id: b.id }, "down"), "Moved")}>↓</button>
            <Button variant="glass" size="sm" disabled={pending} onClick={() => confirm(`Delete band “${b.name}”?`) && run(() => deleteRecord("form_bands", { id: b.id }), "Deleted")}>Delete</Button>
            <Button variant="fill" size="sm" disabled={pending} onClick={() => run(() => saveRecord("form_bands", { id: b.id }, { name: b.name, band: b.band, outcome: b.outcome, min_score: String(b.min_score), max_score: String(b.max_score), table_id: b.table_id ?? "", message: b.message }), "Band saved")}>Save band</Button>
          </div>
        </div>
      ))}
      <div><Button variant="glass" size="sm" icon="plus" disabled={pending} onClick={() => run(() => saveRecord("form_bands", null, { name: "New band", band: "green", outcome: "workout", min_score: String(cursor), max_score: String(Math.max(cursor, maxScore)), message: "" }, { form_id: formId }), "Band added")}>Add band</Button></div>
    </div>
  );
}

const COLS = [["circuit", "Circuit", 70], ["exercise", "Exercise", 220], ["intensity", "Intensity", 130], ["reps", "Reps", 70], ["sets", "Sets", 60], ["tempo", "Tempo", 100], ["rest", "Rest", 70]] as const;
type TRow = Record<string, unknown>;

/** Workout table grid: one row per exercise, rest arrow per row, notes. */
export function TableGrid({ id, title: t0, notes: n0, rows: r0 }: { id: string; title: string; notes: string; rows: TRow[] }) {
  const [rows, setRows] = useState<TRow[]>(r0);
  const [title, setTitle] = useState(t0);
  const [notes, setNotes] = useState(n0);
  const { run, pending } = useRun();
  const set = (i: number, k: string, v: unknown) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const move = (i: number, d: number) => setRows((r) => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="st-form" data-cols="2">
        <div className="st-field"><label className="st-label" htmlFor="tt">Title</label><input id="tt" className="st-in" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="st-field"><label className="st-label" htmlFor="tn">Notes</label><textarea id="tn" className="st-in" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
      <div className="st-scroll">
        <table className="st-tbl">
          <thead><tr><th>#</th>{COLS.map((c) => <th key={c[0]}>{c[1]}</th>)}<th>Rest arrow</th><th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="st-faint">{i + 1}</td>
                {COLS.map(([k, l, w]) => <td key={k} style={{ padding: "4px 4px" }}><input className="st-cell" style={{ minWidth: w }} value={String(r[k] ?? "")} aria-label={`${l} row ${i + 1}`} onChange={(e) => set(i, k, e.target.value)} /></td>)}
                <td style={{ padding: "4px 4px", whiteSpace: "nowrap" }}>
                  <input type="checkbox" aria-label={`Rest arrow row ${i + 1}`} checked={Boolean(r.restArrow)} onChange={(e) => set(i, "restArrow", e.target.checked)} style={{ accentColor: "var(--accent)", marginRight: 6 }} />
                  <select className="st-cell" style={{ width: 70, minWidth: 70 }} aria-label={`Arrow direction row ${i + 1}`} value={String(r.restDir ?? "down")} onChange={(e) => set(i, "restDir", e.target.value)}><option value="down">down</option><option value="up">up</option></select>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="st-iconbtn" aria-label={`Move row ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>{" "}
                  <button type="button" className="st-iconbtn" aria-label={`Move row ${i + 1} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</button>{" "}
                  <button type="button" className="st-iconbtn" aria-label={`Delete row ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="st-empty">No rows yet.</div>}
      </div>
      <div className="st-row">
        <Button variant="glass" size="sm" icon="plus" onClick={() => setRows([...rows, { circuit: rows.at(-1)?.circuit ?? "C1", exercise: "", intensity: "", reps: "", sets: "", tempo: "", rest: "", restArrow: false, restDir: "down" }])}>Add row</Button>
        <span style={{ flex: 1 }} />
        <Button variant="filled" size="md" disabled={pending} onClick={() => run(() => saveRecord("workout_tables", { id }, { title, notes, rows: JSON.stringify(rows) }), "Table saved")}>Save table</Button>
      </div>
    </div>
  );
}
