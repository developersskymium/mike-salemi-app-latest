import type { CSSProperties } from "react";
import "./gfx.css";
import "./StreakFlame.css";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-streak-flame");

export interface StreakFlameProps {
  /** Height in px; the pill is 1.7× as wide. */
  size?: number;
  /** Paused streaks show the unlit pill. */
  lit?: boolean;
  /** A streak of light passes across once when it appears. */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/**
 * Streak, as a pill of light: a glacier capsule glowing from within, a flame
 * drawn in one open stroke ending in its light point, and a streak of light
 * that passes across once. Unlit when the streak is paused.
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
        <linearGradient id={`${id}-p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className={s.p0} />
          <stop offset="1" className={s.p1} />
        </linearGradient>
        <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className={s.sw0} />
          <stop offset=".5" className={s.sw1} />
          <stop offset="1" className={s.sw0} />
        </linearGradient>
        <filter id={`${id}-glow`} x="-40%" y="-80%" width="180%" height="260%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <rect x={1} y={1} width={32} height={18} rx={9} />
        </clipPath>
      </defs>
      {lit ? <rect x={2} y={3} width={30} height={16} rx={8} className={s.glow} filter={`url(#${id}-glow)`} /> : null}
      <rect x={1} y={1} width={32} height={18} rx={9} fill={lit ? `url(#${id}-p)` : undefined} className={s.body} />
      {/* Flame: one open stroke ending in its light point. */}
      <path d="M17 15.6c-2.6 0-4.2-1.6-4.2-3.7 0-2 1.5-3.2 2.2-4.5.4 1.3 1 1.9 1.7 2.2-.3-1.9.4-3.8 1.9-5.5 0 2.5 2.6 3.8 2.6 7.5 0 2.2-1.6 4-4.2 4" className={s.flame} />
      <circle cx={17} cy={12.6} r={1.25} className={s.point} />
      {lit ? (
        <g clipPath={`url(#${id}-clip)`}>
          <rect x={-14} y={0} width={12} height={20} fill={`url(#${id}-sweep)`} className={s.streak} />
        </g>
      ) : null}
    </svg>
  );
}
