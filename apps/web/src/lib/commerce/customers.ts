import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The member's Stripe customer id, created (and remembered in billing_customers) on first use. */
export async function ensureStripeCustomer(
  stripe: Stripe,
  admin: SupabaseClient,
  user: { id: string; email?: string | null },
): Promise<string> {
  const existing = await findStripeCustomer(admin, user.id);
  if (existing) return existing;
  const customer = await stripe.customers.create(
    { email: user.email ?? undefined, metadata: { user_id: user.id } },
    { idempotencyKey: `customer:${user.id}` },
  );
  const { error } = await admin
    .from("billing_customers")
    .upsert({ user_id: user.id, provider: "stripe", customer_id: customer.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw new Error(`billing_customers: ${error.message}`);
  // A parallel request may have won the race; use whatever is stored.
  return (await findStripeCustomer(admin, user.id)) ?? customer.id;
}

export async function findStripeCustomer(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await admin.from("billing_customers").select("customer_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`billing_customers: ${error.message}`);
  return (data?.customer_id as string | undefined) ?? null;
}
