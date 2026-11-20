"use client";

import { useState } from "react";
import { Button, Chip } from "@/components/ui";
import { saveRecord } from "@/lib/studio/actions";
import { PLACEMENTS, TARGET_KINDS } from "@/lib/studio/tables";
import { useRun } from "./forms";
import { Panel } from "./ui";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Opt = { id: string; name: string };
const KINDS = [
  ["always", "Always (any member who qualifies by audience)"], ["completed", "Member completed a program, path or phase"], ["tool_result", "Member got a tool result"],
  ["run_booked", "Member booked a retreat or run"], ["run_upcoming", "A booked run is starting soon"], ["inactive_days", "Member has been inactive"], ["intake_answer", "Member gave a specific intake answer"],
] as const;

/** Rules editor: trigger presets, audience, placements, target, creative and caps. Writes the same JSON the offer engine reads. */
export function OfferForm({ offer, programs, plans }: { offer: Row | null; programs: Opt[]; plans: Opt[] }) {
  const o = offer ?? {};
  const t = (o.trigger ?? { kind: "always" }) as Row;
  const [name, setName] = useState<string>(o.name ?? "");
  const [active, setActive] = useState<boolean>(o.is_active ?? false);
  const [priority, setPriority] = useState(String(o.priority ?? 50));
  const [kind, setKind] = useState<string>(t.kind ?? "always");
  const [tp, setTp] = useState<Row>({ scope: t.scope ?? "program", program_id: t.program_id ?? "", path_id: t.path_id ?? "", tool_id: t.tool_id ?? "", result: t.result ?? "", days: t.days ?? "7", key: t.key ?? "", value: t.value ?? "" });
  const aud = (o.audience ?? {}) as Row;
  const [audPlans, setAudPlans] = useState<string[]>(aud.plans ?? []);
  const { plans: _p, ...rest } = aud; void _p;
  const [audExtra, setAudExtra] = useState(Object.keys(rest).length ? JSON.stringify(rest, null, 2) : "");
  const [places, setPlaces] = useState<string[]>(o.placements ?? ["today"]);
  const [tk, setTk] = useState<string>(o.target_kind ?? "url");
  const [tr, setTr] = useState<string>(o.target_ref ?? "");
  const [headline, setHeadline] = useState<string>(o.headline ?? "");
  const [body, setBody] = useState<string>(o.body ?? "");
  const [cta, setCta] = useState<string>(o.cta_label ?? "Learn more");
  const [img, setImg] = useState<string>(o.image_url ?? "");
  const [maxViews, setMaxViews] = useState(String(o.max_views ?? 5));
  const [cool, setCool] = useState(String(o.cooldown_days ?? 3));
  const [starts, setStarts] = useState<string>((o.starts_at ?? "").slice(0, 16));
  const [ends, setEnds] = useState<string>((o.ends_at ?? "").slice(0, 16));
  const [errs, setErrs] = useState<string[]>([]);
  const { run, pending, router } = useRun();

  const trigger = (() => {
    switch (kind) {
      case "completed": return { kind, scope: tp.scope, ...(tp.program_id ? { program_id: tp.program_id } : {}), ...(tp.path_id ? { path_id: tp.path_id } : {}) };
      case "tool_result": return { kind, tool_id: tp.tool_id, ...(tp.result ? { result: tp.result } : {}) };
      case "run_booked": return { kind, ...(tp.program_id ? { program_id: tp.program_id } : {}) };
      case "run_upcoming": return { kind, ...(tp.program_id ? { program_id: tp.program_id } : {}), days: Number(tp.days) || 7 };
      case "inactive_days": return { kind, days: Number(tp.days) || 7 };
      case "intake_answer": return { kind, key: tp.key, value: tp.value };
      default: return { kind: "always" };
    }
  })();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrs([]);
    let extra = {};
    if (audExtra.trim()) { try { extra = JSON.parse(audExtra); } catch { setErrs(["Audience extras are not valid JSON."]); return; } }
    const audience = { ...extra, ...(audPlans.length ? { plans: audPlans } : {}) };
    const values = { name, is_active: active, priority, trigger: JSON.stringify(trigger), audience: JSON.stringify(audience), placements: places.join("\n"), target_kind: tk, target_ref: tr, headline, body, cta_label: cta, image_url: img, max_views: maxViews, cooldown_days: cool, starts_at: starts, ends_at: ends };
    run(async () => { const r = await saveRecord("offers", offer ? { id: o.id } : null, values); if (!r.ok) setErrs(r.error.split(" · ")); return r; }, "Offer saved", (r) => { if (!offer && r.id) router.push(`/studio/offers/${r.id}`); });
  };
  const tog = (xs: string[], x: string, on: boolean) => (on ? [...xs, x] : xs.filter((y) => y !== x));
  const sel = (id: string, label: string, val: string, set: (v: string) => void, opts: { value: string; label: string }[], none?: string) => (
    <div className="st-field"><label className="st-label" htmlFor={id}>{label}</label><select id={id} className="st-in" value={val} onChange={(e) => set(e.target.value)}>{none !== undefined && <option value="">{none}</option>}{opts.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
  );
  const txt = (id: string, label: string, val: string, set: (v: string) => void, help?: string, type = "text") => (
    <div className="st-field"><label className="st-label" htmlFor={id}>{label}</label><input id={id} type={type} className="st-in" value={val} onChange={(e) => set(e.target.value)} />{help && <span className="st-help">{help}</span>}</div>
  );
  const progOpts = programs.map((p) => ({ value: p.id, label: p.name }));

  return (
    <form onSubmit={submit} noValidate>
      <Panel title="1 · Name and priority">
        <div className="st-form" data-cols="3">
          {txt("on", "Internal name", name, setName)}{txt("op", "Priority", priority, setPriority, "Lower number wins when several offers qualify.", "number")}
          <label className="st-check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />Active</label>
        </div>
      </Panel>
      <Panel title="2 · When" meta="trigger">
        <div className="st-form" data-cols="3">
          <div className="st-field" data-wide="">{sel("ok", "Trigger", kind, setKind, KINDS.map(([v, l]) => ({ value: v, label: l })))}</div>
          {kind === "completed" && <>{sel("os", "Completed", tp.scope, (v) => setTp({ ...tp, scope: v }), ["program", "path", "phase"].map((v) => ({ value: v, label: v })))}{sel("opr", "Program", tp.program_id, (v) => setTp({ ...tp, program_id: v }), progOpts, "Any")}{txt("opa", "Path id or key", tp.path_id, (v) => setTp({ ...tp, path_id: v }), "Only for path scope.")}</>}
          {kind === "tool_result" && <>{txt("ot", "Tool id", tp.tool_id, (v) => setTp({ ...tp, tool_id: v }))}{txt("or", "Result", tp.result, (v) => setTp({ ...tp, result: v }), "Optional: a specific result.")}</>}
          {(kind === "run_booked" || kind === "run_upcoming") && sel("opr2", "Program", tp.program_id, (v) => setTp({ ...tp, program_id: v }), progOpts, "Any")}
          {(kind === "run_upcoming" || kind === "inactive_days") && txt("od", "Days", String(tp.days), (v) => setTp({ ...tp, days: v }), undefined, "number")}
          {kind === "intake_answer" && <>{txt("ok2", "Question key", tp.key, (v) => setTp({ ...tp, key: v }))}{txt("ov", "Answer", tp.value, (v) => setTp({ ...tp, value: v }))}</>}
        </div>
        <pre className="st-help" style={{ marginTop: 10 }}>{JSON.stringify(trigger)}</pre>
      </Panel>
      <Panel title="3 · Who" meta="audience">
        <div className="st-row" style={{ gap: 14 }}><span className="st-label">Plans</span>{plans.map((p) => <label key={p.id} className="st-check" style={{ minHeight: 28 }}><input type="checkbox" checked={audPlans.includes(p.id)} onChange={(e) => setAudPlans(tog(audPlans, p.id, e.target.checked))} style={{ accentColor: "var(--accent)" }} />{p.name}</label>)}<span className="st-help">None ticked means every member.</span></div>
        <div className="st-field" style={{ marginTop: 12 }}><label className="st-label" htmlFor="oae">Other rules <i>· JSON, e.g. {"{"}&quot;lacks_path&quot;: [id]{"}"}</i></label><textarea id="oae" className="st-in" data-mono="" rows={3} value={audExtra} onChange={(e) => setAudExtra(e.target.value)} /></div>
      </Panel>
      <Panel title="4 · Where" meta="placements">
        <div className="st-row">{PLACEMENTS.map((p) => <Chip key={p} variant={places.includes(p) ? "tint" : "outline"} role="checkbox" aria-checked={places.includes(p)} tabIndex={0} style={{ cursor: "pointer" }} onClick={() => setPlaces(tog(places, p, !places.includes(p)))} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setPlaces(tog(places, p, !places.includes(p))); } }}>{p.replace(/_/g, " ")}</Chip>)}</div>
      </Panel>
      <Panel title="5 · What" meta="target and creative">
        <div className="st-form" data-cols="2">
          {sel("otk", "Target kind", tk, setTk, TARGET_KINDS.map((v) => ({ value: v, label: v })))}
          {tk === "program" ? sel("otr", "Program", tr, setTr, progOpts, "Choose…") : tk === "plan" ? sel("otr", "Plan", tr, setTr, plans.map((p) => ({ value: p.id, label: p.name })), "Choose…") : txt("otr", tk === "url" ? "Link" : "Target id", tr, setTr, tk === "url" ? "A path like /programs/… or a full URL." : undefined)}
          {txt("oh", "Headline", headline, setHeadline)}{txt("oc", "Button label", cta, setCta)}
          <div className="st-field" data-wide=""><label className="st-label" htmlFor="ob">Body</label><textarea id="ob" className="st-in" rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <div data-wide="" style={{ gridColumn: "1 / -1" }}>{txt("oi", "Image URL (optional)", img, setImg)}</div>
        </div>
      </Panel>
      <Panel title="6 · Limits" meta="caps and schedule">
        <div className="st-form" data-cols="3">
          {txt("omv", "Max views per member", maxViews, setMaxViews, undefined, "number")}{txt("ocd", "Cooldown (days)", cool, setCool, "Wait this long after a dismiss.", "number")}<span />
          {txt("osa", "Starts", starts, setStarts, undefined, "datetime-local")}{txt("oen", "Ends", ends, setEnds, undefined, "datetime-local")}
        </div>
      </Panel>
      {errs.length > 0 && <div className="st-errs" role="alert" style={{ marginBottom: 12 }}>{errs.map((m, i) => <div key={i}>{m}</div>)}</div>}
      <div className="st-row" style={{ justifyContent: "flex-end" }}><Button type="submit" variant="filled" size="md" disabled={pending}>{pending ? "Saving…" : offer ? "Save offer" : "Create offer"}</Button></div>
    </form>
  );
}
