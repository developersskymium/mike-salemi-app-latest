import type { CSSProperties } from "react";
import { hashId, pointAt, sample, slice } from "./geometry";

export type TraceTone = "trace" | "ink" | "ice" | "white" | "warm";

export type TraceLineProps = {
  /** The path (absolute or relative SVG path data). */
  d: string;
  /** SVG viewBox, e.g. "0 0 200 120". */
  viewBox: string;
  /** Stroke width in viewBox units. */
  width?: number;
  /** How far along the path the member is, 0–1. */
  progress?: number;
  /** Steps along the path (0–1). Filled once passed. */
  nodes?: number[];
  nodeR?: number;
  /** Dotted path ahead. */
  ahead?: boolean;
  /** A "you are here" dot at the end of the travelled part. */
  head?: boolean;
  /** Retired (Trace glow). Accepted, ignored. */
  glow?: boolean;
  /** Retired (Trace tail taper). Accepted, ignored. */
  fullTail?: boolean;
  tail?: number;
  segments?: number;
  floor?: number;
  /** Fill: draw from 0 on first paint (CSS, off under reduced motion). */
  animate?: boolean;
  /** ms */
  duration?: number;
  /** ms */
  delay?: number;
  /** trace = glacier, warm = ember (progress), ink, ice = success, white (over photos). */
  tone?: TraceTone;
  /** Keep stroke widths in CSS px when the SVG is stretched. */
  nonScaling?: boolean;
  preserveAspectRatio?: string;
  /** Accessible description; omit for decorative lines. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
};

const TONES: Record<TraceTone, CSSProperties> = {
  trace: {},
  warm: { "--tr-c": "var(--warm)" } as CSSProperties,
  ink: { "--tr-c": "var(--label)", "--tr-dim": "var(--line-strong)" } as CSSProperties,
  ice: { "--tr-c": "var(--ok)" } as CSSProperties,
  white: { "--tr-c": "#FFFFFF", "--tr-dim": "rgba(255,255,255,.4)" } as CSSProperties,
};

const r1 = (v: number) => Math.round(v * 100) / 100;

/**
 * Summit route line (the Trace drawing rule, retired): a solid round-capped line for the travelled
 * part, a dotted path ahead, filled nodes, and an optional "you are here" dot. Fills on view.
 */
export function TraceLine({
  d, viewBox, width: w = 3, progress = 1, nodes, nodeR, ahead = true, head, animate = false, duration = 700, delay = 0,
  tone = "trace", nonScaling, preserveAspectRatio, label, className, style, children,
}: TraceLineProps) {
  const s = sample(d);
  const L = s.length;
  const p = Math.max(0, Math.min(1, progress));
  const done = L * p;
  const pid = hashId("p", d);
  const vs = nonScaling ? "non-scaling-stroke" : undefined;
  const h = pointAt(s, done);
  const showHead = (head ?? p < 1) && done > 0.5;
  const LL = r1(L);
  return (
    <svg
      className={className ? `tr-svg ${className}` : "tr-svg"}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      data-anim={animate ? "" : undefined}
      style={{ ...TONES[tone], "--tr-dur": `${duration}ms`, "--tr-delay": `${delay}ms`, ...style } as CSSProperties}
    >
      <defs>
        <path id={pid} d={d} />
      </defs>
      {ahead && done < L - 0.5 && (
        <polyline className="tr-ahead" points={slice(s, done, L, Math.max(1.5, (L - done) / 140))} strokeWidth={Math.max(1.4, w * 0.7)} strokeDasharray={`0 ${r1(w * 2.6)}`} vectorEffect={vs} />
      )}
      {done > 0.5 && (
        <use
          href={`#${pid}`}
          className="tr-tail"
          strokeWidth={w}
          strokeDasharray={`${r1(done)} ${r1(LL * 2 + 10)}`}
          style={{ "--tr-len": r1(done) } as CSSProperties}
          vectorEffect={vs}
        />
      )}
      {(nodes ?? []).map((f, i) => {
        const pt = pointAt(s, L * f);
        const lit = L * f <= done + 0.5;
        return <circle key={i} className="tr-node" data-lit={lit ? "" : undefined} cx={r1(pt.x)} cy={r1(pt.y)} r={nodeR ?? w * 1.6} strokeWidth={Math.max(1.5, w * 0.6)} />;
      })}
      {showHead && (
        <g className="tr-head" transform={`translate(${r1(h.x)} ${r1(h.y)})`}>
          <circle className="tr-halo" r={r1(w * 2.6)} />
          <circle className="tr-hot" r={r1(Math.max(w * 1.3, 1.6))} />
        </g>
      )}
      {children}
    </svg>
  );
}
