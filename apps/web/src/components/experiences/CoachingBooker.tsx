"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Chip, Glass, Icon, Sheet, haptic, useToast } from "@/components/ui";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { applyForCoachingAction, bookCoachingAction } from "@/lib/actions/commerce";
import type { CoachingData } from "@/lib/loaders/commerce";
import { SlotPicker, slotWhen, useMounted, type PickSlot } from "./SlotPicker";

type Pkg = CoachingData["packages"][number];

export const pkgLines = (d: string | null) => {
  const lines = (d ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  return { intro: lines.filter((l) => !l.startsWith("- ")).join(" "), bullets: lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2)) };
};
export const usd = (cents: number, cur = "usd") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase(), maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

/**
 * Legacy L28 steps, in one flow: (1) choose a package → (2) pick a Tuesday time → (3) what to work on + the
 * booking summary. With sessions in hand it books straight away; without, it checks out the package first.
 */
export function CoachingBooker({ packages, slots, credits, recommended }: { packages: Pkg[]; slots: PickSlot[]; credits: number; recommended?: string }) {
  const mounted = useMounted();
  const router = useRouter();
  const toast = useToast();
  const buyable = packages.filter((p) => p.price && !p.requires_application);
  const [pkgId, setPkgId] = useState(recommended && buyable.some((p) => p.id === recommended) ? recommended : buyable[0]?.id ?? "");
  const pkg = buyable.find((p) => p.id === pkgId) ?? null;
  const [pick, setPick] = useState<PickSlot | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  const book = () =>
    start(async () => {
      if (!pick) return;
      const r = await bookCoachingAction(pick.id, note || undefined);
      if (r.ok) {
        haptic(14);
        setDone(slotWhen(pick.starts_at, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }));
        toast("Booked", { tone: "success", icon: "check" });
        setPick(null);
        setNote("");
        router.refresh();
      } else toast(r.message, { icon: "close" });
    });

  const pkgSection = (
      <section id="packages" className="ch-sec" aria-labelledby="s1">
        <header className="ch-sec-head">
          <div><div className="lq-eyebrow" data-tone="accent">{credits > 0 ? "More sessions" : "Step one"}</div><h2 id="s1" className="lq-d-sm">{credits > 0 ? "Top up with a package" : "Choose a package"}</h2></div>
          {credits > 0 && <Chip variant="ok" icon="check">{credits} session{credits === 1 ? "" : "s"} ready to book</Chip>}
        </header>
        <div className="ch-pkgs" role="radiogroup" aria-label="Package">
          {buyable.map((p) => {
            const { intro, bullets } = pkgLines(p.description);
            const on = p.id === pkgId;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} className="ch-pkg lq-press" onClick={() => { haptic(); setPkgId(p.id); }}>
                <span className="ch-pkg-top">
                  <span className="lq-d-xs">{p.name}</span>
                  {p.id === recommended ? <Chip variant="accent" size="sm">Recommended</Chip> : <span className="ch-radio" aria-hidden />}
                </span>
                <span className="ch-pkg-price"><b className="lq-num">{usd(p.price!.amountCents, p.price!.currency)}</b>{p.price!.draftNote && <span className="ch-draft" title={p.price!.draftNote}>Draft</span>}</span>
                <span className="lq-t13 lq-c2 ch-ic"><Icon name="clock" size="xs" />{p.sessions > 1 ? `${p.sessions} × ${p.duration_minutes} min` : `${p.duration_minutes} minutes`}</span>
                {intro && <span className="lq-t13 lq-c2">{intro}</span>}
                {bullets.length > 0 && <span className="ch-pkg-list">{bullets.map((b) => <span key={b}><Icon name="check" size="xs" />{b}</span>)}</span>}
              </button>
            );
          })}
        </div>
      </section>
  );
  const bookSection = (
      <section id="book" className="ch-sec" aria-labelledby="s2">
        <header className="ch-sec-head"><div><div className="lq-eyebrow" data-tone="accent">{credits > 0 ? "Book" : "Step two and three"}</div><h2 id="s2" className="lq-d-sm">Pick a time and your focus</h2></div></header>
        <div className="ch-book">
          <Glass radius="card" className="ch-book-pick">
            <div className="lq-t15" style={{ fontWeight: 600 }}>Mike&rsquo;s coaching day is Tuesday</div>
            <SlotPicker slots={slots} value={pick?.id ?? null} onChange={setPick} />
            <label className="ch-field">
              <span>What do you want to work on?</span>
              <textarea className="com-input" rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Physical: my press stalls at 24 kg. Inner: I lose focus by mid-afternoon and want a reset." />
              <span className="lq-t12 lq-c3">You can add goals and a footage link after booking. {note.length}/1000</span>
            </label>
          </Glass>
          <Glass radius="card" className="ch-summary" aria-live="polite">
            <div className="lq-eyebrow">Your booking</div>
            <dl>
              <div><dt>Package</dt><dd>{credits > 0 ? "From your sessions" : pkg?.name ?? "Choose one"}</dd></div>
              <div><dt>When</dt><dd className="lq-num">{pick && mounted ? slotWhen(pick.starts_at) : "Pick a Tuesday time"}</dd></div>
              <div><dt>Length</dt><dd className="lq-num">{pick?.duration_minutes ?? 45} min</dd></div>
              <div className="ch-total"><dt>Total</dt><dd className="lq-num">{credits > 0 ? `1 of ${credits} session${credits === 1 ? "" : "s"}` : pkg ? usd(pkg.price!.amountCents, pkg.price!.currency) : "—"}</dd></div>
            </dl>
            {credits > 0 ? (
              <Button block size="lg" icon="calendarCheck" onClick={book} disabled={!pick || pending} aria-busy={pending}>{pending ? "Booking…" : "Book this session"}</Button>
            ) : pkg ? (
              <CheckoutButton kind="coaching" refId={pkg.id} label={`Get ${pkg.name.toLowerCase()}`} block size="lg" />
            ) : null}
            <p className="lq-t12 lq-c2 ch-ic"><Icon name="calendar" size="xs" />{credits > 0 ? "Move or cancel up to 24 hours before and the session comes back." : "Your sessions appear here after payment, ready to book."}</p>
            {done && <p className="ch-done" role="status"><Icon name="check" size="xs" />Booked for {done}. Add your prep above.</p>}
          </Glass>
        </div>
      </section>
  );
  return credits > 0 ? <>{bookSection}{pkgSection}</> : <>{pkgSection}{bookSection}</>;
}

