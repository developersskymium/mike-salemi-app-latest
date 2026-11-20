"use client";

import type { CSSProperties } from "react";
import { useStretchCount } from "../ui/motion";

type Props = {
  value: number;
  /** Where the count starts (default 0). */
  from?: number;
  /** ms */
  duration?: number;
  /** ms */
  delay?: number;
  /** thin: wide hairline numerals (days, counts, time). solid: stats. */
  variant?: "thin" | "solid";
  /** CSS font-size. */
  size?: number | string;
  decimals?: number;
  format?: (n: number) => string;
  /** Accessible text; defaults to the formatted final value. */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Stretch: a number counts up squeezed narrow (motion blur in type) and springs back wide
 * when it lands. Anybody's width axis does the work; reduced motion shows the value.
 */
export function StretchNumber({ value, from = 0, duration, delay, variant = "thin", size, decimals = 0, format, label, className, style }: Props) {
  const [n, moving] = useStretchCount(value, { from, duration, delay, decimals });
  const text = format ? format(n) : n.toFixed(decimals);
  return (
    <span
      className={className ? `tr-num ${className}` : "tr-num"}
      data-variant={variant}
      data-moving={moving ? "" : undefined}
      style={{ fontSize: size, ...style }}
    >
      <span className="lq-sr">{label ?? (format ? format(value) : value.toFixed(decimals))}</span>
      <span aria-hidden>{text}</span>
    </span>
  );
}
