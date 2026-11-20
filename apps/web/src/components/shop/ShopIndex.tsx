"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PhotoHero } from "@/components/signature";
import { Button, Icon, useToast, type IconName } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import type { ShopCategory, ShopData, ShopNeed, ShopProduct } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { cart } from "./cart";
import { CartButton, CartSheet } from "./CartSheet";
import { BellArt, bellWeights } from "./BellArt";
import { SelectorCard } from "./SelectorCard";
import { bestSaving, NEEDS, unitCents } from "./pricing";
import "@/components/commerce/commerce.css";
import "./shop.css";

type Filter = "all" | ShopNeed;

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

/** Product photo, or the cast bell(s) for kettlebells without one. */
export function ProductVisual({ p, sizes, bellSize = 132 }: { p: ShopProduct; sizes: string; bellSize?: number }) {
  const weights = bellWeights(p);
  const cover = p.image ?? p.gallery[0]?.src ?? null;
  if (weights.length && !p.image) return <BellArt weights={weights} size={bellSize} className="shp-card-bells" />;
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

/** Shop: one hero, shop by need, the Kettlebell Selector, bundles, the grid. Cart in a side sheet. */
export function ShopIndex({ d, selector }: { d: ShopData; selector: Record<string, unknown> | null }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [cartOpen, setCartOpen] = useState(false);
  const toast = useToast();
  const needs = NEEDS.filter((n) => d.products.some((p) => p.need === n.id));
  const inFilter = (p: ShopProduct) => filter === "all" || p.need === filter;
  const bundles = d.products.filter((p) => p.category === "bundles" && inFilter(p));
  const list = d.products.filter((p) => p.category !== "bundles" && inFilter(p));
  const need = NEEDS.find((n) => n.id === filter);

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

      <PhotoHero
        image={{ src: "/media/summit/mike-windmill.jpg", alt: "Mike Salemi in a kettlebell windmill", focal: "72% 30%", focalPhone: "70% 24%" }}
        scrim="left"
        minHeight={320}
        priority
        className="shp-hero"
        as="header"
      >
        <p className="lq-eyebrow shp-hero-eyebrow">Shop</p>
        <h1 className="lq-d-xl">Tools for the practice</h1>
        <p className="lq-lede shp-hero-lede">What Mike trains with, chosen for where you are now.</p>
        <div className="shp-hero-actions">
          <CartButton onOpen={() => setCartOpen(true)} variant="onphoto" />
          {d.member && <span className="shp-hero-chip lq-t13"><Icon name="check" size="xs" /> Member prices on</span>}
        </div>
      </PhotoHero>

      <div className="shp-toolbar">
        <div className="shp-cats" role="tablist" aria-label="Shop by need">
          <NeedChip on={filter === "all"} onClick={() => setFilter("all")} label="Everything" />
          {needs.map((n) => (
            <NeedChip key={n.id} on={filter === n.id} onClick={() => setFilter(n.id)} label={n.label} />
          ))}
        </div>
      </div>

      {(filter === "all" || filter === "start") && selector && <SelectorCard config={selector} products={d.products} member={d.member} onAdded={() => setCartOpen(true)} />}

      {bundles.length > 0 && (
        <section aria-labelledby="shp-bundles" className="shp-block">
          <div className="shp-sech">
            <div>
              <p className="lq-eyebrow" data-tone="warm">Bundles</p>
              <h2 id="shp-bundles" className="lq-d-md">Better together</h2>
            </div>
          </div>
          <div className="shp-grid" data-cols="2">{bundles.map((p) => <ProductCard key={p.id} p={p} d={d} onAdd={add} />)}</div>
        </section>
      )}

      <section aria-labelledby="shp-pick" className="shp-block">
        <div className="shp-sech">
          <div>
            <p className="lq-eyebrow" data-tone="accent">{need ? need.label : "Everything"}</p>
            <h2 id="shp-pick" className="lq-d-md">{need ? need.line : "Pick your next tool"}</h2>
          </div>
          <Link href="/you?tab=history#yu-orders" className="shp-link lq-t15">Your orders <Icon name="chevron" size="xs" /></Link>
        </div>
        <div className="shp-grid">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} d={d} onAdd={add} />
          ))}
        </div>
      </section>

      <p className="shp-foot lq-t13 lq-c2">
        <Icon name="lock" size="xs" /> Secure checkout through Stripe · Free US shipping over {money(d.shipping.free_cents, "usd")} · Only what Mike trains with
      </p>

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} d={d} />
    </div>
  );
}

function NeedChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="tab" aria-selected={on} className="shp-cat lq-press" data-on={on ? "" : undefined} onClick={onClick}>
      <span className="lq-t13">{label}</span>
    </button>
  );
}