/** Executive Edge: by application. Short form in a sheet; shows where the application stands afterwards. */
export function ExecutiveApply({ packageId, status }: { packageId: string; status: string | null }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(status);
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [pressure, setPressure] = useState("");
  const [commit, setCommit] = useState(false);
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const r = await applyForCoachingAction(packageId, { role, goal, pressure, commit: commit as true });
      if (r.ok) {
        setState(r.data.status);
        setOpen(false);
        toast("Application sent", { tone: "success", icon: "check" });
      } else toast(r.message, { icon: "close" });
    });
  if (state && state !== "declined" && state !== "cancelled") {
    const label: Record<string, string> = { submitted: "Application received: Mike reviews it and books a short call", call_booked: "Call booked with Mike", accepted: "Accepted: Mike will send your start date" };
    return <p className="ch-ee-status ch-ic" role="status"><Icon name={state === "accepted" ? "check" : "clock"} size="sm" />{label[state] ?? "Application received"}</p>;
  }
  return (
    <>
      <Button variant="white" size="lg" iconAfter="arrowRight" onClick={() => setOpen(true)}>Apply for Executive Edge</Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Apply for Executive Edge"
        description="Four questions. Nothing is charged; Mike reads every application and books a short call."
        footer={<Button block size="lg" onClick={submit} disabled={pending || !commit || role.trim().length < 2 || goal.trim().length < 10} aria-busy={pending}>{pending ? "Sending…" : "Send application"}</Button>}
      >
        <div className="ch-form">
          <label className="ch-field"><span>What do you do?</span><input className="com-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Founder, 40 people; two kids" /></label>
          <label className="ch-field"><span>What do you want from the eight weeks?</span><textarea className="com-input" rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Sharper focus, more energy in the afternoon, and a body that keeps up." /></label>
          <label className="ch-field"><span>Where does the pressure land on you? <i>optional</i></span><textarea className="com-input" rows={3} value={pressure} onChange={(e) => setPressure(e.target.value)} /></label>
          <button type="button" role="checkbox" aria-checked={commit} className="exp-option" onClick={() => setCommit(!commit)}>
            <span className="exp-tick" aria-hidden style={{ borderRadius: 7 }}><svg viewBox="0 0 24 24"><path d="M5.5 12.5 10 17l8.5-9.5" /></svg></span>
            <span className="com-grow">I can give five minutes a day to the homework, every day for eight weeks.</span>
          </button>
        </div>
      </Sheet>
    </>
  );
}
