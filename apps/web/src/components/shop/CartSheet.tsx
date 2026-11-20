"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { EmptyScene } from "@/components/graphics";
import { Button, Icon, IconButton, Sheet, type ButtonVariant } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import type { ShopData, ShopProduct } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { cart, useCart } from "./cart";
import { unitCents } from "./pricing";
import { ProductVisual } from "./ShopIndex";

export const CHECKOUT_ERR: Record<string, string> = {
  offline: "This preview can't take payments. Checkout works on the live app.",
  closed: "The shop isn't open yet.",
  payments_not_configured: "Payments switch on soon. Your cart is saved on this device.",
  signed_out: "Sign in to check out.",
  not_found: "Something in your cart is no longer available. We've removed it.",
  by_application: "One item is by application only.",
  empty: "Your cart is empty.",
  failed: "Checkout didn't start. Try again in a moment.",
};

/** The cart pill: count badge, opens the cart sheet. */
export function CartButton({ onOpen, variant = "glass", size = "md" }: { onOpen: () => void; variant?: ButtonVariant; size?: "sm" | "md" | "lg" }) {
  const lines = useCart();
  const n = lines.reduce((s, l) => s + l.qty, 0);
  return (
    <Button variant={variant} size={size} icon="shop" onClick={onOpen} aria-label={`Cart, ${n} ${n === 1 ? "item" : "items"}`} className="shp-cartbtn">
      Cart{n > 0 && <span className="shp-cartbtn-n lq-num" aria-hidden>{n}</span>}
    </Button>
  );
}

/** Free-shipping progress line: "$38 to free shipping" → "Free shipping unlocked". */
export function ShipProgress({ subtotal, free, physical }: { subtotal: number; free: number; physical: boolean }) {
  if (!physical) return null;
  if (free <= 0) return <div className="shp-ship" data-done=""><span className="lq-t13"><Icon name="check" size="xs" /> Shipping included · USA orders only</span></div>;
  const left = Math.max(0, free - subtotal);
  return (
    <div className="shp-ship" data-done={left === 0 ? "" : undefined}>
      <span className="lq-t13">{left === 0 ? <><Icon name="check" size="xs" /> Free US shipping unlocked</> : <><b className="lq-num">{money(left, "usd")}</b> to free shipping</>}</span>
      <span className="shp-ship-track" aria-hidden><i style={{ width: `${Math.min(100, (subtotal / free) * 100)}%` }} /></span>
    </div>
  );
}

/** Cart lines priced from the catalogue for display (member price for members); the server re-prices at checkout. */
export function useCartRows(products: ShopProduct[], member: boolean) {
  const lines = useCart();
  const byVariant = useMemo(() => {
    const m = new Map<string, { p: ShopProduct; v: ShopProduct["variants"][number] }>();
    for (const p of products) for (const v of p.variants) m.set(v.id, { p, v });
    return m;
  }, [products]);
  useEffect(() => {
    if (lines.length) cart.prune(new Set(byVariant.keys()));
  }, [lines.length, byVariant]);
  const rows = lines.map((l) => ({ l, ...byVariant.get(l.variant)! })).filter((r) => r.p);
  const subtotal = rows.reduce((s, r) => s + unitCents(r.v, member) * r.l.qty, 0);
  const list = rows.reduce((s, r) => s + r.v.price_cents * r.l.qty, 0);
  return {
    rows,
    currency: rows[0]?.v.currency ?? "usd",
    subtotal,
    memberSaving: list - subtotal,
    count: rows.reduce((s, r) => s + r.l.qty, 0),
    physical: rows.some((r) => r.p.type === "physical"),
  };
}

/** Slide-in cart: lines, quantity steppers, free-shipping progress, one action to the one-page checkout. */
export function CartSheet({ open, onClose, d }: { open: boolean; onClose: () => void; d: ShopData }) {
  const { rows, currency, subtotal, memberSaving, count, physical } = useCartRows(d.products, d.member);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Your cart"
      description={count ? `${count} ${count === 1 ? "item" : "items"}` : undefined}
      desktop="side"
      detents={["large"]}
      footer={
        rows.length ? (
          <div className="shp-cart-foot">
            <ShipProgress subtotal={subtotal} free={d.shipping.free_cents} physical={physical} />
            <div className="shp-cart-sum">
              <span className="lq-t15">Subtotal</span>
              <b className="lq-d-sm lq-num">{money(subtotal, currency)}</b>
            </div>
            {memberSaving > 0 && <p className="lq-t13 shp-save-line lq-num">Member prices save you {money(memberSaving, currency)}</p>}
            <Button block icon="lock" href="/shop/checkout" onClick={onClose}>Checkout</Button>
            <p className="lq-t12 lq-c2 shp-cart-fine">Secure Stripe checkout · Apple Pay and Google Pay.{d.payments ? "" : " Payments switch on soon."}</p>
          </div>
        ) : undefined
      }
    >
      {rows.length ? (
        <ul className="shp-cart" aria-label="Items in your cart">
          {rows.map(({ l, p, v }) => (
            <li key={l.variant} className="shp-cart-line">
              <Link href={`/shop/${p.slug}`} className="shp-cart-img" onClick={onClose} aria-label={p.name}>
                <ProductVisual p={p} sizes="72px" />
              </Link>
              <div className="shp-cart-text">
                <span className="lq-t15 shp-cart-name">{p.name}</span>
                <span className="lq-t13 lq-c2">{v.label}</span>
                <div className="shp-cart-row">
                  <Stepper value={l.qty} onChange={(q) => cart.set(l.variant, q)} label={p.name} />
                  <b className="lq-t15 lq-num">{money(unitCents(v, d.member) * l.qty, v.currency)}</b>
                </div>
              </div>
              <IconButton icon="close" label={`Remove ${p.name} from cart`} variant="plain" size="sm" iconSize="xs" onClick={() => cart.remove(l.variant)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="shp-cart-empty">
          <EmptyScene scene="nothing-saved" size={170} />
          <p className="lq-d-sm">Your cart is empty</p>
          <p className="lq-t15 lq-c2">Add the bag and it waits here until you check out.</p>
          <Button variant="secondary" size="md" onClick={onClose}>Keep browsing</Button>
        </div>
      )}
    </Sheet>
  );
}

/** − n + quantity stepper (1–10). */
export function Stepper({ value, onChange, label, min = 1 }: { value: number; onChange: (n: number) => void; label: string; min?: number }) {
  return (
    <div className="shp-step" role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className="lq-press" onClick={() => { haptic(4); onChange(value - 1); }} disabled={value <= min && min > 0} aria-label="One less">
        <svg viewBox="0 0 24 24" className="lq-icon" data-size="xs" aria-hidden><path d="M6 12h12" /></svg>
      </button>
      <span className="lq-t15 lq-num" aria-live="polite">{value}</span>
      <button type="button" className="lq-press" onClick={() => { haptic(4); onChange(value + 1); }} disabled={value >= cart.MAX_QTY} aria-label="One more">
        <Icon name="plus" size="xs" />
      </button>
    </div>
  );
}
