"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Chip, Icon, useToast } from "@/components/ui";
import { ChipChoice, ChoiceRows, StepFlow, Stepper, useAutosave, type StepFlowStep } from "@/components/ui/form";
import { completeOnboarding, saveFormDraft, skipOnboardingNow } from "@/lib/settings/actions";
import { EQUIPMENT, EXPERIENCE, GOALS, recommend, SESSION_LENGTHS, WEEKDAYS, type Recommendation, type TrainingProfile } from "@/lib/settings/model";
import "@/components/ui/form/form.css";
import "./onboarding.css";

type Photo = { src: string; position: string; alt: string };

/**
 * Onboarding in 4 screens (goal → experience → days → equipment). Writes the training profile,
 * then shows one recommendation with its reason and a preview. Autosaves; resumes where you left off.
 */
export function Onboarding({ firstName, initial, next, photos }: { firstName: string; initial: TrainingProfile; next: string | null; photos: Record<string, Photo> }) {
  const [p, setP] = useState<TrainingProfile>(initial);
  const [screen, setScreen] = useState(0);
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
    setScreen(restored.step);
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

  const steps: StepFlowStep[] = [
    {
      id: "goal",
      group: "a",
      title: `What matters most right now, ${firstName}?`,
      lede: "Pick one. You can change it any time.",
      valid: Boolean(p.goal_kind),
      body: <ChoiceRows labelledBy="fm-q-goal" columns={2} options={GOALS.map((g) => ({ value: g.value, label: g.label, description: g.description, photo: { src: g.photo, position: g.position } }))} value={p.goal_kind} onChange={(v) => set({ goal_kind: v as string })} />,
    },
    {
      id: "experience",
      group: "a",
      title: "How much have you trained with kettlebells?",
      valid: p.kb_experience != null,
      body: (
        <ChoiceRows labelledBy="fm-q-experience" columns={2} options={EXPERIENCE.map((e) => ({ value: e.value, label: e.label, description: e.description }))} value={p.kb_experience != null ? String(p.kb_experience) : null}
          onChange={(v) => { const n = Number(v); set({ kb_experience: n, kb_level: n >= 3 ? "advanced" : n >= 2 ? "intermediate" : "beginner" }); }} />
      ),
    },
    {
      id: "days",
      group: "b",
      title: "How many days a week can you train?",
      lede: "Honest beats ambitious. Three is a great start.",
      valid: Boolean(p.days_per_week),
      body: (
        <div className="ob-days">
          <Stepper label="Days" min={1} max={7} value={p.days_per_week ?? 3} onChange={(n) => set({ days_per_week: n })} format={(n) => `${n} day${n === 1 ? "" : "s"}`} />
          <span className="fm-label" id="ob-wd">Best days <span className="fm-opt">(optional)</span></span>
          <ChipChoice<string> size="sm" multiple labelledBy="ob-wd" options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: WEEKDAYS[d]! }))} value={(p.training_days ?? []).map(String)}
            onChange={(v) => { const arr = (v as string[]).map(Number); set({ training_days: arr, days_per_week: arr.length || p.days_per_week }); }} />
          <span className="fm-label" id="ob-len">Time per session</span>
          <ChipChoice<string> size="sm" labelledBy="ob-len" options={SESSION_LENGTHS.map((m) => ({ value: String(m), label: `${m} min` }))} value={String(p.session_minutes ?? 30)} onChange={(v) => set({ session_minutes: Number(v) })} />
        </div>
      ),
    },
    {
      id: "equipment",
      group: "b",
      title: "What do you have to train with?",
      lede: "Tick all that apply. No bell yet? That's fine.",
      valid: true,
      body: <ChipChoice<string> multiple labelledBy="fm-q-equipment" options={EQUIPMENT.map((e) => ({ value: e.value, label: e.label }))} value={p.equipment ?? []} onChange={(v) => set({ equipment: v as string[] })} />,
    },
  ];

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

  return (
    <div className="ob" data-shell-focus="">
      <aside className="ob-photo" aria-hidden>
        <Image src={(rec?.photo ?? photos.__hero)!.src} alt="" fill priority sizes="(min-width: 960px) 42vw, 1px" style={{ objectFit: "cover", objectPosition: (rec?.photo ?? photos.__hero)!.position }} />
        <span className="ob-wordmark">Mike Salemi</span>
      </aside>
      <main className="ob-main" id="main">
        {!rec && (
          <div className="ob-skip">
            <Button variant="plain" size="sm" onClick={skip} disabled={pending}>Skip for now</Button>
          </div>
        )}
        {rec ? <Result rec={rec} next={next} /> : <StepFlow steps={steps} screen={screen} onScreen={go} onDone={finish} doneLabel="See my recommendation" pending={pending} secondsPerStep={15} />}
      </main>
    </div>
  );
}

function Result({ rec, next }: { rec: Recommendation; next: string | null }) {
  return (
    <div className="ob-result" aria-live="polite">
      <span className="lq-eyebrow" data-tone="accent">Your best next step</span>
      <h1 className="fm-q">Start with {rec.title}.</h1>
      <p className="fm-q-lede">{rec.reason}</p>
      <article className="ob-rec">
        <div className="ob-rec-media">
          <Image src={rec.photo.src} alt={rec.photo.alt} fill sizes="(min-width: 960px) 560px, 100vw" style={{ objectFit: "cover", objectPosition: rec.photo.position }} />
        </div>
        <div className="ob-rec-body">
          <div className="ob-rec-facts">{rec.facts.map((f) => <Chip key={f} size="sm" variant="fill">{f}</Chip>)}</div>
          <p className="ob-rec-note"><Icon name="check" size="xs" /> Saved to your training profile. Every program uses it, so you won&apos;t be asked twice.</p>
        </div>
      </article>
      <div className="ob-result-actions">
        <Button block size="lg" href={rec.href}>Preview {rec.title.split(" · ")[0]}</Button>
        <Button block size="md" variant="plain" href={next ?? "/programs"}>{next ? "Continue where I was going" : "See all programs"}</Button>
      </div>
    </div>
  );
}
