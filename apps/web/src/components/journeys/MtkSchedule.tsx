"use client";

import { useState, useTransition } from "react";
import { Icon, useToast } from "@/components/ui";
import { scheduleMtkPlanAction } from "@/lib/actions/plan";

const DAYS = [
  { n: 1, l: "M" }, { n: 2, l: "T" }, { n: 3, l: "W" }, { n: 4, l: "T" }, { n: 5, l: "F" }, { n: 6, l: "S" }, { n: 0, l: "S" },
];
const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** MTK: put My Plan's learning days on the one schedule (pick training days → scheduleMtkPlanAction). */
export function MtkSchedule({ planId, perWeek }: { planId: string; perWeek: number }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [days, setDays] = useState<number[]>(perWeek >= 3 ? [1, 3, 5] : perWeek === 2 ? [2, 4] : [1, 2, 3, 4, 5].slice(0, Math.max(1, perWeek)));
  const [saved, setSaved] = useState(false);
  const toggle = (n: number) => (setSaved(false), setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort())));
  return (
    <section className="jsch" aria-labelledby="jsch-h">
      <div className="jsch-c">
        <h2 id="jsch-h" className="jsch-t">Add My Plan to your schedule</h2>
        <p className="jl-note">{days.length ? `Learning days on ${days.map((d) => NAMES[d]).join(", ")}.` : "Pick the days you learn."}</p>
      </div>
      <div className="jsch-days" role="group" aria-label="Training days">
        {DAYS.map((d) => (
          <button key={d.n} type="button" aria-pressed={days.includes(d.n)} aria-label={NAMES[d.n]} onClick={() => toggle(d.n)}>{d.l}</button>
        ))}
      </div>
      <button
        type="button"
        className="jsch-go lq-press"
        disabled={pending || !days.length}
        onClick={() =>
          start(async () => {
            const r = await scheduleMtkPlanAction(planId, days).catch(() => ({ ok: false as const, error: "Couldn't reach the server. Try again." }));
            if (r.ok) {
              setSaved(true);
              toast("My Plan is on your schedule", { tone: "success", icon: "check" });
            } else toast(r.error);
          })
        }
      >
        {saved ? <><Icon name="check" size="xs" />Scheduled</> : pending ? "Saving…" : "Add to my schedule"}
      </button>
    </section>
  );
}
