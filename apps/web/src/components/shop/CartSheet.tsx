"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { EmptyScene } from "@/components/graphics";
import { Button, Icon, IconButton, Sheet, useToast, type ButtonVariant } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { checkoutCart } from "@/lib/actions/shop";
import type { ShopProduct } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { cart, useCart } from "./cart";

export const CHECKOUT_ERR: Record<string, string> = {
  offline: "This preview can't take payments. Checkout works on the live app.",
  closed: "The shop isn't open yet.",
  payments_not_configured: "Payments aren't switched on yet. Your cart is saved on this device.",
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

/** Cart: lines priced from the catalog (the server re-prices at checkout), quantity steppers, subtotal, Stripe checkout. */
export function CartSheet({ open, onClose, products, payments }: { open: boolean; onClose: () => void; products: ShopProduct[]; payments: boolean }) {
  const lines = useCart();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(payments ? null : "Payments aren't switched on yet. Your cart stays saved on this device until they are.");
  const byVariant = useMemo(() => {
    const m = new Map<string, { p: ShopProduct; v: ShopProduct["variants"][number] }>();
    for (const p of products) for (const v of p.variants) m.set(v.id, { p, v });
    return m;
  }, [products]);

  // Drop lines the catalog no longer sells.
  useEffect(() => {
    if (lines.length) cart.prune(new Set(byVariant.keys()));
  }, [lines.length, byVariant]);

  const rows = lines.map((l) => ({ l, ...byVariant.get(l.variant)! })).filter((r) => r.p);
  const currency = rows[0]?.v.currency ?? "usd";
  const subtotal = rows.reduce((s, r) => s + r.v.price_cents * r.l.qty, 0);
  const count = rows.reduce((s, r) => s + r.l.qty, 0);
  const physical = rows.some((r) => r.p.type === "physical");

  const checkout = () => {
    if (!payments) {
      setNotice(CHECKOUT_ERR.payments_not_configured!);
      haptic(12);
      return;
    }
    haptic(8);
    start(async () => {
      const r = await checkoutCart(rows.map((x) => ({ variant: x.l.variant, quantity: x.l.qty })));
      if (r.ok) {
        window.location.href = r.url;
        return;
      }
      if (r.error === "not_found" && r.variant) cart.remove(r.variant);
      setNotice(CHECKOUT_ERR[r.error] ?? CHECKOUT_ERR.failed!);
      toast(CHECKOUT_ERR[r.error] ?? CHECKOUT_ERR.failed!, { icon: "close" });
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Your cart"
      description={count ? `${count} ${count === 1 ? "item" : "items"} · saved on this device` : undefined}
      desktop="side"
      detents={["large"]}
      footer={
        rows.length ? (
          <div className="shp-cart-foot">
            <div className="shp-cart-sum">
              <span className="lq-t15">Subtotal</span>
              <b className="lq-d-sm lq-num">{money(subtotal, currency)}</b>
            </div>
            <p className="lq-t12 lq-c2">{physical ? "Shipping and tax are calculated at checkout. Equipment ships within the US." : "Tax is calculated at checkout."}</p>
            {notice && (
              <p className="shp-cart-notice lq-t13" role="status">
                <Icon name="info" size="xs" /> {notice}
              </p>
            )}
            <Button block icon="lock" onClick={checkout} disabled={pending}>
              {pending ? "Opening secure checkout…" : `Check out · ${money(subtotal, currency)}`}
            </Button>
          </div>
        ) : undefined
      }
    >
      {rows.length ? (
        <ul className="shp-cart" aria-label="Items in your cart">
          {rows.map(({ l, p, v }) => (
            <li key={l.variant} className="shp-cart-line">
              <Link href={`/shop/${p.slug}`} className="shp-cart-img" onClick={onClose} aria-label={p.name}>
                {p.image && <Image src={p.image} alt="" fill sizes="72px" style={{ objectFit: "cover" }} />}
              </Link>
              <div className="shp-cart-text">
                <span className="lq-t15 shp-cart-name">{p.name}</span>
                <span className="lq-t13 lq-c2">{v.label}</span>
                <div className="shp-cart-row">
                  <Stepper value={l.qty} onChange={(q) => cart.set(l.variant, q)} label={p.name} />
                  <b className="lq-t15 lq-num">{money(v.price_cents * l.qty, v.currency)}</b>
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
          <p className="lq-t15 lq-c2">Add equipment from the shop and it waits here, on this device, until you check out.</p>
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
