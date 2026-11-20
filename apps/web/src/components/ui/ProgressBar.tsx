import type { CSSProperties } from "react";
import { cx } from "./cx";

type Props = {
  /** 0–1 */
  value: number;
  /** label (neutral, default), accent ("now"), white (over video/photo). */
  tone?: "label" | "accent" | "white";
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export function ProgressBar({ value, tone = "label", label, className, style }: Props) {
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
      style={style}
    >
      <i style={{ "--p": `${p * 100}%` } as CSSProperties} />
    </div>
  );
}

/** Step segments: done steps solid, the current step fills with the accent. */
export function StepSegments({ total, done, current = done, currentProgress = 0.34, label, className }: { total: number; done: number; current?: number; currentProgress?: number; label?: string; className?: string }) {
  return (
    <div className={cx("lq-segs", className)} role="progressbar" aria-label={label ?? `Step ${current + 1} of ${total}`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} data-s={i < done ? "done" : i === current ? "now" : undefined} style={i === current ? ({ "--p": `${currentProgress * 100}%` } as CSSProperties) : undefined} />
      ))}
    </div>
  );
}
