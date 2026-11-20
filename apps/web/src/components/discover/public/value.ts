import type { PricingPlan } from "@ms/api";
import type { ListPrice } from "@/lib/loaders/public";

/**
 * Plan value for the meters: what the plan's included programs cost when bought one by one
 * (from their active list prices), which ones are only available with a plan, and what the
 * plan's discounts save. Display only: checkout prices always come from the server quote.
 */
export type PlanValue = {
  worth: number;
  priced: { id: string; name: string; cents: number }[];
  planOnly: string[];
  discounts: { id: string; name: string; pct: number; cents: number }[];
  savings: number;
};

export function planValue(plan: PricingPlan, prices: ListPrice[], freeIds: Set<string>): PlanValue {
  const byId = new Map(prices.map((p) => [p.programId, p]));
  const included = plan.benefits.filter((b) => b.benefit === "included" && b.scope === "content" && !freeIds.has(b.programId));
  const priced = included.flatMap((b) => {
    const lp = byId.get(b.programId);
    return lp ? [{ id: b.programId, name: b.programName, cents: lp.amountCents }] : [];
  });
  const planOnly = included.filter((b) => !byId.has(b.programId)).map((b) => b.programName);
  const discounts = plan.benefits.flatMap((b) => {
    const lp = byId.get(b.programId);
    return b.benefit === "discount" && b.discountPercent && lp ? [{ id: b.programId, name: b.programName, pct: b.discountPercent, cents: Math.round((lp.amountCents * b.discountPercent) / 100) }] : [];
  });
  return {
    worth: priced.reduce((n, p) => n + p.cents, 0),
    priced,
    planOnly,
    discounts,
    savings: discounts.reduce((n, d) => n + d.cents, 0),
  };
}

export const yearly = (p: PricingPlan) => p.prices.find((x) => x.interval === "year") ?? null;
export const monthly = (p: PricingPlan) => p.prices.find((x) => x.interval === "month") ?? null;
export const isDraftPlan = (p: PricingPlan) => p.draftNote ?? p.prices.find((x) => x.draftNote)?.draftNote ?? null;

/** Programs the free plan includes are free for everyone: they never count as plan value. */
export function freeProgramIds(plans: PricingPlan[]) {
  return new Set(plans.filter((p) => !p.prices.length).flatMap((p) => p.benefits.filter((b) => b.benefit === "included").map((b) => b.programId)));
}
