import type { CSSProperties } from "react";
import "./gfx.css";
import "./Rings.css";
import { clamp, cx, useGfxId, cls } from "./util";

const g = cls("gfx");
const s = cls("gfx-rings");

export interface RingsProps {
  /** Outer to inner, each 0–1 (values above 1 show a full ring). */
  values: number[];
  size?: number;
  /** Ring thickness in px at the given size. */
  thickness?: number;
  gap?: number;
  /** Spring the rings in on mount. */
  animated?: boolean;
  /** Accessible summary, e.g. "23 of 61 days, 2 of 7 steps". */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Concentric activity rings in one hue family: accent, ink and ice. Each ring
 * springs to its value and ends in a softly glowing cap.
 */
export function Rings({ values, size = 120, thickness, gap, animated = true, label, className, style }: RingsProps) {
  const id = useGfxId("rings");
  const n = Math.max(1, Math.min(3, values.length));
  const t = thickness ?? Math.round(size * 0.105);
  const gp = gap ?? Math.max(2, Math.round(t * 0.22));
  const c = size / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={label ?? values.map((v) => `${Math.round(clamp(v) * 100)}%`).join(", ")}
      className={cx(g.root, s.rings, animated && s.animated, className)}
      style={style}
    >
      <defs>
        {Array.from({ length: n }, (_, i) => (
          <linearGradient key={i} id={`${id}-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className={s[`hi${i + 1}`]} />
            <stop offset="1" className={s[`lo${i + 1}`]} />
          </linearGradient>
        ))}
      </defs>
      <g transform={`rotate(-90 ${c} ${c})`}>
        {values.slice(0, n).map((raw, i) => {
          const v = clamp(raw);
          const r = c - t / 2 - i * (t + gp);
          const delay = `${i * 120}ms`;
          return (
            <g key={i} className={s[`ring${i + 1}`]} style={{ ["--v" as string]: v, ["--delay" as string]: delay }}>
              <circle cx={c} cy={c} r={r} strokeWidth={t} className={s.track} />
              {v > 0 ? (
                <>
                  <circle
                    cx={c}
                    cy={c}
                    r={r}
                    strokeWidth={t}
                    pathLength={100}
                    stroke={`url(#${id}-${i})`}
                    className={s.fill}
                  />
                  <g className={s.cap} style={{ transformOrigin: `${c}px ${c}px` }}>
                    <circle cx={c + r} cy={c} r={t / 2} className={s.capDot} />
                  </g>
                </>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
