"use client";

import Image from "next/image";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";

export type ChoiceOption<V extends string = string> = {
  value: V;
  label: string;
  description?: string;
  icon?: IconName;
  /** One small photo per row (minimal visuals). */
  photo?: { src: string; position?: string };
};

/** Arrow-key roving for radio groups. */
function roving(e: KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
  if (!keys.includes(e.key)) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]"));
  const i = items.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  e.preventDefault();
  const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
  const next = items[(i + d + items.length) % items.length]!;
  next.focus();
  next.click();
}

/**
 * Choice rows: big (≥56px) tappable rows with an optional icon or small photo, label and one line.
 * Single (radio) or multiple (checkbox) selection. Keyboard: Tab into the group, arrows move, Space/Enter picks.
 */
export function ChoiceRows<V extends string>({
  options, value, onChange, multiple, label, labelledBy, columns, name,
}: {
  options: ChoiceOption<V>[];
  value: V | V[] | null | undefined;
  onChange: (v: V | V[]) => void;
  multiple?: boolean;
  /** Accessible group name when there's no visible heading id. */
  label?: string;
  labelledBy?: string;
  /** 2 → two columns from 640px. */
  columns?: 1 | 2;
  name?: string;
}) {
  const arr = Array.isArray(value) ? value : value != null ? [value] : [];
  const ref = useRef<HTMLDivElement>(null);
  const first = options.findIndex((o) => arr.includes(o.value));
  return (
    <div
      ref={ref}
      className="fm-choices"
      data-cols={columns === 2 ? "2" : undefined}
      role={multiple ? "group" : "radiogroup"}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      onKeyDown={multiple ? undefined : roving}
      data-name={name}
    >
      {options.map((o, k) => {
        const on = arr.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            className="fm-choice lq-press"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={on}
            tabIndex={multiple ? 0 : on || (first < 0 && k === 0) ? 0 : -1}
            onClick={() => {
              if (multiple) onChange((on ? arr.filter((x) => x !== o.value) : [...arr, o.value]) as V[]);
              else onChange(o.value);
            }}
          >
            {o.photo ? (
              <span className="fm-choice-photo" aria-hidden>
                <Image src={o.photo.src} alt="" fill sizes="56px" style={{ objectFit: "cover", objectPosition: o.photo.position ?? "50% 30%" }} />
              </span>
            ) : o.icon ? (
              <span className="fm-choice-icon" aria-hidden><Icon name={o.icon} size="sm" /></span>
            ) : null}
            <span className="fm-choice-text">
              <span className="fm-choice-label">{o.label}</span>
              {o.description && <span className="fm-choice-desc">{o.description}</span>}
            </span>
            <span className="fm-choice-mark" data-multi={multiple ? "" : undefined} aria-hidden>
              {on && <Icon name="check" size="xs" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Chips: compact choices (single or multiple). Prefer over typing. */
export function ChipChoice<V extends string>({
  options, value, onChange, multiple, label, labelledBy, size = "md",
}: {
  options: { value: V; label: ReactNode }[];
  value: V | V[] | null | undefined;
  onChange: (v: V | V[]) => void;
  multiple?: boolean;
  label?: string;
  labelledBy?: string;
  size?: "sm" | "md";
}) {
  const arr = Array.isArray(value) ? value : value != null ? [value] : [];
  const first = options.findIndex((o) => arr.includes(o.value));
  return (
    <div className="fm-chips" data-size={size} role={multiple ? "group" : "radiogroup"} aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} onKeyDown={multiple ? undefined : roving}>
      {options.map((o, k) => {
        const on = arr.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            className="fm-chip lq-press"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={on}
            tabIndex={multiple ? 0 : on || (first < 0 && k === 0) ? 0 : -1}
            onClick={() => (multiple ? onChange((on ? arr.filter((x) => x !== o.value) : [...arr, o.value]) as V[]) : onChange(o.value))}
          >
            {multiple && on && <Icon name="check" size="xs" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A labelled range slider with the value shown big (tabular). */
export function Slider({
  value, onChange, min, max, step = 1, label, format = (v) => String(v), marks,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  format?: (v: number) => string;
  marks?: [string, string];
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="fm-slider">
      <div className="fm-slider-head">
        <label htmlFor={id} className="fm-label">{label}</label>
        <output htmlFor={id} className="fm-slider-val lq-num">{format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fm-pct" as string]: `${pct}%` }}
      />
      {marks && (
        <div className="fm-slider-marks" aria-hidden>
          <span>{marks[0]}</span>
          <span>{marks[1]}</span>
        </div>
      )}
    </div>
  );
}

/** − value + stepper (48px targets). */
export function Stepper({ value, onChange, min = 0, max = 99, label, format = (v) => String(v) }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; format?: (v: number) => string }) {
  return (
    <div className="fm-stepper" role="group" aria-label={label}>
      <button type="button" className="fm-step lq-press" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <output className="lq-num" aria-live="polite">{format(value)}</output>
      <button type="button" className="fm-step lq-press" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

export { cx };
