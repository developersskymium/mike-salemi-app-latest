"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { FormProgress } from "./Progress";

export type StepFlowStep = {
  id: string;
  title: ReactNode;
  lede?: ReactNode;
  /** Steps with the same group show together on desktop (2–3 per screen). */
  group?: string;
  /** False keeps Continue disabled. */
  valid?: boolean;
  body: ReactNode;
};

const wide = (q: string) => ({
  sub: (cb: () => void) => {
    const m = window.matchMedia(q);
    m.addEventListener("change", cb);
    return () => m.removeEventListener("change", cb);
  },
  get: () => window.matchMedia(q).matches,
});
const DESKTOP = wide("(min-width: 900px)");

/**
 * One question per screen on phone; consecutive steps sharing a `group` show together on desktop.
 * Progress line with time left, Back, one primary Continue. `screen` is the index of the current
 * screen (callers keep it, so autosave can restore it).
 */
export function StepFlow({
  steps, screen, onScreen, onDone, doneLabel = "Finish", pending, secondsPerStep = 12, footer,
}: {
  steps: StepFlowStep[];
  screen: number;
  onScreen: (i: number) => void;
  onDone: () => void;
  doneLabel?: string;
  pending?: boolean;
  secondsPerStep?: number;
  footer?: ReactNode;
}) {
  const desktop = useSyncExternalStore(DESKTOP.sub, DESKTOP.get, () => false);
  const screens = useMemo(() => {
    if (!desktop) return steps.map((s) => [s]);
    const out: StepFlowStep[][] = [];
    for (const s of steps) {
      const last = out[out.length - 1];
      if (last && s.group && last[0]!.group === s.group && last.length < 3) last.push(s);
      else out.push([s]);
    }
    return out;
  }, [steps, desktop]);
  const i = Math.min(screen, screens.length - 1);
  const cur = screens[i] ?? [];
  const stepsBefore = screens.slice(0, i).reduce((n, s) => n + s.length, 0);
  const valid = cur.every((s) => s.valid !== false);
  const last = i >= screens.length - 1;
  const head = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    head.current?.focus({ preventScroll: true });
  }, [i]);

  return (
    <div className="fm-flow">
      <div className="fm-flow-top">
        {i > 0 ? <IconButton icon="back" label="Back" size="md" onClick={() => onScreen(i - 1)} disabled={pending} /> : <span style={{ width: 44 }} />}
        <FormProgress step={stepsBefore} total={steps.length} secondsPerStep={secondsPerStep} />
      </div>
      <div className="fm-flow-body" key={i}>
        {cur.map((s, k) => (
          <section key={s.id} className="fm-flow-step" aria-labelledby={`fm-q-${s.id}`}>
            <h1 id={`fm-q-${s.id}`} className={k === 0 ? "fm-q" : "fm-q fm-q-sm"} tabIndex={-1} ref={k === 0 ? head : undefined}>{s.title}</h1>
            {s.lede && <p className="fm-q-lede">{s.lede}</p>}
            {s.body}
          </section>
        ))}
      </div>
      <div className="fm-flow-foot">
        <Button block size="lg" disabled={!valid || pending} aria-busy={pending} onClick={() => (last ? onDone() : onScreen(i + 1))}>
          {pending ? "One moment…" : last ? doneLabel : "Continue"}
        </Button>
        {footer}
      </div>
    </div>
  );
}
