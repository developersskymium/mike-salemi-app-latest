"use client";

import { useMemo, useState } from "react";
import type { PricingPlan } from "@ms/api";
import { Button, Icon, Segmented, Tag } from "@/components/ui";
import { money } from "../access";
import { Draft, Photo } from "./Pieces";
import { photoFor } from "./photos";
import { isDraftPlan, monthly, yearly, type PlanValue } from "./value";

type Interval = "month" | "year";

export function planPrice(p: PricingPlan, interval: Interval) {
  return p.prices.find((x) => x.interval === interval) ?? null;
}

/** Lines a plan card shows, from the plan × program benefits grid. */
export function planLines(p: PricingPlan) {
  const included = p.benefits.filter((b) => b.benefit === "included" && b.scope === "content");
  const discounts = p.benefits.filter((b) => b.benefit === "discount" && b.discountPercent);
  const credits = p.benefits.filter((b) => b.coachingCredits);
  return [
    ...included.map((b) => ({ kind: "included", icon: "check" as const, text: b.programName })),
    ...discounts.map((b) => ({ kind: "discount", icon: "sparkle" as const, text: `${b.discountPercent}% off ${b.programName}` })),
    ...credits.map((b) => ({ kind: "credit", icon: "people" as const, text: `${b.coachingCredits} coaching ${b.coachingCredits === 1 ? "credit" : "credits"}` })),
    ...p.features.map((f) => ({ kind: "feature", icon: "check" as const, text: f })),
  ];
}

/** Value meter: the plan's yearly price beside what its programs cost bought one by one. */
export function ValueMeter({ plan, value }: { plan: PricingPlan; value: PlanValue }) {
  const y = yearly(plan);
  if (!y) return null;
  if (!value.worth && !value.savings) return null;
  const max = Math.max(value.worth, y.amountCents, 1);
  return (
    <div className="pub-meter">
      {value.worth > 0 && (
        <>
          <div className="pub-meter-row">
            <span>Bought separately</span>
            <span className="pub-meter-bar" aria-hidden>
              {value.priced.map((p) => (
                <i key={p.id} style={{ width: `${(p.cents / max) * 100}%` }} title={`${p.name} ${money(p.cents)}`} />
              ))}
            </span>
            <b>{money(value.worth)}{value.planOnly.length ? "+" : ""}</b>
          </div>
          <div className="pub-meter-row">
            <span>{plan.name}, a year</span>
            <span className="pub-meter-bar" data-tone="plan" aria-hidden>
              <i style={{ width: `${(y.amountCents / max) * 100}%` }} />
            </span>
            <b>{money(y.amountCents, y.currency)}</b>
          </div>
        </>
      )}
      {value.savings > 0 && (
        <p className="pub-meter-save">
          <Icon name="sparkle" size="xs" /> Saves {money(value.savings)} on {value.discounts.map((d) => d.name.split(":")[0]).join(" and ")}
        </p>
      )}
      {value.planOnly.length > 0 && <p className="pub-meter-note">{value.planOnly.join(" and ")} {value.planOnly.length === 1 ? "is" : "are"} only available with a plan.</p>}
    </div>
  );
}

