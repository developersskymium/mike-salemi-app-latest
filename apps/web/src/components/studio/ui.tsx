import Link from "next/link";
import type { ReactNode } from "react";
import { Chip, Glass, cx } from "@/components/ui";

export function PageHead({ title, sub, eyebrow, actions }: { title: string; sub?: ReactNode; eyebrow?: { label: string; href?: string }[]; actions?: ReactNode }) {
  return (
    <header className="st-head">
      <div>
        {eyebrow && (
          <div className="st-eyebrow">
            {eyebrow.map((e, i) => (
              <span key={i}>{i > 0 && "/ "}{e.href ? <Link href={e.href}>{e.label}</Link> : e.label}</span>
            ))}
          </div>
        )}
        <h1 className="st-h1">{title}</h1>
        {sub && <p className="st-sub">{sub}</p>}
      </div>
      {actions && <div className="st-actions">{actions}</div>}
    </header>
  );
}

export function Panel({ title, meta, children, className }: { title?: ReactNode; meta?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Glass className={cx("st-panel", className)}>
      {title && <h2>{title}{meta && <span>{meta}</span>}</h2>}
      {children}
    </Glass>
  );
}

export function Tabs({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <Glass className="st-tabs" radius="pill" role="navigation" aria-label="Sections">
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? "page" : undefined}>{t.label}</Link>
      ))}
    </Glass>
  );
}

export type Col<R> = { label: string; render: (r: R) => ReactNode; num?: boolean };
export function DataTable<R>({ cols, rows, empty = "Nothing here yet." }: { cols: Col<R>[]; rows: R[]; empty?: string }) {
  if (!rows.length) return <div className="st-empty">{empty}</div>;
  return (
    <div className="st-scroll">
      <table className="st-tbl">
        <thead><tr>{cols.map((c, i) => <th key={i} className={c.num ? "num" : undefined}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c, j) => <td key={j} className={c.num ? "num" : undefined}>{c.render(r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const TONE: Record<string, "tint" | "fill" | "outline" | "glass"> = { published: "tint", active: "tint", open: "tint", accepted: "tint", upcoming: "fill", draft: "outline", archived: "outline", past: "outline", cancelled: "outline", submitted: "fill" };
export function Status({ v }: { v: string | null | undefined }) {
  if (!v) return null;
  return <Chip variant={TONE[v] ?? "fill"}>{v.replace(/_/g, " ")}</Chip>;
}

export function Stat({ n, label }: { n: ReactNode; label: string }) {
  return <Glass className="st-stat"><b>{n}</b><span>{label}</span></Glass>;
}

export const money = (cents: number | null | undefined, cur = "usd") => cents == null ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
export const fdate = (s: string | null | undefined, time = false) => s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", ...(time ? { hour: "numeric", minute: "2-digit" } : {}), timeZone: "UTC" }) : "";
export const Note = ({ children, tone }: { children: ReactNode; tone?: "warn" }) => <div className="st-note" data-tone={tone}>{children}</div>;
