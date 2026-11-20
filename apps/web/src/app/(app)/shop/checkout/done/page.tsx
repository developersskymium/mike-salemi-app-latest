import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MOCK } from "@/lib/mock";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Confirming payment" };

/**
 * Return from Stripe.js (one-page checkout). Verifies the PaymentIntent on the server, then marks the
 * member's order paid (apply_paid_order, idempotent) and hands over to the shared success page.
 */
export default async function Done(props: PageProps<"/shop/checkout/done">) {
  const sp = await props.searchParams;
  const order = typeof sp.order === "string" && /^[0-9a-f-]{36}$/i.test(sp.order) ? sp.order : null;
  if (!order) redirect("/shop");
  if (MOCK || !stripeConfigured()) redirect(`/checkout/success?order=${order}&from=shop`);
  const { user } = await getUser();
  if (!user) redirect("/signin");
  const service = createServiceClient();
  const { data: o } = await service.from("orders").select("id, user_id, status, provider_ref, total_cents").eq("id", order).maybeSingle();
  if (!o || o.user_id !== user.id) redirect("/shop");
  if (o.status === "pending" && o.provider_ref?.startsWith("pi_")) {
    try {
      const pi = await getStripe().paymentIntents.retrieve(o.provider_ref);
      if (pi.status === "succeeded" && pi.amount === o.total_cents && pi.metadata?.order_id === o.id) {
        await service.rpc("apply_paid_order", { p_order: o.id, p_payment_ref: pi.id, p_subscription: null as unknown as undefined });
      } else if (pi.status === "requires_payment_method" || pi.status === "canceled") {
        redirect(`/checkout/cancelled?order=${o.id}&from=shop`);
      }
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e) throw e; // redirect
      console.error("shop checkout done", e);
    }
  }
  redirect(`/checkout/success?order=${o.id}&from=shop`);
}
