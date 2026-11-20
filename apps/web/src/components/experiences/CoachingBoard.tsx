"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Chip, Glass, Icon, Rings, Sheet, haptic, useToast } from "@/components/ui";
import { bookCoachingAction, cancelCoachingAction } from "@/lib/actions/commerce";
import type { CoachingData, CoachingSessionView } from "@/lib/loaders/commerce";

/** Times are shown in the member's own time zone, so they are formatted after mount. */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", o).format(new Date(iso));
const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function inWords(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now;
  const h = Math.round(ms / 3600000);
  if (ms < 0) return "now";
  if (h < 1) return `in ${Math.max(1, Math.round(ms / 60000))} min`;
  if (h < 24) return `in ${h} hr${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return d === 1 ? "tomorrow" : `in ${d} days`;
}

/* ------------------------------------------------------------- Credits */
export function CreditsCard({ credits, nextHref }: { credits: number; nextHref: string }) {
  const max = Math.max(4, credits);
  return (
    <Glass radius="card" className="coa-credits" data-has={credits ? "" : undefined}>
      <Rings size={92} stroke={11} rings={[{ value: credits / max, tone: 1 }]} label={`${credits} sessions left`}>
        <span className="coa-credits-n lq-num">{credits}</span>
      </Rings>
      <div className="com-grow">
        <div className="exp-kicker">Sessions left</div>
        <div className="lq-t22">{credits === 0 ? "No sessions yet" : `${credits} session${credits === 1 ? "" : "s"} ready to book`}</div>
        <p className="lq-t13 lq-c2">{credits === 0 ? "Get a package and your sessions appear here, ready to book." : "Each booking uses one. Cancel 24 hours ahead and it comes back."}</p>
      </div>
      {credits > 0 && (
        <Button href={nextHref} size="md" icon="calendar">Book a time</Button>
      )}
    </Glass>
  );
}

/* ------------------------------------------------------------ Calendar */
export function BookingCalendar({ slots, credits }: { slots: CoachingData["slots"]; credits: number }) {
  const mounted = useMounted();
  const toast = useToast();
  const days = useMemo(() => {
    const m = new Map<string, CoachingData["slots"]>();
    for (const s of slots) m.set(dayKey(s.starts_at), [...(m.get(dayKey(s.starts_at)) ?? []), s]);
    return m;
  }, [slots]);
  const strip = useMemo(() => {
    if (!mounted) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 21 }, (_, i) => {
      const d = new Date(start.getTime() + i * 86400000);
      return { key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, date: d };
    });
  }, [mounted]);
  const firstWithSlots = strip.find((d) => days.has(d.key))?.key;
  const [sel, setSel] = useState<string | null>(null);
  const day = sel ?? firstWithSlots ?? strip[0]?.key ?? null;
  const [pick, setPick] = useState<CoachingData["slots"][number] | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [booked, setBooked] = useState<Set<string>>(new Set());

  if (!slots.length) {
    return (
      <Glass radius="card" className="exp-note">
        <span className="coa-date" aria-hidden><Icon name="calendar" size="md" /></span>
        <div>
          <div className="lq-t17">No open times right now</div>
          <p className="lq-t13 lq-c2">Mike opens new times every week. Check back soon.</p>
        </div>
      </Glass>
    );
  }
  const daySlots = (day ? days.get(day) ?? [] : []).filter((s) => !booked.has(s.id));
  const confirm = () =>
    start(async () => {
      if (!pick) return;
      const r = await bookCoachingAction(pick.id, note || undefined);
      if (r.ok) {
        haptic(14);
        setBooked((b) => new Set(b).add(pick.id));
        toast("Booked", { tone: "success", icon: "check" });
        setPick(null);
        setNote("");
      } else toast(r.message, { icon: "close" });
    });

  return (
    <Glass radius="card" className="coa-cal">
      <div className="coa-strip" role="listbox" aria-label="Choose a day">
        {strip.map(({ key, date }) => {
          const n = days.get(key)?.length ?? 0;
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={key === day}
              aria-label={`${fmt(date.toISOString(), { weekday: "long", month: "long", day: "numeric" })}, ${n ? `${n} open times` : "no open times"}`}
              className="coa-day lq-press"
              data-has={n ? "" : undefined}
              disabled={!n}
              onClick={() => { haptic(); setSel(key); }}
            >
              <span className="lq-t11">{fmt(date.toISOString(), { weekday: "short" })}</span>
              <span className="lq-t20 lq-num">{date.getDate()}</span>
              <span className="coa-dots" aria-hidden>{Array.from({ length: Math.min(n, 3) }, (_, i) => <i key={i} />)}</span>
            </button>
          );
        })}
      </div>
      <div className="coa-times">
        {day && daySlots.length ? (
          <>
            <div className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>{mounted && daySlots[0] ? fmt(daySlots[0].starts_at, { weekday: "long", month: "long", day: "numeric" }) : ""}</div>
            <div className="coa-time-grid">
              {daySlots.map((s) => (
                <button key={s.id} type="button" className="coa-time lq-press" onClick={() => { haptic(); setPick(s); }} disabled={credits === 0} aria-label={`Book ${fmt(s.starts_at, { weekday: "long", hour: "numeric", minute: "2-digit" })}`}>
                  <span className="lq-t15 lq-num">{mounted ? fmt(s.starts_at, { hour: "numeric", minute: "2-digit" }) : ""}</span>
                  <span className="lq-t11 lq-c2 lq-num">{s.duration_minutes} min</span>
                </button>
              ))}
            </div>
            {credits === 0 && <p className="lq-t13 lq-c2" style={{ marginTop: 10 }}>Choose a package to book one of these times.</p>}
          </>
        ) : (
          <p className="lq-t15 lq-c2">No open times on this day.</p>
        )}
        <p className="lq-t12 lq-c3" style={{ marginTop: 12 }}>Times in your time zone{mounted ? ` (${Intl.DateTimeFormat().resolvedOptions().timeZone.replace("_", " ")})` : ""}.</p>
      </div>

      <Sheet
        open={pick !== null}
        onClose={() => setPick(null)}
        title="Book this time?"
        detents={["medium"]}
        description={pick && mounted ? `${fmt(pick.starts_at, { weekday: "long", month: "long", day: "numeric" })} at ${fmt(pick.starts_at, { hour: "numeric", minute: "2-digit" })}, ${pick.duration_minutes} minutes with Mike.` : undefined}
        footer={<Button block icon="check" onClick={confirm} disabled={pending} aria-busy={pending}>{pending ? "Booking…" : "Book · uses 1 session"}</Button>}
      >
        <div className="com-field">
          <label htmlFor="coa-note">What would you like to work on? <span className="lq-c3" style={{ fontWeight: 400 }}>(optional)</span></label>
          <textarea id="coa-note" className="com-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. my clean keeps banging my forearm" />
        </div>
        <p className="lq-t13 lq-c2" style={{ marginTop: 12 }}>You&rsquo;ll get the video link before the call. Cancel 24 hours ahead and the session comes back.</p>
      </Sheet>
    </Glass>
  );
}

/* ------------------------------------------------------------ Sessions */
export function UpcomingSessions({ sessions }: { sessions: CoachingSessionView[] }) {
  const mounted = useMounted();
  const toast = useToast();
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const [cancel, setCancel] = useState<CoachingSessionView | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const list = sessions.filter((s) => !gone.has(s.id));
  if (!list.length) return null;
  const doCancel = () =>
    start(async () => {
      if (!cancel) return;
      const r = await cancelCoachingAction(cancel.id);
      if (r.ok) {
        setGone((g) => new Set(g).add(cancel.id));
        toast(r.data.creditReturned ? "Cancelled · session returned" : "Cancelled", { icon: "check" });
        setCancel(null);
      } else toast(r.message, { icon: "close" });
    });
  return (
    <div className="com-stack">
      {list.map((s, i) => {
        const start = new Date(s.starts_at).getTime();
        const soon = mounted && start - now < 15 * 60000 && now < start + s.duration_minutes * 60000;
        return (
          <Glass key={s.id} radius="card" className="coa-session" data-next={i === 0 ? "" : undefined}>
            <div className="coa-date" aria-hidden>
              <span className="lq-t11">{mounted ? fmt(s.starts_at, { month: "short" }) : ""}</span>
              <span className="lq-t28 lq-num">{mounted ? new Date(s.starts_at).getDate() : ""}</span>
            </div>
            <div className="com-grow">
              <div className="com-row" style={{ gap: 8 }}>
                <span className="lq-t17">{mounted ? fmt(s.starts_at, { weekday: "long", hour: "numeric", minute: "2-digit" }) : " "}</span>
                {soon ? <Chip variant="tint" dot>Starting</Chip> : i === 0 && mounted ? <Chip variant="fill">{inWords(s.starts_at, now)}</Chip> : null}
              </div>
              <div className="lq-t13 lq-c2">{s.duration_minutes} min with Mike{s.package ? ` · ${s.package}` : ""}</div>
              <div className="coa-actions">
                {s.meeting_url ? (
                  <Button size="sm" variant={soon ? "filled" : "glass"} icon="play" href={s.meeting_url} target="_blank">Join call</Button>
                ) : (
                  <span className="lq-t13 lq-c3">Video link arrives before the call</span>
                )}
                <Button size="sm" variant="plain" onClick={() => setCancel(s)}>Cancel</Button>
              </div>
            </div>
          </Glass>
        );
      })}
      <Sheet
        open={cancel !== null}
        onClose={() => setCancel(null)}
        title="Cancel this session?"
        detents={["medium"]}
        description={cancel?.can_cancel_with_refund ? "It’s more than 24 hours away, so the session comes back to you." : "It’s less than 24 hours away, so the session won’t come back."}
        footer={
          <div className="com-stack" style={{ gap: 8 }}>
            <Button block variant="glass" onClick={doCancel} disabled={pending} aria-busy={pending}>{pending ? "Cancelling…" : "Cancel session"}</Button>
            <Button block variant="plain" onClick={() => setCancel(null)}>Keep it</Button>
          </div>
        }
      />
    </div>
  );
}

export function PastSessions({ sessions }: { sessions: CoachingSessionView[] }) {
  const mounted = useMounted();
  if (!sessions.length) return null;
  const label: Record<string, string> = { completed: "Done", cancelled: "Cancelled", no_show: "Missed", booked: "Done" };
  return (
    <Glass radius="card" className="com-panel exp-faq" style={{ paddingBlock: 4 }}>
      {sessions.map((s) => (
        <details key={s.id}>
          <summary>
            <span className="com-grow">
              <span className="lq-t15" style={{ display: "block" }}>{mounted ? fmt(s.starts_at, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : " "}</span>
              <span className="lq-t13 lq-c2" style={{ fontWeight: 400 }}>{label[s.status]}{s.package ? ` · ${s.package}` : ""}</span>
            </span>
            {s.coach_note && <Chip variant="fill" icon="bookmark">Notes</Chip>}
            <Icon name="chevron" size="sm" />
          </summary>
          <div className="coa-note">
            {s.member_note && <p className="lq-t13"><span className="lq-c2">You asked: </span>{s.member_note}</p>}
            {s.coach_note ? <p style={{ whiteSpace: "pre-line" }}>{s.coach_note}</p> : <p>Mike&rsquo;s notes appear here after the session.</p>}
          </div>
        </details>
      ))}
    </Glass>
  );
}
