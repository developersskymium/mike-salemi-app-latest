import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getStripe, paymentsNotConfigured, siteOrigin, stripeConfigured } from "@/lib/stripe";
import { findStripeCustomer } from "@/lib/commerce/customers";

/** Stripe customer portal (invoices, card, cancel/upgrade) for the signed-in member. */
export async function POST(request: Request) {
  if (!stripeConfigured()) return paymentsNotConfigured();

  const { user } = await getUser();
  if (!user) return Response.json({ error: "not_signed_in" }, { status: 401 });

  const customer = await findStripeCustomer(createServiceClient(), user.id);
  if (!customer) return Response.json({ error: "no_billing_account" }, { status: 404 });

  const session = await getStripe().billingPortal.sessions.create({
    customer,
    return_url: `${siteOrigin(request)}/account/billing`,
  });
  return Response.json({ url: session.url });
}
