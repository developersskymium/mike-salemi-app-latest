"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IntakeQuestion, IntakeResult } from "@ms/api";
import { Button, Sheet, useToast } from "@/components/ui";
import { submitIntakeAction } from "@/lib/actions/intake";
import { coverFor } from "@/lib/covers";
import { resolveJourney } from "@/lib/journey";
import type { IntakeAttempt, IntakePageData } from "@/lib/loaders/course";
import { IntakeReview, KblResult } from "./IntakeReview";
import { artFor, IntakeArt } from "./IntakeArt";
import { ChoiceCards, NumberStepper, QuestionShell } from "./QuestionShell";
import "./intake.css";
import "../journey/accent.css";

type Answers = Record<string, string | string[]>;
type View = { kind: "flow"; fresh: boolean } | { kind: "done"; attempt: IntakeAttempt };

export function programHref(p: IntakePageData["program"]) {
  return p.type === "course" ? `/programs/${p.slug}/course` : `/programs/${p.slug}`;
}

const answered = (q: IntakeQuestion, v: Answers[string] | undefined) => (Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim()));

/**
 * Program intake (legacy §L13/§L14): one step per screen with a sticky header (back · program · k/n)
 * and the rail, options as rows, a single footer action. Answers are drafted on this device so a
 * member can leave and come back; every save is a new attempt (earlier ones are kept).
 */
/**
 * Summit: on desktop the intake sits beside a full-colour photo of Mike for the program, with
 * the steps listed so the member always knows how much is left. Hidden on phones.
 */
