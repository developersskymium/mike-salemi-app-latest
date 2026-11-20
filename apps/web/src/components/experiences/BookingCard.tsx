import { Button, Glass, Icon } from "@/components/ui";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { DraftChip } from "@/components/commerce/DraftChip";
import { money } from "@/components/commerce/format";
import type { RunHub } from "@/lib/loaders/commerce";
import { retreatSteps, type RetreatStage } from "@/lib/retreat-stage";
import { CallPicker } from "./CallPicker";
import { RetreatSteps } from "./RetreatSteps";

const day = (iso: string, tz: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz }).format(new Date(iso));
const callWhen = (iso: string, tz: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz, timeZoneName: "short" }).format(new Date(iso));

export function priceOf(hub: RunHub) {
  const q = hub.quote;
  const cents = q && q.state === "purchasable" ? q.amount_cents : hub.price?.amountCents ?? (q?.base_cents || null);
  return cents ? { label: money(cents, q?.currency ?? hub.price?.currency ?? "usd"), compare: hub.run.details.price_compare_label ?? null, draft: hub.price?.draftNote ?? null } : null;
}

/** Airbnb-style sticky booking card: price, dates, group, then the one next step for the member's stage. */
export function BookingCard({ hub, stage }: { hub: RunHub; stage: RetreatStage }) {
  const { run } = hub;
  const a = hub.application;
  const price = priceOf(hub);
  const steps = retreatSteps(stage, a?.call_at ? callWhen(a.call_at, run.timezone) : null);
  const applyHref = `/experiences/${run.id}/apply`;

  return (
    <Glass radius="card" className="rt-book" aria-labelledby="book-h">
      <div className="rt-book-price">
        {price ? (
          <>
            <span id="book-h" className="rt-book-amount lq-num">{price.label}</span>
            {price.compare && <s className="lq-t15 lq-c3 lq-num">{price.compare}</s>}
            <span className="lq-t13 lq-c2">per man</span>
            <DraftChip note={price.draft} />
          </>
        ) : (
          <span id="book-h" className="lq-d-sm">{run.price_note ?? "By application"}</span>
        )}
      </div>

      <dl className="rt-book-dates">
        <div><dt>Arrive</dt><dd className="lq-num">{day(run.starts_at, run.timezone)}</dd></div>
        <div><dt>Depart</dt><dd className="lq-num">{run.ends_at ? day(run.ends_at, run.timezone) : "—"}</dd></div>
        <div className="rt-book-wide"><dt>Group</dt><dd>{run.capacity ? `${run.capacity} men maximum` : "Small group"}{run.details.duration_label ? ` · ${run.details.duration_label}` : ""}</dd></div>
      </dl>

      {stage === "sales" && (
        <>
          <Button block size="lg" variant="filled" href={applyHref} iconAfter="arrowRight">{run.status === "waitlist" ? "Join the waitlist" : "Apply"}</Button>
          <p className="rt-book-note">You won&rsquo;t be charged yet. Almost every man who applies is accepted.</p>
        </>
      )}
      {stage === "closed" && (
        <>
          <Button block size="lg" variant="fill" disabled>{run.status === "past" ? "This retreat has happened" : "Applications closed"}</Button>
          <p className="rt-book-note">New dates are announced here first.</p>
        </>
      )}

      <div className="rt-book-steps">
        <div className="rt-book-kicker">{stage === "sales" || stage === "closed" ? "How it comes together" : "Your place"}</div>
        <RetreatSteps steps={steps} />
      </div>

      {(stage === "applied" || stage === "call") && a && (
        <div className="rt-book-act" id="call">
          <div className="lq-t15" style={{ fontWeight: 650 }}>{stage === "call" ? "Your call" : "Pick a time for your call"}</div>
          {stage === "applied" && <p className="lq-t13 lq-c2">A relaxed video call with Mike&rsquo;s team: what&rsquo;s calling you, your health, travel. Then Mike decides.</p>}
          <CallPicker runId={run.id} slots={hub.callSlots} callAt={a.call_at} callUrl={a.call_url} />
        </div>
      )}
      {stage === "review" && (
        <div className="rt-book-msg" data-tone="warm" role="status">
          <Icon name="clock" size="sm" />
          <div><b>Mike is reviewing</b><p>Thanks for the call. You&rsquo;ll hear back within a few days, here and by email.</p></div>
        </div>
      )}
      {stage === "pay" && (
        <div className="rt-book-act" id="pay">
          <div className="rt-book-msg" data-tone="ok" role="status">
            <Icon name="check" size="sm" />
            <div><b>You&rsquo;re approved</b><p>Confirm your place to open your retreat hub: countdown, preparation, travel and the group.</p></div>
          </div>
          {hub.quote?.state === "purchasable" && (
            <div className="rt-book-total">
              <span>Total</span>
              <span className="lq-num">{money(hub.quote.amount_cents, hub.quote.currency)}{hub.quote.discount_cents > 0 && <s className="lq-c3"> {money(hub.quote.base_cents, hub.quote.currency)}</s>}</span>
            </div>
          )}
          <CheckoutButton kind="run" refId={run.id} label="Pay and confirm your place" block size="lg" />
          <p className="rt-book-note"><Icon name="lock" size="xs" /> Secure checkout with Stripe</p>
        </div>
      )}
      {stage === "waitlist" && (
        <div className="rt-book-msg" role="status"><Icon name="clock" size="sm" /><div><b>You&rsquo;re on the waitlist</b><p>You&rsquo;ll be first to hear when a place opens or the next dates land.</p></div></div>
      )}
      {stage === "declined" && (
        <div className="rt-book-msg" role="status"><Icon name="info" size="sm" /><div><b>Not this time</b><p>This retreat isn&rsquo;t the right fit right now. Mike&rsquo;s team will be in touch about other ways to work together.</p></div></div>
      )}

      {stage === "sales" && (
        <ul className="rt-book-trust" role="list">
          <li><Icon name="people" size="xs" />Capped at {run.capacity ?? 20} men</li>
          <li><Icon name="sparkle" size="xs" />Preparation program included</li>
        </ul>
      )}
    </Glass>
  );
}

/** Phone: Airbnb's bottom bar (price + one action). */
export function BookingBar({ hub, stage }: { hub: RunHub; stage: RetreatStage }) {
  const price = priceOf(hub);
  const href = stage === "sales" ? `/experiences/${hub.run.id}/apply` : stage === "pay" ? "#pay" : stage === "applied" || stage === "call" ? "#call" : null;
  const label = stage === "sales" ? "Apply" : stage === "pay" ? "Confirm place" : stage === "applied" ? "Pick a call" : stage === "call" ? "Your call" : null;
  return (
    <div className="rt-bar">
      <div className="com-grow">
        {price ? <div className="lq-t17 lq-num" style={{ fontWeight: 750 }}>{price.label} {price.compare && <s className="lq-t13 lq-c3">{price.compare}</s>}</div> : <div className="lq-t15">{hub.run.price_note}</div>}
        <div className="lq-t12 lq-c2 lq-num">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: hub.run.timezone }).format(new Date(hub.run.starts_at))} – {hub.run.ends_at ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: hub.run.timezone }).format(new Date(hub.run.ends_at)) : ""}{price?.draft ? " · Draft" : ""}</div>
      </div>
      {href && label ? <Button href={href} variant="filled" size="md">{label}</Button> : null}
    </div>
  );
}
