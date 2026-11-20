"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isFormComplete, resolveOutcome, scoreForm, type ReadinessForm, type ReadinessOutcome } from "@ms/core";
import { Button, Icon, Sheet, StepSegments, haptic } from "@/components/ui";
import { ReadinessDial, type DialZone } from "@/components/graphics";

type Note = { title?: string; body?: string; points?: string[] } | null | undefined;

/** Dial zones from the form's bands (gaps fall back to the default full workout, like the SQL). */
export function zonesFor(form: ReadinessForm): DialZone[] {
  const max = form.maxScore;
  const zoneOf = (s: number) => {
    const o = resolveOutcome(form, s);
    return o.band === "green" ? "full" : o.band === "amber" ? "modified" : "recovery";
  };
  const zones: DialZone[] = [];
  for (let s = 0; s <= max; s++) {
    const b = zoneOf(s);
    const last = zones[zones.length - 1];
    if (last && last.band === b) last.to = s;
    else zones.push({ band: b, from: s, to: s });
  }
  return zones;
}

const BAND_WORD: Record<string, string> = { green: "full", amber: "modified", red: "recovery" };

/**
 * Training readiness, one question per screen. Answers slide in, the running score feeds the
 * dial, and the result card shows today's band before the member saves it.
 */
export function ReadinessSheet({
  open,
  onClose,
  form,
  initial,
  saved,
  onDraft,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  form: ReadinessForm;
  initial: Record<string, string>;
  /** Already-saved outcome (shows the result; "Retake" starts again). */
  saved: (ReadinessOutcome & { answers: Record<string, string> }) | null;
  onDraft?: (answers: Record<string, string>) => void;
  onSubmit: (answers: Record<string, string>, preview: ReadinessOutcome) => Promise<boolean>;
}) {
  const qs = useMemo(() => [...form.questions].sort((a, b) => a.position - b.position), [form]);
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers ?? initial);
  const firstOpen = () => {
    const i = qs.findIndex((q) => !answers[q.key]);
    return saved ? qs.length : i < 0 ? qs.length : i;
  };
  const [step, setStep] = useState(firstOpen);
  const [dir, setDir] = useState<1 | -1>(1);
  const [busy, setBusy] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    if (open) {
      // Re-sync with saved answers each time the sheet opens (it stays mounted for its close animation).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers(saved?.answers ?? initial);
      setStep(saved ? qs.length : Math.max(0, qs.findIndex((q) => !(initial ?? {})[q.key])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const complete = isFormComplete(form, answers);
  const preview = complete ? resolveOutcome(form, scoreForm(form, answers)) : null;
  const zones = useMemo(() => zonesFor(form), [form]);
  const q = qs[step];
  const atResult = step >= qs.length;

  function pick(key: string, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    onDraft?.(next);
    haptic(8);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setDir(1);
      setStep((s) => {
        const nextOpen = qs.findIndex((qq, i) => i > s && !next[qq.key]);
        return nextOpen >= 0 ? nextOpen : qs.length;
      });
    }, 320);
  }

  const back = () => {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const note = q?.note as Note;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Training readiness"
      description={atResult ? "Here's what today calls for." : `${["", "One", "Two", "Three", "Four", "Five", "Six", "Seven"][qs.length] ?? qs.length} honest questions set today's workout.`}
      detents={["large"]}
      footer={
        atResult && preview ? (
          <div className="trn-ready-foot">
            {saved && (
              <Button
                variant="fill"
                icon="repeat"
                onClick={() => {
                  setAnswers({});
                  setDir(-1);
                  setStep(0);
                }}
              >
                Retake
              </Button>
            )}
            <Button
              icon={preview.outcome === "workout" ? "kettlebell" : "check"}
              aria-busy={busy || undefined}
              onClick={async () => {
                if (saved && saved.score === preview.score) return onClose();
                setBusy(true);
                const ok = await onSubmit(answers, preview);
                setBusy(false);
                if (ok) onClose();
              }}
            >
              {saved && saved.score === preview.score ? "Done" : preview.outcome === "workout" ? "Save and open my workout" : "Save today's check-in"}
            </Button>
          </div>
        ) : (
          <div className="trn-ready-foot" data-single="">
            <Button variant="plain" icon="back" onClick={back} disabled={step === 0} style={step === 0 ? { visibility: "hidden" } : undefined}>
              Back
            </Button>
            <span className="lq-t13 lq-c2 trn-ready-lock">
              <Icon name="lock" size="xs" /> Your table unlocks when this is done
            </span>
          </div>
        )
      }
    >
      <StepSegments total={qs.length} done={Math.min(step, qs.length)} current={step} currentProgress={0} label={`Question ${Math.min(step + 1, qs.length)} of ${qs.length}`} className="trn-ready-segs" />

      {!atResult && q && (
        <div key={q.key} className="trn-q" data-dir={dir === 1 ? "fwd" : "back"}>
          <p className="lq-t13 lq-c2 lq-num" style={{ fontWeight: 600 }}>
            Question {step + 1} of {qs.length}
          </p>
          <h3 className="lq-t28 trn-q-prompt">{q.prompt}</h3>
          <div className="trn-opts" role="radiogroup" aria-label={q.prompt}>
            {q.options.map((o) => {
              const on = answers[q.key] === o.value;
              return (
                <button key={o.value} type="button" role="radio" aria-checked={on} className="trn-opt lq-press" data-on={on ? "" : undefined} onClick={() => pick(q.key, o.value)}>
                  <span className="lq-t17">{o.label}</span>
                  <span className="trn-radio" aria-hidden>
                    {on && (
                      <svg viewBox="0 0 24 24" className="lq-icon lq-check" data-size="xs" data-draw="">
                        <path d="M5.5 12.5 10 17l8.5-9.5" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {note && (note.body || note.points?.length) && (
            <details className="trn-note">
              <summary className="lq-t15">
                <Icon name="sparkle" size="xs" /> {note.title ? "What to consider" : "How to answer"}
              </summary>
              {note.title && <p className="lq-t15">{note.title}</p>}
              {note.body && <p className="lq-t15">{note.body}</p>}
              {note.points && (
                <ul>
                  {note.points.map((p) => (
                    <li key={p} className="lq-t15">
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )}
        </div>
      )}

      {atResult && preview && (
        <div className="trn-q trn-result" data-dir="fwd">
          <ReadinessDial score={preview.score} band={preview.band} max={form.maxScore} zones={zones} size={260} />
          <h3 className="lq-t28">{preview.name}</h3>
          <p className="lq-t15 lq-c2 trn-result-msg">
            {preview.message ||
              (preview.outcome === "workout"
                ? preview.band === "green"
                  ? "You're ready. Today's full table is waiting in the Workout step."
                  : `A ${BAND_WORD[preview.band]} table keeps today productive without digging a hole.`
                : "Rest is training too. Today's plan is gentler.")}
          </p>
          <p className="lq-t13 lq-c3 lq-num">
            Score {preview.score} of {form.maxScore}. Lower means more ready.
          </p>
        </div>
      )}
    </Sheet>
  );
}
