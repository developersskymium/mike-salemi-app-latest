"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Glass, Rings, haptic, useToast } from "@/components/ui";
import { toggleChecklistAction } from "@/lib/actions/commerce";
import type { ChecklistItem } from "@/lib/loaders/commerce";

/** Packing / prerequisite list. Ticks are optimistic; a failed save rolls back with a toast. */
export function Checklist({ runId, title, items, initial }: { runId: string; title: string; items: ChecklistItem[]; initial: Record<string, boolean> }) {
  const [saved, setSaved] = useState(initial);
  const [state, setOpt] = useOptimistic(saved, (s, [k, v]: [string, boolean]) => ({ ...s, [k]: v }));
  const [, start] = useTransition();
  const toast = useToast();
  const done = items.filter((i) => state[i.id]).length;

  const toggle = (id: string) => {
    const next = !state[id];
    haptic();
    start(async () => {
      setOpt([id, next]);
      const r = await toggleChecklistAction(runId, id, next);
      if (r.ok) setSaved((s) => ({ ...s, [id]: next }));
      else toast(r.message, { icon: "close" });
    });
  };

  return (
    <Glass as="section" radius="card" className="exp-check" aria-label={title}>
      <div className="exp-check-head">
        <Rings size={40} stroke={5} rings={[{ value: items.length ? done / items.length : 0, tone: 1 }]} label={`${done} of ${items.length} done`} />
        <div className="com-grow">
          <h3 className="lq-t17">{title}</h3>
          <p className="lq-t13 lq-c2 lq-num">{done} of {items.length} done</p>
        </div>
      </div>
      <div role="group" aria-label={title}>
        {items.map((i) => (
          <button key={i.id} type="button" role="checkbox" aria-checked={Boolean(state[i.id])} className="exp-check-item" onClick={() => toggle(i.id)}>
            <span className="exp-tick" aria-hidden>
              <svg viewBox="0 0 24 24"><path d="M5.5 12.5 10 17l8.5-9.5" /></svg>
            </span>
            <span className="com-grow">
              <span className="exp-check-label">{i.label}</span>
              {i.note && <span className="lq-t13 lq-c2" style={{ display: "block" }}>{i.note}</span>}
            </span>
          </button>
        ))}
      </div>
    </Glass>
  );
}
