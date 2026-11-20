import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { syncSubscription } from "./subscriptions";

/** A member's live, card-billed Stripe subscription (the one an in-app plan change must modify, never duplicate). */
export interface LiveStripeSubscription {
  rowId: string;
  stripeId: string;
  planId: string;
  interval: "month" | "year";
}

/**
 * The member's highest live Stripe subscription row, or null. Only rows that point at a real Stripe
 * subscription (`sub_…`) count; free orders (`order:…`) and admin grants never had a Stripe subscription.
 */
export async function findLiveStripeSubscription(admin: SupabaseClient, userId: string): Promise<LiveStripeSubscription | null> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("id, provider_ref, plan_id, interval, current_period_end, plans(rank)")
    .eq("user_id", userId)
    .eq("provider", "stripe")
    .in("status", ["trialing", "active", "past_due"])
    .like("provider_ref", "sub_%")
    .gt("current_period_end", new Date().toISOString());
  if (error) throw new Error(`subscriptions lookup: ${error.message}`);
  const rows = (data ?? []).map((r) => ({
    rowId: r.id as string,
    stripeId: r.provider_ref as string,
    planId: r.plan_id as string,
    interval: r.interval as "month" | "year",
    rank: ((Array.isArray(r.plans) ? r.plans[0] : r.plans) as { rank: number } | null)?.rank ?? 0,
  }));
  rows.sort((a, b) => b.rank - a.rank);
  const top = rows[0];
  return top ? { rowId: top.rowId, stripeId: top.stripeId, planId: top.planId, interval: top.interval } : null;
}

export type PlanChangeResult =
  | { ok: true; subscription: Stripe.Subscription }
  | { ok: false; error: "not_changeable" | "paused" | "card_declined" | "change_failed"; message: string };

/**
 * Moves an existing Stripe subscription to another plan in place (same subscription, same row).
 * The difference for the rest of the period is invoiced and charged now (`always_invoice`); if the card
 * fails, Stripe rejects the change (`error_if_incomplete`) and nothing changes.
 * The new price is the plan's catalog Stripe price when one is set, otherwise an inline price at the
 * plan's list price (coupons are first-payment offers and are not carried into a plan change).
 */
export async function changeSubscriptionPlan(
  stripe: Stripe,
  admin: SupabaseClient,
  args: {
    stripeSubscriptionId: string;
    userId: string;
    plan: { ref: string; name: string | null; interval: "month" | "year"; currency: string; baseCents: number; stripePriceId: string | null };
  },
): Promise<PlanChangeResult> {
  const { plan } = args;
  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(args.stripeSubscriptionId);
  } catch (e) {
    if ((e as { code?: string }).code === "resource_missing") return { ok: false, error: "not_changeable", message: "" };
    throw e;
  }
  if (!["active", "trialing", "past_due"].includes(sub.status)) return { ok: false, error: "not_changeable", message: "" };
  if (sub.pause_collection) {
    return { ok: false, error: "paused", message: "Your plan is paused. Resume it in Manage billing first, then change plan." };
  }
  const item = sub.items.data[0];
  if (!item) return { ok: false, error: "not_changeable", message: "" };

  let priceParams: Pick<Stripe.SubscriptionUpdateParams.Item, "price" | "price_data">;
  if (plan.stripePriceId) {
    priceParams = { price: plan.stripePriceId };
  } else {
    const product = await stripe.products.create(
      { name: plan.name ?? plan.ref, metadata: { kind: "plan", ref: plan.ref } },
      { idempotencyKey: `plan-product:${sub.id}:${item.id}:${plan.ref}:${plan.interval}` },
    );
    priceParams = {
      price_data: { currency: plan.currency, product: product.id, unit_amount: plan.baseCents, recurring: { interval: plan.interval } },
    };
  }

  let updated: Stripe.Subscription;
  try {
    updated = await stripe.subscriptions.update(
      sub.id,
      {
        items: [{ id: item.id, ...priceParams }],
        proration_behavior: "always_invoice",
        payment_behavior: "error_if_incomplete",
        cancel_at_period_end: false,
        metadata: { ...sub.metadata, user_id: args.userId, kind: "plan", ref: plan.ref, interval: plan.interval },
      },
      { idempotencyKey: `plan-change:${sub.id}:${item.id}:${plan.ref}:${plan.interval}` },
    );
  } catch (e) {
    const err = e as { type?: string; code?: string; message?: string };
    console.error("stripe plan change", err.code ?? err.type, err.message);
    if (err.type === "StripeCardError" || err.code === "card_declined") {
      return { ok: false, error: "card_declined", message: "Your card was declined, so your plan didn't change. Update your card in Manage billing and try again." };
    }
    return { ok: false, error: "change_failed", message: "Your plan didn't change. Try again in a moment." };
  }

  // Mirror right away so Billing shows the new plan; the customer.subscription.updated webhook repeats this (idempotent, same row).
  await syncSubscription(admin, updated, false, stripe);
  return { ok: true, subscription: updated };
}

/**
 * Safety net for a second subscription created by Checkout (double tap, two tabs): every other live
 * Stripe subscription of this member is set to end at its period end, so nothing is billed twice from
 * the next renewal on. Never cancels immediately (the member keeps what they paid for).
 */
export async function endOtherSubscriptions(stripe: Stripe, admin: SupabaseClient, userId: string, keepStripeId: string) {
  const { data } = await admin
    .from("subscriptions")
    .select("provider_ref")
    .eq("user_id", userId)
    .eq("provider", "stripe")
    .in("status", ["trialing", "active", "past_due"])
    .eq("cancel_at_period_end", false)
    .like("provider_ref", "sub_%")
    .neq("provider_ref", keepStripeId);
  for (const row of data ?? []) {
    try {
      const other = await stripe.subscriptions.update(row.provider_ref as string, { cancel_at_period_end: true });
      await syncSubscription(admin, other, false, stripe);
    } catch (e) {
      console.error("end duplicate subscription", row.provider_ref, e instanceof Error ? e.message : e);
    }
  }
}
