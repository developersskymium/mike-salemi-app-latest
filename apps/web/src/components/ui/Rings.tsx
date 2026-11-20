import type { CSSProperties, ReactNode } from "react";
import { motion } from "@ms/tokens";

export type Ring = { value: number; tone?: 1 | 2 | 3 | "white"; label?: string };

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
  /** Fill on first paint. Default on. */
  animate?: boolean;
  /** Over a photo or ink panel: a translucent white track. */
  onPhoto?: boolean;
};

/**
 * Summit progress rings: a warm hairline track with a round-capped value arc that fills on view.
 * Tones: 1 = glacier (days, programs), 2 = ember (streaks, steps), 3 = success. Concentric when several.
 */
export function Rings({ rings, size = 104, stroke = 10, gap = 3, delay = 0.15, children, label, className, animate = true, onPhoto }: Props) {
  const c = size / 2;
  const w = Math.max(3, stroke * (size < 60 ? 0.55 : 0.8));
  return (
    <span className={className ? `lq-ringwrap ${className}` : "lq-ringwrap"} role={label ? "img" : undefined} aria-label={label} style={{ width: size, height: size }}>
      <svg className="lq-rings" width={size} height={size} viewBox={`0 0 ${size} ${size}`} data-anim={animate ? "" : undefined} data-on-photo={onPhoto ? "" : undefined} aria-hidden>
        {rings.map((r, i) => {
          const rad = c - w / 2 - i * (w + gap);
          if (rad <= 2) return null;
          const p = Math.max(0, Math.min(1, r.value));
          const circ = 2 * Math.PI * rad;
          const tone = r.tone ?? (((i % 3) + 1) as 1 | 2 | 3);
          return (
            <g key={i}>
              <circle className="lq-ring-track" cx={c} cy={c} r={rad} strokeWidth={w} />
              {p > 0 && (
                <circle
                  className="lq-ring-val"
                  data-tone={tone === 1 ? undefined : tone}
                  cx={c}
                  cy={c}
                  r={rad}
                  strokeWidth={w}
                  strokeDasharray={`${(circ * p).toFixed(2)} ${circ.toFixed(2)}`}
                  style={{ "--c": (circ * p).toFixed(2), "--d": `${Math.round(delay * 1000 + i * motion.duration.ringStagger)}ms` } as CSSProperties}
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
