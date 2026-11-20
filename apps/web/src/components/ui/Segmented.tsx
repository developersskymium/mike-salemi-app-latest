"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { cx } from "./cx";
import { haptic, useLens } from "./motion";

export type SegmentedOption<V extends string> = { value: V; label: string };

type Props<V extends string> = {
  options: readonly SegmentedOption<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (v: V) => void;
  /** Accessible group name. */
  label: string;
  /** glass (over content) or fill (inside glass). */
  variant?: "glass" | "fill";
  size?: "sm" | "md";
  className?: string;
};

/** Glass segmented control. The lens slides and stretches between options. */
export function Segmented<V extends string>({ options, value, defaultValue, onChange, label, variant = "glass", size = "md", className }: Props<V>) {
  const [inner, setInner] = useState<V>(defaultValue ?? options[0]!.value);
  const current = value ?? inner;
  const index = Math.max(0, options.findIndex((o) => o.value === current));
  const box = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLElement>(null);
  useLens(box, lens, index);
  const n = options.length;

  const select = (v: V) => {
    if (v === current) return;
    haptic(6);
    setInner(v);
    onChange?.(v);
  };
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = options[(index + d + n) % n]!;
    select(next.value);
    box.current?.querySelectorAll<HTMLButtonElement>("button")[(index + d + n) % n]?.focus();
  };

  return (
    <div
      ref={box}
      role="radiogroup"
      aria-label={label}
      className={cx("lq-seg", variant === "glass" && "lq-glass", className)}
      data-variant={variant === "fill" ? "fill" : undefined}
      data-size={size === "sm" ? "sm" : undefined}
      onKeyDown={onKey}
    >
      <i
        ref={lens}
        className="lq-lens"
        aria-hidden
        style={{ left: `calc(3px + ${index} * (100% - 6px) / ${n})`, width: `calc((100% - 6px) / ${n})` } as CSSProperties}
      />
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          data-lens-item=""
          onClick={() => select(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
