"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ReadinessForm } from "@ms/core";
import { Button, Chip, Glass, Icon, IconButton, StepSegments, haptic } from "@/components/ui";
import { Completion } from "@/components/graphics";
import { saveToolRun } from "@/lib/actions/discover";
import { ToolGlyph } from "../ProgramCard";
import { toolDef, type Answers, type ToolResultView } from "./defs";
import { ResultVisual } from "./Results";

type Props = {
  tool: { id: string; name: string; tagline: string | null; config: Record<string, unknown> };
  form: ReadinessForm | null;
  last: { created_at: string; result: Record<string, unknown> } | null;
  /** Server-rendered OfferSlot for placement "tool_result". */
  offer?: ReactNode;
};

type Stage = { at: "intro" } | { at: "q"; i: number; dir: 1 | -1 } | { at: "result" };
type Save = { state: "idle" | "saving" | "saved" } | { state: "error"; message: string };

/** One question per screen, Apple-onboarding style, ending in a visual result that saves to You → Saves. */
export function ToolFlow({ tool, form, last, offer }: Props) {
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
    },
    [def, tool.id],
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
            <p className="lq-t13 lq-c2 dsc-eyebrow">Free tool · {total || 4} questions · about {def.minutes} min</p>
            <h1 ref={heading} tabIndex={-1} className="lq-t34">{tool.name}</h1>
            <p className="lq-t17 lq-c2">{def.description || tool.tagline}</p>
            <Button block icon="play" onClick={() => setStage({ at: "q", i: 0, dir: 1 })} className="dsc-tool-cta">
              Start
            </Button>
            {lastTitle && last && (
              <p className="lq-t13 lq-c2 dsc-tool-last">
                <Icon name="clock" size="xs" /> Last time ({new Date(last.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}): {lastTitle}
              </p>
            )}
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
        <StepSegments total={total} done={stage.i} current={stage.i} currentProgress={0.5} label={`Question ${stage.i + 1} of ${total}`} className="dsc-tool-progress" />
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
      </div>
    </div>
  );
}

function SaveState({ save }: { save: Save }) {
  if (save.state === "saved") return <Chip variant="tint" icon="check">Saved to You</Chip>;
  if (save.state === "saving") return <Chip variant="fill">Saving…</Chip>;
  if (save.state === "error") return <span className="lq-t13 lq-c2 dsc-save-err" role="status">{save.message}</span>;
  return null;
}
