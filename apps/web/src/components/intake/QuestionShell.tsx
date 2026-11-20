"use client";

import Link from "next/link";
import type { ReactNode, Ref } from "react";
import "./qs.css";

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
);
export const QsCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5.5 12.5 10 17l8.5-9.5" /></svg>
);

/**
 * One question per screen, iOS-onboarding style: thin segmented progress, Back · Skip/close,
 * a scene illustration, the question, its answers, and (only when needed) one Continue.
 */
export function QuestionShell({
  at, total, onBack, backHref, close, art, eyebrow, title, help, children, footer, sceneKey, dir, titleRef, context,
}: {
  at: number;
  total: number;
  onBack?: () => void;
  backHref?: string;
  close?: { label: string; onClick?: () => void; href?: string; icon?: boolean; disabled?: boolean };
  art: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  help?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  sceneKey: string;
  dir?: "fwd" | "back";
  titleRef?: Ref<HTMLHeadingElement>;
  context?: string;
}) {
  return (
    <div className="qs" data-has-foot={footer ? "" : undefined}>
      <header className="qs-top">
        <div className="qs-top-row">
          {backHref ? (
            <Link href={backHref} className="qs-icon" aria-label="Back"><BackIcon /></Link>
          ) : (
            <button type="button" className="qs-icon" aria-label="Back" onClick={onBack} disabled={!onBack}><BackIcon /></button>
          )}
          <div className="qs-rail" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={Math.min(at + 1, total)} aria-label={`Question ${Math.min(at + 1, total)} of ${total}`}>
            {Array.from({ length: total }).map((_, i) => <i key={i} data-s={i < at ? "done" : i === at ? "now" : undefined} />)}
          </div>
          {close ? (
            close.href ? (
              <Link href={close.href} className="qs-icon" aria-label={close.label}><CloseIcon /></Link>
            ) : close.icon ? (
              <button type="button" className="qs-icon" aria-label={close.label} onClick={close.onClick} disabled={close.disabled}><CloseIcon /></button>
            ) : (
              <button type="button" className="qs-skip" onClick={close.onClick} disabled={close.disabled}>{close.label}</button>
            )
          ) : <span />}
        </div>
        {context && <p className="qs-context">{context}</p>}
      </header>
      <main className="qs-body" id="main">
        <div className="qs-scene" key={sceneKey} data-dir={dir === "back" ? "back" : undefined}>
          <div className="qs-art">{art}</div>
          {eyebrow && <div className="qs-eyebrow">{eyebrow}</div>}
          <h1 ref={titleRef} tabIndex={-1} className="qs-title" aria-live="polite">{title}</h1>
          {help && <div className="qs-help">{help}</div>}
          <div className="qs-answers">{children}</div>
        </div>
      </main>
      {footer && <footer className="qs-foot"><div className="qs-col">{footer}</div></footer>}
    </div>
  );
}

export type QsOption = { value: string; label: string; hint?: string; icon?: ReactNode; extra?: ReactNode };

/** Large tappable choice cards (single = radio, multi = checkbox). */
export function ChoiceCards({ options, value, multi, onPick, label, profile }: { options: QsOption[]; value: string | string[] | undefined; multi?: boolean; onPick: (v: string) => void; label: string; profile?: boolean }) {
  const chips = multi && options.length > 6 && options.every((o) => !o.hint && o.label.length < 28);
  return (
    <div className={chips ? "qs-chips" : "qs-cards"} role={multi ? "group" : "radiogroup"} aria-label={label}>
      {options.map((o, i) => {
        const on = multi ? Array.isArray(value) && value.includes(o.value) : value === o.value;
        return (
          <button key={o.value} type="button" role={multi ? "checkbox" : "radio"} aria-checked={on} className={chips ? "qs-chip" : "qs-card"} onClick={() => onPick(o.value)} style={{ animationDelay: `${120 + i * 35}ms` }}>
            {!chips && <span className="qs-card-ic" aria-hidden>{o.icon ?? <span className="qs-dot">{String.fromCharCode(65 + i)}</span>}</span>}
            <span className="qs-card-t">
              <b>{o.label}</b>
              {o.hint && <small>{o.hint}</small>}
              {o.extra}
              {on && profile && <em className="qs-from">From your profile</em>}
            </span>
            <span className="qs-mark" data-multi={multi ? "" : undefined} aria-hidden><QsCheck /></span>
          </button>
        );
      })}
    </div>
  );
}

export function NumberStepper({ value, onChange, min = 0, max = 99, label, format = (v) => String(v) }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; format?: (v: number) => string }) {
  return (
    <div className="qs-stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Less`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <output aria-live="polite">{format(value)}</output>
      <button type="button" aria-label={`More`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}
