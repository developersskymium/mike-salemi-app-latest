"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type React from "react";
import { Button, Icon, useToast } from "@/components/ui";
import { useAutosave } from "@/components/ui/form";
import { Kettlebell } from "@/components/graphics";
import { IntakeArt } from "@/components/intake/IntakeArt";
import { ChoiceCards, NumberStepper, QsCheck, QuestionShell } from "@/components/intake/QuestionShell";
import { completeOnboarding, saveFormDraft, skipOnboardingNow } from "@/lib/settings/actions";
import { EQUIPMENT, EXPERIENCE, GOALS, SESSION_LENGTHS, suggest, WEEKDAYS, type Recommendation, type TrainingProfile } from "@/lib/settings/model";
import "./onboarding.css";

const SCREENS = ["goal", "experience", "days", "weekdays", "length", "equipment"] as const;

type Photo = { src: string; position: string; alt: string };
type Access = { label: string; tone: "open" | "buy" | "upgrade" };

/**
 * Onboarding, one question per screen (goal → experience → days → best days → length → equipment). Writes the training profile,
 * marks onboarding complete, then suggests two or three programs (best fit first, one-line reason, access) that the member can
 * open now or decide on later. Picking one opens the program's home (its own intake/schedule, prefilled), never a lesson.
 * Autosaves; resumes where you left off.
 */
