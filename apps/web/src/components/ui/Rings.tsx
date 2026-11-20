"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { motion } from "@ms/tokens";

export type Ring = { value: number; tone?: 1 | 2 | 3; label?: string };

type Props = {
  rings: Ring[];
  size?: number;
  stroke?: number;
  gap?: number;
  /** Seconds before the first ring fills. */
  delay?: number;
  /** Centre content (score, %). */
  children?: ReactNode;
  /** Accessible summary, e.g. "23 of 61 days, 2 of 7 steps". */
  label?: string;
  className?: string;
};

/**
 * Concentric activity rings. Fill from zero with a spring overshoot, staggered.
 * Tones: 1 = accent family, 2 = neutral, 3 = ice. Reduced motion shows them filled.
 */
export function Rings({ rings, size = 104, stroke = 12, gap = 2, delay = 0.15, children, label, className }: Props) {
  const id = useId().replace(/:/g, "");
  const c = size / 2;
  return (
    <span className={className ? `lq-ringwrap ${className}` : "lq-ringwrap"} role={label ? "img" : undefined} aria-label={label} style={{ width: size, height: size }}>
      <svg className="lq-rings" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          {[1, 2, 3].map((t) => (
            <linearGradient key={t} id={`${id}-g${t}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={`var(--ring-${t})`} />
              <stop offset="1" stopColor={`var(--ring-${t}-hi)`} />
            </linearGradient>
          ))}
        </defs>
        {rings.map((r, i) => {
          const rad = c - stroke / 2 - i * (stroke + gap);
          if (rad <= 0) return null;
          const tone = r.tone ?? ((i % 3) + 1);
          const len = 2 * Math.PI * rad;
          const p = Math.max(0, Math.min(1, r.value));
          const style = { "--len": len.toFixed(2), "--d": `${(delay + (i * motion.duration.ringStagger) / 1000).toFixed(2)}s` } as CSSProperties;
          return (
            <g key={i}>
              <circle cx={c} cy={c} r={rad} stroke={`var(--ring-${tone})`} strokeOpacity={0.18} strokeWidth={stroke} />
              {p > 0 && (
                <circle
                  className="lq-arc"
                  cx={c}
                  cy={c}
                  r={rad}
                  stroke={`url(#${id}-g${tone})`}
                  strokeWidth={stroke}
                  strokeDasharray={len.toFixed(2)}
                  strokeDashoffset={(len * (1 - p)).toFixed(2)}
                  transform={`rotate(-90 ${c} ${c})`}
                  style={style}
                />
              )}
            </g>
          );
        })}
      </svg>
      {children !== undefined && <span className="lq-ringc">{children}</span>}
    </span>
  );
}
