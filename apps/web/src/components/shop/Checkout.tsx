"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Icon, IconButton } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { quoteCart, startShopPayment, type ShippingAddress, type ShopQuote } from "@/lib/actions/shop";
import type { ShopData } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { cart } from "./cart";
import { CHECKOUT_ERR, ShipProgress, useCartRows } from "./CartSheet";
import { PreviewBanner, ProductVisual } from "./ShopIndex";
import "./shop.css";

/* Minimal Stripe.js surface (loaded from js.stripe.com; no npm dependency). */
type StripeElement = { mount: (el: HTMLElement) => void; on: (ev: string, cb: (e: { resolve?: (o?: unknown) => void; expressPaymentType?: string }) => void) => void; destroy: () => void };
type StripeElements = { create: (type: string, opts?: unknown) => StripeElement; update: (o: unknown) => void; submit: () => Promise<{ error?: { message?: string } }> };
type StripeJs = { elements: (o: unknown) => StripeElements; confirmPayment: (o: unknown) => Promise<{ error?: { message?: string } }> };
declare global {
  interface Window {
    Stripe?: (pk: string) => StripeJs;
  }
}

function loadStripeJs(): Promise<NonNullable<Window["Stripe"]>> {
  return new Promise((resolve, reject) => {
    if (window.Stripe) return resolve(window.Stripe);
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error("stripe")));
    s.onerror = () => reject(new Error("stripe"));
    document.head.appendChild(s);
  });
}

const EMPTY_ADDR: ShippingAddress = { name: "", line1: "", line2: "", city: "", state: "", postal_code: "", phone: "" };
const ERR: Record<string, string> = { ...CHECKOUT_ERR, address: "Add your shipping address to continue.", mixed_currency: "Your cart mixes currencies. Check out one at a time." };

/**
 * One-page checkout: express wallets first (Apple Pay / Google Pay through Stripe), then contact,
 * shipping (equipment only) and card, with the server-priced summary beside it. Without Stripe keys
 * the page stays complete and shows a calm "Payments switch on soon" state.
 */
