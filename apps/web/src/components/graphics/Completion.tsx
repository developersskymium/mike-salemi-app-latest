import type { CSSProperties } from "react";
import "./gfx.css";
import "./Completion.css";
import { cx, polar, useGfxId, cls } from "./util";

const g = cls("gfx");
const s = cls("gfx-completion");

export interface CompletionProps {
  /** "step" for a step or day; "milestone" for a phase or level, with the ridge. */
  variant?: "step" | "milestone";
  size?: number;
  /** Play the moment (true) or show its settled end state (false). */
  animated?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/* Fixed, hand-placed shimmer so server and client agree. */
const SPARKS: { a: number; d: number; r: number; delay: number; star?: boolean }[] = [
  { a: 12, d: 50, r: 1.6, delay: 0.62, star: true },
  { a: 58, d: 46, r: 1.1, delay: 0.7 },
  { a: 96, d: 54, r: 1.4, delay: 0.66, star: true },
  { a: 140, d: 47, r: 1, delay: 0.74 },
  { a: 182, d: 52, r: 1.5, delay: 0.64 },
  { a: 220, d: 45, r: 1.2, delay: 0.78, star: true },
  { a: 262, d: 53, r: 1, delay: 0.68 },
  { a: 304, d: 48, r: 1.4, delay: 0.72, star: true },
  { a: 338, d: 55, r: 1.1, delay: 0.8 },
];

function Burst({ cxy, radius }: { cxy: number; radius: number }) {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30 + 15);
  return (
    <g className={s.burst}>
      <circle cx={cxy} cy={cxy} r={radius + 4} className={s.wave} />
      {rays.map((a) => {
        const [x1, y1] = polar(cxy, cxy, radius + 9, a);
        const [x2, y2] = polar(cxy, cxy, radius + (a % 60 === 15 ? 19 : 15), a);
        return <path key={a} d={`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`} className={s.ray} pathLength={1} />;
      })}
      {SPARKS.map((p) => {
        const [x, y] = polar(cxy, cxy, (p.d * radius) / 30, p.a);
        const style = { ["--delay" as string]: `${p.delay}s`, ["--dx" as string]: `${((x - cxy) * 0.18).toFixed(1)}px`, ["--dy" as string]: `${((y - cxy) * 0.18).toFixed(1)}px` };
        return p.star ? (
          <path
            key={p.a}
            d={`M${x.toFixed(1)} ${(y - p.r * 2.4).toFixed(1)}v${(p.r * 4.8).toFixed(1)}M${(x - p.r * 2.4).toFixed(1)} ${y.toFixed(1)}h${(p.r * 4.8).toFixed(1)}`}
            className={cx(s.spark, s.star)}
            style={style}
          />
        ) : (
          <circle key={p.a} cx={x} cy={y} r={p.r} className={s.spark} style={style} />
        );
      })}
    </g>
  );
}

function Medallion({ cxy, radius }: { cxy: number; radius: number }) {
  const k = radius / 30;
  const check = `M${cxy - 11 * k} ${cxy + 0.5 * k}l${7.5 * k} ${7.5 * k}l${15 * k} ${-16 * k}`;
  return (
    <g className={s.medallion}>
      <circle cx={cxy} cy={cxy} r={radius} pathLength={1} className={s.ring} />
      <circle cx={cxy} cy={cxy} r={radius - 4.5 * k} className={s.disc} />
      <path d={check} pathLength={1} className={s.check} style={{ strokeWidth: 4.2 * k }} />
    </g>
  );
}

/**
 * The completion moment: a ring closes, the disc lands on a spring, the check
 * draws itself, then a burst and a short shimmer. The milestone variant rises
 * over the ridge like a sun.
 */
export function Completion({ variant = "step", size, animated = true, label, className, style }: CompletionProps) {
  const id = useGfxId("done");
  if (variant === "milestone") {
    const w = size ?? 320;
    return (
      <svg
        viewBox="0 0 320 220"
        width={w}
        height={(w * 220) / 320}
        role="img"
        aria-label={label ?? "Milestone complete"}
        className={cx(g.root, s.done, s.milestone, animated && s.animated, className)}
        style={style}
      >
        <defs>
          <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
            <stop offset="0" className={s.glowCore} />
            <stop offset="1" className={s.glowEdge} />
          </radialGradient>
          <linearGradient id={`${id}-ridge`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className={s.ridgeTop} />
            <stop offset="1" className={s.ridgeLow} />
          </linearGradient>
          <clipPath id={`${id}-sky`}>
            <path d="M0 0H320V172L272 136 246 146 214 108 172 142 148 130 124 140 98 128 62 160 34 150 0 170Z" />
          </clipPath>
        </defs>
        <circle cx={160} cy={96} r={110} fill={`url(#${id}-glow)`} className={s.glow} />
        <g clipPath={`url(#${id}-sky)`}>
          <g className={s.rise}>
            <svg x={100} y={14} width={120} height={120} viewBox="0 0 120 120" overflow="visible">
              <Burst cxy={60} radius={34} />
              <Medallion cxy={60} radius={34} />
            </svg>
          </g>
        </g>
        <path
          d="M0 170 34 150 62 160 98 128 124 140 148 130 172 142 214 108 246 146 272 136 320 172V220H0Z"
          fill={`url(#${id}-ridge)`}
          className={s.ridge}
        />
        <path d="M0 170 34 150 62 160 98 128 124 140 148 130 172 142 214 108 246 146 272 136 320 172" className={s.ridgeLine} />
        <path d="M204 119.5 214 108 225 121.5 219 119 214 124 209 119Z" className={s.snowcap} />
        <path d="M0 196C60 186 110 192 160 186S260 178 320 190" className={s.mist} />
      </svg>
    );
  }

  const w = size ?? 120;
  return (
    <svg
      viewBox="0 0 120 120"
      width={w}
      height={w}
      role="img"
      aria-label={label ?? "Complete"}
      className={cx(g.root, s.done, animated && s.animated, className)}
      style={style}
    >
      <Burst cxy={60} radius={30} />
      <Medallion cxy={60} radius={30} />
    </svg>
  );
}
