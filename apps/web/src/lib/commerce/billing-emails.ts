import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMAIL_KINDS } from "@/lib/email/catalog";

/** Billing emails the webhook asks for. Templates come from the email work; until a kind is in the catalog it is skipped. */
export type BillingEmailKind = "payment_failed" | "plan_ending" | "plan_ended" | "payment_receipt" | "plan_paused";

/**
 * Queues a billing email in email_outbox (same row shape and dedupe as private.enqueue_email).
 * Kinds the email catalog doesn't know yet are skipped (not queued, so they aren't drained as "Unknown kind");
 * they light up as soon as the templates land. Never throws: an email must never fail a webhook.
 */
export async function enqueueBillingEmail(
  admin: SupabaseClient,
  userId: string | null | undefined,
  kind: BillingEmailKind,
  dedupeKey: string,
  payload: Record<string, unknown> = {},
): Promise<"queued" | "skipped"> {
  try {
    if (!userId) return "skipped";
    if (!EMAIL_KINDS.some((k) => (k.id as string) === kind)) return "skipped";
    const { error } = await admin
      .from("email_outbox")
      .upsert({ user_id: userId, kind, dedupe_key: dedupeKey, payload }, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true });
    if (error) {
      console.error("billing email", kind, error.message);
      return "skipped";
    }
    return "queued";
  } catch (e) {
    console.error("billing email", kind, e instanceof Error ? e.message : e);
    return "skipped";
  }
}

/** The member a Stripe subscription or customer belongs to (our subscriptions row first, then billing_customers). */
export async function memberForStripe(admin: SupabaseClient, ref: { subscriptionId?: string | null; customerId?: string | null }): Promise<string | null> {
  if (ref.subscriptionId) {
    const { data } = await admin.from("subscriptions").select("user_id").eq("provider", "stripe").eq("provider_ref", ref.subscriptionId).maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }
  if (ref.customerId) {
    const { data } = await admin.from("billing_customers").select("user_id").eq("customer_id", ref.customerId).maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }
  return null;
}
