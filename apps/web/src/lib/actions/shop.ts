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
  shipping_cents?: number;
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
  const rpc = service.rpc.bind(service) as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
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
        line_items: [
          ...(o.lines ?? []).map((l) =>
            l.stripe_price_id
              ? { price: l.stripe_price_id, quantity: l.quantity }
              : { quantity: l.quantity, price_data: { currency: o.currency ?? "usd", unit_amount: l.unit_cents, product_data: { name: `${l.name} — ${l.variant}`, metadata: { slug: l.slug } } } },
          ),
          ...(o.shipping_cents ? [{ quantity: 1, price_data: { currency: o.currency ?? "usd", unit_amount: o.shipping_cents, product_data: { name: "Shipping" } } }] : []),
        ],
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

/* ------------------------------------------------------------------ one-page checkout */

export interface ShopQuote {
  lines: { variant_id: string; name: string; variant: string; unit_cents: number; list_cents: number; quantity: number; slug: string; type: "digital" | "physical" }[];
  currency: string;
  member: boolean;
  subtotal_cents: number;
  member_saving_cents: number;
  shipping_cents: number;
  free_shipping_cents: number;
  physical: boolean;
  total_cents: number;
}
type CartItems = { variant: string; quantity: number }[];
const cleanItems = (items: CartItems) =>
  (Array.isArray(items) ? items : [])
    .filter((i) => i && typeof i.variant === "string" && /^[0-9a-f-]{36}$/i.test(i.variant))
    .slice(0, 20)
    .map((i) => ({ variant: i.variant, quantity: Math.max(1, Math.min(10, Math.floor(Number(i.quantity) || 1))) }));

/** Preview-mode quote from the fixture, mirroring private.shop_quote. */
async function mockQuote(items: CartItems): Promise<ShopQuote> {
  const { fixture } = await import("@/lib/mock");
  const d = await fixture<{ member: boolean; shipping: { free_cents: number; flat_cents: number }; products: { slug: string; name: string; type: "digital" | "physical"; variants: { id: string; label: string; price_cents: number; member_price_cents: number | null; currency: string }[] }[] }>("shop");
  const lines: ShopQuote["lines"] = [];
  for (const i of items) {
    for (const p of d.products) {
      const v = p.variants.find((x) => x.id === i.variant);
      if (!v) continue;
      const unit = d.member && v.member_price_cents != null ? v.member_price_cents : v.price_cents;
      lines.push({ variant_id: v.id, name: p.name, variant: v.label, unit_cents: unit, list_cents: v.price_cents, quantity: i.quantity, slug: p.slug, type: p.type });
    }
  }
  const sub = lines.reduce((s, l) => s + l.unit_cents * l.quantity, 0);
  const list = lines.reduce((s, l) => s + l.list_cents * l.quantity, 0);
  const physical = lines.some((l) => l.type === "physical");
  const ship = physical && sub < d.shipping.free_cents ? d.shipping.flat_cents : 0;
  return { lines, currency: "usd", member: d.member, subtotal_cents: sub, member_saving_cents: list - sub, shipping_cents: ship, free_shipping_cents: d.shipping.free_cents, physical, total_cents: sub + ship };
}

/** Price the cart on the server (member prices, shipping). Read-only. */
export async function quoteCart(items: CartItems): Promise<{ ok: true; quote: ShopQuote } | { ok: false; error: string; variant?: string }> {
  const clean = cleanItems(items);
  if (!clean.length) return { ok: false, error: "empty" };
  if (MOCK) return { ok: true, quote: await mockQuote(clean) };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "signed_out" };
  const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("quote_shop_cart", { p_items: clean });
  if (error) return { ok: false, error: "failed" };
  const q = data as ShopQuote & { error?: string; variant?: string };
  if (q.error) return { ok: false, error: q.error, variant: q.variant };
  return { ok: true, quote: q };
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  phone?: string;
}

