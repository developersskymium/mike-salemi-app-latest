import type { DB } from "./client";

/** What can be bought. `ref` is a plan id, program uuid/slug, bundle uuid/slug, run uuid or coaching package uuid. */
export type PurchaseKind = "plan" | "program" | "bundle" | "run" | "coaching";
export type BillingInterval = "one_time" | "month" | "year";
export type QuoteState = "included" | "owned" | "free" | "purchasable" | "unavailable";

/** Server-computed price for the signed-in member (base price when signed out). See `public.quote` in 0007_commerce.sql. */
export interface Quote {
  kind: PurchaseKind;
  ref: string;
  name: string | null;
  interval: BillingInterval;
  state: QuoteState;
  /** Why it is unavailable: not_found | no_price | run_not_open | application_required | unknown_kind */
  reason: string | null;
  currency: string;
  base_cents: number;
  discount_cents: number;
  /** Credit from recent one-off purchases, off the first plan payment, after the discount (0041). Missing before 0041. */
  credit_cents?: number;
  amount_cents: number;
  /** 'pro:discount:20' | 'coupon:CODE' | 'max:included' | null */
  benefit_applied: string | null;
  coupon_id: string | null;
  /** invalid_coupon | coupon_not_applicable */
  coupon_error: string | null;
  price_id: string | null;
  stripe_price_id: string | null;
  access_days: number | null;
  member_plan: string;
}

type RpcResult = PromiseLike<{ data: unknown; error: { message: string } | null }>;
/** RPC without depending on generated function types (they are regenerated separately). */
function rpc(sb: DB, fn: string, args?: Record<string, unknown>): RpcResult {
  return (sb as unknown as { rpc: (f: string, a?: Record<string, unknown>) => RpcResult }).rpc(fn, args);
}

export async function quote(
  sb: DB,
  kind: PurchaseKind,
  ref: string,
  opts: { interval?: BillingInterval; coupon?: string | null } = {},
): Promise<Quote> {
  const { data, error } = await rpc(sb, "quote", {
    p_kind: kind,
    p_ref: ref,
    p_interval: opts.interval ?? "one_time",
    p_coupon: opts.coupon ?? null,
  });
  if (error) throw new Error(`quote: ${error.message}`);
  return data as Quote;
}

export interface OrderItem {
  id: string;
  kind: string;
  ref_id: string;
  name: string;
  quantity: number;
  unit_cents: number;
  benefit_applied: string | null;
}
export interface Order {
  id: string;
  reference: string;
  status: "pending" | "paid" | "refunded" | "failed";
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  created_at: string;
  items: OrderItem[];
}

/** The member's orders (newest first) with their items. Pending orders are left out unless asked for. */
export async function myOrders(sb: DB, opts: { includePending?: boolean } = {}): Promise<Order[]> {
  let q = sb
    .from("orders")
    .select(
      "id, reference, status, subtotal_cents, discount_cents, total_cents, currency, created_at, order_items(id, kind, ref_id, name, quantity, unit_cents, benefit_applied)",
    )
    .order("created_at", { ascending: false });
  if (!opts.includePending) q = q.neq("status", "pending");
  const { data, error } = await q;
  if (error) throw new Error(`myOrders: ${error.message}`);
  return (data ?? []).map(({ order_items, ...o }) => ({ ...o, status: o.status as Order["status"], items: order_items ?? [] }));
}

export interface MemberSubscription {
  id: string;
  planId: string;
  planName: string;
  planRank: number;
  status: string;
  interval: "month" | "year";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  provider: string;
}

/** The member's best current personal subscription (highest plan still inside its period), or null (= Free). */
export async function mySubscription(sb: DB, userId: string): Promise<MemberSubscription | null> {
  const { data, error } = await sb
    .from("subscriptions")
    .select("id, plan_id, status, interval, current_period_end, cancel_at_period_end, provider, plans(name, rank)")
    .eq("user_id", userId)
    .in("status", ["trialing", "active", "past_due", "cancelled"])
    .gt("current_period_end", new Date().toISOString());
  if (error) throw new Error(`mySubscription: ${error.message}`);
  const rows = (data ?? []).map((s) => {
    const plan = (Array.isArray(s.plans) ? s.plans[0] : s.plans) as { name: string; rank: number } | null;
    return {
      id: s.id,
      planId: s.plan_id,
      planName: plan?.name ?? s.plan_id,
      planRank: plan?.rank ?? 0,
      status: s.status,
      interval: s.interval as "month" | "year",
      currentPeriodEnd: s.current_period_end,
      cancelAtPeriodEnd: s.cancel_at_period_end,
      provider: s.provider,
    };
  });
  rows.sort((a, b) => b.planRank - a.planRank || b.currentPeriodEnd.localeCompare(a.currentPeriodEnd));
  return rows[0] ?? null;
}

export interface PlanPrice {
  id: string;
  interval: BillingInterval;
  amountCents: number;
  currency: string;
  label: string | null;
  draftNote: string | null;
}
export interface PlanBenefitCell {
  programId: string;
  programSlug: string;
  programName: string;
  scope: "content" | "retreat" | "coaching";
  benefit: "none" | "discount" | "included";
  discountPercent: number | null;
  coachingCredits: number | null;
}
export interface PricingPlan {
  id: string;
  name: string;
  tagline: string | null;
  rank: number;
  features: string[];
  draftNote: string | null;
  prices: PlanPrice[];
  benefits: PlanBenefitCell[];
}

/** Plans with their prices and the plan × program benefits grid (for the pricing page). Works signed out. */
export async function listPlans(sb: DB): Promise<PricingPlan[]> {
  const [plans, prices, benefits] = await Promise.all([
    sb.from("plans").select("id, name, tagline, rank, features, draft_note").eq("is_active", true).order("rank"),
    sb.from("prices").select("id, ref_id, interval, amount_cents, currency, label, draft_note").eq("kind", "plan").eq("is_active", true),
    sb
      .from("plan_program_benefits")
      .select("plan_id, program_id, scope, benefit, discount_percent, coaching_credits, programs(slug, name, position, status)"),
  ]);
  if (plans.error) throw new Error(`listPlans: ${plans.error.message}`);
  if (prices.error) throw new Error(`listPlans prices: ${prices.error.message}`);
  if (benefits.error) throw new Error(`listPlans benefits: ${benefits.error.message}`);

  return (plans.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    rank: p.rank,
    features: p.features,
    draftNote: p.draft_note,
    prices: (prices.data ?? [])
      .filter((x) => x.ref_id === p.id)
      .map((x) => ({
        id: x.id,
        interval: x.interval as BillingInterval,
        amountCents: x.amount_cents,
        currency: x.currency,
        label: x.label,
        draftNote: x.draft_note,
      }))
      .sort((a, b) => a.amountCents - b.amountCents),
    benefits: (benefits.data ?? [])
      .filter((b) => b.plan_id === p.id)
      .flatMap((b) => {
        const prog = (Array.isArray(b.programs) ? b.programs[0] : b.programs) as
          | { slug: string; name: string; position: number; status: string }
          | null;
        if (!prog) return []; // unpublished programs are hidden by row rules
        return [
          {
            programId: b.program_id,
            programSlug: prog.slug,
            programName: prog.name,
            scope: b.scope,
            benefit: b.benefit,
            discountPercent: b.discount_percent,
            coachingCredits: b.coaching_credits,
            position: prog.position,
          },
        ];
      })
      .sort((a, b) => a.position - b.position)
      .map(({ position: _position, ...cell }) => cell),
  }));
}
