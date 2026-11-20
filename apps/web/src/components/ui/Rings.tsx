import type { ReactNode } from "react";
import { motion } from "@ms/tokens";
import { TraceLine, type TraceTone } from "../signature/TraceLine";

export type Ring = { value: number; tone?: 1 | 2 | 3; label?: string };

type Props = {
  rings: Ring[];
  size?: number;
  stroke?: number;
  gap?: number;
  /** Seconds before the first arc exposes. */
  delay?: number;
  /** Centre content (score, %). */
  children?: ReactNode;
  /** Accessible summary, e.g. "23 of 61 days, 2 of 7 steps". */
  label?: string;
  className?: string;
  /** Draw on first paint (Expose). Default on. */
  animate?: boolean;
};

const TONE: Record<1 | 2 | 3, TraceTone> = { 1: "trace", 2: "ink", 3: "ice" };

/**
 * Concentric trace arcs (the Liquid rings, redrawn as light): each arc exposes from the top
 * with a hot head and a cooling tail, the rest of the circle a dotted path. Staggered.
 * Tones: 1 = glacier, 2 = ink, 3 = deep ice. Reduced motion shows them drawn.
 */
export function Rings({ rings, size = 104, stroke = 12, gap = 2, delay = 0.15, children, label, className, animate = true }: Props) {
  const c = size / 2;
  const w = Math.max(2, stroke * 0.3);
  const pitch = stroke + gap + 2;
  return (
    <span className={className ? `lq-ringwrap ${className}` : "lq-ringwrap"} role={label ? "img" : undefined} aria-label={label} style={{ width: size, height: size }}>
      {rings.map((r, i) => {
        const rad = c - w * 2.4 - i * pitch;
        if (rad <= 2) return null;
        const p = Math.max(0, Math.min(1, r.value));
        const tone = TONE[r.tone ?? (((i % 3) + 1) as 1 | 2 | 3)];
        const d = `M${c} ${c - rad} A${rad} ${rad} 0 1 1 ${(c - 0.01).toFixed(2)} ${c - rad}`;
        return (
          <TraceLine
            key={i}
            className="lq-rings"
            d={d}
            viewBox={`0 0 ${size} ${size}`}
            width={w}
            progress={p || 0.0001}
            head={p > 0}
            segments={24}
            floor={0.1}
            tone={tone}
            animate={animate}
            delay={Math.round(delay * 1000 + i * motion.duration.ringStagger)}
            duration={motion.duration.expose}
            style={{ position: "absolute", inset: 0, width: size, height: size }}
          />
        );
      })}
      {children !== undefined && <span className="lq-ringc">{children}</span>}
    </span>
  );
}
