"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button, Icon, haptic, useToast } from "@/components/ui";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { useIsClient } from "@/lib/hooks/clock";
import { bookCoachingAction } from "@/lib/actions/commerce";
import type { CoachingData } from "@/lib/loaders/commerce";

type Slot = CoachingData["slots"][number];
type Pkg = CoachingData["packages"][number];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (d: Date | string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", o).format(typeof d === "string" ? new Date(d) : d);
const usd = (cents: number, cur = "usd") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase(), maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Idea 2 · Calendar-style booking in the member's own time zone. A month grid where open days are marked,
 * times for the chosen day, and a summary that books (with sessions in hand) or checks out a package.
 */
export function BookCalendar({ slots, credits, packages, mikeTz = "America/Los_Angeles", preview }: { slots: Slot[]; credits: number; packages: Pkg[]; mikeTz?: string; preview?: string | null }) {
  const client = useIsClient();
  const router = useRouter();
  const toast = useToast();
  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    if (!client) return m;
    for (const s of slots) { const k = ymd(new Date(s.starts_at)); m.set(k, [...(m.get(k) ?? []), s]); }
    return m;
  }, [slots, client]);
  const firstOpen = client && slots[0] ? new Date(slots[0].starts_at) : null;
  const [month, setMonth] = useState<{ y: number; m: number } | null>(null);
  const cur = month ?? (firstOpen ? { y: firstOpen.getFullYear(), m: firstOpen.getMonth() } : null);
  const [day, setDay] = useState<string | null>(null);
  const selDay = day ?? (firstOpen ? ymd(firstOpen) : null);
  const [pick, setPick] = useState<Slot | null>(null);
  const buyable = packages.filter((p) => p.price && !p.requires_application);
  const [pkgId, setPkgId] = useState(buyable.find((p) => p.sessions === 1 && p.duration_minutes === 45)?.id ?? buyable[0]?.id ?? "");
  const pkg = buyable.find((p) => p.id === pkgId) ?? null;
  const [pending, start] = useTransition();

  const tz = client ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const cells = useMemo(() => {
    if (!cur) return [];
    const first = new Date(cur.y, cur.m, 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(cur.y, cur.m + 1, 0).getDate();
    return [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, i) => new Date(cur.y, cur.m, i + 1))];
  }, [cur]);
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const k of byDay.keys()) set.add(k.slice(0, 7));
    return [...set].sort();
  }, [byDay]);
  const curKey = cur ? `${cur.y}-${String(cur.m + 1).padStart(2, "0")}` : "";
  const idx = months.indexOf(curKey);
  const go = (dir: -1 | 1) => {
    const k = months[idx + dir];
    if (!k) return;
    const [y, m] = k.split("-").map(Number) as [number, number];
    setMonth({ y, m: m - 1 });
  };
  const times = selDay ? byDay.get(selDay) ?? [] : [];

  const book = () =>
    start(async () => {
      if (!pick) return;
      const r = await bookCoachingAction(pick.id);
      if (r.ok) {
        haptic(14);
        toast("Booked · three quick questions next", { tone: "success", icon: "check" });
        router.push(`/coaching${preview ? `?preview=${preview}` : ""}`);
        router.refresh();
      } else toast(r.message, { icon: "close" });
    });

  if (!client) return <div className="co-book" style={{ minHeight: 520 }} aria-busy />;
  if (!slots.length) return <div className="co-card co-empty"><b>No open times right now</b><p>Mike opens new Tuesday times every week. Message him if you need another day.</p></div>;

  return (
    <div className="co-book">
      <div className="co-card co-cal">
        <div className="co-cal-head">
          <b>{cur ? fmt(new Date(cur.y, cur.m, 1), { month: "long", year: "numeric" }) : ""}</b>
          <div className="co-cal-nav">
            <button type="button" onClick={() => go(-1)} disabled={idx <= 0} aria-label="Previous month"><Icon name="prev" size="sm" /></button>
            <button type="button" onClick={() => go(1)} disabled={idx < 0 || idx >= months.length - 1} aria-label="Next month"><Icon name="next" size="sm" /></button>
          </div>
        </div>
        <div className="co-grid" role="grid" aria-label="Choose a day">
          {WD.map((w) => <span key={w} className="co-wd" aria-hidden>{w}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={`x${i}`} />;
            const k = ymd(d);
            const open = byDay.has(k);
            return (
              <button key={k} type="button" className="co-cell" data-open={open ? "" : undefined} data-today={k === ymd(new Date()) ? "" : undefined} aria-pressed={k === selDay && open} disabled={!open} onClick={() => { haptic(); setDay(k); setPick(null); }} aria-label={`${fmt(d, { weekday: "long", month: "long", day: "numeric" })}${open ? `, ${byDay.get(k)!.length} times open` : ", no times"}`}>
                {d.getDate()}
              </button>
            );
          })}
        </div>
        <div>
          <div className="lq-t15" style={{ fontWeight: 650, marginBottom: 10 }}>{selDay && times[0] ? fmt(times[0].starts_at, { weekday: "long", month: "long", day: "numeric" }) : "Pick a marked day"}</div>
          <div className="co-times" role="radiogroup" aria-label="Time">
            {times.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={pick?.id === s.id} className="co-time" onClick={() => { haptic(); setPick(s); }}>
                {fmt(s.starts_at, { hour: "numeric", minute: "2-digit" })}
              </button>
            ))}
          </div>
        </div>
        <p className="co-tz"><Icon name="compass" size="xs" />Times in your time zone · {tz.replace(/_/g, " ")}</p>
      </div>

      <aside className="co-card co-sum" aria-live="polite">
        <div className="lq-eyebrow" data-tone="accent">Your call</div>
        {credits === 0 && buyable.length > 0 && (
          <div className="co-pkgs" role="radiogroup" aria-label="Package">
            {buyable.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={p.id === pkgId} className="co-pkg" onClick={() => setPkgId(p.id)}>
                <span><b>{p.name}</b><small>{p.sessions > 1 ? `${p.sessions} × ${p.duration_minutes} min` : `${p.duration_minutes} min`}</small></span>
                <span className="co-num" style={{ fontWeight: 650 }}>{usd(p.price!.amountCents, p.price!.currency)}</span>
              </button>
            ))}
          </div>
        )}
        <dl>
          <div><dt>When</dt><dd>{pick ? fmt(pick.starts_at, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Pick a time"}</dd></div>
          {pick && <div><dt>Mike&rsquo;s time</dt><dd className="co-muted">{fmt(pick.starts_at, { hour: "numeric", minute: "2-digit", timeZone: mikeTz, timeZoneName: "short" })}</dd></div>}
          <div><dt>Length</dt><dd>{pick?.duration_minutes ?? 45} min · video</dd></div>
          <div><dt>Uses</dt><dd>{credits > 0 ? `1 of ${credits} session${credits === 1 ? "" : "s"}` : pkg ? usd(pkg.price!.amountCents, pkg.price!.currency) : "—"}</dd></div>
        </dl>
        {credits > 0 ? (
          <Button block size="lg" icon="calendarCheck" onClick={book} disabled={!pick || pending} aria-busy={pending}>{pending ? "Booking…" : "Book this call"}</Button>
        ) : pkg ? (
          <CheckoutButton kind="coaching" refId={pkg.id} label={`Get ${pkg.name.toLowerCase()}`} block size="lg" />
        ) : null}
        <p className="lq-t12 co-faint co-ic"><Icon name="info" size="xs" />{credits > 0 ? "Move or cancel up to 24 hours before and it comes back to you." : "After payment your session is ready to book here."}</p>
      </aside>
    </div>
  );
}
