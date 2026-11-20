import type { CSSProperties } from "react";
import "./gfx.css";
import "./StreakFlame.css";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-streak-flame");

export interface StreakFlameProps {
  /** Height in px; the pill is 1.7× as wide. */
  size?: number;
  /** Lit while the streak is alive; unlit (outlined) when paused. */
  lit?: boolean;
  /** The flame breathes (off under reduced motion). */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/**
 * Streak, as an ember pill: a warm capsule with a layered flame (outer ember,
 * golden core, white heart) and a soft glow under it. Unlit when the streak is
 * paused.
 */
export function StreakFlame({ size = 28, lit = true, animated = true, className, style, title }: StreakFlameProps) {
  const id = useGfxId("streak");
  return (
    <svg
      viewBox="0 0 34 20"
      width={(size * 34) / 20}
      height={size}
      role="img"
      aria-label={title ?? (lit ? "Streak" : "Streak paused")}
      className={cx(g.root, s.pill, !lit && s.unlit, lit && animated && s.animated, className)}
      style={style}
    >
      <defs>
        <linearGradient id={`${id}-p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={s.p0} />
          <stop offset="1" className={s.p1} />
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className={s.f0} />
          <stop offset="1" className={s.f1} />
        </linearGradient>
      </defs>
      {lit ? <rect x={3} y={6} width={28} height={14} rx={7} className={s.glow} /> : null}
      <rect x={1} y={1} width={32} height={18} rx={9} fill={lit ? `url(#${id}-p)` : undefined} className={s.body} />
      {lit ? <path d="M6 4.4C9 2.8 25 2.8 28 4.4" className={s.sheen} /> : null}
      <g className={s.fire}>
        <path d="M17 16.4c-3 0-4.9-1.9-4.9-4.3 0-2.6 2-3.9 2.7-6.3.7 1 1.3 1.7 2.1 2 .3-1.6 1-3 2.1-4.3.3 2.5 2.9 4.3 2.9 7.8 0 2.9-2 5.1-4.9 5.1z" className={s.outer} />
        <path d="M17 16.4c-1.7 0-2.8-1.1-2.8-2.5 0-1.6 1.2-2.4 1.7-3.9.5.9 1.1 1.3 1.8 1.4.1-.9.5-1.7 1.1-2.4.5 1.6 1.8 2.6 1.8 4.6 0 1.6-1.4 2.8-3.6 2.8z" fill={lit ? `url(#${id}-f)` : undefined} className={s.core} />
        <path d="M17.1 16.3c-.8 0-1.3-.5-1.3-1.2 0-.8.6-1.2.9-1.9.3.4.6.6.9.7.3.5.7 1 .7 1.4 0 .6-.5 1-1.2 1z" className={s.heart} />
      </g>
    </svg>
  );
}
