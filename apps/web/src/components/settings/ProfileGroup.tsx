"use client";

import { useState } from "react";
import { Button, Sheet } from "@/components/ui";
import { ChipChoice, ChoiceRows, Field, Stepper } from "@/components/ui/form";
import { saveOwnedBells, saveProfile } from "@/lib/settings/actions";
import {
  BELL_SIZES_KG, bellLabel, EQUIPMENT, EQUIPMENT_LABEL, EXPERIENCE, EXPERIENCE_LABEL, GOAL_LABEL, GOALS, SESSION_LENGTHS, WEEKDAYS,
  type TrainingProfile, type Units,
} from "@/lib/settings/model";
import { Group, Row, useSave } from "./parts";

type Key = "goal" | "experience" | "days" | "length" | "equipment" | "limits";

const SOURCE: Record<string, string> = {
  "goal-setting": "your goal setup", onboarding: "onboarding", "kbl-intake": "the KBL intake", "a4l-intake": "the A4L intake",
  "mtk-intake": "the MTK intake", "working-in-intake": "the Working In intake", profile: "Settings", settings: "Settings",
};

/**
 * Training profile — the single source every intake prefills from (training_profiles, 0025).
 * Each row opens one small sheet with the same chips/choices the intakes use.
 */
export function ProfileGroup({ profile: initial, sources, units, ownedBells: initialBells }: { profile: TrainingProfile; sources: Record<string, string>; units: Units; ownedBells: number[] }) {
  const [p, setP] = useState<TrainingProfile>(initial);
  const [bells, setBells] = useState<number[]>(initialBells);
  const [open, setOpen] = useState<Key | null>(null);
  const [draft, setDraft] = useState<TrainingProfile>({});
  const { save, pending } = useSave();

  const edit = (k: Key) => {
    setDraft(p);
    setOpen(k);
  };
  const commit = () => {
    const before = p;
    const patch: TrainingProfile = {};
    for (const k of Object.keys(draft) as (keyof TrainingProfile)[]) if (JSON.stringify(draft[k]) !== JSON.stringify(p[k])) (patch as Record<string, unknown>)[k] = draft[k];
    setOpen(null);
    if (!Object.keys(patch).length) return;
    save(() => setP({ ...p, ...patch }), () => setP(before), () => saveProfile(patch), "Profile updated");
  };
  const from = (k: keyof TrainingProfile) => (sources[k] ? `From ${SOURCE[sources[k]!] ?? "an intake"}` : undefined);
  const days = p.training_days?.length ? p.training_days.map((d) => WEEKDAYS[d]).join(" · ") : null;
  const exp = p.kb_experience != null ? EXPERIENCE_LABEL[String(p.kb_experience)] : null;
  const toggleBell = (kg: number) => {
    const next = bells.includes(kg) ? bells.filter((b) => b !== kg) : [...bells, kg].sort((a, b) => a - b);
    const before = bells;
    save(() => setBells(next), () => setBells(before), () => saveOwnedBells(next), "");
  };

  return (
    <Group id="profile" title="Training profile" lede="One profile for every program. Intakes fill in from here, so you only answer once.">
      <Row label="Main goal" detail={from("goal_kind")} onClick={() => edit("goal")}>
        <span className="st-value">{(p.goal_kind && GOAL_LABEL[p.goal_kind]) ?? "Not set"}</span>
      </Row>
      <Row label="Kettlebell experience" detail={from("kb_experience") ?? from("kb_level")} onClick={() => edit("experience")}>
        <span className="st-value">{exp ?? (p.kb_level ? p.kb_level[0]!.toUpperCase() + p.kb_level.slice(1) : "Not set")}</span>
      </Row>
      <Row label="Days a week" detail={days ?? from("days_per_week")} onClick={() => edit("days")}>
        <span className="st-value lq-num">{p.days_per_week ?? "—"}</span>
      </Row>
      <Row label="Session length" onClick={() => edit("length")}>
        <span className="st-value lq-num">{p.session_minutes ? `${p.session_minutes} min` : "—"}</span>
      </Row>
      <Row label="Equipment" detail={from("equipment")} onClick={() => edit("equipment")}>
        <span className="st-value st-value-wrap">{p.equipment?.length ? p.equipment.map((e) => EQUIPMENT_LABEL[e] ?? e).join(", ") : "Not set"}</span>
      </Row>
      <Row label="Kettlebells I own" detail="Tap the bells you have. Programs suggest weights from these." stack>
        <ChipChoice<string>
          size="sm"
          multiple
          label="Kettlebells I own"
          options={BELL_SIZES_KG.map((kg) => ({ value: String(kg), label: bellLabel(kg, units) }))}
          value={bells.map(String)}
          onChange={(v) => {
            const arr = (v as string[]).map(Number);
            const changed = arr.find((x) => !bells.includes(x)) ?? bells.find((x) => !arr.includes(x));
            if (changed != null) toggleBell(changed);
          }}
        />
      </Row>
      <Row label={<>Limits &amp; injuries</>} detail={p.limitations || "None noted"} onClick={() => edit("limits")}>
        <span className="st-value">Edit</span>
      </Row>

      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={{ goal: "Main goal", experience: "Kettlebell experience", days: "Training days", length: "Session length", equipment: "Equipment", limits: "Limits & injuries" }[open ?? "goal"]}
        detents={["medium", "large"]}
        footer={<Button block size="lg" onClick={commit} disabled={pending}>Save</Button>}
      >
        <div className="st-sheet">
          {open === "goal" && (
            <ChoiceRows label="Main goal" options={GOALS.map((g) => ({ value: g.value, label: g.label, description: g.description, icon: g.icon }))} value={draft.goal_kind} onChange={(v) => setDraft({ ...draft, goal_kind: v as string })} />
          )}
          {open === "experience" && (
            <ChoiceRows label="Kettlebell experience" options={EXPERIENCE.map((e) => ({ value: e.value, label: e.label, description: e.description }))} value={draft.kb_experience != null ? String(draft.kb_experience) : null}
              onChange={(v) => { const n = Number(v); setDraft({ ...draft, kb_experience: n, kb_level: n >= 3 ? "advanced" : n >= 2 ? "intermediate" : "beginner" }); }} />
          )}
          {open === "days" && (
            <>
              <div className="st-sheet-row">
                <span className="fm-label">Days a week</span>
                <Stepper label="Days" min={1} max={7} value={draft.days_per_week ?? 3} onChange={(n) => setDraft({ ...draft, days_per_week: n })} />
              </div>
              <span className="fm-label" id="st-wd">Which days suit you? <span className="fm-opt">(optional)</span></span>
              <ChipChoice<string> multiple labelledBy="st-wd" options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: WEEKDAYS[d]! }))} value={(draft.training_days ?? []).map(String)}
                onChange={(v) => { const arr = (v as string[]).map(Number); setDraft({ ...draft, training_days: arr, days_per_week: arr.length || draft.days_per_week }); }} />
            </>
          )}
          {open === "length" && (
            <ChipChoice<string> label="Session length" options={SESSION_LENGTHS.map((m) => ({ value: String(m), label: `${m} min` }))} value={draft.session_minutes ? String(draft.session_minutes) : null} onChange={(v) => setDraft({ ...draft, session_minutes: Number(v) })} />
          )}
          {open === "equipment" && (
            <ChipChoice<string> multiple label="Equipment" options={EQUIPMENT.map((e) => ({ value: e.value, label: e.label }))} value={draft.equipment ?? []} onChange={(v) => setDraft({ ...draft, equipment: v as string[] })} />
          )}
          {open === "limits" && (
            <Field label="Anything Mike should know?" optional hint="Old injuries, tight spots, things your doctor said." why="Mike uses this to suggest safer swaps and lighter days. Only you and Mike's coaching team can see it.">
              {(ids) => <textarea {...ids} maxLength={600} value={draft.limitations ?? ""} onChange={(e) => setDraft({ ...draft, limitations: e.target.value })} />}
            </Field>
          )}
        </div>
      </Sheet>
    </Group>
  );
}
