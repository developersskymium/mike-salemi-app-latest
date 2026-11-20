"use client";

import type { IntakeAnswers, IntakeQuestion, IntakeResult } from "@ms/api";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Completion } from "@/components/graphics";
import { AmbientBackdrop, Button, Glass, Icon, IconButton, Rings, StepSegments, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { StartPlanForm } from "@/components/plan/StartPlan";
import { skipOnboarding, submitGoalIntake } from "@/lib/actions/today-plan-you";
import type { OnboardingData } from "@/lib/loaders/today-plan-you";
import { defaultDays } from "./dates";
import { GOAL_ICON, GOAL_PHOTO } from "./model";
import { PHOTOS } from "./photos";
import "./tpy.css";

type Screen = { q: IntakeQuestion; title: string };

/** Apple-style goal setting: one question per screen, big type, glass options, ends in a plan suggestion. */
export function OnboardingFlow({ data }: { data: OnboardingData }) {
  const screens = useMemo<Screen[]>(
    () =>
      data.form.steps.flatMap((s) =>
        s.questions.map((q, i) => ({ q, title: i === 0 && s.title.trim().endsWith("?") ? s.title : q.label })),
      ),
    [data.form.steps],
  );
  // -1 = welcome, 0..n-1 = questions, n = submitting/result
  const [i, setI] = useState(-1);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const n = screens.length;
  const goal = typeof answers.goal_kind === "string" ? answers.goal_kind : null;
  const photo = PHOTOS[GOAL_PHOTO[goal ?? "custom"] ?? "coaching"];
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    body.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
  }, [i]);

  const go = (to: number) => {
    setDir(to < i ? "back" : "fwd");
    setI(to);
  };
  const submit = (final: IntakeAnswers) =>
    start(async () => {
      go(n);
      const res = await submitGoalIntake(data.form.id, final);
      if (!res.ok) {
        toast(res.error === "offline" ? "Preview mode can't save answers." : res.error, { icon: "close" });
        go(n - 1);
        return;
      }
      haptic(14);
      setResult(res.data);
    });
  const next = (final = answers) => (i + 1 >= n ? submit(final) : go(i + 1));
  const set = (id: string, v: IntakeAnswers[string], advance = false) => {
    const a = { ...answers, [id]: v };
    setAnswers(a);
    if (advance) window.setTimeout(() => next(a), 260);
  };
  const skip = async () => {
    await skipOnboarding();
    router.push("/today");
  };

  const cur = i >= 0 && i < n ? screens[i]! : null;
  const canGo = !cur || !cur.q.required || (answers[cur.q.id] !== undefined && answers[cur.q.id] !== "" && !(Array.isArray(answers[cur.q.id]) && !(answers[cur.q.id] as string[]).length));

  return (
    <div className="tpy-ob" role="dialog" aria-modal="true" aria-label="Set your goal" data-shell-focus="">
      <AmbientBackdrop src={photo.src} position={photo.position} />
      <aside className="tpy-ob-photo" aria-hidden>
        <Image src={photo.src} alt="" fill priority sizes="42vw" style={{ objectFit: "cover", objectPosition: photo.src === PHOTOS.coaching.src ? "24% 20%" : photo.position }} placeholder="blur" />
        <span className="tpy-ob-photo-cap">
          <b>Mike Salemi</b>
          <span>A few questions, then a plan built around your week.</span>
        </span>
      </aside>
      <div className="tpy-ob-scrim" />
      <div className="tpy-ob-frame">
        <div className="tpy-ob-top">
          {i > -1 && i <= n && !result ? (
            <IconButton icon="back" label="Back" size="md" onClick={() => go(i - 1)} disabled={pending} />
          ) : (
            <span />
          )}
          {i >= 0 && !result ? <StepSegments total={n} done={Math.min(i, n)} current={i} currentProgress={0.5} label={`Question ${Math.min(i + 1, n)} of ${n}`} /> : <span />}
          {!result ? <Button variant="plain" size="sm" onClick={skip}>Skip</Button> : <span />}
        </div>

        <div className="tpy-ob-body" ref={body} key={result ? "result" : i} data-dir={dir} aria-live="polite">
          {i === -1 && <Welcome name={data.firstName} intro={data.form.introduction} />}
          {cur && <Question s={cur} index={i} total={n} value={answers[cur.q.id]} set={set} onEnter={() => canGo && next()} />}
          {i >= n && !result && (
            <div style={{ display: "grid", justifyItems: "center", gap: 16, textAlign: "center" }}>
              <Completion variant="milestone" size={140} label="Building your plan" />
              <p className="lq-t22">Finding your plan…</p>
            </div>
          )}
          {result && <Suggestion result={result} data={data} answers={answers} />}
        </div>

        <div className="tpy-ob-foot">
          {i === -1 && (
            <Button block size="lg" iconAfter="chevron" onClick={() => go(0)} data-autofocus="">
              Let&apos;s begin
            </Button>
          )}
          {cur && (cur.q.type !== "single" || !cur.q.required) && (
            <Button block size="lg" onClick={() => next()} disabled={!canGo || pending}>
              {answers[cur.q.id] === undefined || answers[cur.q.id] === "" || (Array.isArray(answers[cur.q.id]) && !(answers[cur.q.id] as string[]).length)
                ? cur.q.required ? "Continue" : "Skip this one"
                : i + 1 >= n ? "See my plan" : "Continue"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Welcome({ name, intro }: { name: string; intro: string | null }) {
  return (
    <>
      <Rings size={132} stroke={14} rings={[{ value: 0.78, tone: 1 }, { value: 0.56, tone: 2 }, { value: 0.34, tone: 3 }]} delay={0.3} />
      <div className="tpy-ob-eyebrow">Welcome, {name}</div>
      <h1 className="tpy-ob-q">Let&apos;s set your goal.</h1>
      <p className="lq-t17 lq-c2" style={{ maxWidth: "34ch" }}>{intro}</p>
    </>
  );
}

function Question({
  s, index, total, value, set, onEnter,
}: {
  s: Screen;
  index: number;
  total: number;
  value: IntakeAnswers[string] | undefined;
  set: (id: string, v: IntakeAnswers[string], advance?: boolean) => void;
  onEnter: () => void;
}) {
  const { q } = s;
  const opts = q.options ?? [];
  const numeric = q.type === "single" && opts.length > 0 && opts.every((o) => /^\d+$/.test(o.label));
  return (
    <>
      <div className="tpy-ob-eyebrow lq-num">{index + 1} of {total}</div>
      <h1 className="tpy-ob-q" id={`q-${q.id}`}>{s.title}</h1>
      {q.help && <p className="lq-t15 lq-c2" style={{ marginTop: -10 }}>{q.help}</p>}

      {q.type === "single" && numeric && (
        <div className="tpy-ob-num" role="radiogroup" aria-labelledby={`q-${q.id}`}>
          {opts.map((o, k) => (
            <Glass as="button" key={o.value} interactive radius="panel" className="tpy-ob-opt" role="radio" aria-checked={value === o.value}
              onClick={() => { haptic(6); set(q.id, o.value, true); }}>
              <span className="lq-num">{o.label}</span>
              <small>days</small>
            </Glass>
          ))}
        </div>
      )}

      {q.type === "single" && !numeric && (
        <div className="tpy-ob-opts" data-grid={opts.length > 4 ? "" : undefined} role="radiogroup" aria-labelledby={`q-${q.id}`}>
          {opts.map((o, k) => (
            <Glass as="button" key={o.value} interactive radius="panel" className="tpy-ob-opt" role="radio" aria-checked={value === o.value}
              onClick={() => { haptic(6); set(q.id, o.value, true); }}>
              {GOAL_ICON[o.value] && q.id === "goal_kind" && <span className="tpy-row-icon" aria-hidden><Icon name={GOAL_ICON[o.value]!} size="sm" /></span>}
              <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span className="lq-t17">{o.label}</span>
                {o.description && <span className="lq-t13 lq-c2">{o.description}</span>}
              </span>
              <span className="tpy-ob-mark" aria-hidden>{value === o.value && <Icon name="check" size="xs" />}</span>
            </Glass>
          ))}
        </div>
      )}

      {q.type === "multi" && (
        <div className="tpy-ob-opts" data-grid={opts.length > 4 ? "" : undefined} role="group" aria-labelledby={`q-${q.id}`}>
          {opts.map((o, k) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const on = arr.includes(o.value);
            return (
              <Glass as="button" key={o.value} interactive radius="panel" className="tpy-ob-opt" aria-pressed={on}
                  onClick={() => { haptic(6); set(q.id, on ? arr.filter((x) => x !== o.value) : [...arr, o.value]); }}>
                <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <span className="lq-t17">{o.label}</span>
                  {o.description && <span className="lq-t13 lq-c2">{o.description}</span>}
                </span>
                <span className="tpy-ob-mark" aria-hidden>{on && <Icon name="check" size="xs" />}</span>
              </Glass>
            );
          })}
        </div>
      )}

      {q.type === "date" && (
        <input className="tpy-ob-input" type="date" aria-labelledby={`q-${q.id}`} data-autofocus="" value={typeof value === "string" ? value : ""}
          onChange={(e) => set(q.id, e.target.value || null)} onKeyDown={(e) => e.key === "Enter" && onEnter()} />
      )}

      {(q.type === "text" || q.type === "number") && (
        <textarea className="tpy-ob-input" aria-labelledby={`q-${q.id}`} data-autofocus="" value={typeof value === "string" ? value : ""}
          placeholder="Type here" onChange={(e) => set(q.id, e.target.value)} />
      )}
    </>
  );
}

function Suggestion({ result, data, answers }: { result: IntakeResult; data: OnboardingData; answers: IntakeAnswers }) {
  const router = useRouter();
  const t = result.suggested_template ?? data.templates.find((x) => x.goal_kind === result.goal_kind) ?? null;
  const photo = PHOTOS[GOAL_PHOTO[result.goal_kind ?? "custom"] ?? "coaching"];
  const days = defaultDays(Number(answers.days_per_week ?? t?.days_per_week ?? 3));
  const custom = result.approach === "custom";
  return (
    <>
      <div className="tpy-ob-eyebrow">Your plan</div>
      <h1 className="tpy-ob-q">{custom ? "Let's build it together." : "Here's where to start."}</h1>
      {t && (
        <section className="tpy-plancard" aria-label={t.name}>
          <div className="lq-media">
            <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 640px) 600px, 100vw" style={{ objectFit: "cover", objectPosition: photo.position }} placeholder="blur" />
          </div>
          <Glass level="clear" radius="panel">
            <div className="lq-t13" style={{ fontWeight: 600, opacity: 0.9 }}>{custom ? "Or follow Mike's plan" : "Suggested for you"} · {t.weeks} weeks · {t.days_per_week} days a week</div>
            <div className="lq-t28" style={{ marginTop: 2 }}>{t.name}</div>
            {t.description && <p className="lq-t15" style={{ marginTop: 6, opacity: 0.94 }}>{t.description}</p>}
          </Glass>
        </section>
      )}
      {!custom && t ? (
        <StartPlanForm templateId={t.id} initialDays={days} today={data.today} onStarted={() => router.push("/today")} />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <Button block size="lg" icon="plan" href="/plan?build=1">Build my plan</Button>
          {t && <Button block variant="glass" href="/plan/new">See Mike&apos;s plans</Button>}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: -6 }}>
        {!custom && <Button variant="plain" size="sm" href="/plan?build=1">Build my own instead</Button>}
        <Button variant="plain" size="sm" href="/today">Not now</Button>
      </div>
    </>
  );
}
