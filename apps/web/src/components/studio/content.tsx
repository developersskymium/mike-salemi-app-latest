"use client";

import { useMemo, useState } from "react";
import { Button, Chip } from "@/components/ui";
import { useRun } from "@/components/studio/forms";
import {
  saveBadgeBonusVideo, saveFacilitators, saveFulfilment, saveHomework, saveLibraryPicks, saveMikeNote, saveTestimonial,
  replyAsMike, setLeadStatus, setRequestStatus,
} from "@/lib/studio/actions-new";
import type { Result } from "@/lib/studio/actions";
import "./content.css";

/** Client forms for the Nov 20 Studio screens. Validation runs on the server; errors come back as a toast and inline. */

type V = { id: string; title: string; category?: string | null; thumb?: string | null; seconds?: number | null };

function Field({ label, help, children, wide, htmlFor }: { label: string; help?: string; children: React.ReactNode; wide?: boolean; htmlFor?: string }) {
  return (
    <div className="st-field" data-wide={wide ? "" : undefined}>
      <label className="st-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {help && <span className="st-help">{help}</span>}
    </div>
  );
}

function useSave() {
  const { run, pending } = useRun();
  const [err, setErr] = useState<string | null>(null);
  const save = (fn: () => Promise<Result>, ok = "Saved", after?: () => void) => {
    setErr(null);
    run(async () => { const r = await fn(); if (!r.ok) setErr(r.error); return r; }, ok, after);
  };
  return { save, pending, err };
}
const Errs = ({ err }: { err: string | null }) => (err ? <div className="st-errs" role="alert">{err.split(" · ").map((m, i) => <div key={i}>{m}</div>)}</div> : null);

// ------------------------------------------------------------------ Home: Mike's weekly note

export function MikeNoteForm({ note, photos }: { note: { text: string; photo: string; week_of: string; enabled: boolean }; photos: { key: string; src: string; alt: string; fallback?: string }[] }) {
  const [v, setV] = useState(note);
  const { save, pending, err } = useSave();
  return (
    <form className="st-form" onSubmit={(e) => { e.preventDefault(); save(() => saveMikeNote(v)); }} noValidate>
      <Field label="Note" help={`${v.text.length}/600 · Plain words, first person, one idea for the week.`} wide htmlFor="mn-text">
        <textarea id="mn-text" className="st-in" rows={4} value={v.text} onChange={(e) => setV({ ...v, text: e.target.value })} />
      </Field>
      <Field label="Week of" help="The Monday the note is for." htmlFor="mn-week">
        <input id="mn-week" className="st-in" type="date" value={v.week_of} onChange={(e) => setV({ ...v, week_of: e.target.value })} />
      </Field>
      <div className="st-field" style={{ alignContent: "end" }}>
        <label className="st-check"><input type="checkbox" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} /> Show on Home</label>
      </div>
      <div className="st-field" data-wide="">
        <span className="st-label" id="mn-photo">Photo</span>
        <div className="st-photo-grid" role="radiogroup" aria-labelledby="mn-photo">
          <button type="button" role="radio" aria-checked={v.photo === ""} className="st-photo st-photo-none" onClick={() => setV({ ...v, photo: "" })}>No photo</button>
          {photos.map((p) => (
            <button key={p.key} type="button" role="radio" aria-checked={v.photo === p.key} className="st-photo" onClick={() => setV({ ...v, photo: p.key })} title={p.alt}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} loading="lazy" onError={(e) => { if (p.fallback && !e.currentTarget.src.endsWith(p.fallback)) e.currentTarget.src = p.fallback; }} />
              <span>{p.key}</span>
            </button>
          ))}
        </div>
      </div>
      <Errs err={err} />
      <div className="st-bar"><Button type="submit" size="md" disabled={pending}>{pending ? "Saving…" : "Save note"}</Button></div>
    </form>
  );
}

// ------------------------------------------------------------------ Home: Library "Mike's picks"

