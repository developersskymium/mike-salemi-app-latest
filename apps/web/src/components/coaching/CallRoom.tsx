"use client";

import Image from "next/image";
import { Button, Icon } from "@/components/ui";
import { useIsClient, useNow } from "@/lib/hooks/clock";
import type { CoachSession } from "@/lib/loaders/coaching";

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", o).format(new Date(iso));
const JOIN_EARLY = 10 * 60000;

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const firstSentence = (t: string | null | undefined) => (t ?? "").split(/(?<=[.!?])\s/)[0]?.trim() ?? "";

/**
 * Idea 4 · The call room: countdown in the member's time zone, Join unlocks 10 minutes before,
 * and the agenda built from homework, prep answers and footage.
 */
export function CallRoom({ s, homework, headingLevel = 1 }: { s: CoachSession; homework?: string | null; headingLevel?: 1 | 2 }) {
  const client = useIsClient();
  const now = useNow(1000);
  const start = new Date(s.starts_at).getTime();
  const end = start + s.duration_minutes * 60000;
  const t = now ?? 0;
  const live = client && now !== null && t >= start - JOIN_EARLY && t < end;
  const p = parts(start - t);
  const H = headingLevel === 1 ? "h1" : "h2";
  const agenda = [
    { k: "Check in on your one thing", v: homework ?? "How the last weeks went, in your words." },
    { k: "Your focus", v: s.prep?.goals ?? s.member_note ?? "Add what you want to leave with in the prep form." },
    { k: "What Mike looks at", v: s.prep?.watch || (s.prep?.footage_url ? "Your footage" : "Bring a set on camera, or add a footage link.") },
    { k: "One clear next step", v: "Mike’s notes and your homework land here after the call." },
  ];
  const prepped = Boolean(s.prep?.goals);

  return (
    <section className="co-room" data-live={live ? "" : undefined} aria-labelledby="room-h">
      <div className="co-room-main">
        <div className="co-room-who">
          <span className="co-face"><Image src="/media/summit/mike-face.png" alt="" fill sizes="44px" /></span>
          <div>
            <div className="lq-eyebrow">{live ? "Live now" : "Your next call with Mike"}</div>
            <div className="co-room-when">{client ? `${fmt(s.starts_at, { weekday: "long", month: "long", day: "numeric" })} · ${fmt(s.starts_at, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}` : " "}</div>
          </div>
        </div>
        <H id="room-h" className="lq-d-lg">{live ? "Mike is ready for you" : `${s.duration_minutes} minutes, one sticking point`}</H>
        <div className="co-count" aria-live="off" role="timer" aria-label={client ? `Starts ${fmt(s.starts_at, { weekday: "long", hour: "numeric", minute: "2-digit" })}` : undefined}>
          {client && !live && (
            p.d > 0 ? (
              <><div><b>{p.d}</b><span>days</span></div><div><b>{String(p.h).padStart(2, "0")}</b><span>hrs</span></div><div><b>{String(p.m).padStart(2, "0")}</b><span>min</span></div></>
            ) : (
              <><div><b>{String(p.h).padStart(2, "0")}</b><span>hrs</span></div><div><b>{String(p.m).padStart(2, "0")}</b><span>min</span></div><div><b>{String(p.s).padStart(2, "0")}</b><span>sec</span></div></>
            )
          )}
          {client && live && <div><b>{t < start ? `${Math.max(1, Math.ceil((start - t) / 60000))} min` : "Now"}</b><span>{t < start ? "until start · door is open" : "in session"}</span></div>}
        </div>
        <div className="co-room-acts">
          {live && s.meeting_url ? (
            <Button size="lg" variant="warm" icon="video" href={s.meeting_url} target="_blank">Join the call</Button>
          ) : (
            <Button size="lg" variant="white" icon="lock" disabled aria-disabled>Join opens 10 min before</Button>
          )}
          <Button size="lg" variant="onphoto" href={`/coaching/prep/${s.id}`} icon={prepped ? "check" : "clipboard"}>{prepped ? "Edit prep" : "Prepare · 3 questions"}</Button>
        </div>
        <p className="co-room-note"><Icon name="info" size="xs" />{live ? "Camera on, somewhere you can move." : "Move or cancel up to 24 hours before in Sessions."}</p>
      </div>
      <aside className="co-room-agenda" aria-label="Agenda">
        <h3>Agenda</h3>
        <ol className="co-agenda">
          {agenda.map((a) => <li key={a.k}><div><b>{a.k}</b><span>{a.k === "Your focus" ? firstSentence(a.v) || a.v : a.v}</span></div></li>)}
        </ol>
      </aside>
    </section>
  );
}
