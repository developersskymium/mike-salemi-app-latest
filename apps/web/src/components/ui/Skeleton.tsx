import type { CSSProperties } from "react";
import { cx } from "./cx";

type Props = {
  shape?: "text" | "title" | "block" | "circle" | "card";
  width?: number | string;
  height?: number | string;
  /** Shimmer in glass (over photos/backdrops) instead of a plain fill. */
  glass?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Loading placeholder with a soft glass shimmer. Decorative: wrap regions in aria-busy. */
export function Skeleton({ shape = "block", width, height, glass, className, style }: Props) {
  return (
    <span
      aria-hidden
      className={cx("lq-skel", className)}
      data-shape={shape === "block" ? undefined : shape}
      data-glass={glass ? "" : undefined}
      style={{ display: "block", width, height: height ?? (shape === "circle" ? width : undefined), ...style }}
    />
  );
}

/** Text lines with a shorter last line. */
export function SkeletonText({ lines = 3, glass }: { lines?: number; glass?: boolean }) {
  return (
    <span style={{ display: "grid", gap: 8 }} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} shape="text" glass={glass} width={i === lines - 1 ? "62%" : "100%"} />
      ))}
    </span>
  );
}
