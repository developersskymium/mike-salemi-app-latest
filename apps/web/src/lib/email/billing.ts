import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { money } from "./outbox";
import type { AppEmail } from "./templates";

/**
 * Billing emails from Stripe events. The webhook calls `billingEmailsFor(event, admin)` once after it has
 * applied the event; this file maps the event to at most one email and queues it in email_outbox (the
 * 5-minute email cron sends it, or logs "not configured" until RESEND_API_KEY is set). Never throws:
 * an email problem must never make Stripe retry a payment event.
 *
 * Shop orders are not handled here: their order_confirmation comes from the orders trigger (0042).
 */

export type BillingKind = "payment_receipt" | "payment_failed" | "plan_ending" | "plan_ended" | "plan_paused";
type BillingEmail = Extract<AppEmail, { kind: BillingKind }>;

async function service(): Promise<SupabaseClient | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createServiceClient } = await import("@/lib/supabase/admin");
  return createServiceClient();
}

/**
 * Queue one billing email. `data` is the rendered email's content (stored as the payload), `dedupe`
 * keeps Stripe's retries from sending it twice (use the Stripe event or object id).
 */
export async function enqueueBillingEmail(kind: BillingKind, userId: string, data: Omit<BillingEmail, "kind">, opts: { dedupe: string; sb?: SupabaseClient }) {
  try {
    const sb = opts.sb ?? (await service());
    if (!sb || !userId) return false;
    const email = { kind, ...data } as BillingEmail;
    const { error } = await sb
      .from("email_outbox")
      .upsert({ user_id: userId, kind, dedupe_key: opts.dedupe, payload: { email } }, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true });
    if (error) console.error("billing email not queued", kind, error.message);
    return !error;
  } catch (e) {
    console.error("billing email not queued", kind, e);
    return false;
  }
}

/* ---------------------------------------------------------------- Stripe event → email */

const day = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : undefined;
const dayIso = (iso: string | null | undefined) => (iso ? day(Math.floor(Date.parse(iso) / 1000)) : undefined);
const idOf = (v: string | { id: string } | null | undefined) => (!v ? null : typeof v === "string" ? v : v.id);

type SubRow = { user_id: string; plan_id: string | null; interval: string | null; current_period_end: string | null; plans: { name: string } | null };

async function subRow(sb: SupabaseClient, stripeSubId: string | null): Promise<SubRow | null> {
  if (!stripeSubId) return null;
  const { data } = await sb
    .from("subscriptions")
    .select("user_id, plan_id, interval, current_period_end, plans(name)")
    .eq("provider", "stripe")
    .eq("provider_ref", stripeSubId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as SubRow) ?? null;
}

const planName = (s: SubRow) => {
  const base = s.plans?.name ?? (s.plan_id ? s.plan_id.charAt(0).toUpperCase() + s.plan_id.slice(1) : "Membership");
  return /membership|plan/i.test(base) ? base : `${base} membership`;
};

/** Subscription id on an invoice (new `parent.subscription_details` shape, or the legacy field). */
function invoiceSub(inv: Stripe.Invoice): string | null {
  const parent = (inv as unknown as { parent?: { subscription_details?: { subscription?: string | { id: string } } | null } | null }).parent;
  return idOf(parent?.subscription_details?.subscription ?? (inv as unknown as { subscription?: string | { id: string } | null }).subscription ?? null);
}

