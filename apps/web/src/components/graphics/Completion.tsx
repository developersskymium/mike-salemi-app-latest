import type { CSSProperties } from "react";
import { ChalkBurst } from "./ChalkBurst";
import "./gfx.css";
import "./Completion.css";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-completion");

export interface CompletionProps {
  /** "step": a set or workout done. "milestone": a phase finished, the flag on the summit. */
  variant?: "step" | "milestone";
  /** Width in px (step 120, milestone 320 by default). */
  size?: number;
  /** Play the moment once (disc pops, check draws, chalk bursts). Static when off or under reduced motion. */
  animated?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Completion moments. Step: a glacier glass disc pops, the check draws itself
 * and chalk bursts from it. Milestone: the flag goes up on the summit with a
 * chalk burst. One-shot only.
 */
export function Completion({ variant = "step", size, animated = true, label, className, style }: CompletionProps) {
  const id = useGfxId("done");
  const defs = (
    <>
      <radialGradient id={`${id}-disc`} cx=".36" cy=".3" r=".8">
        <stop offset="0" className={s.d0} />
        <stop offset=".6" className={s.d1} />
        <stop offset="1" className={s.d2} />
      </radialGradient>
      <linearGradient id={`${id}-gl`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className={s.gl0} />
        <stop offset="1" className={s.gl1} />
      </linearGradient>
    </>
  );

  if (variant === "milestone") {
    const w = size ?? 320;
    return (
      <svg
        viewBox="0 0 320 220"
        width={w}
        height={(w * 220) / 320}
        role="img"
        aria-label={label ?? "Phase complete"}
        className={cx(g.root, s.done, s.milestone, animated && s.animated, className)}
        style={style}
      >
        <defs>
          {defs}
          <linearGradient id={`${id}-mtn`} x1="0" y1="60" x2="0" y2="210" gradientUnits="userSpaceOnUse">
            <stop offset="0" className={s.m0} />
            <stop offset="1" className={s.m1} />
          </linearGradient>
          <radialGradient id={`${id}-fade`} cx=".5" cy=".42" r=".62">
            <stop offset=".55" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <mask id={`${id}-vignette`} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="220">
            <rect width="320" height="220" fill={`url(#${id}-fade)`} />
          </mask>
          <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
            <stop offset="0" className={s.glow0} />
            <stop offset="1" className={s.glow1} />
          </radialGradient>
        </defs>
        <circle cx={160} cy={72} r={90} fill={`url(#${id}-glow)`} className={s.glow} />
        <g mask={`url(#${id}-vignette)`}>
        <path d="M0 196 50 160Q56 156 62 159L92 172 124 140Q129 135.4 134 140L140 146 152 122Q160 108 168 122L196 168 222 150Q228 146 234 150L320 192V220H0Z" className={s.back} />
        <path d="M-4 220 40 186 74 194 116 156Q124 149 132 144L150 94Q160 72 170 94L196 148 230 172 268 168 324 204V220Z" fill={`url(#${id}-mtn)`} />
        <path d="M141.6 118 150 94Q160 72 170 94L178.6 115.4 171.4 110.8 165.6 118.6 159.6 110.4 153.2 119.4 147.4 111.6Z" className={s.snowcap} />
        <path d="M96 214 108 198 102 190 118 178 112 168 128 158 124 146 138 128" className={s.trail} />
        </g>
        <g className={s.flag}>
          <rect x={159} y={50} width={2.4} height={30} rx={1.2} className={s.pole} />
          <path d="M161.4 51.4Q161.4 50 162.8 50.5L182 57.2Q184 58 182 58.8L162.8 65.5Q161.4 66 161.4 64.6Z" fill={`url(#${id}-disc)`} />
        </g>
        <ChalkBurst size={150} x={85} y={0} animated={animated} className={s.burst} />
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
      aria-label={label ?? "Done"}
      className={cx(g.root, s.done, s.step, animated && s.animated, className)}
      style={style}
    >
      <defs>{defs}</defs>
      <ChalkBurst size={190} x={-35} y={-35} animated={animated} className={s.burst} />
      <g className={s.disc}>
        <circle cx={60} cy={60} r={30} fill={`url(#${id}-disc)`} />
        <path d="M34 54C36 40 48 31 60 31S84 40 86 54C76 47 44 47 34 54Z" fill={`url(#${id}-gl)`} />
        <circle cx={60} cy={60} r={29.5} className={s.rim} />
        <path d="M46.5 61.5 55.5 70.5 74.5 50.5" className={s.check} pathLength={1} />
      </g>
    </svg>
  );
}
