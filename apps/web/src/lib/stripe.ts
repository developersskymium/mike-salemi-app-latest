import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** True when Stripe keys are present. Routes answer 503 `payments_not_configured` otherwise. */
export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Server-only Stripe client (test mode while the key is a test key). Created lazily so builds work without keys. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { appInfo: { name: "Mike Salemi App" } });
  return client;
}

/** Absolute origin for Checkout/Portal return URLs. */
export function siteOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
}

export function paymentsNotConfigured() {
  return Response.json({ error: "payments_not_configured" }, { status: 503 });
}
