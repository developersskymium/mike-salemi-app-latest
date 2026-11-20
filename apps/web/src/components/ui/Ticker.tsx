"use client";

import { useStretchCount } from "./motion";

/**
 * A number that counts up to its value (tabular figures). Stretch: in display type it squeezes
 * narrow while counting and springs back wide when it lands.
 */
export function Ticker({ value, decimals = 0, format, from = 0, delay, duration }: { value: number; decimals?: number; format?: (n: number) => string; from?: number; delay?: number; duration?: number }) {
  const [n, moving] = useStretchCount(value, { from, decimals, delay, duration });
  return (
    <span className="lq-num lq-ticker" data-moving={moving ? "" : undefined}>
      <span className="lq-sr">{format ? format(value) : String(value)}</span>
      <span aria-hidden>{format ? format(n) : n.toFixed(decimals)}</span>
    </span>
  );
}
