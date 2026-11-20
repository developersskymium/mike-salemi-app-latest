import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/admin";
import { getStripe, paymentsNotConfigured, stripeConfigured } from "@/lib/stripe";
import { subscriptionSnapshot, syncSubscription } from "@/lib/commerce/subscriptions";
import { billingEmailsFor } from "@/lib/email/billing";

type Admin = ReturnType<typeof createServiceClient>;

/**
 * Stripe → database. Signature-verified, stored in payment_events (idempotent by event id),
 * then applied through server functions with the service role.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret) return paymentsNotConfigured();

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "missing_signature" }, { status: 400 });

  const stripe = getStripe();
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createServiceClient();
  const stored = await admin
    .from("payment_events")
    .upsert({ id: event.id, provider: "stripe", type: event.type, payload: event }, { onConflict: "id", ignoreDuplicates: true });
  if (stored.error) return Response.json({ error: "store_failed" }, { status: 500 });

  const { data: existing } = await admin.from("payment_events").select("processed_at").eq("id", event.id).maybeSingle();
  if (existing?.processed_at) return Response.json({ received: true, duplicate: true });

  try {
    await handle(event, stripe, admin);
    await billingEmailsFor(event, admin); // receipts and plan emails (queued; never throws)
    await admin.from("payment_events").update({ processed_at: new Date().toISOString(), error: null }).eq("id", event.id);
    return Response.json({ received: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("stripe webhook", event.type, message);
    await admin.from("payment_events").update({ error: message.slice(0, 1000) }).eq("id", event.id);
    return Response.json({ error: "processing_failed" }, { status: 500 }); // Stripe retries
  }
}

async function handle(event: Stripe.Event, stripe: Stripe, admin: Admin) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status === "unpaid") return; // async method still pending
      const orderId = session.metadata?.order_id ?? session.client_reference_id;
      if (!orderId) throw new Error("session without order_id");

      let paymentRef: string | null = idOf(session.payment_intent);
      let subscription: ReturnType<typeof subscriptionSnapshot> | null = null;
      const subId = idOf(session.subscription);
      if (subId) {
        subscription = subscriptionSnapshot(await stripe.subscriptions.retrieve(subId));
        paymentRef = subId;
      }
      const { error } = await admin.rpc("apply_paid_order", {
        p_order: orderId,
        p_payment_ref: paymentRef ?? session.id,
        p_subscription: subscription,
      });
      if (error) throw new Error(`apply_paid_order: ${error.message}`);
      return;
    }

    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object;
      const orderId = session.metadata?.order_id ?? session.client_reference_id;
      if (orderId) await admin.from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
      return;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(admin, event.data.object, event.type === "customer.subscription.deleted");
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      if (!charge.refunded) return; // partial refund: keep access, recorded in payment_events
      const pi = idOf(charge.payment_intent);
      if (!pi) return;
      const { data: orders, error } = await admin.from("orders").select("id").eq("provider", "stripe").eq("provider_ref", pi);
      if (error) throw new Error(`orders lookup: ${error.message}`);
      for (const o of orders ?? []) {
        const res = await admin.rpc("refund_order", { p_order: o.id });
        if (res.error) throw new Error(`refund_order: ${res.error.message}`);
      }
      return;
    }

    default:
      return; // stored only
  }
}

function idOf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}
