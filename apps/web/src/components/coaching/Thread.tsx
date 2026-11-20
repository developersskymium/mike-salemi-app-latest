"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Icon, useToast } from "@/components/ui";
import { useIsClient } from "@/lib/hooks/clock";
import { markCoachMessagesReadAction, sendCoachMessageAction } from "@/lib/actions/coaching";
import type { CoachingMessage } from "@/lib/loaders/coaching";

const REPLY_HOURS = 48;
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", o).format(new Date(iso));

/** Idea 7 · Async thread with Mike and a visible reply-time promise (48 hours). */
export function Thread({ initial, canWrite }: { initial: CoachingMessage[]; canWrite: boolean }) {
  const client = useIsClient();
  const toast = useToast();
  const [msgs, setMsgs] = useState(initial);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (initial.some((m) => m.from_coach && !m.read_at)) void markCoachMessagesReadAction();
  }, [initial]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length]);

  // The promise: the oldest member message after Mike's last reply is answered within 48 hours.
  const lastCoach = [...msgs].reverse().findIndex((m) => m.from_coach);
  const waiting = (lastCoach === -1 ? msgs : msgs.slice(msgs.length - lastCoach)).filter((m) => !m.from_coach);
  const due = waiting[0] ? new Date(new Date(waiting[0].created_at).getTime() + REPLY_HOURS * 3600000).toISOString() : null;

  const send = () =>
    start(async () => {
      const body = text.trim();
      if (!body) return;
      const r = await sendCoachMessageAction(body);
      if (r.ok) {
        setMsgs((m) => [...m, r.data]);
        setText("");
      } else toast(r.message, { icon: "close" });
    });

  return (
    <div className="co-card co-thread">
      <div className="co-promise" role="status">
        <Icon name="clock" size="sm" />
        {client && due ? (
          <span><b>Mike replies by {fmt(due, { weekday: "long", hour: "numeric", minute: "2-digit" })}</b> · within 48 hours, usually sooner.</span>
        ) : (
          <span><b>Mike replies within 48 hours.</b> Questions between calls, form checks, a quick win to share.</span>
        )}
      </div>
      {msgs.length ? (
        <ol className="co-msgs" role="list" aria-label="Messages">
          {msgs.map((m) => (
            <li key={m.id} className="co-msg" data-me={m.from_coach ? undefined : ""}>
              <span className="co-k">{m.from_coach ? "Mike" : "You"}</span>
              <div className="co-bubble">{m.body}</div>
              {m.attachment_url && <a href={m.attachment_url} target="_blank" rel="noreferrer" className="lq-t12 co-ic"><Icon name="external" size="xs" />Attachment</a>}
              <time dateTime={m.created_at}>{client ? fmt(m.created_at, { weekday: "short", hour: "numeric", minute: "2-digit" }) : " "}</time>
            </li>
          ))}
          <li ref={end} aria-hidden />
        </ol>
      ) : (
        <div className="co-empty" style={{ flex: 1 }}>
          <b>Start the conversation</b>
          <p>Ask about a lift, share a win, or send a footage link. Mike reads every message himself.</p>
        </div>
      )}
      {canWrite ? (
        <div className="co-compose">
          <label htmlFor="co-msg" className="lq-sr" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Message Mike</label>
          <textarea id="co-msg" rows={1} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Message Mike…" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
          <Button size="lg" icon="arrowRight" onClick={send} disabled={pending || !text.trim()} aria-busy={pending}>Send</Button>
        </div>
      ) : (
        <div className="co-compose" style={{ justifyContent: "space-between" }}>
          <span className="lq-t13 co-muted">Messaging opens with your first 1:1 session.</span>
          <Button href="/coaching/book" size="md">Book a call</Button>
        </div>
      )}
    </div>
  );
}
