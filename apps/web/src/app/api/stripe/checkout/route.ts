import type Stripe from "stripe";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getStripe, paymentsNotConfigured, siteOrigin, stripeConfigured } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/commerce/customers";
import { changeSubscriptionPlan, findLiveStripeSubscription } from "@/lib/commerce/upgrade";

const APPLY_FIRST = "Apply first — Mike reviews every application.";

/** The browser says only what it wants; every amount comes from `quote` on the server. */
const Body = z.object({
  kind: z.enum(["plan", "program", "bundle", "run", "coaching"]),
  ref: z.string().min(1).max(200),
  interval: z.enum(["one_time", "month", "year"]).optional(),
  coupon: z.string().max(64).nullish(),
  offer_id: z.uuid().nullish(),
});

interface ServerQuote {
  kind: string;
  ref: string;
  name: string | null;
  interval: "one_time" | "month" | "year";
  state: string;
  currency: string;
  base_cents: number;
  discount_cents: number;
  /** Purchase credit (0041): taken off the first payment only, after the discount. Absent before 0041 is applied. */
  credit_cents?: number;
  amount_cents: number;
  stripe_price_id: string | null;
}
interface PendingOrder {
  order_id?: string;
  reference?: string;
  paid?: boolean;
  error?: string;
  quote: ServerQuote;
}

export async function POST(request: Request) {
  if (!stripeConfigured()) return paymentsNotConfigured();

  const { supabase, user } = await getUser();
  if (!user) return Response.json({ error: "not_signed_in" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const { kind, ref, interval, coupon, offer_id } = parsed.data;

  const admin = createServiceClient();

  // Plan change for a member who already pays by card (Pro -> Max, monthly -> yearly): change the price on the
  // existing Stripe subscription instead of opening a second Checkout, so there is only ever one subscription.
  if (kind === "plan") {
    const live = await findLiveStripeSubscription(admin, user.id);
    if (live) {
      const { data: qd, error: qe } = await supabase.rpc("quote", {
        p_kind: "plan",
        p_ref: ref,
        p_interval: interval === "year" ? "year" : "month",
      });
      if (qe) {
        console.error("quote", qe.message);
        return Response.json({ error: "order_failed" }, { status: 500 });
      }
      const q = qd as unknown as ServerQuote;
      if (q.state !== "purchasable") return Response.json({ error: "not_purchasable", quote: q }, { status: 409 });
      const change = await changeSubscriptionPlan(getStripe(), admin, {
        stripeSubscriptionId: live.stripeId,
        userId: user.id,
        plan: {
          ref: q.ref,
          name: q.name,
          interval: q.interval === "year" ? "year" : "month",
          currency: q.currency,
          baseCents: q.base_cents,
          stripePriceId: q.stripe_price_id,
        },
      });
      if (change.ok) {
        return Response.json({ url: `${siteOrigin(request)}/you/billing?changed=${encodeURIComponent(q.ref)}`, changed: true });
      }
      if (change.error !== "not_changeable") {
        return Response.json({ error: change.error, message: change.message }, { status: change.error === "card_declined" ? 402 : 409 });
      }
      // The Stripe subscription is gone or already ending: fall through to a fresh Checkout.
    }
  }
  const { data, error } = await admin.rpc("create_pending_order", {
    p_user: user.id,
    p_kind: kind,
    p_ref: ref,
    p_interval: interval ?? (kind === "plan" ? "month" : "one_time"),
    p_coupon: coupon ?? null,
    p_offer: offer_id ?? null,
  });
  if (error) {
    console.error("create_pending_order", error.message);
    return Response.json({ error: "order_failed" }, { status: 500 });
  }
  const pending = data as PendingOrder;
  // Packages and programs flagged requires_application (Executive Edge) sell only after Mike accepts the
  // application; the database refuses the order, this names the reason for the member.
  if (pending.error && (pending.quote as ServerQuote & { reason?: string | null })?.reason === "application_required")
    return Response.json({ error: "application_required", message: APPLY_FIRST, quote: pending.quote }, { status: 403 });
  if (pending.error) return Response.json({ error: pending.error, quote: pending.quote }, { status: 409 });
  const orderId = pending.order_id!;
  const origin = siteOrigin(request);

  // 100% discount: already delivered by the database, no payment needed.
  if (pending.paid) return Response.json({ url: `${origin}/checkout/success?order=${orderId}`, order_id: orderId, paid: true });

  const q = pending.quote;
  const isPlan = kind === "plan";
  const stripe = getStripe();
  const customer = await ensureStripeCustomer(stripe, admin, user);
  const metadata = { order_id: orderId, user_id: user.id, kind, ref: q.ref };

  // Purchase credit is a first-payment credit: the line item is priced before it, and the credit goes on as a
  // single-use, one-time ("once") coupon so renewals bill the normal price. Only plans carry a credit.
  const credit = isPlan ? Math.max(0, Math.min(q.credit_cents ?? 0, q.amount_cents + (q.credit_cents ?? 0) - 50)) : 0;
  const beforeCredit = q.amount_cents + credit;

  // Use the catalog Stripe price only when nothing was discounted; otherwise charge exactly the quoted amount.
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem =
    q.stripe_price_id && q.discount_cents === 0
      ? { price: q.stripe_price_id, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: q.currency,
            unit_amount: beforeCredit,
            product_data: { name: q.name ?? q.kind, metadata: { kind, ref: q.ref } },
            ...(isPlan ? { recurring: { interval: q.interval === "year" ? "year" : "month" } } : {}),
          },
        };

  let session: Stripe.Checkout.Session;
  try {
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (credit > 0) {
      const coupon = await stripe.coupons.create(
        { amount_off: credit, currency: q.currency, duration: "once", max_redemptions: 1, name: "Credit for recent purchases", metadata: { order_id: orderId } },
        { idempotencyKey: `credit:${orderId}` },
      );
      discounts = [{ coupon: coupon.id }];
    }
    session = await stripe.checkout.sessions.create(
      {
        mode: isPlan ? "subscription" : "payment",
        customer,
        client_reference_id: orderId,
        line_items: [lineItem],
        ...(discounts ? { discounts } : {}),
        metadata,
        ...(isPlan ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
        success_url: `${origin}/checkout/success?order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancelled?order=${orderId}`,
      },
      { idempotencyKey: `checkout:${orderId}` },
    );
  } catch (e) {
    console.error("stripe checkout", e);
    await admin.from("orders").update({ status: "failed" }).eq("id", orderId);
    return Response.json({ error: "checkout_failed" }, { status: 502 });
  }

  await admin.from("orders").update({ provider_ref: session.id }).eq("id", orderId);
  return Response.json({ url: session.url, order_id: orderId });
}
