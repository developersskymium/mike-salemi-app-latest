import type { CSSProperties } from "react";
import "./gfx.css";
import "./Flare.css";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-flare");

export interface FlareProps {
  size?: number;
  /** Burst once (spring), then the shutter closes on it. Static under reduced motion. */
  animated?: boolean;
  /** Position when nested inside another SVG (centre). */
  x?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
}

const ray = (len: number, w: number, angle: number) => {
  const a = (angle * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const nx = -sn * w;
  const ny = c * w;
  return `M${(nx).toFixed(2)} ${(ny).toFixed(2)}L${(c * len).toFixed(2)} ${(sn * len).toFixed(2)}L${(-nx).toFixed(2)} ${(-ny).toFixed(2)}Z`;
};

/**
 * The Flare: where a trace ends on a finished day, a starburst of light —
 * long cross rays, short diagonals, a halo and a white-hot core.
 */
export function Flare({ size = 120, animated = true, x, y, className, style }: FlareProps) {
  const id = useGfxId("flare");
  const rays = [
    ...[0, 90, 180, 270].map((a) => ray(56, 1.3, a)),
    ...[45, 135, 225, 315].map((a) => ray(22, 0.9, a)),
  ];
  return (
    <svg
      viewBox="-60 -60 120 120"
      x={x !== undefined ? x - size / 2 : undefined}
      y={y !== undefined ? y - size / 2 : undefined}
      width={size}
      height={size}
      aria-hidden="true"
      className={cx(g.root, s.flare, animated && s.animated, className)}
      style={style}
    >
      <defs>
        <radialGradient id={`${id}-ray`} cx="0" cy="0" r="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" className={s.hot} />
          <stop offset=".25" className={s.body} />
          <stop offset="1" className={s.fade} />
        </radialGradient>
        <radialGradient id={`${id}-halo`} cx="0" cy="0" r="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" className={s.haloA} />
          <stop offset="1" className={s.haloB} />
        </radialGradient>
      </defs>
      <circle r={24} fill={`url(#${id}-halo)`} className={s.halo} />
      <g className={s.rays} fill={`url(#${id}-ray)`}>
        {rays.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <circle r={4.4} className={s.core} />
    </svg>
  );
}
