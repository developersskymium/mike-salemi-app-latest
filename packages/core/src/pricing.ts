/**
 * What a member pays for a program, given their plan's benefits.
 * Mirrors the commerce tables (supabase/migrations/0002_commerce_orgs.sql):
 * `plan_program_benefits` (none | discount | included) and `prices`.
 *
 * Rules: owned → no price; free program → no price; included in the plan → no
 * price; discount → the best (lowest) price; discounts never stack.
 */
import type { AccessState, Uuid } from "./types";

export type BenefitType = "none" | "discount" | "included";
export type BenefitScope = "content" | "retreat" | "coaching";

export interface PlanBenefit {
  planId: string;
  programId: Uuid;
  benefit: BenefitType;
  discountPercent?: number | null;
  scope?: BenefitScope;
}

export interface BasePrice {
  programId: Uuid;
  amountCents: number;
  id?: string;
  label?: string | null;
  currency?: string;
  /** Only one-time program prices are considered for a purchase price. */
  interval?: "one_time" | "month" | "year";
  isActive?: boolean;
}

export interface ResolvedPrice {
  state: AccessState;
  /** What the member pays now; null when they pay nothing (owned / included / free) or no price exists. */
  amountCents: number | null;
  /** The undiscounted price, when there is one. */
  baseCents: number | null;
  discountPercent: number | null;
  /** The price row used, when any. */
  priceId: string | null;
  label: string;
}

export function formatCents(cents: number, currency = "usd"): string {
  const code = currency.toUpperCase();
  const whole = cents % 100 === 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(whole ? 0 : 2)} ${code}`;
  }
}

/** Discounted amount, rounded to the nearest cent. */
export function applyDiscount(amountCents: number, percent: number): number {
  return Math.max(0, Math.round((amountCents * (100 - percent)) / 100));
}

export function resolvePrice(input: {
  programId: Uuid;
  basePrices: readonly BasePrice[];
  planId?: string | null;
  benefits: readonly PlanBenefit[];
  owned?: boolean;
  isFree?: boolean;
  /** Access through an organization seat. */
  org?: boolean;
  scope?: BenefitScope;
}): ResolvedPrice {
  const none = (state: AccessState, label: string): ResolvedPrice => ({
    state,
    amountCents: null,
    baseCents: null,
    discountPercent: null,
    priceId: null,
    label,
  });
  if (input.owned) return none("owned", "Owned");
  if (input.org) return none("org", "Included with your organization");
  if (input.isFree) return none("free", "Free");

  const scope = input.scope ?? "content";
  const benefits = input.planId
    ? input.benefits.filter(
        (b) => b.planId === input.planId && b.programId === input.programId && (b.scope ?? "content") === scope,
      )
    : [];
  if (benefits.some((b) => b.benefit === "included")) return none("included", "Included in your plan");

  const prices = input.basePrices.filter(
    (p) => p.programId === input.programId && p.isActive !== false && (p.interval ?? "one_time") === "one_time",
  );
  if (!prices.length) return none("locked", "Not available");
  const base = prices.reduce((best, p) => (p.amountCents < best.amountCents ? p : best));
  const currency = base.currency ?? "usd";

  // Never stack: the single best discount applies once to the best base price.
  const percent = benefits
    .filter((b) => b.benefit === "discount" && b.discountPercent)
    .reduce((max, b) => Math.max(max, Math.min(100, b.discountPercent!)), 0);
  if (percent > 0) {
    const amount = applyDiscount(base.amountCents, percent);
    return {
      state: "locked",
      amountCents: amount,
      baseCents: base.amountCents,
      discountPercent: percent,
      priceId: base.id ?? null,
      label: `${formatCents(amount, currency)} (${percent}% off ${formatCents(base.amountCents, currency)})`,
    };
  }
  return {
    state: "locked",
    amountCents: base.amountCents,
    baseCents: base.amountCents,
    discountPercent: null,
    priceId: base.id ?? null,
    label: formatCents(base.amountCents, currency),
  };
}

/** Comparable strength of a benefit: none < any discount (by percent) < included. */
export function benefitStrength(b: Pick<PlanBenefit, "benefit" | "discountPercent"> | undefined): number {
  if (!b || b.benefit === "none") return 0;
  if (b.benefit === "included") return 101;
  return Math.min(100, Math.max(0, b.discountPercent ?? 0));
}

export interface PlanBenefits {
  planId: string;
  rank: number;
  benefits: readonly PlanBenefit[];
}

/** Every case where a higher-ranked plan gets a worse benefit than a lower one. */
export function planRankProblems(plans: readonly PlanBenefits[]): string[] {
  const sorted = [...plans].sort((a, b) => a.rank - b.rank);
  const key = (b: PlanBenefit) => `${b.programId}|${b.scope ?? "content"}`;
  const keys = new Set(sorted.flatMap((p) => p.benefits.map(key)));
  const problems: string[] = [];
  for (const k of keys) {
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const lower = sorted[i]!;
        const higher = sorted[j]!;
        if (higher.rank === lower.rank) continue;
        const lo = benefitStrength(lower.benefits.find((b) => key(b) === k));
        const hi = benefitStrength(higher.benefits.find((b) => key(b) === k));
        if (hi < lo) problems.push(`${higher.planId} gets less than ${lower.planId} on ${k}`);
      }
    }
  }
  return problems;
}

/** True when higher plans never get worse benefits than lower plans. */
export function planRankOk(plans: readonly PlanBenefits[]): boolean {
  return planRankProblems(plans).length === 0;
}
