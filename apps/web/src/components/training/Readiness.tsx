"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { isFormComplete, resolveOutcome, scoreForm, type ReadinessForm, type ReadinessOutcome, type WorkoutTable } from "@ms/core";
import { Button, Icon, haptic } from "@/components/ui";
import { CircuitTable } from "./CircuitTable";
import { WorkoutCard } from "./WorkoutCard";

/** Today's saved (or optimistic) readiness result. */
export type Readiness = {
  score: number;
  band: "green" | "amber" | "red";
  name: string;
  outcome: "workout" | "recovery" | "rest";
  tableId: string | null;
  message: string;
  answers: Record<string, string>;
  saved: boolean;
  prescription?: WorkoutTable | null;
};

type Note = { title?: string; body?: string; points?: string[] } | null | undefined;

const BAND_WORD: Record<string, string> = { green: "full", amber: "modified", red: "recovery" };

export function bandSummary(r: Pick<Readiness, "message" | "outcome" | "band">) {
  if (r.message) return r.message;
  if (r.outcome !== "workout") return "Rest is training too. Today's plan is gentler.";
  return r.band === "green" ? "You're ready. Today's full table is waiting in the Workout step." : `A ${BAND_WORD[r.band]} table keeps today productive without digging a hole.`;
}

const sortQs = (form: ReadinessForm) => [...form.questions].sort((a, b) => a.position - b.position);

/**
 * The Training Readiness Assessment, inline. One question at a time with a progress rail,
 * an optional "consider this" note, Back and the submit action; once saved, the result
 * card, "What you selected" and a retake. Same layout as the original app.
 */
