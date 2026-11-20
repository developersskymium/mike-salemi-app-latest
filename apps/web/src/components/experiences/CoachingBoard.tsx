"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Chip, Glass, Icon, Rings, Sheet, haptic, useToast } from "@/components/ui";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
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

/* ------------------------------------------------------------ Steps one to three (legacy L28) */
type Pkg = CoachingData["packages"][number];
type Slot = CoachingData["slots"][number];

const pkgLines = (d: string | null) => {
  const lines = (d ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  return { intro: lines.filter((l) => !l.startsWith("- ")).join(" "), bullets: lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2)) };
};
const usd = (cents: number, cur = "usd") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase(), maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

/**
 * Step one "Choose a package" → step two "Pick a time" → step three "What do you want to work on?" + the booking summary.
 * With sessions in hand the summary books straight away (uses one); without, it checks out the chosen package first.
 */
export function CoachingFlow({ packages, slots, credits, recommended }: { packages: Pkg[]; slots: Slot[]; credits: number; recommended?: string }) {
  const mounted = useMounted();
  const toast = useToast();
  const buyable = packages.filter((p) => p.price && !p.requires_application);
  const byApp = packages.filter((p) => !p.price || p.requires_application);
  const [pkgId, setPkgId] = useState(recommended && buyable.some((p) => p.id === recommended) ? recommended : buyable[0]?.id ?? "");
  const pkg = buyable.find((p) => p.id === pkgId) ?? null;

  const days = useMemo(() => {
    const m = new Map<string, Slot[]>();
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
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const daySlots = (day ? days.get(day) ?? [] : []).filter((s) => !booked.has(s.id));
  const [pick, setPick] = useState<Slot | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  const book = () =>
    start(async () => {
      if (!pick) return;
      const r = await bookCoachingAction(pick.id, note || undefined);
      if (r.ok) {
        haptic(14);
        setBooked((b) => new Set(b).add(pick.id));
        setDone(fmt(pick.starts_at, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }));
        toast("Booked", { tone: "success", icon: "check" });
        setPick(null);
        setNote("");
      } else toast(r.message, { icon: "close" });
    });

  const when = pick && mounted ? fmt(pick.starts_at, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Pick a time above";

  return (
    <>
      <section id="packages" className="exp-section coa-step" aria-labelledby="s1">
        <header className="exp-heading"><div><div className="exp-kicker">Step one</div><h2 id="s1" className="lq-t22">Choose a package</h2></div>{credits > 0 && <Chip variant="fill" icon="check">{credits} session{credits === 1 ? "" : "s"} ready to book</Chip>}</header>
        <div className="coa-pkgs" role="radiogroup" aria-label="Package">
          {buyable.map((p) => {
            const { intro, bullets } = pkgLines(p.description);
            const on = p.id === pkgId;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} className="coa-pkg2 lq-press" onClick={() => { haptic(); setPkgId(p.id); }}>
                <span className="com-between" style={{ width: "100%" }}>
                  <span className="lq-t15" style={{ fontWeight: 650 }}>{p.name}</span>
                  {p.id === recommended ? <Chip variant="fill">Recommended</Chip> : <span className="coa-radio" aria-hidden />}
                </span>
                <span className="coa-price lq-num">{usd(p.price!.amountCents, p.price!.currency)}</span>
                <span className="lq-t13 lq-c2 coa-pkg2-meta"><Icon name="clock" size="xs" />{p.sessions > 1 ? `${p.sessions} × ${p.duration_minutes} min` : `${p.duration_minutes} minutes`}</span>
                {intro && <span className="lq-t13 lq-c2">{intro}</span>}
                {bullets.length > 0 && <span className="coa-pkg2-list">{bullets.map((b) => <span key={b}><Icon name="check" size="xs" />{b}</span>)}</span>}
              </button>
            );
          })}
        </div>
        {byApp.length > 0 && (
          <p className="lq-t13 lq-c2 coa-byapp">{byApp.map((p) => p.name).join(", ")}: by application. Ask Mike&rsquo;s team on your next call, or reply to any email from Mike.</p>
        )}
      </section>

      <section id="book" className="exp-section coa-step" aria-labelledby="s2">
        <header className="exp-heading"><div><div className="exp-kicker">Step two</div><h2 id="s2" className="lq-t22">Pick a time</h2><p className="lq-t13 lq-c2">Mike coaches Tuesday to Saturday. Times show in your local time zone{mounted ? ` (${Intl.DateTimeFormat().resolvedOptions().timeZone.replace("_", " ")})` : ""}.</p></div></header>
        {!slots.length ? (
          <Glass radius="card" className="exp-note">
            <span className="coa-date" aria-hidden><Icon name="calendar" size="md" /></span>
            <div><div className="lq-t17">No open times right now</div><p className="lq-t13 lq-c2">Mike opens new times every week. Check back soon.</p></div>
          </Glass>
        ) : (
          <Glass radius="card" className="coa-cal">
            <div className="coa-strip" role="listbox" aria-label="Choose a day">
              {strip.map(({ key, date }) => {
                const n = (days.get(key) ?? []).filter((s) => !booked.has(s.id)).length;
                return (
                  <button key={key} type="button" role="option" aria-selected={key === day} aria-label={`${fmt(date.toISOString(), { weekday: "long", month: "long", day: "numeric" })}, ${n ? `${n} open times` : "no open times"}`} className="coa-day lq-press" data-has={n ? "" : undefined} disabled={!n} onClick={() => { haptic(); setSel(key); setPick(null); }}>
                    <span className="lq-t11">{fmt(date.toISOString(), { weekday: "short" })}</span>
                    <span className="lq-t20 lq-num">{date.getDate()}</span>
                    <span className="coa-dots" aria-hidden>{Array.from({ length: Math.min(n, 3) }, (_, i) => <i key={i} />)}</span>
                  </button>
                );
              })}
            </div>
            <div className="coa-times">
              {daySlots.length ? (
                <>
                  <div className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>{mounted && daySlots[0] ? fmt(daySlots[0].starts_at, { weekday: "long", month: "long", day: "numeric" }) : ""}</div>
                  <div className="coa-time-grid" role="radiogroup" aria-label="Time">
                    {daySlots.map((s) => (
                      <button key={s.id} type="button" role="radio" aria-checked={pick?.id === s.id} className="coa-time lq-press" onClick={() => { haptic(); setPick(s); }}>
                        <span className="lq-t15 lq-num">{mounted ? fmt(s.starts_at, { hour: "numeric", minute: "2-digit" }) : ""}</span>
                        <span className="lq-t11 lq-c2 lq-num">{s.duration_minutes} min</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="lq-t15 lq-c2">No open times on this day.</p>
              )}
            </div>
          </Glass>
        )}
      </section>

      <section className="exp-section coa-step" aria-labelledby="s3">
        <header className="exp-heading"><div><div className="exp-kicker">Step three</div><h2 id="s3" className="lq-t22">What do you want to work on?</h2></div></header>
        <div className="coa-final">
          <div className="com-field" style={{ margin: 0 }}>
            <label htmlFor="coa-focus" className="lq-sr">Session focus</label>
            <textarea id="coa-focus" className="com-input coa-focus" rows={5} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="My snatch loses the arm lockout past rep 15, and my left shoulder aches the next day." />
            <span className="lq-t12 lq-c3">Send footage ahead of time and the call goes straight to the fix. {note.length}/1000</span>
          </div>
          <Glass radius="card" className="coa-summary" aria-live="polite">
            <div className="exp-kicker" style={{ textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11 }}>Your booking</div>
            <dl>
              <div><dt>Package</dt><dd>{credits > 0 ? "From your sessions" : pkg?.name ?? "Choose one"}</dd></div>
              <div><dt>When</dt><dd className="lq-num">{when}</dd></div>
              <div className="coa-total"><dt>Total</dt><dd className="lq-num">{credits > 0 ? `1 of ${credits} session${credits === 1 ? "" : "s"}` : pkg ? usd(pkg.price!.amountCents, pkg.price!.currency) : "—"}</dd></div>
            </dl>
            {credits > 0 ? (
              <Button block size="lg" icon="check" onClick={book} disabled={!pick || pending} aria-busy={pending}>{pending ? "Booking…" : "Book this session"}</Button>
            ) : pkg ? (
              <CheckoutButton kind="coaching" refId={pkg.id} label={pick ? "Pay, then book this time" : `Get ${pkg.name.toLowerCase()}`} block size="lg" />
            ) : null}
            <p className="lq-t12 lq-c2 coa-terms"><Icon name="calendar" size="xs" />{credits > 0 ? "Cancel or move up to 24 hours before and the session comes back." : "Your sessions appear here after payment, ready to book the time you picked."}</p>
            {done && <p className="coa-done" role="status"><Icon name="check" size="xs" />Booked for {done}. You&rsquo;ll get the video link before the call.</p>}
          </Glass>
        </div>
      </section>
    </>
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
  if (!sessions.length)
    return (
      <Glass radius="card" className="exp-note">
        <span className="coa-date" aria-hidden><Icon name="bookmark" size="md" /></span>
        <div><div className="lq-t17">No sessions yet</div><p className="lq-t13 lq-c2">Once you&rsquo;ve trained with Mike, every session and its notes live here.</p></div>
      </Glass>
    );
  const label: Record<string, string> = { completed: "Done", cancelled: "Cancelled", no_show: "Missed", booked: "Done" };
  return (
    <ul className="coa-history" role="list">
      {sessions.map((s) => (
        <li key={s.id}>
          <Glass radius="card" className="coa-hist">
            <div className="com-between" style={{ flexWrap: "wrap", alignItems: "baseline" }}>
              <span className="lq-t15" style={{ fontWeight: 600 }}>{mounted ? fmt(s.starts_at, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : " "}</span>
              <span className="lq-t13 lq-c2">{s.package ?? "Session"}{s.status !== "completed" && s.status !== "booked" ? ` · ${label[s.status]}` : ""}</span>
            </div>
            {s.member_note && <p className="lq-t13 lq-c2"><span className="lq-c3">You asked: </span>{s.member_note}</p>}
            {s.coach_note ? <p className="coa-coachnote">{s.coach_note}</p> : s.status === "completed" ? <p className="lq-t13 lq-c3">Mike&rsquo;s notes appear here after the session.</p> : null}
          </Glass>
        </li>
      ))}
    </ul>
  );
}
