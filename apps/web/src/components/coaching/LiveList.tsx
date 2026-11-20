"use client";

import { useState, useTransition } from "react";
import { Button, Chip, Icon, haptic, useToast } from "@/components/ui";
import { useIsClient, useNow } from "@/lib/hooks/clock";
import { liveReminderAction } from "@/lib/actions/coaching";
import type { CoachingLive } from "@/lib/loaders/coaching";

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", o).format(new Date(iso));
const icsTime = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function ics(l: CoachingLive) {
  const s = new Date(l.starts_at);
  const e = new Date(s.getTime() + l.duration_minutes * 60000);
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mike Salemi//Zen Savage//EN", "BEGIN:VEVENT", `UID:${l.id}@mikesalemi`, `DTSTAMP:${icsTime(new Date())}`, `DTSTART:${icsTime(s)}`, `DTEND:${icsTime(e)}`, `SUMMARY:Zen Savage live: ${l.title}`, "BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:Zen Savage starts in 15 minutes", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

/** Idea 8 · Upcoming Zen Savage lives with a reminder toggle and add-to-calendar. */
export function LiveList({ lives }: { lives: CoachingLive[] }) {
  const client = useIsClient();
  const now = useNow(30000) ?? 0;
  const toast = useToast();
  const [on, setOn] = useState(() => new Set(lives.filter((l) => l.reminded).map((l) => l.id)));
  const [, start] = useTransition();
  const toggle = (id: string) => {
    const next = !on.has(id);
    setOn((cur) => { const s = new Set(cur); if (next) s.add(id); else s.delete(id); return s; });
    haptic();
    start(async () => {
      const r = await liveReminderAction(id, next);
      if (r.ok) toast(next ? "We'll remind you 15 minutes before" : "Reminder off", { icon: next ? "bell" : "check" });
      else {
        setOn((cur) => { const s = new Set(cur); if (next) s.delete(id); else s.add(id); return s; });
        toast(r.message, { icon: "close" });
      }
    });
  };
  return (
    <ul className="co-lives" role="list">
      {lives.map((l, i) => {
        const st = new Date(l.starts_at).getTime();
        const live = client && now >= st - 10 * 60000 && now < st + l.duration_minutes * 60000;
        return (
          <li key={l.id} className="co-card co-live">
            <div className="co-cal-date" aria-hidden>
              <span>{client ? fmt(l.starts_at, { weekday: "short" }) : ""}</span>
              <b>{client ? fmt(l.starts_at, { day: "numeric" }) : ""}</b>
              <span>{client ? fmt(l.starts_at, { month: "short" }) : ""}</span>
            </div>
            <div>
              <h3>{l.title} {i === 0 && <Chip variant={live ? "warm" : "fill"} size="sm" dot={live}>{live ? "Live now" : "Next"}</Chip>}</h3>
              <p>{client ? `${fmt(l.starts_at, { weekday: "long", hour: "numeric", minute: "2-digit", timeZoneName: "short" })} · ${l.duration_minutes} min` : " "}{l.summary ? ` · ${l.summary}` : ""}</p>
            </div>
            <div className="co-acts" style={{ justifyContent: "flex-end" }}>
              {live && l.join_url ? (
                <Button size="md" variant="warm" icon="video" href={l.join_url} target="_blank">Join live</Button>
              ) : (
                <Button size="md" variant={on.has(l.id) ? "tint" : "secondary"} icon={on.has(l.id) ? "check" : "bell"} aria-pressed={on.has(l.id)} onClick={() => toggle(l.id)}>{on.has(l.id) ? "Reminder on" : "Remind me"}</Button>
              )}
              {client && <a className="co-ics" href={ics(l)} download={`zen-savage-${l.starts_at.slice(0, 10)}.ics`} aria-label={`Add ${l.title} to calendar`}><Icon name="calendar" size="xs" />Add</a>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
