import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

type OurStatus = "trialing" | "active" | "past_due" | "cancelled" | "expired";

/** Stripe subscription status -> subscriptions.status */
export function mapStripeStatus(status: Stripe.Subscription.Status): OurStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "canceled":
      return "cancelled";
    case "incomplete_expired":
      return "expired";
    default:
      // past_due | unpaid | incomplete | paused: keep access through the period, flag for dunning
      return "past_due";
  }
}

/** Period end moved to subscription items in recent API versions; read whichever is present (unix seconds). */
export function periodEnd(sub: Stripe.Subscription): number | null {
  const fromItems = sub.items?.data?.map((i) => i.current_period_end).filter((n): n is number => typeof n === "number");
  if (fromItems?.length) return Math.max(...fromItems);
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof legacy === "number" ? legacy : null;
}

/** The shape `apply_paid_order(p_subscription)` expects. */
export function subscriptionSnapshot(sub: Stripe.Subscription) {
  return {
    id: sub.id,
    status: mapStripeStatus(sub.status),
    current_period_end: periodEnd(sub),
    cancel_at_period_end: sub.cancel_at_period_end,
  };
}

/** Mirror a Stripe subscription change onto our row (status, period end, cancel flag, plan if the price is known). */
export async function syncSubscription(admin: SupabaseClient, sub: Stripe.Subscription, deleted: boolean) {
  const end = periodEnd(sub);
  const patch: Record<string, unknown> = {
    status: deleted ? "expired" : mapStripeStatus(sub.status),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
  if (deleted) {
    patch.current_period_end = new Date((sub.ended_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
  } else if (end) {
    patch.current_period_end = new Date(end * 1000).toISOString();
  }

  // Plan changes made in the customer portal use catalog prices: map them back through prices.stripe_price_id.
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (priceId && !deleted) {
    const { data: price } = await admin
      .from("prices")
      .select("ref_id, interval")
      .eq("kind", "plan")
      .eq("stripe_price_id", priceId)
      .maybeSingle();
    if (price) {
      patch.plan_id = price.ref_id;
      if (price.interval === "month" || price.interval === "year") patch.interval = price.interval;
    }
  }

  const { data, error } = await admin
    .from("subscriptions")
    .update(patch)
    .eq("provider", "stripe")
    .eq("provider_ref", sub.id)
    .select("id");
  if (error) throw new Error(`subscriptions update: ${error.message}`);
  return data?.length ?? 0;
}