/**
 * Start paying for the cart on the one-page checkout: the database re-prices and makes a pending order
 * (create_shop_checkout_order, service role), then a Stripe PaymentIntent is created for that exact total.
 * The browser confirms it with Stripe.js (Apple Pay / Google Pay / card). /shop/checkout/done verifies
 * the PaymentIntent on the server and marks the order paid (apply_paid_order).
 */
export async function startShopPayment(items: CartItems, shipping: ShippingAddress | null, email?: string): Promise<{ ok: true; clientSecret: string; orderId: string; total: number } | { ok: false; error: string; variant?: string }> {
  if (MOCK) return { ok: false, error: "payments_not_configured" };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "signed_out" };
  const clean = cleanItems(items);
  if (!clean.length) return { ok: false, error: "empty" };
  const sb = supabase as unknown as DB;
  const [{ data: setting }, { data: admin }] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "shop").maybeSingle(),
    sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
  ]);
  if (!(setting?.value as { enabled?: boolean } | null)?.enabled && !admin) return { ok: false, error: "closed" };
  if (!stripeConfigured()) return { ok: false, error: "payments_not_configured" };

  const addr = shipping
    ? {
        name: String(shipping.name ?? "").slice(0, 120),
        line1: String(shipping.line1 ?? "").slice(0, 200),
        line2: String(shipping.line2 ?? "").slice(0, 200),
        city: String(shipping.city ?? "").slice(0, 120),
        state: String(shipping.state ?? "").slice(0, 40),
        postal_code: String(shipping.postal_code ?? "").slice(0, 20),
        phone: String(shipping.phone ?? "").slice(0, 40),
        country: "US",
      }
    : null;

  const service = createServiceClient();
  const rpc = service.rpc.bind(service) as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("create_shop_checkout_order", { p_user: user.id, p_items: clean, p_shipping: addr });
  if (error) {
    console.error("create_shop_checkout_order", error.message);
    return { ok: false, error: "failed" };
  }
  const o = data as ShopQuote & { order_id?: string; reference?: string; error?: string; variant?: string };
  if (o.error) return { ok: false, error: o.error, variant: o.variant };
  if (o.physical && (!addr || !addr.name || !addr.line1 || !addr.city || !addr.state || !addr.postal_code)) {
    await service.from("orders").update({ status: "failed" }).eq("id", o.order_id!);
    return { ok: false, error: "address" };
  }
  const stripe = getStripe();
  try {
    const customer = await ensureStripeCustomer(stripe, service, user);
    const metadata = { order_id: o.order_id!, user_id: user.id, kind: "product", ref: "checkout" };
    const pi = await stripe.paymentIntents.create(
      {
        amount: o.total_cents,
        currency: o.currency,
        customer,
        automatic_payment_methods: { enabled: true },
        receipt_email: email || user.email || undefined,
        description: `Mike Salemi shop · ${o.reference}`,
        metadata,
        ...(addr ? { shipping: { name: addr.name, phone: addr.phone || undefined, address: { line1: addr.line1, line2: addr.line2 || undefined, city: addr.city, state: addr.state, postal_code: addr.postal_code, country: "US" } } } : {}),
      },
      { idempotencyKey: `shop-pi:${o.order_id}` },
    );
    await service.from("orders").update({ provider_ref: pi.id }).eq("id", o.order_id!);
    return pi.client_secret ? { ok: true, clientSecret: pi.client_secret, orderId: o.order_id!, total: o.total_cents } : { ok: false, error: "failed" };
  } catch (e) {
    console.error("shop payment intent", e);
    await service.from("orders").update({ status: "failed" }).eq("id", o.order_id!);
    return { ok: false, error: "failed" };
  }
}

/** Rate gear from a paid order (one rating per product, editable). The database checks the purchase. */
export async function rateGear(productId: string, rating: number): Promise<{ ok: boolean; error?: string }> {
  if (MOCK) return { ok: true };
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return { ok: false, error: "invalid" };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "signed_out" };
  const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("rate_shop_product", { p_product: productId, p_rating: Math.max(1, Math.min(5, Math.round(rating))) });
  if (error) return { ok: false, error: "failed" };
  const r = data as { ok?: boolean; error?: string };
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "failed" };
}
