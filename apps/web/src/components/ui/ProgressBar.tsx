import type { CSSProperties } from "react";
import { cx } from "./cx";

type Props = {
  /** 0–1 */
  value: number;
  /** label/accent = glacier (default), warm = ember (streaks, badges, progress), ok = done, white = over photos. */
  tone?: "label" | "accent" | "warm" | "ok" | "white";
  /** thin = 5px (rows, cards). */
  size?: "thin" | "md";
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** Fill on first paint (default on). */
  animate?: boolean;
};

/** A Summit progress bar: a sunk track with a rounded gradient fill that draws in on view. */
export function ProgressBar({ value, tone = "label", size = "md", label, className, style, animate = true }: Props) {
  const p = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      className={cx("lq-progress", className)}
      data-tone={tone === "label" || tone === "accent" ? undefined : tone}
      data-size={size === "thin" ? "thin" : undefined}
      data-anim={animate ? "" : undefined}
      data-empty={p === 0 ? "" : undefined}
      style={{ "--p": `${p * 100}%`, ...style } as CSSProperties}
    >
      <i />
    </div>
  );
}

/** Step dots: one pill per step. Done steps green, the current step ember, the rest neutral. */
export function StepSegments({ total, done, current = done, label, className, onPhoto }: { total: number; done: number; current?: number; /** Retired (Trace). */ currentProgress?: number; label?: string; className?: string; onPhoto?: boolean }) {
  return (
    <div
      className={cx("lq-segs", className)}
      role="progressbar"
      aria-label={label ?? `Step ${Math.min(current + 1, total)} of ${total}`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      data-on-photo={onPhoto ? "" : undefined}
    >
      {Array.from({ length: total }, (_, i) => (
        <i key={i} data-s={i < done ? "done" : i === current ? "now" : undefined} />
      ))}
    </div>
  );
}
