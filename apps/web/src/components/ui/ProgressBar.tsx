import type { CSSProperties } from "react";
import { cx } from "./cx";

type Props = {
  /** 0–1 */
  value: number;
  /** label (glacier trace, default), accent (same, brighter head), white (over video/photo). */
  tone?: "label" | "accent" | "white";
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** Expose on first paint (default on). */
  animate?: boolean;
};

/**
 * A straight trace: the travelled part is a tapered tail of glacier light ending in a hot head,
 * the rest a dotted path. Draws on first paint.
 */
export function ProgressBar({ value, tone = "label", label, className, style, animate = true }: Props) {
  const p = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      className={cx("lq-progress", className)}
      data-tone={tone === "label" ? undefined : tone}
      data-anim={animate ? "" : undefined}
      data-empty={p === 0 ? "" : undefined}
      style={{ "--p": `${p * 100}%`, ...style } as CSSProperties}
    >
      <i />
    </div>
  );
}

/** Steps strung on one trace: done steps lit, the current step is the head, the rest dotted. */
export function StepSegments({ total, done, current = done, currentProgress = 0.34, label, className }: { total: number; done: number; current?: number; currentProgress?: number; label?: string; className?: string }) {
  const lit = total > 1 ? Math.min(1, (Math.min(current, total - 1) + (current < total ? currentProgress : 0)) / (total - 1)) : 1;
  return (
    <div
      className={cx("lq-segs", className)}
      role="progressbar"
      aria-label={label ?? `Step ${current + 1} of ${total}`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      style={{ "--p": `${lit * 100}%`, "--n": total } as CSSProperties}
    >
      <b aria-hidden />
      {Array.from({ length: total }, (_, i) => (
        <i key={i} data-s={i < done ? "done" : i === current ? "now" : undefined} />
      ))}
    </div>
  );
}
