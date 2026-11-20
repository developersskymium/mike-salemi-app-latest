"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type React from "react";
import { Button, Chip, Icon, useToast } from "@/components/ui";
import { useAutosave } from "@/components/ui/form";
import { Kettlebell } from "@/components/graphics";
import { IntakeArt } from "@/components/intake/IntakeArt";
import { ChoiceCards, NumberStepper, QuestionShell } from "@/components/intake/QuestionShell";
import { completeOnboarding, saveFormDraft, skipOnboardingNow } from "@/lib/settings/actions";
import { EQUIPMENT, EXPERIENCE, GOALS, recommend, SESSION_LENGTHS, WEEKDAYS, type Recommendation, type TrainingProfile } from "@/lib/settings/model";
import "./onboarding.css";

const SCREENS = ["goal", "experience", "days", "weekdays", "length", "equipment"] as const;

type Photo = { src: string; position: string; alt: string };

/**
 * Onboarding, one question per screen (goal → experience → days → best days → length → equipment). Writes the training profile,
 * then shows one recommendation with its reason and a preview. Autosaves; resumes where you left off.
 */
export function Onboarding({ firstName, initial, next, photos }: { firstName: string; initial: TrainingProfile; next: string | null; photos: Record<string, Photo> }) {
  const [p, setP] = useState<TrainingProfile>(initial);
  const [screen, setScreen] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [rec, setRec] = useState<Recommendation | null>(null);
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
    const r = recommend(profile, photoFor);
    start(async () => {
      const res = await completeOnboarding(profile, r.slug);
      if (!res.ok) {
        toast(res.error, { icon: "close" });
        return;
      }
      clear();
      setRec(r);
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

  if (rec) {
    return (
      <div className="ob" data-shell-focus="">
        <QuestionShell at={total - 1} total={total} sceneKey="rec" art={<IntakeArt topic="plan" />} eyebrow={<span className="qs-tag">Saved to your training profile</span>}
          title="Here’s your plan" help={<p>{rec.reason}</p>}
          footer={<><Button block size="lg" href={rec.href}>Start with {rec.title.split(" · ")[0]}</Button><Button block size="md" variant="plain" href={next ?? "/programs"}>{next ? "Continue where I was going" : "See all programs"}</Button></>}>
          <article className="ob-rec">
            <div className="ob-rec-media">
              <Image src={rec.photo.src} alt={rec.photo.alt} fill sizes="(min-width: 640px) 520px, 100vw" style={{ objectFit: "cover", objectPosition: rec.photo.position }} />
            </div>
            <div className="ob-rec-body">
              <b className="ob-rec-t">{rec.title}</b>
              <div className="ob-rec-facts">{rec.facts.map((f) => <Chip key={f} size="sm" variant="fill">{f}</Chip>)}</div>
            </div>
          </article>
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
      <QuestionShell {...shell} art={<IntakeArt topic="equipment" />} title="What do you have to train with?" help={<p>Tick all that apply. No bell yet? That&apos;s fine.</p>} footer={cont("See my recommendation")}>
        <ChoiceCards label="Equipment" multi value={p.equipment ?? []} options={EQUIPMENT.map((e) => ({ value: e.value, label: e.label }))}
          onPick={(v) => { const cur = p.equipment ?? []; set({ equipment: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }); }} />
      </QuestionShell>
    );
  return <div className="ob" data-shell-focus="">{body}</div>;
}
