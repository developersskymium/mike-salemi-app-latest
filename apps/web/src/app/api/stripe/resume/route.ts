import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getStripe, paymentsNotConfigured, stripeConfigured } from "@/lib/stripe";
import { syncSubscription } from "@/lib/commerce/subscriptions";

/**
 * Resume a paused plan: clears Stripe's pause_collection on the member's own paused subscription and mirrors
 * it right away (period end from Stripe again, so plan access comes back). Billing restarts from the next invoice.
 */
export async function POST() {
  if (!stripeConfigured()) return paymentsNotConfigured();

  const { user } = await getUser();
  if (!user) return Response.json({ error: "not_signed_in" }, { status: 401 });

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("provider_ref")
    .eq("user_id", user.id)
    .eq("provider", "stripe")
    .like("provider_ref", "sub_%")
    .not("paused_at", "is", null)
    .order("paused_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return Response.json({ error: "not_paused" }, { status: 404 });

  const stripe = getStripe();
  try {
    const sub = await stripe.subscriptions.update(data.provider_ref as string, { pause_collection: "" });
    await syncSubscription(admin, sub, false, stripe);
  } catch (e) {
    console.error("stripe resume", e instanceof Error ? e.message : e);
    return Response.json({ error: "resume_failed" }, { status: 502 });
  }
  return Response.json({ resumed: true });
}
