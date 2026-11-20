"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ReadinessForm } from "@ms/core";
import Link from "next/link";
import type { LibraryVideo } from "@ms/api";
import { Button, Chip, Glass, Icon, IconButton, StepSegments, haptic, useToast } from "@/components/ui";
import { Completion } from "@/components/graphics";
import { saveToolRun } from "@/lib/actions/discover";
import { ToolGlyph } from "../ProgramCard";
import { VideoCard } from "../VideoCard";
import { toolDef, type Answers, type ToolResultView } from "./defs";
import { ResultVisual } from "./Results";

type Props = {
  tool: { id: string; name: string; tagline: string | null; config: Record<string, unknown> };
  form: ReadinessForm | null;
  last: { created_at: string; result: Record<string, unknown> } | null;
  /** Server-rendered OfferSlot for placement "tool_result". */
  offer?: ReactNode;
  /** Follow-along videos for the result (from the library, by topic). */
  followAlong?: LibraryVideo[];
};

/** Legacy intro copy: three "how it works" bullets and the start label (aware of a previous result). */
const INTRO: Record<string, { bullets: string[]; start: string; again: string }> = {
  "kettlebell-selector": {
    bullets: ["Four questions about your size, background and goal.", "You get three bells — where to start, your working bell, and heavy work.", "Save it and the full set list stays in your account."],
    start: "Find my bells",
    again: "Run it again",
  },
  "kettlebell-roadmap": {
    bullets: ["A few questions about the lifts you already own.", "You get your phase, the lifts to own next and the skills you'll build.", "It saves to your account so you can track the next phase."],
    start: "Find my phase",
    again: "Run it again",
  },
};
const ASSESS = {
  bullets: ["One question at a time — you can go back and change any answer.", "You get a scored result with the specific things to work on next.", "It saves to your account, with follow-along videos for what comes next."],
  start: "Start the assessment",
  again: "Take it again",
};

type Stage = { at: "intro" } | { at: "q"; i: number; dir: 1 | -1 } | { at: "result" };
type Save = { state: "idle" | "saving" | "saved" } | { state: "error"; message: string };

