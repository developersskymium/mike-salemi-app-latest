import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  // Billing emails are queued once, with the payloads their templates expect, by billingEmailsFor
  // (lib/email/billing.ts) right after the webhook handles the event. Queuing here too would send
  // each one twice, so this stays a no-op; the arguments document which email the event maps to.
  void admin; void userId; void kind; void dedupeKey; void payload;
  return "skipped";
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
