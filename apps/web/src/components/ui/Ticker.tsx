"use client";

import { useTicker } from "./motion";

/** A number that counts up to its value (tabular figures). */
export function Ticker({ value, decimals = 0, format }: { value: number; decimals?: number; format?: (n: number) => string }) {
  const n = useTicker(value, decimals);
  return (
    <span className="lq-num">
      <span className="lq-sr">{format ? format(value) : String(value)}</span>
      <span aria-hidden>{format ? format(n) : n.toFixed(decimals)}</span>
    </span>
  );
}