/** Plans grid with a monthly / yearly switch, value meters, and the top plan as the one primary action. */
export function PlansGrid({ plans, values, compact, signedIn, recommended }: { plans: PricingPlan[]; values?: Record<string, PlanValue>; compact?: boolean; signedIn?: boolean; recommended?: string | null }) {
  const [interval, setIv] = useState<Interval>("year");
  const top = plans.reduce((a, b) => (b.rank > a.rank ? b : a), plans[0]!);
  const yearlySaving = (() => {
    const p = plans.find((x) => monthly(x) && yearly(x));
    if (!p) return null;
    const m = monthly(p)!.amountCents * 12;
    const y = yearly(p)!.amountCents;
    return m > y ? Math.round((1 - y / m) * 100) : null;
  })();
  const draft = plans.map(isDraftPlan).find(Boolean) ?? null;

  return (
    <div>
      <div className="pub-plans-top">
        <Segmented
          label="Billing period"
          options={[
            { value: "month", label: "Monthly" },
            { value: "year", label: yearlySaving ? `Yearly · save ${yearlySaving}%` : "Yearly" },
          ]}
          value={interval}
          onChange={setIv}
        />
      </div>
      <div className="pub-plans" style={{ "--n": plans.length } as React.CSSProperties}>
        {plans.map((p) => {
          const price = planPrice(p, interval);
          const lines = planLines(p);
          const shown = compact ? lines.slice(0, 4) : lines;
          const isTop = p.id === top.id;
          const isRec = recommended === p.id;
          const href = signedIn ? (p.prices.length ? `/you/billing?plan=${p.id}&interval=${interval}` : "/today") : `/signup?plan=${encodeURIComponent(p.name.toLowerCase())}`;
          const perMonth = interval === "year" && price ? Math.round(price.amountCents / 12) : null;
          return (
            <article key={p.id} className="pub-plan" data-top={isTop && !recommended ? "" : undefined} data-rec={isRec ? "" : undefined} aria-label={`${p.name} plan`}>
              {(isRec || (isTop && !recommended)) && (
                <span className="pub-plan-flag">
                  <Tag tone={isRec ? "warm" : "accent"}>{isRec ? "Best fit for you" : "Everything"}</Tag>
                </span>
              )}
              <div className="pub-plan-head">
                <h3 className="lq-d-sm">{p.name}</h3>
                <Draft note={isDraftPlan(p)} />
              </div>
              {p.tagline && <p className="pub-plan-tag">{p.tagline}</p>}
              <div className="pub-plan-price">
                <b>{money(price?.amountCents ?? 0, price?.currency)}</b>
                <span>{price ? `/${interval === "month" ? "month" : "year"}` : "forever"}</span>
              </div>
              <p className="pub-plan-sub">{perMonth ? `${money(perMonth)} a month, billed yearly` : price ? "Billed monthly, cancel any time" : "No card needed"}</p>
              {!compact && values?.[p.id] && <ValueMeter plan={p} value={values[p.id]!} />}
              <ul className="pub-plan-lines">
                {shown.map((l) => (
                  <li key={l.text} data-kind={l.kind}>
                    <Icon name={l.icon} size="xs" />
                    <span>{l.text}</span>
                  </li>
                ))}
                {compact && lines.length > shown.length && <li className="more">and {lines.length - shown.length} more</li>}
              </ul>
              <Button href={href} variant={isRec || (isTop && !recommended) ? "filled" : "secondary"} size="md" block>
                {p.prices.length ? `Choose ${p.name}` : signedIn ? "Open the app" : "Start free"}
              </Button>
            </article>
          );
        })}
      </div>
      {draft && (
        <p className="pub-plans-note lq-t13 lq-c2">
          <Draft note={draft} /> Preview pricing. Plan names and prices are being finalised; checkout always shows the final price.
        </p>
      )}
    </div>
  );
}

type Pickable = { id: string; slug: string; name: string; listCents: number | null };

