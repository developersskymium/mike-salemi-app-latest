"use client";

import type { TrainingProfile } from "@ms/api";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, useToast } from "@/components/ui";
import { saveTrainingProfileAction } from "@/lib/actions/plan";
import "./profile.css";

const GOALS = [
  { v: "strength", l: "Strength" }, { v: "technique", l: "Technique" }, { v: "mobility", l: "Mobility" },
  { v: "conditioning", l: "Conditioning" }, { v: "mindset", l: "Mindset" }, { v: "retreat_prep", l: "Retreat prep" },
];
const LEVELS = [{ v: "beginner", l: "Beginner" }, { v: "intermediate", l: "Intermediate" }, { v: "advanced", l: "Advanced" }] as const;
const EXPERIENCE = ["New", "Some", "Regular", "Experienced"];
const MINUTES = [15, 30, 45, 60];
const EQUIPMENT = ["One kettlebell", "Two kettlebells (a pair)", "Several kettlebells", "Pull-up bar", "Mat and floor space", "Full gym"];
const WD = [{ d: 1, l: "M" }, { d: 2, l: "T" }, { d: 3, l: "W" }, { d: 4, l: "T" }, { d: 5, l: "F" }, { d: 6, l: "S" }, { d: 0, l: "S" }];
const WD_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * The training profile — the single source every intake prefills from (spec 11 #1, spec 12 Settings #2).
 * Reusable: the Plan page's settings and the Settings page embed this same component.
 * Chips over typing; one Save; answers write through `save_training_profile`.
 */
export function TrainingProfileEditor({ initial, onSaved, title = "Training profile" }: { initial: TrainingProfile; onSaved?: (p: TrainingProfile) => void; title?: string | null }) {
  const [p, setP] = useState<TrainingProfile>(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const set = <K extends keyof TrainingProfile>(k: K, v: TrainingProfile[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };
  const days = p.training_days ?? [];
  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort();
    setP((x) => ({ ...x, training_days: next, days_per_week: next.length || x.days_per_week }));
    setDirty(true);
  };
  const toggleEq = (e: string) => set("equipment", (p.equipment ?? []).includes(e) ? (p.equipment ?? []).filter((x) => x !== e) : [...(p.equipment ?? []), e]);
  const save = () =>
    start(async () => {
      const r = await saveTrainingProfileAction(p);
      if (!r.ok) return void toast(r.error === "offline" ? "Preview mode can't save. It works on the live app." : r.error, { icon: "close" });
      setDirty(false);
      toast("Profile saved — your intakes will use it", { tone: "success", icon: "check" });
      onSaved?.(r.data);
      router.refresh();
    });

  return (
    <div className="tpe">
      {title && <h3 className="tpe-h">{title}</h3>}
      <Field label="Main goal">
        <Chips options={GOALS} value={p.goal_kind} onPick={(v) => set("goal_kind", v)} />
      </Field>
      <Field label="Training days" hint={days.length ? `${days.length} a week · ${days.map((d) => WD_NAME[d]!.slice(0, 3)).join(", ")}` : p.days_per_week ? `${p.days_per_week} a week` : "Tap your usual days"}>
        <div className="tpe-days" role="group" aria-label="Training days">
          {WD.map((w) => (
            <button key={w.d} type="button" className="tpe-day" aria-pressed={days.includes(w.d)} aria-label={WD_NAME[w.d]} onClick={() => toggleDay(w.d)}>{w.l}</button>
          ))}
        </div>
      </Field>
      <Field label="Session length">
        <Chips options={MINUTES.map((m) => ({ v: String(m), l: `${m} min` }))} value={p.session_minutes ? String(p.session_minutes) : undefined} onPick={(v) => set("session_minutes", Number(v))} />
      </Field>
      <Field label="Kettlebell level">
        <Chips options={LEVELS as unknown as { v: string; l: string }[]} value={p.kb_level} onPick={(v) => set("kb_level", v as TrainingProfile["kb_level"])} />
      </Field>
      <Field label="Kettlebell experience">
        <Chips options={EXPERIENCE.map((l, i) => ({ v: String(i), l }))} value={p.kb_experience != null ? String(p.kb_experience) : undefined} onPick={(v) => set("kb_experience", Number(v))} />
      </Field>
      <Field label="Equipment">
        <div className="tpe-chips" role="group" aria-label="Equipment">
          {EQUIPMENT.map((e) => (
            <button key={e} type="button" className="tpe-chip" aria-pressed={(p.equipment ?? []).includes(e)} onClick={() => toggleEq(e)}>{e}</button>
          ))}
        </div>
      </Field>
      <Field label="Kettlebells you own" hint="e.g. 12 kg, 16 kg pair">
        <input className="tpe-input" value={p.bell_weights ?? ""} maxLength={120} onChange={(e) => set("bell_weights", e.target.value)} aria-label="Kettlebells you own" />
      </Field>
      <Field label="Injuries or limits" hint="Why we ask: Mike's guidance avoids what hurts.">
        <textarea className="tpe-input tpe-text" value={p.limitations ?? ""} maxLength={1000} onChange={(e) => set("limitations", e.target.value)} aria-label="Injuries or limits" />
      </Field>
      <div className="tpe-foot">
        <Button size="md" onClick={save} disabled={!dirty || pending} aria-busy={pending || undefined}>{dirty ? "Save profile" : "Saved"}</Button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="tpe-f">
      <div className="tpe-l">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </div>
  );
}

function Chips({ options, value, onPick }: { options: { v: string; l: string }[]; value?: string; onPick: (v: string) => void }) {
  return (
    <div className="tpe-chips" role="radiogroup">
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className="tpe-chip" onClick={() => onPick(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}
