"use client";

import { useMemo, useState } from "react";
import { useIsClient } from "@/lib/hooks/clock";
import { haptic } from "@/components/ui";

export interface PickSlot { id: string; starts_at: string; duration_minutes: number }

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", o).format(new Date(iso));
const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function useMounted() {
  return useIsClient();
}

export function slotWhen(iso: string, o: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) {
  return fmt(iso, o);
}

/**
 * Day chips (only days with open times) and a time grid, in the member's own time zone.
 * Used for the retreat alignment call, booking a coaching session and moving one.
 */
export function SlotPicker({ slots, value, onChange, maxDays = 8, label = "Choose a time", durationLabel }: { slots: PickSlot[]; value: string | null; onChange: (s: PickSlot) => void; maxDays?: number; label?: string; durationLabel?: string }) {
  const mounted = useMounted();
  const days = useMemo(() => {
    const m = new Map<string, PickSlot[]>();
    for (const s of slots) m.set(dayKey(s.starts_at), [...(m.get(dayKey(s.starts_at)) ?? []), s]);
    return [...m.entries()].slice(0, maxDays);
  }, [slots, maxDays]);
  const [day, setDay] = useState<string | null>(null);
  const selDay = day ?? (value ? dayKey(slots.find((s) => s.id === value)?.starts_at ?? "") : null) ?? days[0]?.[0] ?? null;
  const list = days.find(([k]) => k === selDay)?.[1] ?? [];
  if (!mounted) return <div className="rt-picker" aria-busy style={{ minHeight: 168 }} />;
  if (!days.length) return <p className="lq-t15 lq-c2">No open times right now. Mike opens new times every week.</p>;
  return (
    <div className="rt-picker">
      <div className="rt-days" role="listbox" aria-label="Day">
        {days.map(([k, ss]) => (
          <button key={k} type="button" role="option" aria-selected={k === selDay} className="rt-day lq-press" onClick={() => { haptic(); setDay(k); }}>
            <span className="rt-day-w">{fmt(ss[0]!.starts_at, { weekday: "short" })}</span>
            <span className="rt-day-n lq-num">{fmt(ss[0]!.starts_at, { day: "numeric" })}</span>
            <span className="rt-day-m">{fmt(ss[0]!.starts_at, { month: "short" })}</span>
          </button>
        ))}
      </div>
      <div className="rt-times" role="radiogroup" aria-label={label}>
        {list.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={value === s.id} className="rt-time lq-press" onClick={() => { haptic(); onChange(s); }}>
            <span className="lq-num">{fmt(s.starts_at, { hour: "numeric", minute: "2-digit" })}</span>
          </button>
        ))}
      </div>
      <p className="lq-t12 lq-c3">Times in your time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")}) · {durationLabel ?? `${list[0]?.duration_minutes ?? 45} minutes`}</p>
    </div>
  );
}