/** "What do you want to train?" → the lightest plan that covers it, beside buying the programs alone. */
export function PricingExplorer({ plans, values, pickable, signedIn }: { plans: PricingPlan[]; values: Record<string, PlanValue>; pickable: Pickable[]; signedIn: boolean }) {
  const [picked, setPicked] = useState<string[]>(pickable[0] ? [pickable[0].id] : []);
  const paid = useMemo(() => plans.filter((p) => p.prices.length).sort((a, b) => (yearly(a)?.amountCents ?? 0) - (yearly(b)?.amountCents ?? 0)), [plans]);
  const covers = (p: PricingPlan, id: string) => p.benefits.some((b) => b.programId === id && b.benefit === "included");
  const fit = picked.length ? paid.find((p) => picked.every((id) => covers(p, id))) ?? null : null;
  const chosen = pickable.filter((x) => picked.includes(x.id));
  const alone = chosen.filter((x) => x.listCents != null);
  const aloneTotal = alone.reduce((n, x) => n + (x.listCents ?? 0), 0);
  const notSold = chosen.filter((x) => x.listCents == null);
  const y = fit ? yearly(fit) : null;
  const toggle = (id: string) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <section className="pub-recm" aria-labelledby="recm-title">
        <div>
          <p className="lq-eyebrow" data-tone="warm">Plan finder</p>
          <h2 id="recm-title" className="lq-d-md" style={{ margin: "10px 0 0" }}>What do you want to train?</h2>
          <p className="lq-t15 lq-c2" style={{ margin: "8px 0 0" }}>Pick the programs you want. We&rsquo;ll show the lightest plan that covers them, and what they cost on their own.</p>
          <div className="pub-recm-picks">
            {pickable.map((x) => (
              <button key={x.id} type="button" className="pub-pick" aria-pressed={picked.includes(x.id)} onClick={() => toggle(x.id)}>
                <Photo p={photoFor(x.slug)} sizes="32px" />
                {x.name.split(":")[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="pub-recm-out" aria-live="polite">
          {!picked.length ? (
            <p>Pick at least one program to see your best fit.</p>
          ) : fit && y ? (
            <>
              <Tag tone="warm">Best fit</Tag>
              <h3 className="lq-d-sm">
                {fit.name} · {money(y.amountCents, y.currency)}/year <Draft note={isDraftPlan(fit)} />
              </h3>
              <p>
                Covers {chosen.map((x) => x.name.split(":")[0]).join(", ")}
                {values[fit.id]?.savings ? `, plus ${values[fit.id]!.discounts.map((d) => `${d.pct}% off ${d.name.split(":")[0]}`).join(" and ")}` : ""}.
              </p>
              {aloneTotal > 0 && <div className="pub-meter">
                <div className="pub-meter-row">
                  <span>On their own</span>
                  <span className="pub-meter-bar" aria-hidden>
                    <i style={{ width: `${(aloneTotal / Math.max(aloneTotal, y.amountCents, 1)) * 100}%` }} />
                  </span>
                  <b>{aloneTotal ? money(aloneTotal) : "—"}{notSold.length ? "+" : ""}</b>
                </div>
                <div className="pub-meter-row">
                  <span>{fit.name}, a year</span>
                  <span className="pub-meter-bar" data-tone="plan" aria-hidden>
                    <i style={{ width: `${(y.amountCents / Math.max(aloneTotal, y.amountCents, 1)) * 100}%` }} />
                  </span>
                  <b>{money(y.amountCents, y.currency)}</b>
                </div>
              </div>}
              {notSold.length > 0 && <p className="pub-meter-note">{notSold.map((x) => x.name.split(":")[0]).join(" and ")} {notSold.length === 1 ? "is" : "are"} only available with a plan.</p>}
              <div className="pub-rec-actions">
                <Button href={signedIn ? `/you/billing?plan=${fit.id}&interval=year` : `/signup?plan=${encodeURIComponent(fit.name.toLowerCase())}`} size="md">Choose {fit.name}</Button>
                {alone.length === 1 && notSold.length === 0 && (
                  <Button href={`/explore/${alone[0]!.slug}`} size="md" variant="secondary">Or buy it alone · {money(alone[0]!.listCents!)}</Button>
                )}
              </div>
            </>
          ) : (
            <p>No single plan covers all of these yet. Start with the program you want most, or compare the plans below.</p>
          )}
        </div>
      </section>
      <div style={{ marginTop: 40 }}>
        <PlansGrid plans={plans} values={values} signedIn={signedIn} recommended={fit?.id ?? null} />
      </div>
    </>
  );
}
