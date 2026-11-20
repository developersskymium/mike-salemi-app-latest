"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { DayGlyph } from "@/components/graphics";
import { Button, Glass, Icon, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { reminderControl } from "@/lib/actions/notifications";
import { dayTypeOf, splitDayTitle } from "@/components/today/model";
import { time12 } from "@/components/notifications/format";
import "./pln.css";

export interface NextSession {
  title: string;
  program: string | null;
  date: string;
  href: string;
  kind: string;
  /** "HH:MM" reminder time for that weekday. */
  reminderTime: string;
  timezone: string;
  remindersOn: boolean;
}

const SNOOZE = [
  { label: "15 min", minutes: 15 },
  { label: "1 hour", minutes: 60 },
  { label: "3 hours", minutes: 180 },
];

function prettyDate(iso: string, today: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const diff = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  const day = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  return diff === 0 ? `Today · ${day}` : diff === 1 ? `Tomorrow · ${day}` : day;
}

/** Minutes from the member's local "now" until date+time (both member-local). */
function countdown(date: string, hhmm: string, today: string, now: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const [nh, nm] = now.split(":").map(Number);
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  const diff = days * 1440 + (h! * 60 + m!) - (nh! * 60 + nm!);
  if (diff <= 0) return "Due now";
  if (diff < 60) return `In ${diff} min`;
  if (diff < 1440) return `In ${Math.round(diff / 60)} hr`;
  return `In ${Math.round(diff / 1440)} days`;
}

/**
 * Next scheduled session with its reminder (time, zone, countdown) and "not right now" controls:
 * snooze or skip today mute the nudge without touching the schedule; resume brings it back.
 */
export function NextSessionCard({ s, today, now, snoozedUntil, skipDate }: { s: NextSession; today: string; now: string; snoozedUntil: string | null; skipDate: string | null }) {
  const [snooze, setSnooze] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(skipDate === today);
  const [pending, start] = useTransition();
  const toast = useToast();

  useEffect(() => {
    const t = snoozedUntil ? Date.parse(snoozedUntil) : 0;
    setSnooze(t > Date.now() ? t : null);
  }, [snoozedUntil]);

  const muted = skipped || snooze !== null;
  const { day, name } = splitDayTitle(s.title);
  const dt = dayTypeOf(null, s.title, s.kind);
  const fail = (e: string) => toast(e === "offline" ? "Preview mode can't change reminders. It works on the live app." : e, { icon: "close" });

  const doSnooze = (minutes: number, label: string) =>
    start(async () => {
      const r = await reminderControl("snooze", minutes);
      if (!r.ok) return fail(r.error);
      const until = r.data.snoozed_until ? Date.parse(r.data.snoozed_until) : Date.now() + minutes * 60_000;
      setSnooze(until);
      haptic(8);
      toast(`Snoozed ${label} — back at ${new Date(until).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`, { tone: "success", icon: "moon" });
    });
  const doSkip = () =>
    start(async () => {
      const r = await reminderControl("skip_today");
      if (!r.ok) return fail(r.error);
      setSkipped(true);
      haptic(8);
      toast("Today's reminder skipped. Your schedule is untouched — reminders resume tomorrow.", { tone: "success", icon: "next", duration: 4500 });
    });
  const resume = () =>
    start(async () => {
      const r = await reminderControl("resume");
      if (!r.ok) return fail(r.error);
      setSnooze(null);
      setSkipped(false);
      toast("Reminders back on", { tone: "success", icon: "bell" });
    });

  return (
    <Glass as="section" radius="card" className="pln-next" aria-labelledby="pln-next-t">
      <div className="pln-next-head">
        <span className="pln-eyebrow"><Icon name="calendar" size="xs" /> Next session</span>
        <Link href="/you/notifications" className="pln-quiet-link"><Icon name="clock" size="xs" /> History</Link>
      </div>
      <div className="pln-next-body">
        <span className="pln-next-glyph" aria-hidden>{dt ? <DayGlyph type={dt} size={30} tone="accent" /> : <Icon name="kettlebell" />}</span>
        <div className="pln-next-main">
          <h2 id="pln-next-t" className="pln-next-title">{day ? `Day ${day} · ${name}` : name}</h2>
          <p className="pln-next-sub">{[s.program, prettyDate(s.date, today)].filter(Boolean).join(" · ")}</p>
          <div className="pln-chips">
            <span className="pln-chip" data-on={s.remindersOn && !muted ? "" : undefined}>
              <Icon name="bell" size="xs" /> {s.remindersOn ? `Reminder at ${time12(s.reminderTime)}` : "Reminders are off"}
            </span>
            <span className="pln-chip">{s.timezone.replace(/_/g, " ")}</span>
            {s.remindersOn && !muted && <span className="pln-chip lq-num">{countdown(s.date, s.reminderTime, today, now)}</span>}
          </div>
          {muted && (
            <p className="pln-muted" role="status">
              <Icon name="moon" size="xs" />
              {skipped ? "Today's reminder is skipped. Your schedule is untouched." : `Snoozed until ${new Date(snooze!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`}
            </p>
          )}
        </div>
        <Button icon="play" href={s.href} className="pln-next-cta">Open session</Button>
      </div>
      <div className="pln-next-foot">
        {muted ? (
          <button type="button" className="pln-pillbtn" onClick={resume} disabled={pending}><Icon name="repeat" size="xs" /> Resume reminders</button>
        ) : (
          <>
            <span className="pln-foot-label">Snooze</span>
            {SNOOZE.map((o) => (
              <button key={o.minutes} type="button" className="pln-pillbtn" onClick={() => doSnooze(o.minutes, o.label)} disabled={pending || !s.remindersOn}>
                <Icon name="moon" size="xs" /> {o.label}
              </button>
            ))}
            <button type="button" className="pln-pillbtn pln-skip" onClick={doSkip} disabled={pending || !s.remindersOn}><Icon name="next" size="xs" /> Skip today</button>
          </>
        )}
      </div>
    </Glass>
  );
}
