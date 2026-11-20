"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IntakeQuestion, IntakeResult } from "@ms/api";
import { Button, Glass, Sheet, useToast } from "@/components/ui";
import { submitIntakeAction } from "@/lib/actions/intake";
import type { IntakeAttempt, IntakePageData } from "@/lib/loaders/course";
import { IntakeReview, KblResult } from "./IntakeReview";
import "./intake.css";

type Answers = Record<string, string | string[]>;
type View = { kind: "flow"; fresh: boolean } | { kind: "done"; attempt: IntakeAttempt };

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5.5 12.5 10 17l8.5-9.5" /></svg>
);
const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.6v.2" /></svg>
);

export function programHref(p: IntakePageData["program"]) {
  return p.type === "course" ? `/programs/${p.slug}/course/resume` : `/programs/${p.slug}`;
}

const answered = (q: IntakeQuestion, v: Answers[string] | undefined) => (Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim()));

/**
 * Program intake (legacy §L13/§L14): one step per screen with a sticky header (back · program · k/n)
 * and the rail, options as rows, a single footer action. Answers are drafted on this device so a
 * member can leave and come back; every save is a new attempt (earlier ones are kept).
 */
export function IntakeFlow({ data, start }: { data: IntakePageData; start: "flow" | "review" | "fresh" }) {
  const router = useRouter();
  const toast = useToast();
  const steps = data.form.steps;
  const draftKey = `intake-draft:${data.form.key ?? data.form.id}`;
  const [view, setView] = useState<View>(() =>
    start === "review" && data.latest ? { kind: "done", attempt: data.latest } : { kind: "flow", fresh: start === "fresh" || !data.latest },
  );
  const [answers, setAnswers] = useState<Answers>(() => (start === "fresh" || !data.latest ? {} : (data.latest.answers as Answers)));
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [restored, setRestored] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);

  // Resume a draft from this device.
  useEffect(() => {
    if (view.kind !== "flow") return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as { answers: Answers; step: number };
      if (d && Object.keys(d.answers ?? {}).length) {
        setAnswers(d.answers);
        setStep(Math.min(Math.max(0, d.step | 0), steps.length - 1));
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

  const cur = steps[step]!;
  const last = step === steps.length - 1;
  const missing = cur?.questions.some((q) => q.required && !answered(q, answers[q.id]));

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
    if (q.type === "single" && cur.questions.length === 1 && !last) {
      window.setTimeout(() => {
        setDir("fwd");
        setStep((s) => Math.min(s + 1, steps.length - 1));
      }, 260);
    }
  };

  const save = async () => {
    setSaving(true);
    const r = await submitIntakeAction(data.form.id, answers, data.program.slug);
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
    if (last) void save();
    else {
      setDir("fwd");
      setStep((s) => s + 1);
    }
  };

  const startFresh = () => {
    setConfirm(false);
    setAnswers({});
    setStep(0);
    setView({ kind: "flow", fresh: true });
    try {
      window.localStorage.removeItem(draftKey);
    } catch {}
    toast("Starting a new attempt — earlier answers are kept");
  };

  const counts = useMemo(() => steps.length, [steps]);

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
      <div className="itk">
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
  const onBack = () => {
    if (step > 0) {
      setDir("back");
      setStep((s) => s - 1);
    } else if (data.latest) setView({ kind: "done", attempt: data.latest });
    else router.push(backHref);
  };

  return (
    <div className="itk">
      <Glass as="header" level="thick" className="itk-head">
        <div className="itk-col">
          <div className="itk-head-row">
            {step === 0 && !data.latest ? (
              <Link href={backHref} className="itk-back" aria-label="Back to program"><BackIcon /></Link>
            ) : (
              <button type="button" className="itk-x itk-back" aria-label="Previous step" onClick={onBack}><BackIcon /></button>
            )}
            <p className="itk-head-t">{data.program.name}</p>
            <span className="itk-head-n">{step + 1}/{counts}</span>
          </div>
          <div className="itk-rail" role="progressbar" aria-valuemin={1} aria-valuemax={counts} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${counts}`}>
            {steps.map((s, i) => <i key={s.id} data-s={i < step ? "done" : i === step ? "now" : undefined} />)}
          </div>
        </div>
      </Glass>

      <div className="itk-body">
        <div className="itk-col itk-scene" key={cur.id} data-dir={dir === "back" ? "back" : undefined}>
          <span className="itk-numeral" aria-hidden>{String(step + 1).padStart(2, "0")}</span>
          <p className="itk-eyebrow">{data.kind === "program" ? "Program intake" : cur.eyebrow ?? data.form.title}</p>
          <h2 ref={title} tabIndex={-1} className="itk-title" aria-live="polite">{cur.title}</h2>
          {cur.intro && <p className="itk-help">{cur.intro}</p>}
          {step === 0 && data.form.introduction && !cur.intro && <p className="itk-help">{data.form.introduction}</p>}

          {cur.questions.map((q) => {
            const solo = cur.questions.length === 1 && q.label === cur.title;
            const v = answers[q.id];
            return (
              <div key={q.id} className="itk-q">
                {!solo && <h3>{q.label}{q.required && <span aria-hidden>*</span>}</h3>}
                {q.help && <p>{q.help}</p>}
                {q.type === "text" ? (
                  <>
                    <textarea
                      className="itk-text"
                      value={typeof v === "string" ? v : ""}
                      maxLength={1000}
                      placeholder="Optional notes"
                      aria-label={q.label}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value.slice(0, 1000) }))}
                    />
                    <p className="itk-count">{(typeof v === "string" ? v.length : 0)}/1000</p>
                  </>
                ) : (
                  <div className="itk-opts" role={q.type === "multi" ? "group" : "radiogroup"} aria-label={q.label} data-grid={q.type === "multi" && (q.options?.length ?? 0) > 6 ? "" : undefined}>
                    {(q.options ?? []).map((o) => {
                      const on = q.type === "multi" ? Array.isArray(v) && v.includes(o.value) : v === o.value;
                      return (
                        <button key={o.value} type="button" role={q.type === "multi" ? "checkbox" : "radio"} aria-checked={on} className="itk-opt" onClick={() => choose(q, o.value)}>
                          <span>
                            <b>{o.label}</b>
                            {o.description && <small>{o.description}</small>}
                            {o.bullets?.map((b) => <small key={b}>· {b}</small>)}
                          </span>
                          <span className="itk-mark" data-multi={q.type === "multi" ? "" : undefined} aria-hidden><Check /></span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {cur.note && (
            <div className="itk-note">
              <p><InfoIcon />{cur.note.title}</p>
              <ul>{cur.note.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          {error && <p className="itk-err" role="alert">{error}</p>}
          {restored && step === 0 && <p className="itk-saved">We kept your answers from last time on this device.</p>}
        </div>
      </div>

      <Glass as="footer" level="thick" className="itk-foot">
        <div className="itk-col">
          <Button block onClick={next} disabled={saving} iconAfter={last ? "check" : undefined} aria-busy={saving || undefined}>
            {last ? (data.kind === "kbl" ? "See my plan" : data.kind === "mtk" ? "See my results" : "Save my intake") : "Continue"}
          </Button>
        </div>
      </Glass>
    </div>
  );
}
