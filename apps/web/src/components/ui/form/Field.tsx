"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon } from "../Icon";
import { cx } from "../cx";

/**
 * One form field: a visible label, an optional "Why?" note, a hint, and an inline, screen-reader
 * announced error. `children` receives the ids to wire onto the control (id, aria-describedby, aria-invalid).
 */
export type FieldIds = { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean; "aria-required"?: boolean };

export function Field({
  label, hint, error, why, required, optional, className, children, aside,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** Shown behind a small "Why?" button (sensitive questions). */
  why?: ReactNode;
  required?: boolean;
  /** Marks the label "(optional)". */
  optional?: boolean;
  className?: string;
  aside?: ReactNode;
  children: (ids: FieldIds) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("fm-field", className)} data-invalid={error ? "" : undefined}>
      <div className="fm-label-row">
        <label htmlFor={id} className="fm-label">
          {label}
          {optional && <span className="fm-opt"> (optional)</span>}
        </label>
        {why && <Why>{why}</Why>}
        {aside}
      </div>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, "aria-required": required || undefined })}
      {hint && !error && <p id={hintId} className="fm-hint">{hint}</p>}
      <FieldError id={errId} error={error} />
    </div>
  );
}

/** Inline, kind validation text. Always rendered as a live region so screen readers hear it. */
export function FieldError({ id, error }: { id?: string; error?: string | null }) {
  return (
    <p id={id} className="fm-error" role="alert" aria-live="polite" hidden={!error}>
      {error && (
        <>
          <Icon name="info" size="xs" /> {error}
        </>
      )}
    </p>
  );
}

/** "Why?" — a quiet disclosure explaining why a sensitive question is asked. */
export function Why({ children, label = "Why?" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="fm-why">
      <button type="button" className="fm-why-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {label}
      </button>
      <span id={id} className="fm-why-body" hidden={!open} role="note">{children}</span>
    </span>
  );
}

/** "From your profile — edit": shown above prefilled answers. */
export function FromProfile({ items, onEdit, editHref }: { items: { label: string; value: string }[]; onEdit?: () => void; editHref?: string }) {
  if (!items.length) return null;
  return (
    <div className="fm-fromprofile" role="group" aria-label="From your profile">
      <div className="fm-fromprofile-head">
        <span className="lq-t13" style={{ fontWeight: 650 }}><Icon name="check" size="xs" /> From your profile</span>
        {onEdit ? (
          <button type="button" className="fm-link" onClick={onEdit}>Edit</button>
        ) : editHref ? (
          <a className="fm-link" href={editHref}>Edit</a>
        ) : null}
      </div>
      <dl>
        {items.map((it) => (
          <div key={it.label}>
            <dt>{it.label}</dt>
            <dd>{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Simple validators that read kindly. Return a message or null. */
export const validate = {
  required: (v: unknown, what = "this") => (v == null || v === "" || (Array.isArray(v) && !v.length) ? `Please add ${what}.` : null),
  email: (v: string) => (!v.trim() ? "Please add your email." : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "That email looks incomplete. Check for a typo?"),
  min: (v: string, n: number, what = "it") => (v.trim().length >= n ? null : `Make ${what} at least ${n} characters.`),
  max: (v: string, n: number) => (v.length <= n ? null : `That's a little long — keep it under ${n} characters.`),
};
