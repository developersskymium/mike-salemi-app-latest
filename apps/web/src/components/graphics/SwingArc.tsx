import type { CSSProperties } from "react";
import "./gfx.css";
import "./SwingArc.css";
import { Line, traceGeo, type Pt } from "./trace";
import { TraceMarks } from "./Trace";
import { cls, cx } from "./util";

const g = cls("gfx");
const s = cls("gfx-swing-arc");

export interface SwingArcProps {
  /** 0..1 exposes the arc up to that point; leave out for an indeterminate loader (a short trace sweeps the arc). */
  progress?: number;
  /** Width in px; height follows 64:40. */
  size?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const PIVOT = { x: 32, y: 0 };
const R = 32;
const SPAN = 56;
/** Point on the swing arc for a swing angle (0 = straight down, + to the right). */
const on = (a: number): Pt => [PIVOT.x + R * Math.sin((a * Math.PI) / 180), PIVOT.y + R * Math.cos((a * Math.PI) / 180)];
const arc = (from: number, to: number, n = 40) => new Line(Array.from({ length: n + 1 }, (_, i) => on(from + ((to - from) * i) / n)));
const FULL = arc(-SPAN, SPAN);
const SHORT = arc(-40, 0, 24);

/**
 * The swing arc: the bell's path as progress or loader, drawn as a Trace.
 * Determinate: exposed to the progress point, hot head leading, the rest of
 * the arc dotted ahead. Indeterminate: a short trace sweeps the arc again and
 * again (reduced motion: it rests at the bottom).
 */
export function SwingArc({ progress, size = 64, label, className, style }: SwingArcProps) {
  const det = progress !== undefined;
  const p = Math.min(1, Math.max(0, progress ?? 0));
  return (
    <svg
      viewBox="0 0 64 40"
      width={size}
      height={(size * 40) / 64}
      role={det ? "progressbar" : "img"}
      aria-label={label ?? (det ? "Progress" : "Loading")}
      aria-valuenow={det ? Math.round(p * 100) : undefined}
      aria-valuemin={det ? 0 : undefined}
      aria-valuemax={det ? 100 : undefined}
      className={cx(g.root, s.arc, !det && s.indeterminate, className)}
      style={style}
    >
      {det ? (
        <TraceMarks geo={traceGeo(FULL, p, { width: 2.6, segments: 18, floor: 0.1 })} />
      ) : (
        <>
          <TraceMarks geo={traceGeo(FULL, 0, { width: 2.6, head: false })} />
          <g className={s.sweep}>
            <TraceMarks geo={traceGeo(SHORT, 1, { width: 2.6, segments: 14, floor: 0.02, ahead: false })} />
          </g>
        </>
      )}
    </svg>
  );
}
