"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { AmbientBackdrop, Button, Glass, Icon, IconButton, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { buyShopItem } from "@/lib/actions/shop";
import type { ShopData, ShopProduct } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { PreviewBanner, priceLabel, ProductCard } from "./ShopIndex";
import "./shop.css";

const ERR: Record<string, string> = {
  offline: "Preview mode can't take orders. Checkout works on the live app.",
  closed: "The shop isn't open yet.",
  payments_not_configured: "Payments aren't set up yet.",
  signed_out: "Sign in to order.",
  not_found: "That size is no longer available.",
  failed: "Checkout didn't start. Try again in a moment.",
};

/** Product page (legacy layout): context bar, gallery | buy panel, "Also in the shop", phone buy bar. */
export function ProductView({ p, d }: { p: ShopProduct; d: ShopData }) {
  const [variant, setVariant] = useState(p.variants.length === 1 ? p.variants[0]!.id : "");
  const [pending, start] = useTransition();
  const toast = useToast();
  const v = p.variants.find((x) => x.id === variant);
  const price = v ? money(v.price_cents, v.currency) : priceLabel(p);
  const others = d.products.filter((x) => x.id !== p.id && (x.type === p.type || !x.file_url)).slice(0, 3);
  const trust = p.type === "physical" ? ["Secure checkout", "Ships from the US", "Made in Bulgaria"] : p.file_url ? ["Instant access", "Print or save", "Yours for life"] : ["Personal reply", "No payment to apply", "Yours for life"];

  const buy = () => {
    if (!v) {
      haptic(12);
      toast("Choose a size first", { icon: "close" });
      document.getElementById("shp-sizes")?.focus();
      return;
    }
    haptic(8);
    start(async () => {
      const r = await buyShopItem(v.id, 1);
      if (r.ok) window.location.href = r.url;
      else toast(ERR[r.error] ?? ERR.failed!, { icon: "close" });
    });
  };

  const action = p.inquiry ? (
    <Button block href={p.inquiry.href} iconAfter="chevron">{p.inquiry.label}</Button>
  ) : p.file_url ? (
    p.unlocked ? (
      <a className="lq-btn lq-fx lq-press" data-variant="filled" data-block="" data-fx="" href={p.file_url} download>
        <Icon name="down" size="sm" />
        <span>Download PDF</span>
      </a>
    ) : (
      <Button block href="/programs/kettlebell-lifestyle" iconAfter="chevron">Included with Kettlebell Lifestyle</Button>
    )
  ) : (
    <Button block onClick={buy} disabled={pending}>{pending ? "Starting checkout…" : `Buy now${v ? ` · ${price}` : ""}`}</Button>
  );

  return (
    <>
      {p.image && <AmbientBackdrop src={p.image} position="50% 50%" fixed />}
      <div className="shp-ctx-wrap">
        <Glass className="shp-ctx" radius="pill">
          <IconButton icon="back" label="Back to the shop" href="/shop" size="sm" />
          <span className="shp-ctx-mid">
            <b className="lq-t15">{p.name}</b>
            <span className="lq-t13 lq-c2 lq-num">{price}</span>
          </span>
          <span className="shp-ctx-act">{!p.inquiry && !p.file_url && <Button size="sm" onClick={buy} disabled={pending}>Buy</Button>}</span>
        </Glass>
      </div>

      <div className="shp-page">
        {!d.enabled && <PreviewBanner />}
        <div className="shp-product">
          <div className="shp-gallery">
            {p.image && <Image src={p.image} alt={p.name} fill priority sizes="(min-width: 1024px) 640px, 100vw" style={{ objectFit: "cover" }} />}
          </div>
          <Glass as="section" level="thick" className="shp-buy" aria-labelledby="shp-name">
            <span className="lq-t13 yu-eyebrow shp-eyebrow">{p.type === "physical" ? "Equipment" : p.file_url ? "Printable plan" : "Digital"}</span>
            <h1 id="shp-name" className="lq-t28 shp-name">{p.name}</h1>
            <p className="lq-t22 lq-num shp-price">{price}</p>
            {p.description && <p className="lq-t15 lq-c2">{p.description}</p>}
            {p.bullets.length > 0 && (
              <ul className="shp-bullets">
                {p.bullets.map((b) => (
                  <li key={b} className="lq-t15"><Icon name="check" size="xs" /> {b}</li>
                ))}
              </ul>
            )}
            {p.variants.length > 1 && (
              <fieldset className="shp-sizes" id="shp-sizes" tabIndex={-1}>
                <legend className="yu-overline">Choose a size</legend>
                <div className="shp-size-grid" role="radiogroup" aria-label="Size">
                  {p.variants.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      role="radio"
                      aria-checked={variant === x.id}
                      className="shp-size"
                      onClick={() => {
                        haptic(6);
                        setVariant(x.id);
                      }}
                    >
                      <span className="lq-t15">{x.label.split("·")[0]!.trim()}</span>
                      <span className="lq-t13 lq-c2 lq-num">{x.label.split("·")[1]?.trim()} · {money(x.price_cents, x.currency)}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="shp-action">{action}</div>
            {p.note && <p className="lq-t13 lq-c2">{p.note}</p>}
            {!p.inquiry && !p.file_url && <p className="lq-t13 lq-c2">{p.type === "physical" ? "We'll email shipping details once your order is confirmed." : "One-time payment · lifetime access."}</p>}
            <div className="shp-chips">
              {trust.map((t) => <span key={t} className="shp-chip lq-t12"><Icon name="check" size="xs" /> {t}</span>)}
            </div>
          </Glass>
        </div>

        {others.length > 0 && (
          <section aria-labelledby="shp-also" className="shp-block">
            <h2 id="shp-also" className="lq-t22 shp-h">Also in the shop</h2>
            <div className="shp-grid">{others.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </section>
        )}
      </div>

      <div className="shp-bar-wrap">
        <Glass level="thick" float className="shp-bar">
          <span className="shp-bar-price">
            <b className="lq-t17 lq-num">{price}</b>
            <span className="lq-t12 lq-c2">{v ? v.label : p.variants.length > 1 ? "Choose a size" : p.tagline}</span>
          </span>
          <span className="shp-bar-act">{action}</span>
        </Glass>
      </div>
    </>
  );
}
