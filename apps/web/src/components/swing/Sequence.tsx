"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, Icon } from "@/components/ui";

/* ------------------------------------------------------------------ speech */

const SPEAK_KEY = "sw-speech";

/** Optional spoken prompts (Web Speech API). Off by default; the choice is remembered on the device. */
const listeners = new Set<() => void>();
const readOn = () => {
  try {
    return window.localStorage.getItem(SPEAK_KEY) === "1";
  } catch {
    return false;
  }
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useSpeech() {
  const on = useSyncExternalStore(subscribe, readOn, () => false);
  const supported = useSyncExternalStore(subscribe, () => "speechSynthesis" in window, () => false);
  const toggle = useCallback(() => {
    const next = !readOn();
    try {
      window.localStorage.setItem(SPEAK_KEY, next ? "1" : "0");
      if (!next) window.speechSynthesis?.cancel();
    } catch {}
    listeners.forEach((l) => l());
  }, []);
  const say = useCallback(
    (text: string) => {
      if (!on || !supported) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
      } catch {}
    },
    [on, supported],
  );
  useEffect(() => () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  }, []);
  return { on, toggle, say, supported };
}

export function SpeechToggle({ speech }: { speech: ReturnType<typeof useSpeech> }) {
  if (!speech.supported) return null;
  return (
    <button type="button" className="sw-speak" aria-pressed={speech.on} onClick={speech.toggle}>
      <Icon name="speaker" size="xs" /> {speech.on ? "Voice on" : "Voice off"}
    </button>
  );
}

/* ------------------------------------------------------------------ sequence player */

export interface SeqStep {
  /** Group label shown above ("Left foot · 2 of 4"). */
  group?: string;
  title: string;
  detail?: string;
  /** Seconds; omit for a step the member advances by tapping. */
  seconds?: number;
  /** Spoken prompt (defaults to the title). */
  say?: string;
  /** Breath phase drives the ring's motion ("in" grows, "out" shrinks, "hold" stays). */
  breath?: "in" | "out" | "hold";
}

/**
 * A calm step-through: one prompt at a time, a ring for the seconds left, pause and skip.
 * Used by the Approach ritual and the Feet activation drill.
 */
export function SequencePlayer({
  steps,
  speech,
  onDone,
  doneLabel = "Done",
  label,
}: {
  steps: SeqStep[];
  speech: ReturnType<typeof useSpeech>;
  onDone: () => void;
  doneLabel?: string;
  label: string;
}) {
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(steps[0]?.seconds ?? 0);
  const [paused, setPaused] = useState(false);
  const step = steps[i];
  const said = useRef(-1);

  useEffect(() => {
    if (!step || said.current === i) return;
    said.current = i;
    speech.say(step.say ?? step.title);
  }, [i, step, speech]);

  const next = useCallback(() => {
    if (i + 1 >= steps.length) {
      onDone();
      return;
    }
    setI(i + 1);
    setLeft(steps[i + 1]?.seconds ?? 0);
  }, [i, steps, onDone]);

  useEffect(() => {
    if (!step?.seconds || paused) return;
    const t = window.setTimeout(() => (left <= 1 ? next() : setLeft(left - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [left, paused, step, next]);

  if (!step) return null;
  const pct = step.seconds ? 1 - left / step.seconds : 0;
  const R = 54;
  const C = 2 * Math.PI * R;
  return (
    <div className="sw-seq" aria-label={label}>
      <ol className="sw-seq-track" aria-hidden>
        {steps.map((_, k) => (
          <li key={k} data-s={k < i ? "done" : k === i ? "now" : undefined} />
        ))}
      </ol>
      <div className="sw-seq-stage">
        <div className="sw-seq-ring" data-breath={paused ? undefined : step.breath} key={`${i}-${step.breath ?? ""}`} style={{ ["--sw-dur" as string]: `${step.seconds ?? 4}s` }}>
          <svg viewBox="0 0 120 120" aria-hidden>
            <circle cx="60" cy="60" r={R} className="sw-ring-track" />
            {step.seconds ? <circle cx="60" cy="60" r={R} className="sw-ring-arc" strokeDasharray={C} strokeDashoffset={C * pct} /> : null}
          </svg>
          <span className="sw-seq-num" aria-live="off">{step.seconds ? left : <Icon name="check" size="md" />}</span>
        </div>
        <div className="sw-seq-text" aria-live="polite">
          {step.group && <p className="sw-seq-group">{step.group}</p>}
          <h2 className="sw-seq-title">{step.title}</h2>
          {step.detail && <p className="sw-seq-detail">{step.detail}</p>}
        </div>
      </div>
      <div className="sw-seq-actions">
        {step.seconds ? (
          <Button variant="secondary" size="md" icon={paused ? "play" : "pause"} onClick={() => setPaused((p) => !p)}>
            {paused ? "Resume" : "Pause"}
          </Button>
        ) : null}
        <Button variant={step.seconds ? "ghost" : "filled"} size="md" onClick={next}>
          {i + 1 >= steps.length ? doneLabel : step.seconds ? "Skip" : "Next"}
        </Button>
      </div>
      <p className="sw-seq-count">{i + 1} of {steps.length}</p>
    </div>
  );
}
