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
  /** thin and solid are both Instrument Sans 600 now (numerals carry the card). */
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

/** A hero number (Instrument Sans 600, tabular) that counts up to its value. Reduced motion shows the value. */
export function StretchNumber({ value, from = 0, duration, delay, variant = "thin", size, decimals = 0, format, label, className, style }: Props) {
  const [n] = useStretchCount(value, { from, duration, delay, decimals });
  const text = format ? format(n) : n.toFixed(decimals);
  return (
    <span className={className ? `tr-num ${className}` : "tr-num"} data-variant={variant} style={{ fontSize: size, ...style }}>
      <span className="lq-sr">{label ?? (format ? format(value) : value.toFixed(decimals))}</span>
      <span aria-hidden>{text}</span>
    </span>
  );
}
