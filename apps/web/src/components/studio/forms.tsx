"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button, Icon, useToast } from "@/components/ui";
import { deleteRecord, moveRecord, saveRecord, type Result } from "@/lib/studio/actions";
import { TABLES, toRaw, type Field } from "@/lib/studio/tables";

/** Run a server action with a toast and a refresh. */
export function useRun() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>, ok = "Saved", after?: (r: Extract<Result, { ok: true }>) => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast(ok); after?.(r); router.refresh(); } else toast(r.error);
    });
  return { run, pending, router };
}

export type Choices = Record<string, { value: string; label: string }[]>;
export function FieldInput({ f, value, onChange, invalid, choices }: { f: Field; value: string | boolean; onChange: (v: string | boolean) => void; invalid?: boolean; choices?: { value: string; label: string }[] }) {
  const id = `f-${f.name}`;
  if (f.kind === "bool")
    return (
      <label className="st-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
        {f.label}
      </label>
    );
  const label = (
    <label className="st-label" htmlFor={id}>{f.label}{f.required ? "" : <i> · optional</i>}</label>
  );
  const common = { id, className: "st-in", "aria-invalid": invalid || undefined, value: String(value), "aria-describedby": f.help ? `${id}-h` : undefined } as const;
  let control: ReactNode;
  if (f.kind === "select" || choices)
    control = (
      <select {...common} onChange={(e) => onChange(e.target.value)}>
        {!f.required || value === "" ? <option value="">{f.required ? "Choose…" : "None"}</option> : null}
        {(choices ?? f.options!.map((o) => ({ value: o, label: o.replace(/_/g, " ") }))).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  else if (f.kind === "long" || f.kind === "lines" || f.kind === "json")
    control = <textarea {...common} data-mono={f.kind === "json" ? "" : undefined} spellCheck={f.kind !== "json"} rows={f.kind === "json" ? 6 : 4} onChange={(e) => onChange(e.target.value)} />;
  else control = <input {...common} type={f.kind === "datetime" ? "datetime-local" : f.kind === "int" ? "number" : "text"} inputMode={f.kind === "int" ? "numeric" : undefined} onChange={(e) => onChange(e.target.value)} />;
  return (
    <div className="st-field" data-wide={f.wide ? "" : undefined}>
      {label}
      {control}
      {f.help && <span id={`${id}-h`} className="st-help">{f.help}</span>}
    </div>
  );
}

type RecordFormProps = {
  table: keyof typeof TABLES;
  /** Existing row (for edit). Omit to create. */
  row?: Record<string, unknown>;
  /** Columns written on create (parent ids). */
  fixed?: Record<string, unknown>;
  /** Only these fields (names). */
  only?: string[];
  /** Initial raw values for create. */
  defaults?: Record<string, string | boolean>;
  submit?: string;
  cols?: 1 | 2 | 3;
  /** After a create, go to `${base}/${id}`; or refresh in place when unset. */
  redirectBase?: string;
  extra?: ReactNode;
  /** Turn a text id field into a picker. */
  choices?: Choices;
  onDone?: () => void;
};

/** Generic edit/create form for any configured table. Validation runs on the server (zod). */
export function RecordForm({ table, row, fixed, only, defaults, submit, cols = 2, redirectBase, extra, choices, onDone }: RecordFormProps) {
  const cfg = TABLES[table];
  const fields = (cfg.fields as readonly Field[]).filter((f) => !only || only.includes(f.name));
  const init = () => {
    const v: Record<string, string | boolean> = {};
    if (!row && "typedId" in cfg && cfg.typedId) v.id = "";
    for (const f of fields) v[f.name] = row ? toRaw(f, row[f.name]) : (defaults?.[f.name] ?? (f.kind === "bool" ? (f.name === "is_active" || f.name === "is_listed" || f.name === "is_open" ? true : false) : f.kind === "json" && f.notNull ? (f.name === "attachments" || f.name === "rows" || f.name === "images" || f.name === "gallery" || f.name === "questions" ? "[]" : "{}") : ""));
    return v;
  };
  const [v, setV] = useState(init);
  const [errs, setErr] = useState<string[]>([]);
  const { run, pending, router } = useRun();
  const set = (k: string) => (x: string | boolean) => setV((o) => ({ ...o, [k]: x }));
  const pk = row ? Object.fromEntries(cfg.pk.map((k) => [k, String(row[k])])) : null;
  const typedId = !row && "typedId" in cfg && cfg.typedId;

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErr([]);
    run(
      async () => {
        const r = await saveRecord(table, pk, v, fixed);
        if (!r.ok) setErr(r.error.split(" · "));
        return r;
      },
      row ? "Saved" : "Created",
      (r) => { onDone?.(); if (!row && redirectBase && r.id) router.push(`${redirectBase}/${r.id}`); else if (!row) setV(init()); },
    );
  };

  return (
    <form className="st-form" data-cols={cols} onSubmit={submitForm} noValidate>
      {typedId && (
        <div className="st-field">
          <label className="st-label" htmlFor="f-id">Id</label>
          <input id="f-id" className="st-in" value={String(v.id)} onChange={(e) => set("id")(e.target.value)} />
          <span className="st-help">Short and permanent: letters, numbers, dashes.</span>
        </div>
      )}
      {fields.map((f) => <FieldInput key={f.name} f={f} value={v[f.name] ?? ""} onChange={set(f.name)} invalid={errs.some((m) => m.startsWith(f.label))} choices={choices?.[f.name]} />)}
      {extra}
      {errs.length > 0 && <div className="st-errs" role="alert">{errs.map((m, i) => <div key={i}>{m}</div>)}</div>}
      <div className="st-bar"><Button type="submit" size="md" disabled={pending}>{pending ? "Saving…" : submit ?? (row ? "Save changes" : `Create ${cfg.label.toLowerCase()}`)}</Button></div>
    </form>
  );
}

/** Up / down / delete for one row of an orderable table. */
export function RowTools({ table, pk, orderable = true, deletable = true, first, last, label }: { table: keyof typeof TABLES; pk: Record<string, string>; orderable?: boolean; deletable?: boolean; first?: boolean; last?: boolean; label: string }) {
  const { run, pending, router } = useRun();
  return (
    <span className="st-row" style={{ gap: 2, flexWrap: "nowrap" }}>
      {orderable && (
        <>
          <button type="button" className="st-iconbtn" aria-label={`Move ${label} up`} disabled={pending || first} onClick={() => run(() => moveRecord(table, pk, "up"), "Moved")}><Icon name="chevron" size="xs" style={{ transform: "rotate(-90deg)" }} /></button>
          <button type="button" className="st-iconbtn" aria-label={`Move ${label} down`} disabled={pending || last} onClick={() => run(() => moveRecord(table, pk, "down"), "Moved")}><Icon name="chevron" size="xs" style={{ transform: "rotate(90deg)" }} /></button>
        </>
      )}
      {deletable && (
        <button type="button" className="st-iconbtn" aria-label={`Delete ${label}`} disabled={pending} onClick={() => { if (confirm(`Delete “${label}”? This cannot be undone.`)) run(() => deleteRecord(table, pk), "Deleted", () => router.refresh()); }}><Icon name="close" size="xs" /></button>
      )}
    </span>
  );
}

/** Small confirm-then-run button for custom actions. */
export function ActionButton({ action, children, ok = "Done", confirmText, variant = "fill", size = "sm", disabled }: { action: () => Promise<Result>; children: ReactNode; ok?: string; confirmText?: string; variant?: "fill" | "glass" | "filled" | "tint" | "plain"; size?: "sm" | "md"; disabled?: boolean }) {
  const { run, pending } = useRun();
  return (
    <Button type="button" variant={variant} size={size} disabled={pending || disabled} onClick={() => { if (!confirmText || confirm(confirmText)) run(action, ok); }}>
      {children}
    </Button>
  );
}

/** A small "add" form shown inline in a sheet-like panel. */
export function Disclosure({ label, children, open: o = false }: { label: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(o);
  return (
    <div>
      <Button type="button" variant={open ? "fill" : "glass"} size="sm" icon={open ? "close" : "plus"} onClick={() => setOpen(!open)}>{open ? "Close" : label}</Button>
      {open && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}