export function Checkout({ d, email, name, publishableKey }: { d: ShopData; email: string; name: string; publishableKey: string | null }) {
  const { rows, subtotal, physical, count } = useCartRows(d.products, d.member);
  const [quote, setQuote] = useState<ShopQuote | null>(null);
  const [addr, setAddr] = useState<ShippingAddress>({ ...EMPTY_ADDR, name });
  const [mail, setMail] = useState(email);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [openSum, setOpenSum] = useState(false);
  const [pending, start] = useTransition();
  const live = d.payments && !!publishableKey;
  const stripeRef = useRef<{ stripe: StripeJs; elements: StripeElements } | null>(null);
  const expressRef = useRef<HTMLDivElement>(null);
  const payRef = useRef<HTMLDivElement>(null);
  const key = rows.map((r) => `${r.l.variant}:${r.l.qty}`).join(",");

  // Server quote (member prices, shipping) whenever the cart changes.
  useEffect(() => {
    if (!key) return;
    let on = true;
    quoteCart(rows.map((r) => ({ variant: r.l.variant, quantity: r.l.qty }))).then((r) => {
      if (!on) return;
      if (r.ok) setQuote(r.quote);
      else {
        if (r.error === "not_found" && r.variant) cart.remove(r.variant);
        setError(ERR[r.error] ?? ERR.failed!);
      }
    });
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const total = quote?.total_cents ?? subtotal;
  const currency = quote?.currency ?? "usd";
  const missing = physical ? (["name", "line1", "city", "state", "postal_code"] as const).filter((k) => !addr[k]?.trim()) : [];
  const zipBad = physical && !!addr.postal_code && !/^\d{5}(-\d{4})?$/.test(addr.postal_code.trim());
  const mailBad = !!mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail);
  const valid = !missing.length && !zipBad && !mailBad && !!mail;
  const validRef = useRef(valid);
  validRef.current = valid;
  const payArgs = useRef({ rows, addr, mail, physical });
  payArgs.current = { rows, addr, mail, physical };

  const begin = async () => {
    const a = payArgs.current;
    const r = await startShopPayment(a.rows.map((x) => ({ variant: x.l.variant, quantity: x.l.qty })), a.physical ? a.addr : null, a.mail);
    if (!r.ok) throw new Error(ERR[r.error] ?? ERR.failed!);
    return r;
  };
  const confirm = async (clientSecret: string, orderId: string) => {
    const s = stripeRef.current!;
    const res = await s.stripe.confirmPayment({ elements: s.elements, clientSecret, confirmParams: { return_url: `${window.location.origin}/shop/checkout/done?order=${orderId}` } });
    if (res.error) throw new Error(res.error.message ?? ERR.failed!);
  };

  // Stripe Elements: Express Checkout (Apple Pay / Google Pay) + Payment Element, deferred intent.
  useEffect(() => {
    if (!live || !total || stripeRef.current) return;
    let cancelled = false;
    loadStripeJs()
      .then((Stripe) => {
        if (cancelled || !expressRef.current || !payRef.current) return;
        const stripe = Stripe(publishableKey!);
        const elements = stripe.elements({
          mode: "payment",
          amount: total,
          currency,
          appearance: { theme: "stripe", variables: { colorPrimary: "#1A85D6", borderRadius: "12px", fontFamily: "Inter, system-ui, sans-serif" } },
        });
        stripeRef.current = { stripe, elements };
        const express = elements.create("expressCheckout", { buttonType: { applePay: "buy", googlePay: "buy" }, buttonHeight: 48 });
        express.on("click", (e) => {
          setTouched(true);
          if (!validRef.current) {
            setError(ERR.address!);
            return;
          }
          e.resolve?.();
        });
        express.on("confirm", async () => {
          try {
            const r = await begin();
            await confirm(r.clientSecret, r.orderId);
          } catch (err) {
            setError(err instanceof Error ? err.message : ERR.failed!);
          }
        });
        express.mount(expressRef.current);
        elements.create("payment", { layout: "tabs", wallets: { applePay: "never", googlePay: "never" } }).mount(payRef.current);
        setReady(true);
      })
      .catch(() => setError("Secure payments didn't load. Check your connection and try again."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, total > 0]);

  useEffect(() => {
    if (stripeRef.current && total) stripeRef.current.elements.update({ amount: total });
  }, [total]);

  const pay = () => {
    setTouched(true);
    setError(null);
    if (!valid) {
      haptic(12);
      document.querySelector<HTMLInputElement>(".shp-co-form [aria-invalid='true']")?.focus();
      return;
    }
    if (!live) {
      setError(ERR.payments_not_configured!);
      return;
    }
    haptic(8);
    start(async () => {
      try {
        const sub = await stripeRef.current!.elements.submit();
        if (sub.error) throw new Error(sub.error.message ?? ERR.failed!);
        const r = await begin();
        await confirm(r.clientSecret, r.orderId);
      } catch (err) {
        setError(err instanceof Error ? err.message : ERR.failed!);
      }
    });
  };

  if (!rows.length) {
    return (
      <div className="shp-page shp-co-empty">
        <h1 className="lq-d-lg">Your cart is empty</h1>
        <p className="lq-t15 lq-c2">Add a bell or a bundle and come back here to check out.</p>
        <Button href="/shop" iconAfter="arrowRight">Back to the shop</Button>
      </div>
    );
  }

  const field = (k: keyof ShippingAddress, label: string, opts: { auto?: string; half?: boolean; optional?: boolean; mode?: "numeric" | "tel" } = {}) => {
    const bad = touched && !opts.optional && (missing as readonly string[]).includes(k);
    const zip = k === "postal_code" && touched && zipBad;
    return (
      <label className="shp-field" data-half={opts.half ? "" : undefined}>
        <span className="lq-t13">{label}{opts.optional && <span className="lq-c2"> (optional)</span>}</span>
        <input
          className="shp-input"
          value={addr[k] ?? ""}
          onChange={(e) => setAddr((a) => ({ ...a, [k]: e.target.value }))}
          autoComplete={opts.auto}
          inputMode={opts.mode}
          aria-invalid={bad || zip ? "true" : undefined}
          aria-describedby={bad || zip ? `shp-err-${k}` : undefined}
        />
        {(bad || zip) && <span id={`shp-err-${k}`} className="shp-field-err lq-t12" role="alert">{zip ? "Use a 5-digit ZIP code." : `Add your ${label.toLowerCase()}.`}</span>}
      </label>
    );
  };

  return (
    <div className="shp-page">
      {!d.enabled && <PreviewBanner payments={d.payments} />}
      <div className="shp-co-head">
        <IconButton icon="back" label="Back to the shop" href="/shop" size="sm" />
        <h1 className="lq-d-lg">Checkout</h1>
      </div>

      <div className="shp-co">
        <div className="shp-co-form">
          <section className="shp-co-sec" aria-labelledby="co-express">
            <h2 id="co-express" className="lq-d-xs">Express checkout</h2>
            {live ? (
              <div ref={expressRef} className="shp-co-express" data-ready={ready ? "" : undefined} />
            ) : (
              <div className="shp-co-soon" role="status">
                <span className="shp-co-wallets" aria-hidden>
                  <span className="shp-wallet">Apple Pay</span>
                  <span className="shp-wallet">Google Pay</span>
                </span>
                <span>
                  <b className="lq-t15">Payments switch on soon</b>
                  <span className="lq-t13 lq-c2">Your cart is saved. Apple Pay, Google Pay and card open here as soon as they do.</span>
                </span>
              </div>
            )}
          </section>

          <div className="shp-co-or lq-t12 lq-c2" aria-hidden><span>or pay with card</span></div>

          <section className="shp-co-sec" aria-labelledby="co-contact">
            <h2 id="co-contact" className="lq-d-xs">Contact</h2>
            <label className="shp-field">
              <span className="lq-t13">Email for your receipt{email && <span className="lq-c2"> · from your profile</span>}</span>
              <input className="shp-input" type="email" value={mail} onChange={(e) => setMail(e.target.value)} autoComplete="email" aria-invalid={touched && (mailBad || !mail) ? "true" : undefined} aria-describedby={touched && (mailBad || !mail) ? "shp-err-mail" : undefined} />
              {touched && (mailBad || !mail) && <span id="shp-err-mail" className="shp-field-err lq-t12" role="alert">Add an email we can send the receipt to.</span>}
            </label>
          </section>

          {physical && (
            <section className="shp-co-sec" aria-labelledby="co-ship">
              <h2 id="co-ship" className="lq-d-xs">Shipping <span className="lq-t13 lq-c2">· US only</span></h2>
              <div className="shp-fields">
                {field("name", "Full name", { auto: "shipping name" })}
                {field("line1", "Address", { auto: "shipping address-line1" })}
                {field("line2", "Apartment, suite", { auto: "shipping address-line2", optional: true })}
                {field("city", "City", { auto: "shipping address-level2", half: true })}
                {field("state", "State", { auto: "shipping address-level1", half: true })}
                {field("postal_code", "ZIP code", { auto: "shipping postal-code", half: true, mode: "numeric" })}
                {field("phone", "Phone for delivery", { auto: "shipping tel", half: true, optional: true, mode: "tel" })}
              </div>
            </section>
          )}

          <section className="shp-co-sec" aria-labelledby="co-pay">
            <h2 id="co-pay" className="lq-d-xs">Payment</h2>
            {live ? <div ref={payRef} className="shp-co-payel" /> : <p className="lq-t13 lq-c2 shp-co-card-soon"><Icon name="lock" size="xs" /> Card payments open here when payments switch on.</p>}
          </section>

          {error && <p className="shp-cart-notice lq-t13" role="alert"><Icon name="info" size="xs" /> {error}</p>}
          <Button block size="lg" icon="lock" onClick={pay} disabled={pending || (live && !ready)}>
            {pending ? "Paying securely…" : live ? `Pay ${money(total, currency)}` : "Payments switch on soon"}
          </Button>
          <p className="lq-t12 lq-c2 shp-co-fine">Secured by Stripe. Card details never touch our servers. Equipment ships within the US.</p>
        </div>

        <aside className="shp-co-sum" aria-labelledby="co-sum" data-open={openSum ? "" : undefined}>
          <button type="button" className="shp-co-sumtoggle" aria-expanded={openSum} onClick={() => setOpenSum((x) => !x)}>
            <h2 id="co-sum" className="lq-d-xs">Order summary <span className="lq-t13 lq-c2 lq-num">· {count} {count === 1 ? "item" : "items"}</span></h2>
            <span className="shp-co-sumtotal lq-t15 lq-num">{quote ? money(quote.total_cents, currency) : "…"} <Icon name={openSum ? "chevronUp" : "chevronDown"} size="xs" /></span>
          </button>
          <ul className="shp-co-lines">
            {rows.map(({ l, p, v }) => {
              const q = quote?.lines.find((x) => x.variant_id === v.id);
              return (
                <li key={l.variant}>
                  <span className="shp-co-thumb"><ProductVisual p={p} sizes="56px" bellSize={40} />{l.qty > 1 && <span className="shp-co-qty lq-num">{l.qty}</span>}</span>
                  <span className="shp-co-line-t">
                    <span className="lq-t15">{p.name}</span>
                    <span className="lq-t13 lq-c2">{v.label}</span>
                  </span>
                  <span className="lq-t15 lq-num">{q ? money(q.unit_cents * q.quantity, currency) : "…"}</span>
                </li>
              );
            })}
          </ul>
          <ShipProgress subtotal={quote?.subtotal_cents ?? subtotal} free={d.shipping.free_cents} physical={physical} />
          <dl className="shp-co-totals">
            <div><dt className="lq-t13">Subtotal</dt><dd className="lq-t15 lq-num">{quote ? money(quote.subtotal_cents, currency) : "…"}</dd></div>
            {physical && <div><dt className="lq-t13">Shipping</dt><dd className="lq-t15 lq-num">{quote ? (quote.shipping_cents ? money(quote.shipping_cents, currency) : "Free") : "…"}</dd></div>}
            <div className="shp-co-total"><dt className="lq-t15">Total</dt><dd className="lq-d-sm lq-num">{quote ? money(quote.total_cents, currency) : "…"}</dd></div>
          </dl>
          {quote && quote.member_saving_cents > 0 && <p className="lq-t13 shp-save-line lq-num"><Icon name="check" size="xs" /> Member prices save you {money(quote.member_saving_cents, currency)}</p>}
          <p className="lq-t12 lq-c2 shp-co-note">Prices are confirmed on our server when you pay.</p>
        </aside>
      </div>
    </div>
  );
}