/** One question per screen, Apple-onboarding style, ending in a visual result that saves to You → Saves. */
export function ToolFlow({ tool, form, last, offer, followAlong = [] }: Props) {
  const toast = useToast();
  const def = useMemo(() => toolDef(tool.id, tool.config, form), [tool.id, tool.config, form]);
  const [stage, setStage] = useState<Stage>({ at: "intro" });
  const [answers, setAnswers] = useState<Answers>({});
  const [save, setSave] = useState<Save>({ state: "idle" });
  const [picked, setPicked] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const steps = useMemo(() => def?.steps(answers) ?? [], [def, answers]);
  const result = useMemo<ToolResultView | null>(() => (stage.at === "result" && def ? def.result(answers) : null), [stage, def, answers]);

  // Move focus to each new screen's heading for screen readers and keyboard users.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [stage]);

  const finish = useCallback(
    async (a: Answers) => {
      setStage({ at: "result" });
      const r = def?.result(a);
      if (!r) return;
      setSave({ state: "saving" });
      const res = await saveToolRun(tool.id, a, { ...r, title: r.headline });
      setSave(res.ok ? { state: "saved" } : { state: "error", message: res.error });
      if (res.ok) toast(`${tool.name} complete — saved to your account`, { tone: "success", icon: "check" });
    },
    [def, tool.id, tool.name, toast],
  );

  const choose = useCallback(
    (value: string) => {
      if (stage.at !== "q") return;
      const step = steps[stage.i];
      if (!step || picked) return;
      haptic(8);
      setPicked(value);
      const next = { ...answers, [step.id]: value };
      // Later answers can depend on this one: drop them.
      const keep = new Set(steps.slice(0, stage.i + 1).map((s) => s.id));
      for (const k of Object.keys(next)) if (!keep.has(k)) delete next[k];
      window.setTimeout(() => {
        setPicked(null);
        setAnswers(next);
        const nextSteps = def?.steps(next) ?? [];
        if (stage.i + 1 < nextSteps.length) setStage({ at: "q", i: stage.i + 1, dir: 1 });
        else void finish(next);
      }, 240);
    },
    [stage, steps, picked, answers, def, finish],
  );

  const back = useCallback(() => {
    if (stage.at === "q") setStage(stage.i === 0 ? { at: "intro" } : { at: "q", i: stage.i - 1, dir: -1 });
    else if (stage.at === "result") setStage({ at: "q", i: steps.length - 1, dir: -1 });
  }, [stage, steps.length]);

  // Keyboard: 1–9 pick an option, ← / Backspace go back, Enter starts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (stage.at === "q") {
        const n = Number(e.key);
        const opts = steps[stage.i]?.options ?? [];
        if (n >= 1 && n <= opts.length) choose(opts[n - 1]!.value);
        if (e.key === "ArrowLeft" || e.key === "Backspace") back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, steps, choose, back]);

  if (!def) return null;
  const total = steps.length;
  const lastTitle = typeof last?.result?.title === "string" ? last.result.title : null;

  /* ------------------------------------------------------------ intro */
  const copy = INTRO[tool.id] ?? ASSESS;
  if (stage.at === "intro") {
    return (
      <div className="dsc-tool" data-stage="intro">
        <div className="dsc-tool-top">
          <IconButton icon="back" label="All tools" href="/tools" />
        </div>
        <div className="dsc-tool-intro dsc-step-in">
          <div className="dsc-tool-cover" aria-hidden>
            <ToolGlyph id={tool.id} size={210} />
          </div>
          <div className="dsc-tool-introtext">
            <p className="lq-t13 lq-c2 dsc-eyebrow">{tool.tagline ?? "Free tool"} · {total || 4} questions · about {def.minutes} min</p>
            <h1 ref={heading} tabIndex={-1} className="lq-t34">{tool.name}</h1>
            <p className="lq-t17 lq-c2">{def.description || tool.tagline}</p>
            <ol className="w1-tool-bullets">
              {copy.bullets.map((b, i) => (
                <li key={b}>
                  <span className="w1-tool-n lq-num" aria-hidden>{i + 1}</span>
                  <span className="lq-t15">{b}</span>
                </li>
              ))}
            </ol>
            {lastTitle && last && (
              <Glass radius="panel" className="w1-tool-prev">
                <Icon name="clock" size="sm" className="lq-c2" />
                <span className="lq-t13">
                  <span className="lq-c2">Your last result · {new Date(last.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  <br />
                  <strong>{lastTitle}</strong>
                </span>
                <Link href="/you/saves" className="lq-t13 w1-tool-prevlink">See saves</Link>
              </Glass>
            )}
            <Button block icon={last ? "repeat" : "play"} onClick={() => setStage({ at: "q", i: 0, dir: 1 })} className="dsc-tool-cta">
              {last ? copy.again : copy.start}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ result */
  if (stage.at === "result") {
    return (
      <div className="dsc-tool" data-stage="result">
        <div className="dsc-tool-top">
          <IconButton icon="back" label="Change my answers" onClick={back} />
          <span className="lq-t13 lq-c2">{tool.name}</span>
          <IconButton icon="close" label="Close" href="/tools" />
        </div>
        {result ? (
          <div className="dsc-result dsc-step-in">
            <div className="dsc-result-head">
              <span className="dsc-result-badge" aria-hidden>
                <Completion size={64} />
              </span>
              <p className="lq-t13 lq-c2 dsc-eyebrow">Your result</p>
              <h1 ref={heading} tabIndex={-1} className="lq-t34">{result.headline}</h1>
              {result.summary && <p className="lq-t17 lq-c2 dsc-result-sum">{result.summary}</p>}
            </div>
            <ResultVisual result={result} />
            <div className="dsc-result-actions">
              <SaveState save={save} />
              <Button variant="glass" size="md" icon="repeat" onClick={() => { setAnswers({}); setSave({ state: "idle" }); setStage({ at: "q", i: 0, dir: 1 }); }}>
                Retake
              </Button>
              <Button variant="glass" size="md" href="/tools">All tools</Button>
            </div>
            <AnswerRecap steps={steps} answers={answers} onChange={(i) => setStage({ at: "q", i, dir: -1 })} />
            {followAlong.length > 0 && (
              <section className="w1-tool-follow" aria-labelledby="follow-t">
                <h2 id="follow-t" className="lq-t20">Follow along</h2>
                <div className="w1-tool-videos">
                  {followAlong.slice(0, 4).map((v) => (
                    <VideoCard key={v.id} video={v} compact />
                  ))}
                </div>
              </section>
            )}
            {offer && <div className="dsc-offer">{offer}</div>}
          </div>
        ) : (
          <div className="dsc-result">
            <h1 ref={heading} tabIndex={-1} className="lq-t28">We couldn’t work that out</h1>
            <Button variant="glass" onClick={() => { setAnswers({}); setStage({ at: "q", i: 0, dir: 1 }); }}>Start again</Button>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------ question */
  const step = steps[stage.i]!;
  return (
    <div className="dsc-tool" data-stage="q">
      <div className="dsc-tool-top">
        <IconButton icon="back" label={stage.i === 0 ? "Back to intro" : "Previous question"} onClick={back} />
        <div className="w1-tool-head">
          <span className="lq-t13 w1-tool-headname">
            <span>{tool.name}</span>
            <span className="lq-c2 lq-num">{stage.i + 1}/{total}</span>
          </span>
          <StepSegments total={total} done={stage.i} current={stage.i} currentProgress={0.5} label={`Question ${stage.i + 1} of ${total}`} className="dsc-tool-progress" />
        </div>
        <IconButton icon="close" label="Close" href="/tools" />
      </div>
      <div key={step.id} className="dsc-q dsc-step-in" data-dir={stage.dir}>
        <p className="lq-t13 lq-c2 dsc-eyebrow">{step.eyebrow ?? `Question ${stage.i + 1}`}</p>
        <h1 ref={heading} tabIndex={-1} className="lq-t28 dsc-q-title">{step.question}</h1>
        {step.help && <p className="lq-t15 lq-c2">{step.help}</p>}
        {step.note && (
          <Glass radius="panel" className="dsc-q-note">
            {step.note.title && <p className="lq-t13" style={{ fontWeight: 600 }}>{step.note.title}</p>}
            {step.note.body && <p className="lq-t13 lq-c2">{step.note.body}</p>}
            {step.note.points && (
              <ul>
                {step.note.points.map((p) => (
                  <li key={p} className="lq-t13 lq-c2">{p}</li>
                ))}
              </ul>
            )}
          </Glass>
        )}
        <div className="dsc-opts" role="radiogroup" aria-labelledby={undefined} aria-label={step.question}>
          {step.options.map((o, i) => {
            const on = (picked ?? answers[step.id]) === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                className="dsc-opt lq-glass lq-fx lq-press"
                data-fx=""
                data-on={on ? "" : undefined}
                onClick={() => choose(o.value)}
              >
                <span className="dsc-opt-key lq-num" aria-hidden>{i + 1}</span>
                <span className="dsc-opt-text">
                  <span className="lq-t17">{o.label}</span>
                  {o.description && <span className="lq-t13 lq-c2">{o.description}</span>}
                </span>
                <span className="dsc-opt-check" aria-hidden>
                  <Icon name="check" size="sm" />
                </span>
              </button>
            );
          })}
        </div>
        {stage.i > 0 && <AnswerRecap steps={steps.slice(0, stage.i)} answers={answers} onChange={(i) => setStage({ at: "q", i, dir: -1 })} compact />}
      </div>
    </div>
  );
}

/** Answered questions with a way back to change any of them (legacy AnswerRecap). */
function AnswerRecap({ steps, answers, onChange, compact }: { steps: { id: string; question: string; options: { value: string; label: string }[] }[]; answers: Answers; onChange: (i: number) => void; compact?: boolean }) {
  const rows = steps.map((st, i) => ({ i, q: st.question, a: st.options.find((o) => o.value === answers[st.id])?.label })).filter((r) => r.a);
  if (!rows.length) return null;
  return (
    <section className="w1-tool-recap" data-compact={compact ? "" : undefined} aria-label="Your answers">
      {!compact && <h2 className="lq-t17">Your answers</h2>}
      <ol>
        {rows.map((r) => (
          <li key={r.i}>
            <button type="button" className="w1-tool-recaprow" onClick={() => onChange(r.i)} aria-label={`Change your answer to: ${r.q}`}>
              <span className="lq-t12 lq-c2 w1-tool-recapq">{r.q}</span>
              <span className="lq-t15">{r.a}</span>
              <span className="lq-t12 w1-tool-change">Change</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SaveState({ save }: { save: Save }) {
  if (save.state === "saved") return <Chip variant="tint" icon="check">Saved to You</Chip>;
  if (save.state === "saving") return <Chip variant="fill">Saving…</Chip>;
  if (save.state === "error") return <span className="lq-t13 lq-c2 dsc-save-err" role="status">{save.message}</span>;
  return null;
}
