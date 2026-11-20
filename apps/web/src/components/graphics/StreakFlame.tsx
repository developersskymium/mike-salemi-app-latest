import type { CSSProperties } from "react";
import "./gfx.css";
import "./StreakFlame.css";
import { cx, useGfxId, cls } from "./util";

const g = cls("gfx");
const s = cls("gfx-streak-flame");

export interface StreakFlameProps {
  /** Height in px; width follows the 24:30 mark. */
  size?: number;
  /** An unlit flame (streak paused) draws as a quiet outline. */
  lit?: boolean;
  /** Gentle flicker loop (off under reduced motion). */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const OUTER =
  "M12 1.6c1.3 4.2 6.9 7.5 6.9 15.7 0 5.6-3 10.3-6.9 10.3s-6.9-4.4-6.9-9.6c0-3.4 1.6-5.7 3.4-7.4.1 2.4 1 3.8 2.2 4.4-.6-4.6.4-10.2 1.3-13.4Z";
const INNER =
  "M12.1 13.6c1.4 2.9 3.4 4.7 3.4 8.1 0 2.8-1.5 4.6-3.5 4.6s-3.4-1.7-3.4-4.2c0-2.4 1.8-3.6 2.3-5.4.7 1 1.2-1 1.2-3.1Z";

/** A small living flame for streaks: glacier-blue fire with a white-hot core. */
export function StreakFlame({ size = 28, lit = true, animated = true, className, style, title }: StreakFlameProps) {
  const id = useGfxId("flame");
  return (
    <svg
      viewBox="0 0 24 30"
      width={(size * 24) / 30}
      height={size}
      role="img"
      aria-label={title ?? (lit ? "Streak" : "Streak paused")}
      className={cx(g.root, s.flame, !lit && s.unlit, lit && animated && s.animated, className)}
      style={style}
    >
      <defs>
        <linearGradient id={`${id}-o`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className={s.o0} />
          <stop offset=".55" className={s.o1} />
          <stop offset="1" className={s.o2} />
        </linearGradient>
        <linearGradient id={`${id}-i`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className={s.i0} />
          <stop offset="1" className={s.i1} />
        </linearGradient>
      </defs>
      {lit ? (
        <>
          <ellipse cx={12} cy={27.6} rx={7} ry={1.6} className={s.glow} />
          <g className={s.outer}>
            <path d={OUTER} fill={`url(#${id}-o)`} />
          </g>
          <g className={s.inner}>
            <path d={INNER} fill={`url(#${id}-i)`} />
          </g>
          <circle cx={15.6} cy={9} r={0.8} className={s.ember} />
          <circle cx={8.4} cy={12} r={0.6} className={cx(s.ember, s.ember2)} />
        </>
      ) : (
        <path d={OUTER} className={s.outline} />
      )}
    </svg>
  );
}
