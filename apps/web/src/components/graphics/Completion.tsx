import type { CSSProperties } from "react";
import { Exposure, shastaPath } from "./exposure";
import { Flare } from "./Flare";
import "./gfx.css";
import "./Completion.css";
import { Line, smooth, traceGeo, type Pt } from "./trace";
import { TraceMarks } from "./Trace";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-completion");

export interface CompletionProps {
  /** "step": a set or step done. "milestone": a day or phase finished, under the night sky. */
  variant?: "step" | "milestone";
  /** Width in px (step 120, milestone 320 by default). */
  size?: number;
  /** Play the moment once: the trace exposes and ends in a Flare. Static under reduced motion. */
  animated?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const CHECK = new Line([
  [34, 62],
  [50, 78],
  [84, 42],
]);
const ARC_CTRL: Pt[] = [
  [18, 92],
  [52, 150],
  [110, 184],
  [176, 180],
  [236, 140],
  [276, 82],
  [292, 34],
];
const ARC = new Line(smooth(ARC_CTRL, 14));
const NODES = [0.18, 0.36, 0.54, 0.72, 0.88];

/**
 * Completion moments in the Trace language. Step: the check is traced in
 * glacier light and ends in a Flare. Milestone: a night exposure over Mount
 * Shasta — the day's path, its steps as lit nodes, the Flare at the head.
 */
export function Completion({ variant = "step", size, animated = true, label, className, style }: CompletionProps) {
  const id = useGfxId("done");
  if (variant === "milestone") {
    const w = size ?? 320;
    const geo = traceGeo(ARC, 1, { width: 3.2, segments: 26, floor: 0.06, ahead: false, head: false });
    return (
      <svg
        viewBox="0 0 320 220"
        width={w}
        height={(w * 220) / 320}
        role="img"
        aria-label={label ?? "Day complete"}
        className={cx(g.root, s.done, s.milestone, animated && s.animated, className)}
        style={style}
      >
        <defs>
          <clipPath id={`${id}-panel`}>
            <rect width={320} height={220} rx={26} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-panel)`}>
          <Exposure w={320} h={220} pole={[250, -30]} seed={7} night />
          <path d={shastaPath(70, 222, 190, 92)} className={s.mtn} />
          <path d={shastaPath(70, 222, 190, 92)} className={s.mtnRim} />
          <g className={s.expose}>
            <TraceMarks geo={geo} nodes={NODES.map((f) => [...ARC.at(ARC.total * f), true] as [number, number, boolean])} />
          </g>
          <Flare x={292} y={34} size={96} animated={animated} className={s.flare} />
        </g>
      </svg>
    );
  }

  const w = size ?? 120;
  const geo = traceGeo(CHECK, 1, { width: 5, segments: 14, floor: 0.4, ahead: false, head: false });
  return (
    <svg
      viewBox="0 0 120 120"
      width={w}
      height={w}
      role="img"
      aria-label={label ?? "Done"}
      className={cx(g.root, s.done, s.step, animated && s.animated, className)}
      style={style}
    >
      <circle cx={60} cy={60} r={44} className={s.ring} />
      <g className={s.expose}>
        <TraceMarks geo={geo} />
      </g>
      <Flare x={84} y={42} size={74} animated={animated} className={s.flare} />
    </svg>
  );
}
