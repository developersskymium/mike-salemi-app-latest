"use server";

import { headers } from "next/headers";
import type { DB } from "@ms/api";
import { ensureStripeCustomer } from "@/lib/commerce/customers";
import { MOCK } from "@/lib/mock";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

export type ShopCheckout = { ok: true; url: string } | { ok: false; error: "offline" | "signed_out" | "closed" | "payments_not_configured" | "not_found" | "by_application" | "free_item" | "failed" };

interface ShopOrder {
  order_id?: string;
  reference?: string;
  amount_cents?: number;
  unit_cents?: number;
  quantity?: number;
  currency?: string;
  name?: string;
  variant?: string;
  type?: "digital" | "physical";
  slug?: string;
  stripe_price_id?: string | null;
  error?: ShopCheckout extends { error: infer E } ? E : never;
}

/**
 * Buy a shop variant: the database makes a pending order at the catalog price (create_shop_order,
 * service role only), then Stripe Checkout collects payment (and a US shipping address for physical goods).
 * The existing Stripe webhook marks the order paid (apply_paid_order).
 */
export async function buyShopItem(variantId: string, quantity = 1): Promise<ShopCheckout> {
  if (MOCK) return { ok: false, error: "offline" };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "signed_out" };
  if (!/^[0-9a-f-]{36}$/i.test(variantId)) return { ok: false, error: "not_found" };
  const sb = supabase as unknown as DB;
  const [{ data: setting }, { data: admin }] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "shop").maybeSingle(),
    sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
  ]);
  if (!(setting?.value as { enabled?: boolean } | null)?.enabled && !admin) return { ok: false, error: "closed" };
  if (!stripeConfigured()) return { ok: false, error: "payments_not_configured" };

  const service = createServiceClient();
  const { data, error } = await service.rpc("create_shop_order", { p_user: user.id, p_variant: variantId, p_quantity: Math.max(1, Math.min(10, Math.floor(quantity))) });
  if (error) {
    console.error("create_shop_order", error.message);
    return { ok: false, error: "failed" };
  }
  const o = data as ShopOrder;
  if (o.error) return { ok: false, error: o.error };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const stripe = getStripe();
  try {
    const customer = await ensureStripeCustomer(stripe, service, user);
    const metadata = { order_id: o.order_id!, user_id: user.id, kind: "product", ref: variantId };
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer,
        client_reference_id: o.order_id,
        line_items: [
          o.stripe_price_id
            ? { price: o.stripe_price_id, quantity: o.quantity ?? 1 }
            : { quantity: o.quantity ?? 1, price_data: { currency: o.currency ?? "usd", unit_amount: o.unit_cents!, product_data: { name: `${o.name} — ${o.variant}`, metadata: { slug: o.slug ?? "" } } } },
        ],
        ...(o.type === "physical" ? { shipping_address_collection: { allowed_countries: ["US"] }, phone_number_collection: { enabled: true } } : {}),
        metadata,
        payment_intent_data: { metadata },
        success_url: `${origin}/checkout/success?order=${o.order_id}&from=shop&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancelled?order=${o.order_id}&from=shop`,
      },
      { idempotencyKey: `shop:${o.order_id}` },
    );
    await service.from("orders").update({ provider_ref: session.id }).eq("id", o.order_id!);
    return session.url ? { ok: true, url: session.url } : { ok: false, error: "failed" };
  } catch (e) {
    console.error("shop checkout", e);
    await service.from("orders").update({ status: "failed" }).eq("id", o.order_id!);
    return { ok: false, error: "failed" };
  }
}

interface CartOrder {
  order_id?: string;
  reference?: string;
  currency?: string;
  physical?: boolean;
  lines?: { variant_id: string; name: string; variant: string; unit_cents: number; quantity: number; slug: string; stripe_price_id: string | null }[];
  error?: string;
}

export type CartCheckout =
  | { ok: true; url: string }
  | { ok: false; error: "offline" | "signed_out" | "closed" | "payments_not_configured" | "not_found" | "by_application" | "free_item" | "empty" | "failed"; variant?: string };

/**
 * Check out the whole cart: the database re-prices every line from shop_variants and makes one pending
 * order (create_shop_cart_order, service role only); Stripe Checkout collects payment, plus a US shipping
 * address when any line is equipment. The Stripe webhook marks the order paid (apply_paid_order).
 */
export async function checkoutCart(items: { variant: string; quantity: number }[]): Promise<CartCheckout> {
  if (MOCK) return { ok: false, error: "offline" };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "signed_out" };
  const clean = (Array.isArray(items) ? items : [])
    .filter((i) => i && typeof i.variant === "string" && /^[0-9a-f-]{36}$/i.test(i.variant))
    .slice(0, 20)
    .map((i) => ({ variant: i.variant, quantity: Math.max(1, Math.min(10, Math.floor(Number(i.quantity) || 1))) }));
  if (!clean.length) return { ok: false, error: "empty" };
  const sb = supabase as unknown as DB;
  const [{ data: setting }, { data: admin }] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "shop").maybeSingle(),
    sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
  ]);
  if (!(setting?.value as { enabled?: boolean } | null)?.enabled && !admin) return { ok: false, error: "closed" };
  if (!stripeConfigured()) return { ok: false, error: "payments_not_configured" };

  const service = createServiceClient();
  const rpc = service.rpc as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("create_shop_cart_order", { p_user: user.id, p_items: clean });
  if (error) {
    console.error("create_shop_cart_order", error.message);
    return { ok: false, error: "failed" };
  }
  const o = data as CartOrder;
  if (o.error) {
    const e = o.error as CartCheckout extends { error: infer E } ? E : never;
    return { ok: false, error: ["not_found", "by_application", "free_item", "empty"].includes(o.error) ? e : "failed", variant: (data as { variant?: string }).variant };
  }

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const stripe = getStripe();
  try {
    const customer = await ensureStripeCustomer(stripe, service, user);
    const metadata = { order_id: o.order_id!, user_id: user.id, kind: "product", ref: "cart" };
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer,
        client_reference_id: o.order_id,
        line_items: (o.lines ?? []).map((l) =>
          l.stripe_price_id
            ? { price: l.stripe_price_id, quantity: l.quantity }
            : { quantity: l.quantity, price_data: { currency: o.currency ?? "usd", unit_amount: l.unit_cents, product_data: { name: `${l.name} — ${l.variant}`, metadata: { slug: l.slug } } } },
        ),
        ...(o.physical ? { shipping_address_collection: { allowed_countries: ["US"] }, phone_number_collection: { enabled: true } } : {}),
        metadata,
        payment_intent_data: { metadata },
        success_url: `${origin}/checkout/success?order=${o.order_id}&from=shop&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancelled?order=${o.order_id}&from=shop`,
      },
      { idempotencyKey: `shop-cart:${o.order_id}` },
    );
    await service.from("orders").update({ provider_ref: session.id }).eq("id", o.order_id!);
    return session.url ? { ok: true, url: session.url } : { ok: false, error: "failed" };
  } catch (e) {
    console.error("shop cart checkout", e);
    await service.from("orders").update({ status: "failed" }).eq("id", o.order_id!);
    return { ok: false, error: "failed" };
  }
}
