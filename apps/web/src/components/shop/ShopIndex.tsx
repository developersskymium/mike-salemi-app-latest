"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button, Icon, useToast, type IconName } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import type { ShopCategory, ShopData, ShopProduct } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { cart } from "./cart";
import { CartButton, CartSheet } from "./CartSheet";
import { SelectorCard } from "./SelectorCard";
import { bestSaving, unitCents } from "./pricing";
import "@/components/commerce/commerce.css";
import "./shop.css";

export const CATEGORY: Record<ShopCategory, { label: string; short: string; icon: IconName }> = {
  bundles: { label: "Bundles", short: "Bundle", icon: "gift" },
  equipment: { label: "Equipment", short: "Equipment", icon: "kettlebell" },
  plans: { label: "Printable plans", short: "Plan", icon: "file" },
  coaching: { label: "Coaching", short: "Coaching", icon: "coaching" },
  retreats: { label: "Retreats", short: "Retreat", icon: "retreats" },
  digital: { label: "Digital", short: "Digital", icon: "sparkle" },
};

/** Card / header price: member price for members, "From" when sizes differ. */
export function priceLabel(p: ShopProduct, member = false) {
  if (p.inquiry) return "By application";
  if (p.file_url) return p.unlocked ? "Included" : "With Kettlebell Lifestyle";
  const prices = p.variants.map((v) => unitCents(v, member));
  if (!prices.length) return "—";
  const min = Math.min(...prices);
  return `${prices.length > 1 && Math.max(...prices) !== min ? "From " : ""}${money(min, p.variants[0]!.currency)}`;
}

/** Lowest member price, when it differs from the list price. */
export function memberLabel(p: ShopProduct) {
  const m = p.variants.map((v) => v.member_price_cents).filter((x): x is number => x != null);
  if (!m.length || p.inquiry || p.file_url) return null;
  return money(Math.min(...m), p.variants[0]!.currency);
}

/** Buyable through the cart (priced variants, not by application, not an included download). */
export const buyable = (p: ShopProduct) => !p.inquiry && !p.file_url && p.variants.some((v) => v.price_cents > 0);

export function PreviewBanner({ payments }: { payments: boolean }) {
  return (
    <div className="shp-note" role="note">
      <span className="shp-note-ic" aria-hidden><Icon name="lock" size="sm" /></span>
      <span className="lq-t13">
        <b>Admin preview.</b> Hidden from members<span className="shp-note-more"> until it&apos;s switched on in Studio › Settings › <code>shop</code>.
        {!payments && " Payments switch on when the Stripe keys are added."}</span>
      </span>
    </div>
  );
}

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="shp-stars lq-t12 lq-num" aria-label={`Rated ${value} out of 5${count ? ` by ${count} members` : ""}`}>
      <Icon name="star" size="xs" /> {value.toFixed(1)}{count ? <span className="lq-c2"> ({count})</span> : null}
    </span>
  );
}

/** Product photo (real photography only). */
export function ProductVisual({ p, sizes }: { p: ShopProduct; sizes: string; bellSize?: number }) {
  const cover = p.image ?? p.gallery[0]?.src ?? null;
  if (cover) return <Image src={cover} alt="" fill sizes={sizes} style={{ objectFit: "cover", objectPosition: p.gallery[0]?.focal ?? p.mike_photo?.focal ?? "50% 30%" }} />;
  return <span className="shp-card-fallback" aria-hidden><Icon name={CATEGORY[p.category].icon} size="lg" /></span>;
}