export function Onboarding({ firstName, initial, next, photos, access = {} }: { firstName: string; initial: TrainingProfile; next: string | null; photos: Record<string, Photo>; access?: Record<string, Access> }) {
  const [p, setP] = useState<TrainingProfile>(initial);
  const [screen, setScreen] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [pick, setPick] = useState(0);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const { restored, save, clear } = useAutosave<TrainingProfile>("onboarding", { remote: (k, d) => saveFormDraft(k, d) });
  const photoFor = useMemo(() => (slug: string) => photos[slug] ?? photos["kettlebell-lifestyle"]!, [photos]);

  useEffect(() => {
    if (!restored) return;
    // One-time restore of an autosaved draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setP((cur) => ({ ...cur, ...restored.answers }));
    setScreen(Math.min(Math.max(0, restored.step | 0), SCREENS.length - 1));
  }, [restored]);

  const set = (patch: TrainingProfile) => {
    const nextP = { ...p, ...patch };
    setP(nextP);
    save(nextP, screen);
  };
  const go = (i: number) => {
    setScreen(i);
    save(p, i);
  };

  const finish = () => {
    const profile: TrainingProfile = { ...p, days_per_week: p.days_per_week ?? 3, session_minutes: p.session_minutes ?? 30 };
    const list = suggest(profile, photoFor);
    start(async () => {
      // Finishing marks onboarding complete (completed_at), so "Decide later" or leaving here never sends the member back.
      const res = await completeOnboarding(profile, list[0]!.slug, list.map((r) => ({ slug: r.slug, reason: r.reason })));
      if (!res.ok) {
        toast(res.error, { icon: "close" });
        return;
      }
      clear();
      setPick(0);
      setRecs(list);
    });
  };

  const skip = () =>
    start(async () => {
      await skipOnboardingNow();
      clear();
      router.push(next ?? "/today");
    });

  const total = SCREENS.length + 1;
  const at = Math.min(screen, SCREENS.length - 1);
  const id = SCREENS[at]!;
  const advance = () => go(Math.min(screen + 1, SCREENS.length));
  const pickAndGo = (patch: TrainingProfile) => {
    set(patch);
    window.setTimeout(() => {
      setDir("fwd");
      setScreen((s) => {
        const n = Math.min(s + 1, SCREENS.length - 1);
        return n;
      });
    }, 250);
  };
  const back = screen > 0 ? () => { setDir("back"); go(screen - 1); } : undefined;
  const fwd = () => { setDir("fwd"); if (screen >= SCREENS.length - 1) finish(); else advance(); };
  const close = { label: "Skip for now", onClick: skip, disabled: pending };
  const cont = (label = "Continue", disabled = false) => <Button block size="lg" onClick={fwd} disabled={disabled || pending} aria-busy={pending || undefined}>{label}</Button>;

  if (recs) {
    const chosen = recs[pick] ?? recs[0]!;
    return (
      <div className="ob ob-sum" data-shell-focus="">
        <QuestionShell at={total - 1} total={total} sceneKey="rec" art={<IntakeArt topic="plan" />} eyebrow={<span className="qs-tag">Based on your answers</span>}
          title="A few good places to start" help={<p>You can start any of these now or decide later. Your answers are saved.</p>}
          footer={<><Button block size="lg" href={chosen.href}>Open {chosen.title}</Button><Button block size="md" variant="plain" href={next ?? "/today"}>Decide later</Button></>}>
          <div className="qs-cards ob-sg" role="radiogroup" aria-label="Suggested programs">
            {recs.map((r, i) => {
              const a = access[r.slug];
              const on = i === pick;
              return (
                <button key={r.slug} type="button" role="radio" aria-checked={on} className="qs-card ob-sg-card" onClick={() => setPick(i)} style={{ animationDelay: `${120 + i * 50}ms` }}>
                  <span className="ob-sg-ph" aria-hidden>
                    <Image src={r.photo.src} alt="" fill sizes="72px" style={{ objectFit: "cover", objectPosition: r.photo.position }} />
                  </span>
                  <span className="qs-card-t ob-sg-t">
                    {i === 0 && <em className="ob-sg-best">Best fit</em>}
                    <b>{r.title}</b>
                    <small>{r.reason}</small>
                    {a && <span className="ob-sg-access" data-tone={a.tone}>{a.tone === "open" ? <Icon name="check" size="xs" /> : null}{a.label}</span>}
                  </span>
                  <span className="qs-mark" aria-hidden><QsCheck /></span>
                </button>
              );
            })}
          </div>
        </QuestionShell>
      </div>
    );
  }

  const shell = { at, total, onBack: back, close, sceneKey: id, dir, context: restored && at === 0 ? "Picking up where you left off" : undefined };
  let body: React.ReactNode = null;
  if (id === "goal")
    body = (
      <QuestionShell {...shell} art={<IntakeArt topic="goal" />} title={`What matters most right now, ${firstName}?`} help={<p>Pick one. You can change it any time.</p>} footer={p.goal_kind ? cont() : undefined}>
        <ChoiceCards label="Goal" value={p.goal_kind ?? undefined} options={GOALS.map((g) => ({ value: g.value, label: g.label, hint: g.description, icon: <Icon name={g.icon as never} size="sm" /> }))} onPick={(v) => pickAndGo({ goal_kind: v })} />
      </QuestionShell>
    );
  else if (id === "experience")
    body = (
      <QuestionShell {...shell} art={<IntakeArt topic="experience" />} title="How much have you trained with kettlebells?" footer={p.kb_experience != null ? cont() : undefined}>
        <ChoiceCards label="Experience" value={p.kb_experience != null ? String(p.kb_experience) : undefined}
          options={EXPERIENCE.map((e, i) => ({ value: e.value, label: e.label, hint: e.description, icon: <Kettlebell size={14 + i * 3} variant="line" /> }))}
          onPick={(v) => { const n = Number(v); pickAndGo({ kb_experience: n, kb_level: n >= 3 ? "advanced" : n >= 2 ? "intermediate" : "beginner" }); }} />
      </QuestionShell>
    );
  else if (id === "days")
    body = (
      <QuestionShell {...shell} art={<IntakeArt topic="days" />} title="How many days a week can you train?" help={<p>Honest beats ambitious. Three is a great start.</p>} footer={cont()}>
        <NumberStepper label="Days" min={1} max={7} value={p.days_per_week ?? 3} onChange={(n) => set({ days_per_week: n })} format={(n) => `${n} day${n === 1 ? "" : "s"}`} />
      </QuestionShell>
    );
  else if (id === "weekdays")
    body = (
      <QuestionShell {...shell} art={<IntakeArt topic="days" />} title="Which days suit you best?" help={<p>Optional. We&apos;ll nudge you on these days.</p>} footer={cont((p.training_days ?? []).length ? "Continue" : "Skip this")}>
        <ChoiceCards label="Best days" multi value={(p.training_days ?? []).map(String)} options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: WEEKDAYS[d]! }))}
          onPick={(v) => { const cur = (p.training_days ?? []).map(String); const arr = (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).map(Number); set({ training_days: arr, days_per_week: arr.length || p.days_per_week }); }} />
      </QuestionShell>
    );
  else if (id === "length")
    body = (
      <QuestionShell {...shell} art={<IntakeArt topic="time" />} title="How long is a session for you?" footer={p.session_minutes ? cont() : undefined}>
        <ChoiceCards label="Time per session" value={p.session_minutes ? String(p.session_minutes) : undefined}
          options={SESSION_LENGTHS.map((m) => ({ value: String(m), label: `${m} minutes`, hint: m <= 15 ? "A focused dose" : m <= 30 ? "The sweet spot for most" : m <= 45 ? "Room for skill work" : "A full session" }))}
          onPick={(v) => pickAndGo({ session_minutes: Number(v) })} />
      </QuestionShell>
    );
  else
    body = (
      <QuestionShell {...shell} art={<IntakeArt topic="equipment" />} title="What do you have to train with?" help={<p>Tick all that apply. No bell yet? That&apos;s fine.</p>} footer={cont("See my suggestions")}>
        <ChoiceCards label="Equipment" multi value={p.equipment ?? []} options={EQUIPMENT.map((e) => ({ value: e.value, label: e.label }))}
          onPick={(v) => { const cur = p.equipment ?? []; set({ equipment: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }); }} />
      </QuestionShell>
    );
  return <div className="ob" data-shell-focus="">{body}</div>;
}
