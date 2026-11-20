"use client";

import { useState, useTransition } from "react";
import { Icon, haptic, useToast } from "@/components/ui";
import { useIsClient } from "@/lib/hooks/clock";
import { tickHomeworkAction } from "@/lib/actions/coaching";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Idea 5 · Mike's homework as daily ticks: the last seven days in the member's time zone, today first-class.
 * Ticks are stored in coaching_homework_ticks and read by the schedule (coachingHomeworkDays).
 */
export function HomeworkWeek({ bookingId, homework, from, ticked, compact }: { bookingId: string; homework: string; from: string; ticked: string[]; compact?: boolean }) {
  const client = useIsClient();
  const toast = useToast();
  const [done, setDone] = useState(() => new Set(ticked));
  const [, start] = useTransition();
  const fromDay = ymd(new Date(from));
  const days = client
    ? Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; })
    : [];
  const today = client ? ymd(new Date()) : "";
  const inWeek = days.filter((d) => ymd(d) > fromDay);
  const count = inWeek.filter((d) => done.has(ymd(d))).length;

  const toggle = (key: string) => {
    const on = !done.has(key);
    const next = new Set(done);
    if (on) next.add(key); else next.delete(key);
    setDone(next);
    if (on) haptic(12);
    start(async () => {
      const r = await tickHomeworkAction(bookingId, key, on);
      if (!r.ok) {
        setDone((cur) => { const back = new Set(cur); if (on) back.delete(key); else back.add(key); return back; });
        toast(r.message, { icon: "close" });
      }
    });
  };

  return (
    <section className={compact ? undefined : "co-card co-hw"} aria-labelledby={`hw-${bookingId}`}>
      {!compact && (
        <div>
          <div className="lq-eyebrow" data-tone="warm">Your one thing · 5 minutes a day</div>
          <p id={`hw-${bookingId}`} className="co-hw-text">{homework}</p>
          <p className="co-hw-meta">{client ? `${count} of ${inWeek.length} days this week · ticks show on your schedule` : " "}</p>
        </div>
      )}
      <div className="co-hw-side">
        <div className="co-week" role="group" aria-label="Tick the days you did it" style={{ minHeight: 58 }}>
          {days.map((d) => {
            const key = ymd(d);
            const before = key <= fromDay;
            const future = key > today;
            const on = done.has(key);
            return (
              <button key={key} type="button" className="co-day" aria-pressed={on} disabled={before || future} data-today={key === today ? "" : undefined} onClick={() => toggle(key)} aria-label={`${new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(d)}${on ? ", done" : ""}`}>
                <span className="co-tick"><Icon name="check" size="xs" /></span>
                <span>{key === today ? "Today" : new Intl.DateTimeFormat("en-US", { weekday: "narrow" }).format(d)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
