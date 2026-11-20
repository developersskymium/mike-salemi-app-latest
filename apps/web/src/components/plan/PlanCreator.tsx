"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DayGlyph } from "@/components/graphics";
import { Button, Glass, Icon, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { previewCreatedPlan, saveCreatedPlan, type CreatedPlan, type CreatorInput } from "@/lib/actions/plan";
import type { LessonCatalog } from "@/lib/loaders/today-plan-you";
import { defaultDays } from "@/components/today/dates";
import { dayTypeOf, lessonHref, splitDayTitle } from "@/components/today/model";
import { DayPicker } from "./StartPlan";
import type { TrainingProfile } from "@ms/api";
import "@/components/today/tpy.css";
import "./pln.css";

const GOALS: { value: CreatorInput["goal"]; label: string; title: string }[] = [
  { value: "strength", label: "Strength", title: "Build real kettlebell strength" },
  { value: "technique", label: "Technique", title: "Clean up my technique" },
  { value: "mobility", label: "Mobility", title: "Move and recover better" },
  { value: "conditioning", label: "Conditioning", title: "Build my engine" },
  { value: "mindset", label: "Mindset", title: "Train with presence" },
  { value: "retreat_prep", label: "Retreat prep", title: "Get ready for the retreat" },
  { value: "custom", label: "My own", title: "Build consistent strength and movement practice" },
];

const title = (t: string) => {
  const { day, name } = splitDayTitle(t);
  return day ? `Day ${day} · ${name}` : name;
};
const dateLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function Num({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void }) {
  return (
    <label className="pln-field">
      <span>{label}</span>
      <input className="pln-input lq-num" type="number" inputMode="numeric" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))} />
    </label>
  );
}

/**
 * L11 plan creator: sticky form (goal, weeks / days / minutes, experience, programs, equipment,
 * recovery, constraints, start date) → result (overview + Save and schedule, week accordions with the
 * real lessons and why each is there) → saved plans.
 */
