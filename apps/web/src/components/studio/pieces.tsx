"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { addSlots, addStepClip, createInvite, grantAccess, revokeAccess, saveRecord, saveSetting, setBenefit, setProgramModes, setStepVideo, setVideoKey } from "@/lib/studio/actions";
import { MODES, parseVimeo, type TableName } from "@/lib/studio/tables";
import { useRun } from "./forms";

/** One-line "add" box: a title and Enter. Creates a row under fixed parent columns. */
export function QuickAdd({ table, fixed, placeholder, field = "title", extra, label = "Add" }: { table: TableName; fixed: Record<string, unknown>; placeholder: string; field?: string; extra?: Record<string, unknown>; label?: string }) {
  const [v, setV] = useState("");
  const { run, pending } = useRun();
  return (
    <form className="st-row" style={{ flexWrap: "nowrap", padding: "4px 6px" }} onSubmit={(e) => { e.preventDefault(); if (v.trim()) run(() => saveRecord(table, null, { [field]: v, ...extra }, fixed), "Added", () => setV("")); }}>
      <input className="st-in" style={{ minHeight: 32, padding: "5px 10px", fontSize: 13 }} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <Button type="submit" variant="fill" size="sm" disabled={pending || !v.trim()}>{label}</Button>
    </form>
  );
}

export function ModesEditor({ programId, modes, defaultMode }: { programId: string; modes: string[]; defaultMode: string }) {
  const [sel, setSel] = useState(modes);
  const [def, setDef] = useState(defaultMode || modes[0] || "");
  const { run, pending } = useRun();
  return (
    <div className="st-row" style={{ alignItems: "flex-end" }}>
      {MODES.map((m) => (
        <label key={m} className="st-check"><input type="checkbox" checked={sel.includes(m)} onChange={(e) => { const n = e.target.checked ? [...sel, m] : sel.filter((x) => x !== m); setSel(n); if (!n.includes(def)) setDef(n[0] ?? ""); }} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />{m.replace("_", "-")}</label>
      ))}
      <select className="st-in" style={{ width: 160 }} value={def} onChange={(e) => setDef(e.target.value)} aria-label="Default mode" disabled={!sel.length}>{sel.map((m) => <option key={m} value={m}>default: {m.replace("_", "-")}</option>)}</select>
      <Button variant="fill" size="sm" disabled={pending} onClick={() => run(() => setProgramModes(programId, sel, def), "Modes saved")}>Save modes</Button>
    </div>
  );
}

/** Vimeo picker: paste a link or id (+ optional key); live embed preview; saves to the step. */
export function StepVideo({ stepId, current }: { stepId: string; current: { provider_id: string; privacy_hash: string | null; title: string; needs_key: boolean } | null }) {
  const [input, setInput] = useState(current?.provider_id ?? "");
  const [hash, setHash] = useState(current?.privacy_hash ?? "");
  const [title, setTitle] = useState(current?.title ?? "");
  const { run, pending } = useRun();
  const p = parseVimeo(input);
  const h = (hash || p?.hash || "").toLowerCase();
  const src = p ? `https://player.vimeo.com/video/${p.id}${h ? `?h=${h}` : ""}` : null;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="st-form" data-cols="3">
        <div className="st-field"><label className="st-label" htmlFor="vimeo">Vimeo link or id</label><input id="vimeo" className="st-in" value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://vimeo.com/123456789/abcdef1234" /></div>
        <div className="st-field"><label className="st-label" htmlFor="vkey">Privacy key <i>· if private</i></label><input id="vkey" className="st-in" value={hash} onChange={(e) => setHash(e.target.value)} placeholder="abcdef1234" /></div>
        <div className="st-field"><label className="st-label" htmlFor="vtitle">Library title</label><input id="vtitle" className="st-in" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      </div>
      {input && !p && <div className="st-note" role="alert">That does not look like a Vimeo link or id.</div>}
      {current?.needs_key && !h && <div className="st-note" data-tone="warn">This video needs its privacy key before members can play it.</div>}
      {src ? <iframe className="st-embed" src={src} title="Video preview" allow="fullscreen; picture-in-picture" loading="lazy" /> : <div className="st-embed" style={{ display: "grid", placeItems: "center", color: "var(--label-3)", fontSize: 13 }}>Preview appears here</div>}
      <div className="st-row">
        <Button variant="filled" size="md" disabled={pending || (!!input && !p)} onClick={() => run(() => setStepVideo(stepId, input, hash, title), input ? "Video saved" : "Video removed")}>{input ? "Save video" : "Remove video"}</Button>
      </div>
    </div>
  );
}

