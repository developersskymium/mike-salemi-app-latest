import type { CSSProperties } from "react";
import "./gfx.css";
import "./Completion.css";
import { MomentScene } from "./Moment";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-completion");

export interface CompletionProps {
  /** "step": a set or step done. "milestone": a day or phase finished (the day-complete scene). */
  variant?: "step" | "milestone";
  /** Width in px (step 120, milestone 320 by default). */
  size?: number;
  /** Play the moment once. Static under reduced motion. */
  animated?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4 + Math.PI / 8;
  const r0 = 50;
  const r1 = i % 2 ? 56 : 59;
  return `M${(60 + Math.cos(a) * r0).toFixed(1)} ${(60 + Math.sin(a) * r0).toFixed(1)}L${(60 + Math.cos(a) * r1).toFixed(1)} ${(60 + Math.sin(a) * r1).toFixed(1)}`;
}).join("");

/**
 * Completion moments in Summit. Step: an ember seal with its check drawn in,
 * a burst of short rays and two glacier sparks. Milestone: the day-complete
 * scene (MomentScene "day").
 */
export function Completion({ variant = "step", size, animated = true, label, className, style }: CompletionProps) {
  const id = useGfxId("done");
  if (variant === "milestone") {
    return <MomentScene kind="day" size={size ?? 320} animated={animated} label={label ?? "Day complete"} className={className} style={style} />;
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
      <defs>
        <radialGradient id={`${id}-seal`} cx=".36" cy=".3" r=".8">
          <stop offset="0" className={s.hi} />
          <stop offset=".6" className={s.mid} />
          <stop offset="1" className={s.lo} />
        </radialGradient>
      </defs>
      <path d={RAYS} className={s.rays} />
      <circle cx={60} cy={63} r={40} className={s.shadow} />
      <circle cx={60} cy={60} r={40} fill={`url(#${id}-seal)`} className={s.seal} />
      <circle cx={60} cy={60} r={34.5} className={s.inner} />
      <path d="M42 60.5 54 72.5 79 47" className={s.check} pathLength={1} />
      <path d="M33 44A30 30 0 0 1 50 30" className={s.gloss} />
      <path d="M96 22l1.4 3.6 3.6 1.4-3.6 1.4L96 32l-1.4-3.6L91 27l3.6-1.4z" className={s.spark} />
      <path d="M20 90l1 2.6 2.6 1-2.6 1L20 97.2l-1-2.6-2.6-1 2.6-1z" className={s.spark} />
    </svg>
  );
}
