"use client";

import { useTransition, type ReactNode } from "react";
import { useToast } from "@/components/ui";
import type { Result } from "@/lib/settings/model";

/** A settings group: heading + one hairline card. */
export function Group({ id, title, lede, children, action }: { id: string; title: string; lede?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section id={id} className="st-group" aria-labelledby={`${id}-h`}>
      <div className="st-group-head">
        <h2 id={`${id}-h`} className="st-group-title">{title}</h2>
        {action}
      </div>
      {lede && <p className="st-group-lede">{lede}</p>}
      <div className="st-card">{children}</div>
    </section>
  );
}

/** One row: label (+ detail) on the left, control or value on the right. */
export function Row({ label, detail, children, id, stack, onClick }: { label: ReactNode; detail?: ReactNode; children?: ReactNode; id?: string; stack?: boolean; onClick?: () => void }) {
  const inner = (
    <>
      <span className="st-row-main">
        <span className="st-row-label" id={id}>{label}</span>
        {detail && <span className="st-row-detail">{detail}</span>}
      </span>
      {children !== undefined && <span className="st-row-ctl">{children}</span>}
    </>
  );
  if (onClick)
    return (
      <button type="button" className="st-row st-row-btn lq-press" onClick={onClick} data-stack={stack ? "" : undefined}>
        {inner}
      </button>
    );
  return <div className="st-row" data-stack={stack ? "" : undefined}>{inner}</div>;
}

/** Optimistic save with a quiet toast and revert on failure. */
export function useSave() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const save = <T,>(apply: () => void, revert: () => void, action: () => Promise<Result<T>>, ok = "Saved", after?: (d: T) => void) => {
    apply();
    start(async () => {
      const r = await action();
      if (r.ok) {
        after?.(r.data);
        if (ok) toast(ok, { tone: "success", icon: "check" });
        return;
      }
      revert();
      toast(r.error, { icon: "close" });
    });
  };
  return { save, pending };
}

export const money = (c: number | null, cur = "usd") =>
  c == null ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase(), maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
export const dateLong = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
export const hm = (t: string | null) => (t ? t.slice(0, 5) : "");
