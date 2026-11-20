import type { CSSProperties } from "react";
import "./gfx.css";
import "./StreakFlame.css";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-streak-flame");

export interface StreakFlameProps {
  /** Height in px; width follows 32:40. */
  size?: number;
  /** Paused streaks show the unlit outline. */
  lit?: boolean;
  /** Ignite once when it appears. */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const OUTER =
  "M16 2.6C18.6 8.4 25.8 12.8 25.8 22.6C25.8 30.4 21.4 36.8 16 36.8S6.2 30.4 6.2 22.6C6.2 17.4 8.6 14 10.6 11.6C10.8 15.4 12.6 17.6 14.4 18.2C13.4 12.8 14 7.4 16 2.6Z";
const INNER =
  "M16.4 16.8C18.4 20.8 21.6 23.2 21.6 28.4C21.6 32.4 19.2 35.4 16 35.4S10.4 32.6 10.4 28.6C10.4 25.4 12.4 23.6 13.8 22.4C14 24.4 15 25.6 15.8 25.8C15.4 22.8 15.4 19.6 16.4 16.8Z";

/**
 * Streak flame: a glass flame in glacier blue — deep outer flame, a brighter
 * inner tongue and a white-hot core, with a specular edge. Unlit when paused.
 */
export function StreakFlame({ size = 28, lit = true, animated = true, className, style, title }: StreakFlameProps) {
  const id = useGfxId("flame");
  return (
    <svg
      viewBox="0 0 32 40"
      width={(size * 32) / 40}
      height={size}
      role="img"
      aria-label={title ?? (lit ? "Streak" : "Streak paused")}
      className={cx(g.root, s.flame, !lit && s.unlit, lit && animated && s.animated, className)}
      style={style}
    >
      <defs>
        <linearGradient id={`${id}-o`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={s.o0} />
          <stop offset=".55" className={s.o1} />
          <stop offset="1" className={s.o2} />
        </linearGradient>
        <linearGradient id={`${id}-i`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={s.i0} />
          <stop offset="1" className={s.i1} />
        </linearGradient>
        <radialGradient id={`${id}-c`} cx=".5" cy=".6" r=".5">
          <stop offset="0" className={s.c0} />
          <stop offset="1" className={s.c1} />
        </radialGradient>
      </defs>
      {lit ? (
        <g className={s.body}>
          <path d={OUTER} fill={`url(#${id}-o)`} />
          <path d={INNER} fill={`url(#${id}-i)`} />
          <ellipse cx={16} cy={30.6} rx={3.2} ry={4.2} fill={`url(#${id}-c)`} />
          <path d="M9.2 18.6C8 21 7.8 24.6 8.6 27.6" className={s.spec} />
        </g>
      ) : (
        <path d={OUTER} className={s.out} />
      )}
    </svg>
  );
}