export function ProductCard({ p, d, onAdd }: { p: ShopProduct; d: Pick<ShopData, "member" | "ratings" | "products">; onAdd?: (p: ShopProduct) => void }) {
  const quick = onAdd && buyable(p) && p.variants.length === 1;
  const member = memberLabel(p);
  const saving = p.bundle.length ? bestSaving(p, d.products, d.member) : 0;
  const rating = d.ratings[p.id];
  return (
    <article className="shp-card">
      <Link href={`/shop/${p.slug}`} className="shp-card-link lq-press" aria-label={`${p.name}, ${priceLabel(p, d.member)}`}>
        <span className="shp-card-img">
          <ProductVisual p={p} sizes="(min-width: 1280px) 380px, (min-width: 640px) 50vw, 100vw" />
          {saving > 0 ? <span className="shp-pill" data-tone="save">Save {money(saving, p.variants[0]!.currency)}</span> : null}
        </span>
        <span className="shp-card-body">
          <span className="shp-card-top">
            <span className="lq-d-xs shp-card-name">{p.name}</span>
            {rating && <Stars value={rating.average} />}
          </span>
          {p.tagline && <span className="lq-t13 lq-c2 shp-card-line">{p.tagline}</span>}
          <span className="shp-card-foot">
            <span className="shp-card-price">
              <b className="lq-t15 lq-num" data-tone={p.inquiry || p.file_url ? "quiet" : undefined}>{priceLabel(p, d.member)}</b>
              {member && (d.member ? <span className="lq-t12 lq-c2 lq-num">Member price</span> : <span className="lq-t12 lq-c2 lq-num">Members {member}</span>)}
            </span>
            {!quick && <span className="shp-card-go lq-t13">{p.inquiry ? "Apply" : p.file_url ? "View" : p.variants.length > 1 ? "Choose" : "View"} <Icon name="chevron" size="xs" /></span>}
          </span>
        </span>
      </Link>
      {quick && (
        <Button size="sm" variant="tint" icon="plus" className="shp-card-add" onClick={() => onAdd(p)} aria-label={`Add ${p.name} to cart`}>
          Add
        </Button>
      )}
    </article>
  );
}

/** Real reasons to buy from Mike, shown under the hero and on the product page. */
export const TRUST: { icon: IconName; label: string; line: string }[] = [
  { icon: "flag", label: "Made in Bulgaria", line: "Original Suples, genuine leather" },
  { icon: "check", label: "2-year warranty", line: "On genuine leather" },
  { icon: "shop", label: "Free US shipping", line: "Shipping included · USA only" },
  { icon: "medal", label: "Authorized Suples distributor", line: "Mike is a Suples educator" },
];

export function TrustStrip() {
  return (
    <ul className="shp-trust" aria-label="Why buy from Mike">
      {TRUST.map((t) => (
        <li key={t.label} className="shp-trust-item">
          <span className="shp-trust-ic" aria-hidden><Icon name={t.icon} size="sm" /></span>
          <span>
            <b className="lq-t13">{t.label}</b>
            <span className="lq-t12 lq-c2">{t.line}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Shop: a calm header and the product grid (product photography only). Cart in a side sheet. No order history here (that lives in You › Orders). */
export function ShopIndex({ d, selector }: { d: ShopData; selector: Record<string, unknown> | null }) {
  const [cartOpen, setCartOpen] = useState(false);
  const toast = useToast();
  const list = d.products;

  const add = (p: ShopProduct) => {
    const v = p.variants[0];
    if (!v) return;
    haptic(8);
    cart.add(p.id, v.id, 1);
    toast(`${p.name} added to your cart`, { tone: "success", icon: "check" });
  };

  return (
    <div className="shp-page">
      {!d.enabled && <PreviewBanner payments={d.payments} />}

      <header className="shp-head">
        <div>
          <h1 className="lq-d-lg">Shop</h1>
          <p className="lq-t15 lq-c2">Gear Mike trains with. Shipping included · USA only.</p>
        </div>
        <CartButton onOpen={() => setCartOpen(true)} variant="secondary" />
      </header>

      <section aria-label="Products" className="shp-block">
        <div className="shp-grid shp-grid-calm">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} d={d} onAdd={add} />
          ))}
        </div>
      </section>

      {selector && <SelectorCard config={selector} />}

      <p className="shp-foot lq-t13 lq-c2">
        <Icon name="lock" size="xs" /> Secure checkout through Stripe · USA orders only · Shipping included
      </p>

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} d={d} />
    </div>
  );
}