function IntakePhoto({ data, steps, at }: { data: IntakePageData; steps: string[]; at: number }) {
  const cover = coverFor(data.program.slug, data.program.image);
  const lead = data.kind === "kbl" ? "Thirteen short steps place you in the right level." : data.kind === "mtk" ? "Two minutes, then Mike recommends where to start." : "A few questions so Mike's guidance fits where you are.";
  return (
    <aside className="itk-photo" aria-hidden>
      <Image src={cover.src} alt="" fill sizes="40vw" priority style={{ objectPosition: cover.focal }} />
      <div className="itk-photo-in">
        <p className="itk-photo-e">{data.kind === "mtk" ? "Assessment" : "Program intake"} · {data.program.name}</p>
        <p className="itk-photo-t">{lead}</p>
        <ol className="itk-photo-steps">
          {steps.map((t, i) => (
            <li key={`${i}-${t}`} data-s={i < at ? "done" : i === at ? "now" : undefined}>
              <span>{i < at ? "✓" : i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

export function IntakeFlow({ data, start }: { data: IntakePageData; start: "flow" | "review" | "fresh" }) {
  const theme = resolveJourney(data.program.slug).theme;
  const router = useRouter();
  const toast = useToast();
  const prefill = data.prefill ?? null;
  const filled = useMemo(() => new Set(prefill?.filled ?? []), [prefill]);
  // Ask only what the profile doesn't already know; "Edit" brings every step back.
  const [editing, setEditing] = useState(start === "flow" && !!data.latest);
  const steps = useMemo(() => {
    const all = data.form.steps;
    if (editing || !filled.size) return all;
    const open = all.filter((st) => !st.questions.every((q) => filled.has(q.id)));
    return open.length ? open : all.slice(-1);
  }, [data.form.steps, editing, filled]);
  const skipped = data.form.steps.length - steps.length;
  // One question per screen: every open step is split into its questions (prefilled ones show preselected).
  const screens = useMemo(
    () => steps.flatMap((st) => st.questions.map((q, i) => ({ step: st, q, first: i === 0, last: i === st.questions.length - 1 }))),
    [steps],
  );
  const draftKey = `intake-draft:${data.form.key ?? data.form.id}`;
  const [view, setView] = useState<View>(() =>
    start === "review" && data.latest ? { kind: "done", attempt: data.latest } : { kind: "flow", fresh: start === "fresh" || !data.latest },
  );
  const [answers, setAnswers] = useState<Answers>(() =>
    start === "fresh" || !data.latest ? ({ ...(prefill?.answers ?? {}) } as Answers) : ({ ...(prefill?.answers ?? {}), ...(data.latest.answers as Answers) } as Answers),
  );
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [restored, setRestored] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);

  // Resume a draft from this device. This must run after hydration (the server has no localStorage) and
  // before the draft-saving effect below overwrites it, so it stays a mount effect on purpose.
  useEffect(() => {
    if (view.kind !== "flow") return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as { answers: Answers; step: number };
      // A draft that only holds the profile prefill isn't "your answers from last time".
      if (d && Object.keys(d.answers ?? {}).some((k) => !filled.has(k))) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser storage after hydration
        setAnswers(d.answers);
        setStep(Math.min(Math.max(0, d.step | 0), screens.length));
        setRestored(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (view.kind !== "flow") return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ answers, step }));
    } catch {}
  }, [answers, step, view.kind, draftKey]);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [step, view.kind]);

  const curQ = screens[Math.min(step, screens.length - 1)]?.q;
  const missing = step < screens.length && !!curQ?.required && !answered(curQ, answers[curQ.id]);

  const choose = (q: IntakeQuestion, value: string) => {
    setError(null);
    setAnswers((a) => {
      if (q.type === "multi") {
        const list = Array.isArray(a[q.id]) ? (a[q.id] as string[]) : [];
        // "None in particular" / "Not sure" style options clear the others.
        const exclusive = /^(none|not sure|unsure)/i.test(value);
        const next = list.includes(value) ? list.filter((x) => x !== value) : exclusive ? [value] : [...list.filter((x) => !/^(none|not sure)/i.test(x)), value];
        return { ...a, [q.id]: next };
      }
      return { ...a, [q.id]: value };
    });
    // Single-question single-choice screens advance by themselves (iOS-style).
    if (q.type === "single") {
      window.setTimeout(() => {
        setDir("fwd");
        setStep((s) => Math.min(s + 1, screens.length));
      }, 250);
    }
  };

  const save = async () => {
    setSaving(true);
    const r = await submitIntakeAction(data.form.id, answers, data.program.slug, data.form.key);
    setSaving(false);
    if (!r.ok) {
      toast(r.message);
      return;
    }
    try {
      window.localStorage.removeItem(draftKey);
    } catch {}
    if (data.kind === "mtk") {
      router.push("/mtk/results");
      return;
    }
    toast("Program intake saved", { tone: "success" });
    setView({ kind: "done", attempt: { id: r.result.response_id, answers, result: r.result as IntakeResult, createdAt: new Date().toISOString() } });
  };

  const next = () => {
    if (missing) {
      setError("Please answer this question to continue.");
      return;
    }
    setError(null);
    if (step >= screens.length) void save();
    else {
      setDir("fwd");
      setStep((s) => Math.min(s + 1, screens.length));
    }
  };

  const startFresh = () => {
    setConfirm(false);
    setAnswers({ ...(prefill?.answers ?? {}) } as Answers);
    setStep(0);
    setView({ kind: "flow", fresh: true });
    try {
      window.localStorage.removeItem(draftKey);
    } catch {}
    toast("Starting a new attempt — earlier answers are kept");
  };

  if (view.kind === "done") {
    const props = {
      data,
      attempt: view.attempt,
      attempts: data.latest && view.attempt.id === data.latest.id ? data.attempts : data.attempts + 1,
      onReview: () => {
        setAnswers(view.attempt.answers as Answers);
        setStep(0);
        setView({ kind: "flow", fresh: false });
      },
      onFresh: () => setConfirm(true),
    };
    return (
      <div className="itk" data-shell-focus="" data-jy-theme={theme}>
        <IntakePhoto data={data} steps={steps.map((x) => x.title)} at={steps.length} />
        {data.kind === "kbl" ? <KblResult {...props} /> : <IntakeReview {...props} />}
        <Sheet
          open={confirm}
          onClose={() => setConfirm(false)}
          title="Start fresh?"
          detents={["medium"]}
          footer={<Button block onClick={startFresh}>Clear my answers</Button>}
        >
          <div className="itk-confirm"><p>Clear your answers and start this intake from scratch? Your earlier attempts stay in your history, and your course progress isn’t touched.</p></div>
        </Sheet>
      </div>
    );
  }

  const backHref = programHref(data.program);
  const total = screens.length + 1;
  const atSummary = step >= screens.length;
  const scr = screens[Math.min(step, screens.length - 1)]!;
  const q = scr.q;
  const v = answers[q.id];
  const fromProfile = filled.has(q.id) && JSON.stringify(v) === JSON.stringify(prefill?.answers?.[q.id]);
  const needsContinue = atSummary || q.type !== "single" || answered(q, v);
  const onBack = () => {
    setError(null);
    if (step > 0) {
      setDir("back");
      setStep((s) => s - 1);
    } else if (data.latest) setView({ kind: "done", attempt: data.latest });
    else router.push(backHref);
  };
  const closeTo = data.latest ? undefined : backHref;
  const finishLabel = data.kind === "kbl" ? "See my plan" : data.kind === "mtk" ? "See my results" : "Save my intake";

  if (atSummary) {
    const lines = data.form.steps.flatMap((st) => st.questions).filter((x) => answered(x, answers[x.id])).slice(0, 6);
    const show = (x: IntakeQuestion) => {
      const a = answers[x.id];
      const labelOf = (val: string) => x.options?.find((o) => o.value === val)?.label ?? val;
      return Array.isArray(a) ? a.map(labelOf).join(", ") : labelOf(String(a ?? ""));
    };
    return (
      <div className="itk" data-shell-focus="" data-jy-theme={theme}>
        <QuestionShell
          at={total - 1} total={total} onBack={onBack} sceneKey="summary" dir={dir} titleRef={title} context={data.program.name}
          close={closeTo ? { label: "Close", href: closeTo, icon: true } : { label: "Close", icon: true, onClick: () => data.latest && setView({ kind: "done", attempt: data.latest }) }}
          art={<IntakeArt topic="plan" />}
          eyebrow={<span className="qs-tag">All set</span>}
          title="Here’s your plan"
          help={<p>{data.kind === "mtk" ? "Mike scores your answers and recommends where to start in Mastering the Kettlebell." : data.kind === "kbl" ? "Your answers place you in the right Kettlebell Lifestyle level, with a pace that fits your week." : `Mike tailors ${data.program.name} to what you told him: your priorities, cautions and the pace to start at.`}</p>}
          footer={<Button block size="lg" onClick={() => void save()} disabled={saving} aria-busy={saving || undefined}>{finishLabel}</Button>}
        >
          {lines.length > 0 && (
            <section className="qs-profile" aria-label="Your answers">
              <dl>{lines.map((x) => <div key={x.id}><dt>{x.label}</dt><dd>{show(x)}</dd></div>)}</dl>
            </section>
          )}
          {!editing && skipped > 0 && (
            <p className="qs-sub">{skipped === 1 ? "One step" : `${skipped} steps`} filled from your profile. <button type="button" className="qs-link" onClick={() => { setEditing(true); setStep(0); setDir("back"); }}>Edit</button></p>
          )}
        </QuestionShell>
      </div>
    );
  }

  const topic = artFor(`${q.label} ${scr.step.title}`, q.type);
  const multiOpts = q.options ?? [];
  return (
    <div className="itk" data-shell-focus="" data-jy-theme={theme}>
      <QuestionShell
        at={step} total={total} onBack={onBack} backHref={step === 0 && !data.latest ? backHref : undefined} sceneKey={q.id} dir={dir} titleRef={title} context={data.program.name}
        close={closeTo ? { label: "Close", href: closeTo, icon: true } : { label: "Close", icon: true, onClick: () => data.latest && setView({ kind: "done", attempt: data.latest }) }}
        art={<IntakeArt topic={topic} move={/breath/i.test(q.label) ? "breathing" : /get.?up/i.test(q.label) ? "getup" : /press/i.test(q.label) ? "press" : undefined} />}
        eyebrow={
          step === 0 && !editing && skipped > 0 ? (
            <span className="qs-tag">{skipped === 1 ? "1 step" : `${skipped} steps`} from your profile · <button type="button" className="qs-link" onClick={() => { setEditing(true); setStep(0); setDir("back"); }}>Edit</button></span>
          ) : fromProfile ? <span className="qs-tag">From your profile</span> : scr.step.eyebrow && scr.step.eyebrow !== q.label && !/^step\s*\d/i.test(scr.step.eyebrow) ? scr.step.eyebrow : undefined
        }
        title={q.label}
        help={(q.help || (scr.first && scr.step.intro) || (step === 0 && data.form.introduction)) ? <p>{q.help || (scr.first && scr.step.intro) || data.form.introduction}</p> : undefined}
        footer={needsContinue ? <Button block size="lg" onClick={next} disabled={saving}>Continue</Button> : undefined}
      >
        {q.type === "text" ? (
          <>
            <textarea className="qs-text" value={typeof v === "string" ? v : ""} maxLength={1000} placeholder={q.required ? "Type your answer" : "Optional — skip if nothing comes to mind"} aria-label={q.label}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value.slice(0, 1000) }))} />
            <p className="qs-count">{typeof v === "string" ? v.length : 0}/1000</p>
          </>
        ) : q.type === "number" ? (
          <NumberStepper label={q.label} value={Number(v ?? 0) || 0} min={0} max={200} onChange={(n) => setAnswers((a) => ({ ...a, [q.id]: String(n) }))} />
        ) : q.type === "date" ? (
          <input type="date" className="qs-input" aria-label={q.label} value={typeof v === "string" ? v : ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
        ) : (
          <ChoiceCards
            label={q.label} multi={q.type === "multi"} value={v} profile={fromProfile}
            options={multiOpts.map((o) => ({ value: o.value, label: o.label, hint: o.description, extra: o.bullets?.length ? <small>{o.bullets.join(" · ")}</small> : undefined }))}
            onPick={(val) => choose(q, val)}
          />
        )}
        {scr.last && scr.step.note && (
          <div className="qs-note"><b>{scr.step.note.title}</b><ul>{scr.step.note.points.map((p) => <li key={p}>{p}</li>)}</ul></div>
        )}
        {error && <p className="qs-err" role="alert">{error}</p>}
        {restored && step === 0 && <p className="qs-sub">We kept your answers from last time on this device.</p>}
      </QuestionShell>
    </div>
  );
}
