import type { CSSProperties } from "react";
import "./gfx.css";
import "./ChalkBurst.css";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-chalk");

export interface ChalkBurstProps {
  size?: number;
  /** Play the burst once on mount. Without motion it shows the burst mid-flight, as an illustration. */
  animated?: boolean;
  /** Mix a few glacier specks into the chalk. */
  accent?: boolean;
  /** Position when nested inside another SVG. */
  x?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
}

/* Deterministic spray: angle (deg), distance, radius, delay (ms). */
const SPECKS = Array.from({ length: 22 }, (_, i) => {
  const a = (i * 137.5) % 360;
  const d = 30 + ((i * 53) % 22);
  const r = 0.9 + ((i * 7) % 5) * 0.32;
  return { a, d, r, delay: (i * 23) % 120 };
});
const PUFFS = [
  { x: -14, y: -6, r: 15 },
  { x: 12, y: -10, r: 13 },
  { x: 2, y: 10, r: 16 },
  { x: -6, y: -16, r: 10 },
];

/**
 * Completion "chalk burst": the slap of chalked hands — soft puffs of chalk
 * dust bloom and fade while specks spray outwards. One-shot, never looping.
 */
export function ChalkBurst({ size = 120, animated = true, accent = true, x, y, className, style }: ChalkBurstProps) {
  const id = useGfxId("chalk");
  return (
    <svg
      viewBox="-60 -60 120 120"
      x={x}
      y={y}
      width={size}
      height={size}
      aria-hidden="true"
      className={cx(g.root, s.burst, animated && s.animated, className)}
      style={style}
    >
      <defs>
        <radialGradient id={`${id}-puff`} cx=".45" cy=".4" r=".55">
          <stop offset="0" className={s.puffA} />
          <stop offset=".7" className={s.puffB} />
          <stop offset="1" className={s.puffC} />
        </radialGradient>
      </defs>
      {PUFFS.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill={`url(#${id}-puff)`}
          className={s.puff}
          style={{ animationDelay: `${i * 40}ms` }}
        />
      ))}
      {SPECKS.map((k, i) => {
        const rad = (k.a * Math.PI) / 180;
        const dx = Math.cos(rad) * k.d;
        const dy = Math.sin(rad) * k.d;
        return (
          <circle
            key={i}
            r={k.r}
            cx={0}
            cy={0}
            className={cx(s.speck, accent && i % 7 === 3 && s.speckAccent)}
            style={
              {
                "--dx": `${dx.toFixed(1)}px`,
                "--dy": `${dy.toFixed(1)}px`,
                "--dx2": `${(dx * 0.62).toFixed(1)}px`,
                "--dy2": `${(dy * 0.62).toFixed(1)}px`,
                animationDelay: `${k.delay}ms`,
              } as CSSProperties
            }
          />
        );
      })}
    </svg>
  );
}
