"use client";

import { useState } from "react";
import { Button, Chip, Glass } from "@/components/ui";
import { createProgram } from "@/lib/studio/actions";
import { CATALOG_GROUPS, CONTENT_STATUS, MODES, PROGRAM_TYPES, TABLES, type Field } from "@/lib/studio/tables";
import { FieldInput, useRun } from "./forms";

const F = (n: string) => (TABLES.programs.fields as readonly Field[]).find((f) => f.name === n)!;
const STEPS = ["Basics", "Modes and labels", "Words", "Imagery and notes"] as const;
const PRESETS: Record<string, { section: string; lesson: string; modes: string[]; group: string }> = {
  day_program: { section: "Phase", lesson: "Day", modes: ["immersion", "self_guided", "library"], group: "training" },
  course: { section: "Section", lesson: "Lesson", modes: ["self_guided", "library"], group: "training" },
  challenge: { section: "Week", lesson: "Day", modes: ["self_guided"], group: "experiences" },
  live: { section: "Session", lesson: "Session", modes: ["self_guided"], group: "experiences" },
  retreat: { section: "Section", lesson: "Lesson", modes: [], group: "experiences" },
  coaching: { section: "Section", lesson: "Lesson", modes: [], group: "experiences" },
  tool: { section: "Section", lesson: "Lesson", modes: ["self_guided"], group: "free" },
  bundle: { section: "Section", lesson: "Lesson", modes: [], group: "training" },
};
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function NewProgram() {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Record<string, string | boolean>>({ name: "", slug: "", type: "course", status: "draft", catalog_group: "training", section_label: "Section", lesson_label: "Lesson", is_free: false, is_listed: true, sequence_locked: false, tagline: "", summary: "", description: "", highlights: "", draft_note: "", format_label: "", duration_label: "" });
  const [modes, setModes] = useState<string[]>(["self_guided", "library"]);
  const [def, setDef] = useState("self_guided");
  const [img, setImg] = useState({ hero: "", card: "" });
  const [errs, setErrs] = useState<string[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const { run, pending, router } = useRun();
  const set = (k: string) => (x: string | boolean) => setV((o) => {
    const n = { ...o, [k]: x };
    if (k === "name" && !slugTouched) n.slug = slugify(String(x));
    if (k === "slug") setSlugTouched(true);
    if (k === "type") { const p = PRESETS[String(x)]!; n.section_label = p.section; n.lesson_label = p.lesson; n.catalog_group = p.group; setModes(p.modes); setDef(p.modes[0] ?? ""); }
    return n;
  });
  const field = (n: string) => <FieldInput key={n} f={F(n)} value={v[n] ?? ""} onChange={set(n)} invalid={errs.some((m) => m.startsWith(F(n).label))} />;
  const submit = () => {
    setErrs([]);
    run(async () => { const r = await createProgram(v, modes, def, img); if (!r.ok) setErrs(r.error.split(" · ")); return r; }, "Program created as a draft", (r) => r.id && router.push(`/studio/programs/${r.id}`));
  };
  return (
    <Glass className="st-panel" style={{ maxWidth: 820 }}>
      <div className="st-row" style={{ marginBottom: 18 }} role="list" aria-label="Steps">
        {STEPS.map((s, i) => <Chip key={s} role="listitem" variant={i === step ? "tint" : i < step ? "fill" : "outline"} onClick={() => setStep(i)} style={{ cursor: "pointer" }} aria-current={i === step ? "step" : undefined}>{i + 1}. {s}</Chip>)}
      </div>
      <div className="st-form" data-cols="2">
        {step === 0 && <>{field("name")}{field("slug")}{field("type")}{field("catalog_group")}{field("status")}</>}
        {step === 1 && (
          <>
            <div className="st-field" data-wide="">
              <span className="st-label">Learning modes</span>
              <div className="st-row">
                {MODES.map((m) => (
                  <label key={m} className="st-check"><input type="checkbox" checked={modes.includes(m)} onChange={(e) => { const n = e.target.checked ? [...modes, m] : modes.filter((x) => x !== m); setModes(n); if (!n.includes(def)) setDef(n[0] ?? ""); }} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />{m.replace("_", "-")}</label>
                ))}
              </div>
              <span className="st-help">Immersion walks day by day, self-guided lets members jump around, library is video-only.</span>
            </div>
            <div className="st-field"><label className="st-label" htmlFor="dm">Default mode</label>
              <select id="dm" className="st-in" value={def} onChange={(e) => setDef(e.target.value)} disabled={!modes.length}>{modes.map((m) => <option key={m} value={m}>{m.replace("_", "-")}</option>)}</select></div>
            {field("section_label")}{field("lesson_label")}{field("is_free")}{field("sequence_locked")}{field("is_listed")}
          </>
        )}
        {step === 2 && <>{field("tagline")}{field("level")}{field("summary")}{field("description")}{field("highlights")}{field("format_label")}{field("duration_label")}</>}
        {step === 3 && (
          <>
            <div className="st-field" data-wide=""><label className="st-label" htmlFor="hero">Hero image URL <i>· optional</i></label><input id="hero" className="st-in" value={img.hero} onChange={(e) => setImg({ ...img, hero: e.target.value })} placeholder="/media/… or https://…" /></div>
            <div className="st-field" data-wide=""><label className="st-label" htmlFor="card">Card image URL <i>· optional</i></label><input id="card" className="st-in" value={img.card} onChange={(e) => setImg({ ...img, card: e.target.value })} placeholder="/media/… or https://…" /></div>
            {field("draft_note")}
          </>
        )}
        {errs.length > 0 && <div className="st-errs" role="alert">{errs.map((m, i) => <div key={i}>{m}</div>)}</div>}
        <div className="st-bar">
          {step > 0 && <Button type="button" variant="glass" size="md" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < STEPS.length - 1 ? <Button type="button" variant="glass" size="md" onClick={() => setStep(step + 1)}>Next</Button> : null}
          <Button type="button" variant="filled" size="md" disabled={pending} onClick={submit}>{pending ? "Creating…" : "Create program"}</Button>
        </div>
      </div>
    </Glass>
  );
}
