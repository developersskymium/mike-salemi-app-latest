import type Stripe from "stripe";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getStripe, paymentsNotConfigured, siteOrigin, stripeConfigured } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/commerce/customers";

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

  const { user } = await getUser();
  if (!user) return Response.json({ error: "not_signed_in" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const { kind, ref, interval, coupon, offer_id } = parsed.data;

  const admin = createServiceClient();
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

  // Use the catalog Stripe price only when nothing was discounted; otherwise charge exactly the quoted amount.
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem =
    q.stripe_price_id && q.discount_cents === 0
      ? { price: q.stripe_price_id, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: q.currency,
            unit_amount: q.amount_cents,
            product_data: { name: q.name ?? q.kind, metadata: { kind, ref: q.ref } },
            ...(isPlan ? { recurring: { interval: q.interval === "year" ? "year" : "month" } } : {}),
          },
        };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: isPlan ? "subscription" : "payment",
        customer,
        client_reference_id: orderId,
        line_items: [lineItem],
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