export function AddClip({ stepId }: { stepId: string }) {
  const [input, setInput] = useState(""), [hash, setHash] = useState(""), [title, setTitle] = useState("");
  const { run, pending } = useRun();
  return (
    <form className="st-row" onSubmit={(e) => { e.preventDefault(); run(() => addStepClip(stepId, input, hash, title), "Clip added", () => { setInput(""); setHash(""); setTitle(""); }); }}>
      <input className="st-in" style={{ flex: "2 1 200px" }} placeholder="Vimeo link or id" aria-label="Vimeo link or id" value={input} onChange={(e) => setInput(e.target.value)} />
      <input className="st-in" style={{ flex: "1 1 100px" }} placeholder="Key" aria-label="Privacy key" value={hash} onChange={(e) => setHash(e.target.value)} />
      <input className="st-in" style={{ flex: "1.5 1 140px" }} placeholder="Title" aria-label="Clip title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button type="submit" variant="fill" size="sm" disabled={pending || !input.trim()}>Add clip</Button>
    </form>
  );
}

/** Inline paste-the-hash field for the Library missing-key report. */
export function KeyField({ videoId, providerId }: { videoId: string; providerId: string }) {
  const [v, setV] = useState("");
  const { run, pending } = useRun();
  return (
    <form className="st-row" style={{ flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); const p = parseVimeo(v); run(() => setVideoKey(videoId, p?.hash ?? v), "Key saved", () => setV("")); }}>
      <input className="st-in" style={{ minHeight: 34, padding: "6px 10px", width: 200 }} value={v} onChange={(e) => setV(e.target.value)} placeholder="Paste key or full link" aria-label={`Vimeo key for ${providerId}`} />
      <Button type="submit" variant="filled" size="sm" disabled={pending || !v.trim()}>Save</Button>
    </form>
  );
}

/** Benefits grid cell: none, discount % or included. Saves on change. */
export function BenefitCell({ planId, programId, benefit, percent }: { planId: string; programId: string; benefit: "none" | "discount" | "included"; percent: number | null }) {
  const [b, setB] = useState(benefit);
  const [pc, setPc] = useState(percent ? String(percent) : "");
  const { run, pending } = useRun();
  const save = (nb: typeof b, np: string) => run(() => setBenefit(planId, programId, nb, np ? Number(np) : null), "Saved");
  return (
    <div className="st-ben">
      <select className="st-in" value={b} disabled={pending} aria-label={`${planId} benefit`} onChange={(e) => { const nb = e.target.value as typeof b; setB(nb); if (nb !== "discount") save(nb, ""); }}>
        <option value="none">None</option><option value="discount">Discount</option><option value="included">Included</option>
      </select>
      {b === "discount" && <input className="st-in" type="number" min={1} max={100} value={pc} placeholder="% off" aria-label="Discount percent" onChange={(e) => setPc(e.target.value)} onBlur={() => pc && save("discount", pc)} />}
    </div>
  );
}

export function GrantForm({ userId, programs }: { userId: string; programs: { id: string; name: string }[] }) {
  const [pid, setPid] = useState(""), [ends, setEnds] = useState(""), [note, setNote] = useState("");
  const { run, pending } = useRun();
  return (
    <form className="st-row" style={{ alignItems: "flex-end" }} onSubmit={(e) => { e.preventDefault(); run(() => grantAccess(userId, pid, ends, note), "Access granted", () => { setPid(""); setEnds(""); setNote(""); }); }}>
      <div className="st-field" style={{ flex: "2 1 200px" }}><label className="st-label" htmlFor="gp">Program</label><select id="gp" className="st-in" value={pid} onChange={(e) => setPid(e.target.value)}><option value="">Choose…</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="st-field"><label className="st-label" htmlFor="ge">Ends <i>· optional</i></label><input id="ge" type="date" className="st-in" value={ends} onChange={(e) => setEnds(e.target.value)} /></div>
      <div className="st-field" style={{ flex: "1 1 160px" }}><label className="st-label" htmlFor="gn">Note</label><input id="gn" className="st-in" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <Button type="submit" variant="filled" size="md" disabled={pending || !pid}>Grant access</Button>
    </form>
  );
}