const mins = (s?: number | null) => (s ? `${Math.round(s / 60)} min` : "");
export function PicksPicker({ month, picked, videos }: { month: string; picked: V[]; videos: V[] }) {
  const [ids, setIds] = useState(picked.map((p) => p.id));
  const [m, setM] = useState(month || new Date().toISOString().slice(0, 7));
  const [q, setQ] = useState("");
  const { save, pending, err } = useSave();
  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);
  const hits = q.trim() ? videos.filter((v) => !ids.includes(v.id) && (v.title + " " + (v.category ?? "")).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 12) : [];
  const move = (i: number, d: number) => setIds((xs) => { const ys = [...xs]; const j = i + d; if (j < 0 || j >= ys.length) return xs; [ys[i], ys[j]] = [ys[j]!, ys[i]!]; return ys; });
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="st-form" data-cols="3">
        <Field label="Month" help="The shelf reads “Mike's picks for …”." htmlFor="pk-month"><input id="pk-month" className="st-in" type="month" value={m} onChange={(e) => setM(e.target.value)} /></Field>
        <Field label="Add a video" help={`${ids.length}/8 picked. Search by title or category.`} htmlFor="pk-q" wide>
          <input id="pk-q" className="st-in" type="search" value={q} placeholder="Search the library" onChange={(e) => setQ(e.target.value)} disabled={ids.length >= 8} />
        </Field>
      </div>
      {hits.length > 0 && (
        <ul className="st-picklist" aria-label="Search results">
          {hits.map((v) => (
            <li key={v.id}><span><b>{v.title}</b> <span className="st-faint">{[v.category, mins(v.seconds)].filter(Boolean).join(" · ")}</span></span>
              <Button type="button" size="sm" variant="glass" icon="plus" onClick={() => { setIds((xs) => (xs.length < 8 ? [...xs, v.id] : xs)); setQ(""); }}>Add</Button></li>
          ))}
        </ul>
      )}
      {ids.length ? (
        <ol className="st-picklist" aria-label="Picked videos">
          {ids.map((id, i) => {
            const v = byId.get(id);
            return (
              <li key={id}>
                <span><span className="st-faint" style={{ marginRight: 8 }}>{i + 1}</span><b>{v?.title ?? "Missing video"}</b> {!v && <Chip size="sm" variant="warm">removed from library</Chip>}</span>
                <span className="st-row" style={{ gap: 2, flexWrap: "nowrap" }}>
                  <button type="button" className="st-iconbtn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button type="button" className="st-iconbtn" aria-label="Move down" disabled={i === ids.length - 1} onClick={() => move(i, 1)}>↓</button>
                  <button type="button" className="st-iconbtn" aria-label={`Remove ${v?.title ?? "video"}`} onClick={() => setIds((xs) => xs.filter((x) => x !== id))}>×</button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : <div className="st-empty">No picks yet. With none, the shelf is hidden in the Library.</div>}
      <Errs err={err} />
      <div className="st-bar"><Button type="button" size="md" disabled={pending} onClick={() => save(() => saveLibraryPicks({ ids, month: m }))}>{pending ? "Saving…" : "Save picks"}</Button></div>
    </div>
  );
}

// ------------------------------------------------------------------ Coaching

export function ReplyBox({ memberId }: { memberId: string }) {
  const [body, setBody] = useState("");
  const { save, pending, err } = useSave();
  return (
    <form className="st-form" data-cols="1" onSubmit={(e) => { e.preventDefault(); save(() => replyAsMike(memberId, body), "Reply sent", () => setBody("")); }}>
      <Field label="Reply as Mike" help="Members see it in their thread and get a notification." htmlFor="rp-body">
        <textarea id="rp-body" className="st-in" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Errs err={err} />
      <div className="st-bar"><Button type="submit" size="md" icon="arrowRight" disabled={pending || !body.trim()}>{pending ? "Sending…" : "Send reply"}</Button></div>
    </form>
  );
}

export function HomeworkForm({ bookingId, homework }: { bookingId: string; homework: string | null }) {
  const [text, setText] = useState(homework ?? "");
  const { save, pending, err } = useSave();
  return (
    <form className="st-form" data-cols="1" onSubmit={(e) => { e.preventDefault(); save(() => saveHomework(bookingId, text.split("\n"))); }}>
      <Field label="Homework items" help="One per line. The member ticks each day they do it. Empty clears it." htmlFor={`hw-${bookingId}`}>
        <textarea id={`hw-${bookingId}`} className="st-in" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Errs err={err} />
      <div className="st-bar"><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save homework"}</Button></div>
    </form>
  );
}

// ------------------------------------------------------------------ Status + note (retreat enquiries, account requests)

export function StatusNote({ kind, id, status, note, options }: { kind: "lead" | "request"; id: string; status: string; note: string | null; options: readonly string[] }) {
  const [s, setS] = useState(status);
  const [n, setN] = useState(note ?? "");
  const { save, pending, err } = useSave();
  const act = kind === "lead" ? setLeadStatus : setRequestStatus;
  return (
    <form className="st-form" data-cols="1" onSubmit={(e) => { e.preventDefault(); save(() => act(id, s, n)); }} style={{ minWidth: 260 }}>
      <select className="st-in" aria-label="Status" value={s} onChange={(e) => setS(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
      </select>
      <textarea className="st-in" aria-label="Note" rows={2} placeholder="Note (staff only)" value={n} onChange={(e) => setN(e.target.value)} />
      <Errs err={err} />
      <div className="st-bar"><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button></div>
    </form>
  );
}

// ------------------------------------------------------------------ Retreats: facilitators, testimonial

type Fac = { name: string; role: string; line: string; photo: string };
export function FacilitatorsForm({ runId, list }: { runId: string; list: Partial<Fac>[] }) {
  const [xs, setXs] = useState<Fac[]>(list.map((f) => ({ name: f.name ?? "", role: f.role ?? "", line: f.line ?? "", photo: f.photo ?? "" })));
  const { save, pending, err } = useSave();
  const set = (i: number, k: keyof Fac, v: string) => setXs((a) => a.map((f, j) => (j === i ? { ...f, [k]: v } : f)));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {xs.map((f, i) => (
        <div key={i} className="st-fac">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {f.photo ? <img src={f.photo} alt="" className="st-fac-photo" /> : <span className="st-fac-photo" aria-hidden />}
          <div className="st-form" data-cols="3" style={{ flex: 1 }}>
            <Field label="Name" htmlFor={`fc-n-${runId}-${i}`}><input id={`fc-n-${runId}-${i}`} className="st-in" value={f.name} onChange={(e) => set(i, "name", e.target.value)} /></Field>
            <Field label="Role" htmlFor={`fc-r-${runId}-${i}`}><input id={`fc-r-${runId}-${i}`} className="st-in" value={f.role} onChange={(e) => set(i, "role", e.target.value)} /></Field>
            <Field label="Photo URL" htmlFor={`fc-p-${runId}-${i}`}><input id={`fc-p-${runId}-${i}`} className="st-in" value={f.photo} placeholder="/media/… or https://…" onChange={(e) => set(i, "photo", e.target.value)} /></Field>
            <Field label="One line" wide htmlFor={`fc-l-${runId}-${i}`}><input id={`fc-l-${runId}-${i}`} className="st-in" value={f.line} onChange={(e) => set(i, "line", e.target.value)} /></Field>
          </div>
          <button type="button" className="st-iconbtn" aria-label={`Remove ${f.name || "facilitator"}`} onClick={() => setXs((a) => a.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {!xs.length && <div className="st-faint">No facilitators listed for this run.</div>}
      <Errs err={err} />
      <div className="st-row">
        <Button type="button" size="sm" variant="glass" icon="plus" onClick={() => setXs((a) => [...a, { name: "", role: "", line: "", photo: "" }])}>Add facilitator</Button>
        <Button type="button" size="sm" disabled={pending} onClick={() => save(() => saveFacilitators(runId, xs))}>{pending ? "Saving…" : "Save facilitators"}</Button>
      </div>
    </div>
  );
}

export function TestimonialForm({ programId, t }: { programId: string; t: { name?: string; line?: string; video_url?: string; poster?: string } | null }) {
  const [v, setV] = useState({ name: t?.name ?? "", line: t?.line ?? "", video_url: t?.video_url ?? "", poster: t?.poster ?? "" });
  const { save, pending, err } = useSave();
  const id = (k: string) => `ts-${programId}-${k}`;
  return (
    <form className="st-form" onSubmit={(e) => { e.preventDefault(); save(() => saveTestimonial(programId, v)); }}>
      <Field label="Video URL" help="A 30-second clip. Empty hides the testimonial." wide htmlFor={id("v")}><input id={id("v")} className="st-in" value={v.video_url} onChange={(e) => setV({ ...v, video_url: e.target.value })} /></Field>
      <Field label="Who" htmlFor={id("n")}><input id={id("n")} className="st-in" value={v.name} placeholder="Name, city" onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Poster image" htmlFor={id("p")}><input id={id("p")} className="st-in" value={v.poster} placeholder="/media/… or https://…" onChange={(e) => setV({ ...v, poster: e.target.value })} /></Field>
      <Field label="Their line" wide htmlFor={id("l")}><textarea id={id("l")} className="st-in" rows={2} value={v.line} onChange={(e) => setV({ ...v, line: e.target.value })} /></Field>
      <Errs err={err} />
      <div className="st-bar"><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save testimonial"}</Button></div>
    </form>
  );
}

// ------------------------------------------------------------------ Shop: fulfilment

export function FulfilmentForm({ o }: { o: { id: string; fulfillment: string | null; tracking_carrier: string | null; tracking_number: string | null; tracking_url: string | null } }) {
  const [v, setV] = useState({ fulfillment: o.fulfillment ?? "", carrier: o.tracking_carrier ?? "", number: o.tracking_number ?? "", url: o.tracking_url ?? "" });
  const { save, pending, err } = useSave();
  const go = (fulfillment: string) => save(() => saveFulfilment({ id: o.id, ...v, fulfillment: fulfillment as never }), fulfillment === "shipped" ? "Marked shipped" : fulfillment === "delivered" ? "Marked delivered" : "Saved", () => setV((x) => ({ ...x, fulfillment })));
  const id = (k: string) => `of-${o.id}-${k}`;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="st-form" data-cols="3">
        <Field label="Carrier" htmlFor={id("c")}><input id={id("c")} className="st-in" value={v.carrier} placeholder="USPS, UPS…" onChange={(e) => setV({ ...v, carrier: e.target.value })} /></Field>
        <Field label="Tracking number" htmlFor={id("n")}><input id={id("n")} className="st-in" value={v.number} onChange={(e) => setV({ ...v, number: e.target.value })} /></Field>
        <Field label="Tracking link" htmlFor={id("u")}><input id={id("u")} className="st-in" value={v.url} placeholder="https://…" onChange={(e) => setV({ ...v, url: e.target.value })} /></Field>
      </div>
      <Errs err={err} />
      <div className="st-row">
        <Button type="button" size="sm" variant="glass" disabled={pending} onClick={() => go(v.fulfillment || "processing")}>Save tracking</Button>
        {v.fulfillment !== "shipped" && v.fulfillment !== "delivered" && <Button type="button" size="sm" disabled={pending} onClick={() => go("shipped")}>Mark shipped</Button>}
        {v.fulfillment === "shipped" && <Button type="button" size="sm" disabled={pending} onClick={() => go("delivered")}>Mark delivered</Button>}
        {(v.fulfillment === "shipped" || v.fulfillment === "delivered") && <Button type="button" size="sm" variant="plain" disabled={pending} onClick={() => go("processing")}>Back to processing</Button>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Badges: bonus video

export function BadgeVideoForm({ badge, videos }: { badge: { id: string; perk: { label?: string; detail?: string | null; video_id?: string } }; videos: V[] }) {
  const [video, setVideo] = useState(badge.perk.video_id ?? "");
  const [label, setLabel] = useState(badge.perk.label ?? "");
  const [detail, setDetail] = useState(badge.perk.detail ?? "");
  const [q, setQ] = useState("");
  const { save, pending, err } = useSave();
  const list = videos.filter((v) => v.id === video || !q.trim() || (v.title + " " + (v.category ?? "")).toLowerCase().includes(q.trim().toLowerCase()));
  const id = (k: string) => `bv-${badge.id}-${k}`;
  return (
    <form className="st-form" onSubmit={(e) => { e.preventDefault(); save(() => saveBadgeBonusVideo(badge.id, video, label, detail)); }}>
      <Field label="Filter videos" htmlFor={id("q")}><input id={id("q")} className="st-in" type="search" value={q} placeholder="Search title" onChange={(e) => setQ(e.target.value)} /></Field>
      <Field label="Bonus video" help="Members who earn the badge get a link straight to it." htmlFor={id("v")}>
        <select id={id("v")} className="st-in" value={video} onChange={(e) => setVideo(e.target.value)}>
          <option value="">Not chosen (links to the Library)</option>
          {list.map((v) => <option key={v.id} value={v.id}>{v.title}{v.category ? ` · ${v.category}` : ""}</option>)}
        </select>
      </Field>
      <Field label="Perk label" htmlFor={id("l")}><input id={id("l")} className="st-in" value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
      <Field label="Perk line" htmlFor={id("d")}><input id={id("d")} className="st-in" value={detail ?? ""} onChange={(e) => setDetail(e.target.value)} /></Field>
      <Errs err={err} />
      <div className="st-bar"><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save perk"}</Button></div>
    </form>
  );
}
