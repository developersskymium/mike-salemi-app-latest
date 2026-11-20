import type { CSSProperties } from "react";
import { hashId, pointAt, sample, slice, whenReached } from "./geometry";

export type TraceTone = "trace" | "ink" | "ice" | "white";

export type TraceLineProps = {
  /** The path the light travels (absolute or relative SVG path data). */
  d: string;
  /** SVG viewBox, e.g. "0 0 200 120". */
  viewBox: string;
  /** Stroke width at the head, in viewBox units. */
  width?: number;
  /** How far the light has travelled, 0–1. */
  progress?: number;
  /** Steps along the path (0–1). Lit once the head has passed them. */
  nodes?: number[];
  nodeR?: number;
  /** Dotted path ahead of the head. */
  ahead?: boolean;
  /** White-hot head with a halo. Defaults to on while progress < 1 or when the trace ends. */
  head?: boolean;
  /** Blurred glow under the tail. */
  glow?: boolean;
  /** Tail spans the whole travelled path (completion). Otherwise `tail` (fraction of the path). */
  fullTail?: boolean;
  tail?: number;
  /** Tail slices (default 18, capped by length); more = smoother taper, more markup. */
  segments?: number;
  /** Opacity the tail cools to. */
  floor?: number;
  /** Expose: draw from 0 on first paint (CSS + SMIL, off under reduced motion). */
  animate?: boolean;
  /** ms */
  duration?: number;
  /** ms */
  delay?: number;
  tone?: TraceTone;
  /** Keep stroke widths in CSS px when the SVG is stretched. */
  nonScaling?: boolean;
  preserveAspectRatio?: string;
  /** Accessible description; omit for decorative traces. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** Extra SVG children drawn above the trace (labels, flares). */
  children?: React.ReactNode;
};

const TONES: Record<TraceTone, CSSProperties> = {
  trace: {},
  ink: { "--tr-c": "var(--ink)", "--tr-hot": "var(--ink)", "--tr-dim": "var(--rule)" } as CSSProperties,
  ice: { "--tr-c": "var(--ring-3)", "--tr-hot": "var(--ring-3-hi)" } as CSSProperties,
  white: { "--tr-c": "#E6F8FF", "--tr-hot": "#FFFFFF", "--tr-dim": "rgba(230,248,255,.35)" } as CSSProperties,
};

const r1 = (v: number) => Math.round(v * 100) / 100;

/**
 * The signature drawing rule: light travelling along a path with a white-hot head, a
 * tapered tail that cools to `floor`, a blurred glow, a dotted path ahead and lit nodes.
 * Server-rendered geometry; Expose is SMIL: one mask stroke reveals the tail as the head travels.
 */