export function RevokeButton({ grantId }: { grantId: string }) {
  const { run, pending } = useRun();
  return <Button variant="fill" size="sm" disabled={pending} onClick={() => confirm("Revoke this access now?") && run(() => revokeAccess(grantId), "Access revoked")}>Revoke</Button>;
}

export function SlotsForm() {
  const [s, setS] = useState({ from: "", to: "", times: "09:00 10:00 11:00", minutes: "60", offset: "-420" });
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const { run, pending } = useRun();
  const D = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const k = (n: keyof typeof s) => ({ value: s[n], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [n]: e.target.value }) });
  return (
    <form className="st-form" data-cols="3" onSubmit={(e) => { e.preventDefault(); run(() => addSlots({ from: s.from, to: s.to, times: s.times, weekdays: days, minutes: Number(s.minutes), offsetMinutes: Number(s.offset) }), "Slots added"); }}>
      <div className="st-field"><label className="st-label" htmlFor="sf">From</label><input id="sf" type="date" className="st-in" {...k("from")} /></div>
      <div className="st-field"><label className="st-label" htmlFor="st">To</label><input id="st" type="date" className="st-in" {...k("to")} /></div>
      <div className="st-field"><label className="st-label" htmlFor="sm">Minutes each</label><input id="sm" type="number" className="st-in" {...k("minutes")} /></div>
      <div className="st-field"><label className="st-label" htmlFor="stm">Start times (24h)</label><input id="stm" className="st-in" {...k("times")} /><span className="st-help">Separated by spaces.</span></div>
      <div className="st-field"><label className="st-label" htmlFor="so">UTC offset (minutes)</label><input id="so" type="number" className="st-in" {...k("offset")} /><span className="st-help">Pacific summer is -420, winter -480.</span></div>
      <div className="st-field"><span className="st-label">Weekdays</span><div className="st-row" style={{ gap: 10 }}>{D.map((d, i) => <label key={d} className="st-check" style={{ minHeight: 28 }}><input type="checkbox" checked={days.includes(i)} onChange={(e) => setDays(e.target.checked ? [...days, i] : days.filter((x) => x !== i))} style={{ accentColor: "var(--accent)" }} />{d}</label>)}</div></div>
      <div className="st-bar"><Button type="submit" variant="filled" size="md" disabled={pending}>Add slots</Button></div>
    </form>
  );
}

export function InviteForm({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState(""), [role, setRole] = useState("member");
  const { run, pending } = useRun();
  return (
    <form className="st-row" style={{ alignItems: "flex-end" }} onSubmit={(e) => { e.preventDefault(); run(() => createInvite(orgId, email, role), "Invite created", () => setEmail("")); }}>
      <div className="st-field" style={{ flex: "2 1 220px" }}><label className="st-label" htmlFor="ie">Email</label><input id="ie" type="email" className="st-in" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="st-field"><label className="st-label" htmlFor="ir">Role</label><select id="ir" className="st-in" value={role} onChange={(e) => setRole(e.target.value)}><option value="member">Member</option><option value="coach">Coach</option></select></div>
      <Button type="submit" variant="filled" size="md" disabled={pending || !email}>Send invite</Button>
    </form>
  );
}

/** Validated JSON editor for one site setting. */
export function SettingEditor({ k, value }: { k: string; value: unknown }) {
  const [v, setV] = useState(JSON.stringify(value, null, 2));
  const [err, setErr] = useState("");
  const { run, pending } = useRun();
  const check = (s: string) => { setV(s); try { JSON.parse(s); setErr(""); } catch (e) { setErr((e as Error).message); } };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <textarea className="st-in" data-mono="" aria-label={`Value for ${k}`} aria-invalid={!!err || undefined} value={v} onChange={(e) => check(e.target.value)} rows={Math.min(14, v.split("\n").length + 1)} />
      {err && <div className="st-help" role="alert">Invalid JSON: {err}</div>}
      <div className="st-row"><Button variant="filled" size="sm" disabled={pending || !!err} onClick={() => run(() => saveSetting(k, v), "Setting saved")}>Save</Button></div>
    </div>
  );
}