export function ReadinessAssessment({
  form,
  saved,
  initial,
  onDraft,
  onSubmit,
}: {
  form: ReadinessForm;
  saved: Readiness | null;
  initial: Record<string, string>;
  onDraft?: (answers: Record<string, string>) => void;
  onSubmit: (answers: Record<string, string>, preview: ReadinessOutcome) => Promise<boolean>;
}) {
  const qs = useMemo(() => sortQs(form), [form]);
  const [answers, setAnswers] = useState<Record<string, string>>(initial ?? {});
  const [step, setStep] = useState(() => {
    const i = qs.findIndex((q) => !(initial ?? {})[q.key]);
    return i < 0 ? Math.max(qs.length - 1, 0) : i;
  });
  const [dir, setDir] = useState<1 | -1>(1);
  const [redo, setRedo] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (saved && !redo) {
    return (
      <div className="kd-ready kd-in">
        <ReadinessResult result={saved} max={form.maxScore} />
        <AnswerRecap form={form} answers={saved.answers} />
        {!saved.saved && <p className="lq-t13 lq-c2">Not saved yet. It saves when you&apos;re back online.</p>}
        <Button
          variant="fill"
          size="md"
          block
          icon="repeat"
          onClick={() => {
            setAnswers({});
            setDir(-1);
            setStep(0);
            setRedo(true);
          }}
        >
          Retake today&apos;s assessment
        </Button>
      </div>
    );
  }

  const index = Math.min(Math.max(step, 0), qs.length - 1);
  const q = qs[index];
  if (!q) return null;
  const all = isFormComplete(form, answers);
  const note = q.note as Note;

  function choose(value: string) {
    const next = { ...answers, [q!.key]: value };
    setAnswers(next);
    onDraft?.(next);
    haptic(8);
    window.clearTimeout(timer.current);
    if (index < qs.length - 1) {
      timer.current = window.setTimeout(() => {
        setDir(1);
        setStep(index + 1);
      }, 160);
    }
  }

  async function submit() {
    if (!all) return;
    setBusy(true);
    const preview = resolveOutcome(form, scoreForm(form, answers));
    const ok = await onSubmit(answers, preview);
    setBusy(false);
    if (ok) setRedo(false);
  }

  return (
    <div className="kd-ready">
      <div className="kd-qrail" aria-hidden>
        {qs.map((qq, i) => (
          <span key={qq.key} data-state={answers[qq.key] ? "done" : i === index ? "now" : undefined} />
        ))}
      </div>

      <div key={q.key} className="kd-q" data-dir={dir === 1 ? "fwd" : "back"}>
        <p className="kd-eyebrow kd-eyebrow-now lq-num">
          Question {index + 1} of {qs.length}
        </p>
        <h3 className="lq-t20 kd-q-prompt">{q.prompt}</h3>
        <div className="kd-opts" role="radiogroup" aria-label={q.prompt}>
          {q.options.map((o) => {
            const on = answers[q.key] === o.value;
            return (
              <button key={o.value} type="button" role="radio" aria-checked={on} className="kd-opt lq-press" data-on={on ? "" : undefined} onClick={() => choose(o.value)}>
                <span className="lq-t15">{o.label}</span>
                {on && (
                  <svg viewBox="0 0 24 24" className="lq-icon lq-check" data-size="xs" data-draw="" aria-hidden>
                    <path d="M5.5 12.5 10 17l8.5-9.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        {note && (note.title || note.body || note.points?.length) ? (
          <div className="kd-qnote">
            <p className="lq-t13 kd-qnote-h">
              <Icon name="sparkle" size="xs" />
              {note.title ?? "Consider this before you answer"}
            </p>
            {note.body && <p className="lq-t13 lq-c2">{note.body}</p>}
            {note.points && (
              <ul>
                {note.points.map((p) => (
                  <li key={p} className="lq-t13 lq-c2">
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <div className="kd-qfoot">
        <Button
          variant="fill"
          size="md"
          icon="back"
          disabled={index === 0}
          onClick={() => {
            setDir(-1);
            setStep(Math.max(0, index - 1));
          }}
        >
          Back
        </Button>
        {all ? (
          <Button size="md" icon="kettlebell" aria-busy={busy || undefined} disabled={busy} onClick={submit}>
            Submit and open my workout table
          </Button>
        ) : (
          <p className="lq-t13 lq-c2 kd-qlock">
            <Icon name="lock" size="xs" /> Your workout table unlocks when this is done
          </p>
        )}
      </div>
    </div>
  );
}

/** Score + band headline ("Readiness result"). */
export function ReadinessResult({ result, max }: { result: Pick<Readiness, "score" | "band" | "name" | "message" | "outcome">; max: number }) {
  return (
    <div className="kd-result" data-band={result.band}>
      <div className="kd-result-main">
        <p className="kd-eyebrow">
          <span className="kd-band-dot" data-band={result.band} aria-hidden />
          Readiness result
        </p>
        <h3 className="lq-t17 kd-result-name">{result.name}</h3>
        <p className="lq-t15 lq-c2">{bandSummary(result)}</p>
      </div>
      <div className="kd-result-score">
        <p className="lq-num">
          <b>{result.score}</b>
          <span className="lq-c2">/{max}</span>
        </p>
        <p className="kd-eyebrow">Fatigue score</p>
        <p className="lq-t11 lq-c2">Lower is better</p>
      </div>
    </div>
  );
}

/** "What you selected": each question with the chosen answer. */
export function AnswerRecap({ form, answers }: { form: ReadinessForm; answers: Record<string, string> }) {
  const rows = sortQs(form).map((q) => ({ key: q.key, question: q.prompt, answer: q.options.find((o) => o.value === answers[q.key])?.label ?? "—" }));
  return (
    <div className="kd-recap">
      <p className="kd-eyebrow kd-recap-h">What you selected</p>
      <ul>
        {rows.map((r) => (
          <li key={r.key}>
            <span className="lq-t13 lq-c2">{r.question}</span>
            <b className="lq-t13">{r.answer}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Recovery / Off Day: no table, the band's message instead. */
export function RecoveryNotice({ name, message }: { name: string; message: string }) {
  return (
    <div role="status" className="kd-notice">
      <h3 className="lq-t17">{name}</h3>
      <p className="lq-t15">{message || "Rest is training too. Today's plan is gentler."}</p>
      <Link href="/library" className="kd-link kd-link-now">
        Open recovery and stretching videos
        <Icon name="chevron" size="xs" />
      </Link>
    </div>
  );
}

/** The workout table until today's assessment is done. */
export function TableLocked({ onGo }: { onGo?: () => void }) {
  return (
    <div className="kd-locked">
      <span className="kd-locked-ic" aria-hidden>
        <Icon name="lock" size="sm" />
      </span>
      <h3 className="lq-t15">Your workout table is locked</h3>
      <p className="lq-t13 lq-c2">Finish the Training Readiness Assessment at the top of today and today&apos;s table appears right here.</p>
      {onGo && (
        <Button size="md" icon="steps" onClick={onGo}>
          Go to the assessment
        </Button>
      )}
    </div>
  );
}

/**
 * What sits under the Workout step (and in the Session plan): the starter table on days
 * without an assessment; otherwise locked until readiness is done, then the prescribed
 * table, or the recovery / off-day notice when the band says so.
 */
export function WorkoutTablePanel({
  hasForm,
  readiness,
  table,
  onGoToAssessment,
  full,
  onFinished,
  finishLabel,
}: {
  hasForm: boolean;
  readiness: Readiness | null;
  table: WorkoutTable | null;
  onGoToAssessment?: () => void;
  /** The Summit "Session plan" card (chips, print, phone cards, Workout mode) around the same table. */
  full?: boolean;
  /** Workout mode finished: e.g. mark the workout step complete. */
  onFinished?: () => void;
  finishLabel?: string;
}) {
  const show = (t: WorkoutTable) => (full ? <WorkoutCard table={t} chosenFromReadiness={hasForm} onRetake={onGoToAssessment} onFinished={onFinished} finishLabel={finishLabel} /> : <CircuitTable table={t} />);
  if (!hasForm) return table ? show(table) : null;
  if (!readiness) return <TableLocked onGo={onGoToAssessment} />;
  if (readiness.outcome !== "workout" || !table) return <RecoveryNotice name={readiness.name} message={readiness.message} />;
  return show(table);
}