export function TraceLine({
  d, viewBox, width: w = 3, progress = 1, nodes, nodeR, ahead = true, head, glow = true, fullTail, tail = 1,
  segments = 18, floor = 0.08, animate = false, duration = 1400, delay = 0, tone = "trace", nonScaling,
  preserveAspectRatio, label, className, style, children,
}: TraceLineProps) {
  const s = sample(d);
  const L = s.length;
  const p = Math.max(0, Math.min(1, progress));
  const done = L * p;
  const showHead = head ?? true;
  const pid = hashId("p", d);
  const mid = hashId("m", d, viewBox, p, w, duration, delay);
  const [vx, vy, vw, vh] = viewBox.split(/[\s,]+/).map(Number) as [number, number, number, number];
  const vs = nonScaling ? "non-scaling-stroke" : undefined;
  const tailStart = fullTail ? 0 : Math.max(0, done - L * tail);
  const N = Math.max(5, Math.min(Math.round(segments), Math.round(L / 8)));
  const LL = r1(L);
  /* each tail slice is the same path shown through a dash window: tiny markup, exact geometry */
  const win = (a: number, b: number) => ({ strokeDasharray: `${r1(Math.max(0.01, b - a))} ${r1(LL * 2 + 10)}`, strokeDashoffset: r1(-a) });

  /* nodes light as the head passes them (timed on the same ease as the head) */
  const at = (x: number) => Math.round(delay + whenReached(x / Math.max(done, 0.001)) * duration);
  const segs: { dash: ReturnType<typeof win>; sw: number; op: number; cap: boolean }[] = [];
  if (done > 0.5) {
    for (let i = 0; i < N; i++) {
      const a = tailStart + ((done - tailStart) * i) / N;
      const b = Math.min(done, tailStart + ((done - tailStart) * (i + 1)) / N + 0.6);
      const t = (i + 1) / N;
      segs.push({ dash: win(a, b), sw: r1(w * (0.25 + 0.75 * t)), op: r1(floor + (1 - floor) * Math.pow(t, 1.5)), cap: i === N - 1 });
    }
  }
  const h = pointAt(s, done);
  const keySpline = ".33 1 .68 1";
  const dur = `${duration}ms`;
  const begin = `${delay}ms`;
  const aheadStep = Math.max(1.5, (L - done) / 140);

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
      style={{ ...TONES[tone], "--tr-dur": dur, "--tr-delay": begin, "--tr-p": p, ...style } as CSSProperties}
    >
      <defs>
        <path id={pid} d={d} />
        {animate && done > 0.5 && (
          <mask id={mid} maskUnits="userSpaceOnUse" x={vx - vw} y={vy - vh} width={vw * 3} height={vh * 3}>
            <use
              href={`#${pid}`}
              className="tr-reveal"
              fill="none"
              stroke="#fff"
              strokeWidth={r1(w * 8)}
              strokeDasharray={`${LL + 10} ${LL + 10}`}
              strokeDashoffset={r1(LL + 10 - done)}
              style={{ "--tr-end": r1(LL + 10 - done) } as CSSProperties}
            >
              <animate
                attributeName="stroke-dashoffset"
                values={`${r1(LL + 10)};${r1(LL + 10)};${r1(LL + 10 - done)}`}
                keyTimes={`0;${(delay / (delay + duration)).toFixed(4)};1`}
                calcMode="spline"
                keySplines={`0 0 1 1;${keySpline}`}
                dur={`${delay + duration}ms`}
                fill="freeze"
              />
            </use>
          </mask>
        )}
      </defs>
      {ahead && done < L - 0.5 && (
        <polyline className="tr-ahead" points={slice(s, done, L, aheadStep)} strokeWidth={Math.max(1.4, w * 0.55)} vectorEffect={vs} />
      )}
      {done > 0.5 && (
        <g mask={animate ? `url(#${mid})` : undefined}>
          {glow && w >= 1.6 && <use href={`#${pid}`} className="tr-glow" {...win(Math.max(tailStart, done * 0.45), done)} strokeWidth={r1(w * 3.2)} vectorEffect={vs} />}
          {segs.map((g, i) => (
            <use key={i} href={`#${pid}`} className="tr-tail" {...g.dash} strokeWidth={g.sw} strokeOpacity={g.op} strokeLinecap={g.cap ? "round" : "butt"} vectorEffect={vs} />
          ))}
        </g>
      )}
      {(nodes ?? []).map((f, i) => {
        const at0 = L * f;
        const pt = pointAt(s, at0);
        const lit = at0 <= done + 0.5;
        const litAt = animate && lit && p > 0 ? at(at0) : undefined;
        return (
          <circle
            key={i}
            className="tr-node"
            data-lit={lit ? "" : undefined}
            cx={r1(pt.x)}
            cy={r1(pt.y)}
            r={nodeR ?? w * 1.6}
            style={litAt !== undefined ? ({ "--lit-at": `${Math.round(litAt)}ms` } as CSSProperties) : undefined}
          />
        );
      })}
      {showHead && done > 0.5 && (
        <>
          <g className={animate ? "tr-head tr-head-still" : "tr-head"} transform={`translate(${r1(h.x)} ${r1(h.y)})`}>
            <circle className="tr-halo" r={r1(w * 3.2)} />
            <circle className="tr-hot" r={r1(Math.max(w * 0.95, 1.2))} />
          </g>
          {animate && (
            <g className="tr-head tr-head-anim" opacity={0}>
              <set attributeName="opacity" to="1" begin={begin} fill="freeze" />
              <animateMotion
                begin={begin}
                dur={dur}
                fill="freeze"
                keyPoints={`0;${p}`}
                keyTimes="0;1"
                calcMode="spline"
                keySplines={keySpline}
              >
                <mpath href={`#${pid}`} />
              </animateMotion>
              <circle className="tr-halo" r={r1(w * 3.2)} />
              <circle className="tr-hot" r={r1(Math.max(w * 0.95, 1.2))} />
            </g>
          )}
        </>
      )}
      {children}
    </svg>
  );
}