export async function billingEmailsFor(event: Stripe.Event, sb: SupabaseClient): Promise<void> {
  try {
    switch (event.type) {
      /* A one-off purchase or the first payment of a plan (renewals come as invoice.paid below). */
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.payment_status === "unpaid") return;
        const orderId = session.metadata?.order_id ?? session.client_reference_id;
        if (!orderId) return;
        const { data: o } = await sb
          .from("orders")
          .select("id, user_id, reference, status, total_cents, currency, created_at, order_items(kind, name, quantity)")
          .eq("id", orderId)
          .maybeSingle();
        if (!o || o.status !== "paid" || !o.total_cents) return;
        const items = (o.order_items ?? []) as { kind: string; name: string; quantity: number }[];
        if (items.some((i) => i.kind === "product")) return; // shop: order_confirmation (DB trigger)
        const names = items.filter((i) => i.kind !== "shipping").map((i) => (i.quantity > 1 ? `${i.name} × ${i.quantity}` : i.name));
        const sub = await subRow(sb, idOf(session.subscription));
        await enqueueBillingEmail(
          "payment_receipt",
          o.user_id as string,
          {
            itemName: names.join(", ") || "Your purchase",
            amount: money(o.total_cents as number, o.currency as string),
            paidOn: dayIso(new Date().toISOString())!,
            reference: (o.reference as string | null) ?? undefined,
            nextBilling: sub ? dayIso(sub.current_period_end) : undefined,
          },
          { dedupe: `order:${o.id}`, sb },
        );
        return;
      }

      /* Plan renewals. */
      case "invoice.paid": {
        const inv = event.data.object;
        if (inv.billing_reason !== "subscription_cycle" || !inv.amount_paid) return;
        const sub = await subRow(sb, invoiceSub(inv));
        if (!sub) return;
        const periodEnd = inv.lines?.data?.[0]?.period?.end;
        await enqueueBillingEmail(
          "payment_receipt",
          sub.user_id,
          {
            itemName: `${planName(sub)}${sub.interval ? ` · ${sub.interval === "year" ? "yearly" : "monthly"}` : ""}`,
            amount: money(inv.amount_paid, inv.currency),
            paidOn: day(inv.status_transitions?.paid_at ?? Math.floor(Date.now() / 1000))!,
            reference: inv.number ?? undefined,
            nextBilling: day(periodEnd),
            receiptUrl: inv.hosted_invoice_url ?? undefined,
            renewal: true,
          },
          { dedupe: `invoice:${inv.id}`, sb },
        );
        return;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object;
        const sub = await subRow(sb, invoiceSub(inv));
        if (!sub) return;
        await enqueueBillingEmail(
          "payment_failed",
          sub.user_id,
          {
            planName: planName(sub),
            amount: inv.amount_due ? money(inv.amount_due, inv.currency) : undefined,
            retryOn: day(inv.next_payment_attempt),
            accessUntil: dayIso(sub.current_period_end),
          },
          // One email per failed attempt, not per webhook retry.
          { dedupe: `invoice:${inv.id}:${inv.attempt_count ?? 1}`, sb },
        );
        return;
      }

      case "customer.subscription.updated": {
        const s = event.data.object;
        const prev = (event.data.previous_attributes ?? {}) as Partial<Stripe.Subscription>;
        const sub = await subRow(sb, s.id);
        if (!sub) return;
        const cancelling = s.cancel_at_period_end || Boolean(s.cancel_at);
        const wasCancelling = "cancel_at_period_end" in prev || "cancel_at" in prev ? Boolean(prev.cancel_at_period_end) || Boolean(prev.cancel_at) : cancelling;
        if (cancelling && !wasCancelling && s.status !== "canceled") {
          const ends = s.cancel_at ?? (sub.current_period_end ? Math.floor(Date.parse(sub.current_period_end) / 1000) : null);
          await enqueueBillingEmail("plan_ending", sub.user_id, { planName: planName(sub), endsOn: day(ends) ?? "the end of this period" }, { dedupe: `ending:${s.id}:${ends ?? event.id}`, sb });
          return;
        }
        if (s.pause_collection && "pause_collection" in prev && !prev.pause_collection) {
          await enqueueBillingEmail("plan_paused", sub.user_id, { planName: planName(sub), resumesOn: day(s.pause_collection.resumes_at) }, { dedupe: `paused:${s.id}:${event.id}`, sb });
        }
        return;
      }

      case "customer.subscription.paused": {
        const s = event.data.object;
        const sub = await subRow(sb, s.id);
        if (!sub) return;
        await enqueueBillingEmail("plan_paused", sub.user_id, { planName: planName(sub) }, { dedupe: `paused:${s.id}:${event.id}`, sb });
        return;
      }

      case "customer.subscription.deleted": {
        const s = event.data.object;
        const sub = await subRow(sb, s.id);
        if (!sub) return;
        await enqueueBillingEmail("plan_ended", sub.user_id, { planName: planName(sub), endedOn: day(s.ended_at ?? Math.floor(Date.now() / 1000)) }, { dedupe: `ended:${s.id}`, sb });
        return;
      }

      default:
        return;
    }
  } catch (e) {
    console.error("billing email", event.type, e);
  }
}
