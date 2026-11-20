"use client";

import { useMemo, useState } from "react";
import { Glass, Segmented } from "@/components/ui";
import type { ItineraryItem } from "@/lib/loaders/commerce";
import { time } from "@/components/commerce/format";

/** "Day 1 · Arrival & Connection" → "Arrival & Connection" */
function dayTitle(items: ItineraryItem[]) {
  const d = items[0]?.description ?? "";
  const shared = items.every((i) => i.description === d);
  return shared && d.includes("·") ? d.split("·").slice(1).join("·").trim() : null;
}

/** Itinerary by day: segmented day tabs on phone, all days side by side on desktop. Today's day is the "now" day. */
export function Itinerary({ items, startsAt, timezone, nowDay }: { items: ItineraryItem[]; startsAt: string; timezone: string; nowDay?: number | null }) {
  const days = useMemo(() => {
    const m = new Map<number, ItineraryItem[]>();
    for (const i of items) m.set(i.day_index, [...(m.get(i.day_index) ?? []), i]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);
  const [sel, setSel] = useState(String(nowDay ?? days[0]?.[0] ?? 1));
  if (!days.length) return null;
  const date = (dayIndex: number) => {
    const d = new Date(new Date(startsAt).getTime() + (dayIndex - 1) * 86400000);
    return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: timezone }).format(d);
  };
  return (
    <div>
      <Segmented
        className="exp-days-tabs"
        label="Day"
        options={days.map(([d]) => ({ value: String(d), label: `Day ${d}` }))}
        value={sel}
        onChange={setSel}
      />
      <div className="exp-days" style={{ ["--days" as string]: Math.min(days.length, 4) }}>
        {days.map(([d, list]) => {
          const title = dayTitle(list);
          return (
            <Glass as="article" radius="card" key={d} className="exp-day" data-off={String(d) !== sel ? "" : undefined} data-now={nowDay === d ? "" : undefined} aria-label={`Day ${d}`}>
              <div className="exp-day-head">
                <span className="exp-day-num">{String(d).padStart(2, "0")}</span>
                <div>
                  <div className="lq-t17">{title ?? `Day ${d}`}</div>
                  <div className="lq-t13 lq-c2">{date(d)}</div>
                </div>
              </div>
              <ol className="exp-tl">
                {list.map((i) => (
                  <li key={i.id}>
                    <div className="lq-t15">{i.title}</div>
                    {(i.starts_at || i.location || (i.description && !title)) && (
                      <div className="lq-t13 lq-c2">
                        {[i.starts_at ? time(`1970-01-01T${i.starts_at}Z`, "UTC") : null, i.location, title ? null : i.description].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </Glass>
          );
        })}
      </div>
    </div>
  );
}