export function PlanCreator({ catalog, today, saved, profile }: { catalog: LessonCatalog; today: string; saved: { id: string; name: string; sessions: number }[]; profile?: TrainingProfile | null }) {
  // Defaults come from the training profile: preferred weekdays, days a week and session length.
  const prefDays = profile?.training_days?.length ? profile.training_days : profile?.days_per_week ? defaultDays(Math.min(6, Math.max(2, profile.days_per_week))) : defaultDays(3);
  const [form, setForm] = useState<CreatorInput>({
    goal: "strength",
    title: GOALS[0]!.title,
    weeks: 4,
    daysPerWeek: Math.min(6, Math.max(2, prefDays.length)),
    minutes: Math.min(120, Math.max(10, profile?.session_minutes ?? 35)),
    experience: "intermediate",
    programIds: catalog.programs.slice(0, 2).map((p) => p.id),
    trainingDays: prefDays,
    equipment: "One kettlebell",
    recovery: "",
    constraints: "",
    startDate: today,
  });
  const [plan, setPlan] = useState<CreatedPlan | null>(null);
  const [pending, start] = useTransition();
  const [saving, startSave] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const set = (patch: Partial<CreatorInput>) => setForm((f) => ({ ...f, ...patch }));
  const weeks = useMemo(() => (plan ? Array.from({ length: plan.weeks }, (_, i) => plan.sessions.filter((s) => s.week === i + 1)) : []), [plan]);
  const ready = form.programIds.length > 0 && form.title.trim().length >= 2 && form.trainingDays.length > 0;

  const create = () =>
    start(async () => {
      const r = await previewCreatedPlan(form);
      if (!r.ok) return void toast(r.error, { icon: "close" });
      haptic(12);
      setPlan(r.data);
      if (window.matchMedia("(max-width: 1099px)").matches) document.getElementById("pln-cr-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  const save = () =>
    startSave(async () => {
      const r = await saveCreatedPlan(form);
      if (!r.ok) return void toast(r.error === "offline" ? "Preview mode can't save plans. It works on the live app." : r.error, { icon: "close" });
      haptic(16);
      toast("Plan saved to your calendar", { tone: "success", icon: "check" });
      router.push(`/plan?plan=${r.data}`);
    });

  return (
    <div className="pln-cr">
      <Glass as="form" radius="card" className="pln-cr-form" aria-label="Plan details" onSubmit={(e: React.FormEvent) => { e.preventDefault(); if (ready) create(); }}>
        <fieldset className="pln-field">
          <legend>Primary goal</legend>
          <div className="pln-goals" role="group" aria-label="Goal">
            {GOALS.map((g) => (
              <button key={g.value} type="button" className="pln-goal" aria-pressed={form.goal === g.value} onClick={() => set({ goal: g.value, title: GOALS.some((x) => x.title === form.title) ? g.title : form.title })}>{g.label}</button>
            ))}
          </div>
          <input className="pln-input" aria-label="Describe your goal" value={form.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} />
        </fieldset>
        <div className="pln-3up">
          <Num label="Weeks" value={form.weeks} min={2} max={8} onChange={(weeks) => set({ weeks })} />
          <Num label="Days / week" value={form.daysPerWeek} min={2} max={6} onChange={(daysPerWeek) => set({ daysPerWeek, trainingDays: defaultDays(daysPerWeek) })} />
          <Num label="Minutes" value={form.minutes} min={10} max={120} step={5} onChange={(minutes) => set({ minutes })} />
        </div>
        <div className="pln-field">
          <span>Training days</span>
          <DayPicker value={form.trainingDays} onChange={(d) => set({ trainingDays: d, daysPerWeek: Math.max(2, Math.min(6, d.length || 2)) })} />
        </div>
        <label className="pln-field">
          <span>Experience</span>
          <select className="pln-input" value={form.experience} onChange={(e) => set({ experience: e.target.value as CreatorInput["experience"] })}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <fieldset className="pln-field">
          <legend>Programs</legend>
          <div className="pln-progs">
            {catalog.programs.map((p) => {
              const on = form.programIds.includes(p.id);
              return (
                <label key={p.id} className="pln-prog">
                  <input type="checkbox" checked={on} onChange={() => set({ programIds: on ? form.programIds.filter((x) => x !== p.id) : [...form.programIds, p.id] })} />
                  <span>{p.name}</span>
                  <small className="lq-num">{p.lessons.length}</small>
                </label>
              );
            })}
            {!catalog.programs.length && <p className="pln-sub" style={{ padding: 10 }}>Start or unlock a program and its lessons can be planned here.</p>}
          </div>
        </fieldset>
        <label className="pln-field"><span>Equipment</span><input className="pln-input" value={form.equipment} maxLength={200} onChange={(e) => set({ equipment: e.target.value })} /></label>
        <label className="pln-field"><span>Recovery needs</span><textarea className="pln-input" value={form.recovery} maxLength={500} placeholder="e.g. Sore lower back after long work days" onChange={(e) => set({ recovery: e.target.value })} /></label>
        <label className="pln-field"><span>Constraints</span><textarea className="pln-input" value={form.constraints} maxLength={1000} placeholder="e.g. Travelling the second week" onChange={(e) => set({ constraints: e.target.value })} /></label>
        <label className="pln-field"><span>Start date</span><input className="pln-input lq-num" type="date" min={today} value={form.startDate} onChange={(e) => e.target.value && set({ startDate: e.target.value })} /></label>
        <Button type="submit" block icon={pending ? undefined : "sparkle"} disabled={pending || !ready} variant={plan ? "fill" : "filled"}>
          {pending ? "Creating…" : plan ? "Regenerate plan" : "Create my plan"}
        </Button>
      </Glass>

      <div className="pln-cr-results" id="pln-cr-results" aria-live="polite">
        {!plan ? (
          <div className="pln-cr-empty">
            <div>
              <span className="pln-next-glyph" style={{ margin: "0 auto" }} aria-hidden><Icon name="sparkle" /></span>
              <h2>Your pathway will appear here</h2>
              <p>A weekly rhythm, real lessons you can open today, recovery between hard days and the reason each session belongs.</p>
            </div>
          </div>
        ) : (
          <>
            <Glass as="section" radius="card" className="pln-cr-ov" aria-labelledby="pln-cr-t">
              <span className="pln-eyebrow">Your {plan.weeks}-week pathway</span>
              <h2 id="pln-cr-t">{form.title}</h2>
              <p>{plan.overview}</p>
              <div className="pln-sync">
                <Button icon={saving ? undefined : "calendar"} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save and schedule"}</Button>
              </div>
            </Glass>
            {weeks.map((list, i) => (
              <Glass as="details" key={i} radius="card" className="pln-week" open={i === 0}>
                <summary>
                  <span><b>Week {i + 1}</b><small className="lq-num">{list.length} sessions</small></span>
                  <Icon name="chevron" size="sm" />
                </summary>
                {list.map((s) => {
                  const dt = dayTypeOf(null, s.title, s.kind);
                  return (
                    <Link key={`${s.week}-${s.session}`} className="pln-sess" data-kind={s.kind} href={s.lessonId ? lessonHref(s.programSlug, s.lessonId) : "/plan"}>
                      <span className="pln-sess-n lq-num" aria-hidden>{dt && s.kind !== "recovery" ? <DayGlyph type={dt} size={20} tone="mono" /> : s.session}</span>
                      <span className="pln-sess-main">
                        <span className="pln-sess-t">{title(s.title)}</span>
                        <span className="pln-sess-m">{dateLabel(s.date)} · {[s.programName, s.note].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="pln-sess-m">{s.minutes}m</span>
                    </Link>
                  );
                })}
              </Glass>
            ))}
          </>
        )}
        {saved.length > 0 && (
          <section aria-labelledby="pln-saved-t">
            <h2 id="pln-saved-t" className="tpy-section-title">Saved plans</h2>
            <div className="pln-saved">
              {saved.slice(0, 4).map((s) => (
                <Glass key={s.id} as={Link} href={`/plan/${s.id}`} radius="card" interactive className="pln-plancard">
                  <h3 className="pln-h3">{s.name}</h3>
                  <p className="pln-sub lq-num">{s.sessions} scheduled sessions</p>
                </Glass>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
