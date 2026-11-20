import type { CSSProperties } from "react";
import { BELL_OUTLINE, BELL_WINDOW } from "./figures/bell";
import "./gfx.css";
import "./SwingArc.css";
import { cls, cx, polar, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-swing-arc");

export interface SwingArcProps {
  /** 0..1 fills the arc and parks the bell there; leave out for an indeterminate loader (the bell swings). */
  progress?: number;
  /** Width in px; height follows 64:40. */
  size?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const PIVOT = { x: 32, y: 2 };
const R = 30;
const SPAN = 56; // degrees either side of straight down

/** Clock angle (0 = up, clockwise) for a swing angle (0 = down, + towards the right). */
const clock = (a: number) => 180 - a;

/**
 * The swing arc: the path a kettlebell travels, as a progress bar or a loader.
 * Determinate: the arc fills and the bell sits at the progress point.
 * Indeterminate: the bell swings back and forth along the arc (reduced motion:
 * it rests at the bottom).
 */
export function SwingArc({ progress, size = 64, label, className, style }: SwingArcProps) {
  const id = useGfxId("arc");
  const det = progress !== undefined;
  const p = Math.min(1, Math.max(0, progress ?? 0));
  const [x0, y0] = polar(PIVOT.x, PIVOT.y, R, clock(-SPAN));
  const [x1, y1] = polar(PIVOT.x, PIVOT.y, R, clock(SPAN));
  const arc = `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 0 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  const len = (Math.PI * R * (SPAN * 2)) / 180;
  const angle = -SPAN + p * SPAN * 2;
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
      <defs>
        <radialGradient id={`${id}-bell`} cx=".34" cy=".58" r=".75">
          <stop offset="0" className={s.hi} />
          <stop offset=".55" className={s.mid} />
          <stop offset="1" className={s.lo} />
        </radialGradient>
      </defs>
      <path d={arc} className={s.track} />
      {det ? <path d={arc} className={s.fill} strokeDasharray={`${(len * p).toFixed(2)} ${len.toFixed(2)}`} /> : <path d={arc} className={s.trail} />}
      <g className={s.pendulum} style={{ transform: det ? `rotate(${(-angle).toFixed(2)}deg)` : undefined }}>
        <g transform={`translate(${PIVOT.x} ${PIVOT.y + R - 6}) scale(.34)`}>
          <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" fill={`url(#${id}-bell)`} />
        </g>
      </g>
    </svg>
  );
}
