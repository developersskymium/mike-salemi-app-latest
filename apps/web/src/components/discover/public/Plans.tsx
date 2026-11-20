"use client";

import { useState } from "react";
import type { PricingPlan } from "@ms/api";
import { Button, Chip, Glass, Icon, Segmented } from "@/components/ui";
import { money } from "../access";

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
    ...included.map((b) => ({ icon: "check" as const, text: b.programName })),
    ...discounts.map((b) => ({ icon: "sparkle" as const, text: `${b.discountPercent}% off ${b.programName}` })),
    ...credits.map((b) => ({ icon: "people" as const, text: `${b.coachingCredits} coaching ${b.coachingCredits === 1 ? "credit" : "credits"}` })),
    ...p.features.map((f) => ({ icon: "check" as const, text: f })),
  ];
}

/** Plans grid with a monthly / yearly switch. The top plan carries the one primary action. */
export function PlansGrid({ plans, compact, signedIn }: { plans: PricingPlan[]; compact?: boolean; signedIn?: boolean }) {
  const [interval, setIv] = useState<Interval>("month");
  const top = plans.reduce((a, b) => (b.rank > a.rank ? b : a), plans[0]!);
  const yearlySaving = (() => {
    const p = plans.find((x) => planPrice(x, "month") && planPrice(x, "year"));
    if (!p) return null;
    const m = planPrice(p, "month")!.amountCents * 12;
    const y = planPrice(p, "year")!.amountCents;
    return m > y ? Math.round((1 - y / m) * 100) : null;
  })();
  const draft = plans.some((p) => p.draftNote || p.prices.some((x) => x.draftNote));

  return (
    <div className="dsc-plans-wrap">
      <div className="dsc-plans-switch">
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
      <div className="dsc-plans" data-compact={compact ? "" : undefined}>
        {plans.map((p) => {
          const price = planPrice(p, interval);
          const lines = planLines(p);
          const shown = compact ? lines.slice(0, 4) : lines;
          const primary = p.id === top.id;
          const href = signedIn ? (p.prices.length ? `/you/billing?plan=${p.id}&interval=${interval}` : "/today") : `/signup?plan=${p.id}`;
          return (
            <Glass key={p.id} radius="card" className="dsc-plan" data-top={primary ? "" : undefined}>
              <div className="dsc-plan-head">
                <h3 className="lq-t22">{p.name}</h3>
                {primary && <Chip variant="tint">Everything</Chip>}
              </div>
              {p.tagline && <p className="lq-t13 lq-c2">{p.tagline}</p>}
              <div className="dsc-plan-price">
                {price ? (
                  <>
                    <span className="lq-t34 lq-num">{money(price.amountCents, price.currency)}</span>
                    <span className="lq-t15 lq-c2">/{interval === "month" ? "mo" : "yr"}</span>
                  </>
                ) : (
                  <>
                    <span className="lq-t34 lq-num">{money(0)}</span>
                    <span className="lq-t15 lq-c2">forever</span>
                  </>
                )}
              </div>
              <ul className="dsc-plan-lines">
                {shown.map((l) => (
                  <li key={l.text} className="lq-t15">
                    <Icon name={l.icon} size="xs" className={l.icon === "check" ? "" : "lq-c2"} />
                    <span>{l.text}</span>
                  </li>
                ))}
                {compact && lines.length > shown.length && <li className="lq-t13 lq-c2">and {lines.length - shown.length} more</li>}
              </ul>
              <Button href={href} variant={primary ? "filled" : "glass"} size="md" block className="dsc-plan-cta">
                {p.prices.length ? `Choose ${p.name}` : signedIn ? "Open the app" : "Start free"}
              </Button>
            </Glass>
          );
        })}
      </div>
      {draft && <p className="lq-t12 lq-c3 dsc-plans-note">Preview pricing. Final prices are confirmed at checkout.</p>}
    </div>
  );
}
