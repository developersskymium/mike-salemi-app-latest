"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PhotoHero } from "@/components/signature";
import { Button, Glass, Icon, useToast, type IconName } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import type { ShopCategory, ShopData, ShopProduct } from "@/lib/loaders/shop";
import { OrderList } from "@/components/commerce/OrderList";
import { money } from "@/components/you/format";
import { cart } from "./cart";
import { CartButton, CartSheet } from "./CartSheet";
import "@/components/commerce/commerce.css";
import "./shop.css";

type Filter = "all" | ShopCategory;

export const CATEGORY: Record<ShopCategory, { label: string; short: string; icon: IconName }> = {
  equipment: { label: "Equipment", short: "Equipment", icon: "kettlebell" },
  plans: { label: "Printable plans", short: "Plans", icon: "file" },
  coaching: { label: "Coaching", short: "Coaching", icon: "coaching" },
  retreats: { label: "Retreats", short: "Retreats", icon: "retreats" },
  digital: { label: "Digital", short: "Digital", icon: "sparkle" },
};

export function priceLabel(p: ShopProduct) {
  if (p.inquiry) return "By application";
  if (p.file_url) return p.unlocked ? "Included" : "With Kettlebell Lifestyle";
  const prices = p.variants.map((v) => v.price_cents);
  if (!prices.length) return "—";
  const min = Math.min(...prices);
  return `${prices.length > 1 && Math.max(...prices) !== min ? "From " : ""}${money(min, p.variants[0]!.currency)}`;
}

/** Buyable through the cart (priced variants, not by application, not an included download). */
export const buyable = (p: ShopProduct) => !p.inquiry && !p.file_url && p.variants.some((v) => v.price_cents > 0);

export const TRUST: { icon: IconName; title: string; body: string }[] = [
  { icon: "lock", title: "Secure checkout", body: "Paid through Stripe. Card details never touch our servers." },
  { icon: "map", title: "Tracked shipping", body: "Equipment ships within the US, with updates by email." },
  { icon: "star", title: "Chosen by Mike", body: "Only what he trains with and teaches from." },
];

export function PreviewBanner({ payments }: { payments: boolean }) {
  return (
    <div className="shp-note" role="note">
      <span className="shp-note-ic" aria-hidden><Icon name="lock" size="sm" /></span>
      <span className="lq-t13">
        <b>Admin preview.</b> Hidden from members<span className="shp-note-more"> until it&apos;s switched on in Studio › Settings › <code>shop</code>.
        {!payments && " Payments aren't switched on yet, so checkout shows a notice instead of Stripe."}</span>
      </span>
    </div>
  );
}

export function ProductCard({ p, onAdd }: { p: ShopProduct; onAdd?: (p: ShopProduct) => void }) {
  const quick = onAdd && buyable(p) && p.variants.length === 1;
  const cover = p.image ?? p.gallery[0]?.src ?? null;
  return (
    <article className="shp-card">
      <Link href={`/shop/${p.slug}`} className="shp-card-link lq-press" aria-label={`${p.name}, ${priceLabel(p)}`}>
        <span className="shp-card-img">
          {cover ? (
            <Image src={cover} alt="" fill sizes="(min-width: 1280px) 380px, (min-width: 640px) 50vw, 100vw" style={{ objectFit: "cover", objectPosition: p.gallery[0]?.focal ?? "50% 50%" }} />
          ) : (
            <span className="shp-card-fallback" aria-hidden><Icon name={CATEGORY[p.category].icon} size="lg" /></span>
          )}
          <span className="shp-pill">{CATEGORY[p.category].short}</span>
        </span>
        <span className="shp-card-body">
          <span className="lq-d-xs shp-card-name">{p.name}</span>
          {p.tagline && <span className="lq-t13 lq-c2 shp-card-line">{p.tagline}</span>}
          <span className="shp-card-foot">
            <b className="lq-t15 lq-num" data-tone={p.inquiry || p.file_url ? "quiet" : undefined}>{priceLabel(p)}</b>
            {!quick && <span className="shp-card-go lq-t13">{p.inquiry ? "Apply" : p.file_url ? "View" : p.variants.length > 1 ? "Choose size" : "View"} <Icon name="chevron" size="xs" /></span>}
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

/** Shop (legacy L29 order): head, category filter, product grid, trust row, your orders. Cart in a side sheet. */
export function ShopIndex({ d }: { d: ShopData }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [cartOpen, setCartOpen] = useState(false);
  const toast = useToast();
  const counts = useMemo(() => {
    const c = new Map<ShopCategory, number>();
    for (const p of d.products) c.set(p.category, (c.get(p.category) ?? 0) + 1);
    return c;
  }, [d.products]);
  const cats = (Object.keys(CATEGORY) as ShopCategory[]).filter((c) => counts.get(c));
  const list = d.products.filter((p) => filter === "all" || p.category === filter);
  const paid = d.orders.filter((o) => o.status === "paid");
  const spent = paid.reduce((n, o) => n + o.total_cents, 0);
  const featured = d.products.find((p) => p.category === "equipment" && buyable(p));

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
        image={{ src: "/media/summit/mike-windmill.jpg", alt: "Mike Salemi in a kettlebell windmill", focal: "72% 30%", focalPhone: "70% 30%" }}
        scrim="left"
        minHeight={360}
        priority
        className="shp-hero"
        as="header"
      >
        <p className="lq-eyebrow shp-hero-eyebrow">Shop</p>
        <h1 className="lq-d-xl">Tools for the practice</h1>
        <p className="lq-lede shp-hero-lede">The equipment Mike trains with, printable phase plans and time with Mike himself.</p>
        <div className="shp-hero-actions">
          {featured && <Button href={`/shop/${featured.slug}`} iconAfter="arrowRight">Shop the {featured.name.split("®")[0]!.replace("Suples ", "")}</Button>}
          <CartButton onOpen={() => setCartOpen(true)} variant="onphoto" />
        </div>
      </PhotoHero>

      <div className="shp-toolbar">
        <div className="shp-cats" role="tablist" aria-label="Categories">
          <CatChip on={filter === "all"} onClick={() => setFilter("all")} label="Everything" count={d.products.length} />
          {cats.map((c) => (
            <CatChip key={c} on={filter === c} onClick={() => setFilter(c)} label={CATEGORY[c].label} count={counts.get(c)!} icon={CATEGORY[c].icon} />
          ))}
        </div>
      </div>

      <section aria-labelledby="shp-pick" className="shp-block">
        <div className="shp-sech">
          <div>
            <p className="lq-eyebrow" data-tone="accent">{filter === "all" ? "Everything" : CATEGORY[filter].label}</p>
            <h2 id="shp-pick" className="lq-d-md">Pick your next tool</h2>
          </div>
          <span className="lq-t13 lq-c2 lq-num">{list.length} {list.length === 1 ? "item" : "items"}</span>
        </div>
        <div className="shp-grid">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} onAdd={add} />
          ))}
        </div>
      </section>

      <div className="shp-trust">
        {TRUST.map((t) => (
          <Glass key={t.title} radius="card" className="shp-trust-tile">
            <span className="shp-trust-ic" aria-hidden><Icon name={t.icon} size="sm" /></span>
            <span>
              <b className="lq-t15">{t.title}</b>
              <span className="lq-t13 lq-c2">{t.body}</span>
            </span>
          </Glass>
        ))}
      </div>

      <section aria-labelledby="shp-orders" className="shp-block" id="orders">
        <div className="shp-sech">
          <div>
            <p className="lq-eyebrow" data-tone="accent">Your orders</p>
            <h2 id="shp-orders" className="lq-d-md">Order history</h2>
          </div>
          <Link href="/you/billing" className="shp-link lq-t15">Billing <Icon name="chevron" size="xs" /></Link>
        </div>
        <div className="shp-orders">
          <Glass radius="card" className="shp-ostats">
            <div>
              <span className="lq-dnum shp-ostat-n">{paid.length}</span>
              <span className="lq-t13 lq-c2">{paid.length === 1 ? "Order" : "Orders"}</span>
            </div>
            <div>
              <span className="lq-dnum shp-ostat-n">{money(spent, paid[0]?.currency ?? "usd")}</span>
              <span className="lq-t13 lq-c2">Total spent</span>
            </div>
          </Glass>
          <Glass radius="card" className="shp-olist">
            {d.orders.length ? (
              <OrderList orders={d.orders} />
            ) : (
              <p className="lq-t15 lq-c2 shp-oempty">No orders yet. What you buy here shows up with its receipt and shipping updates.</p>
            )}
          </Glass>
        </div>
      </section>

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} products={d.products} payments={d.payments} />
    </div>
  );
}

function CatChip({ on, onClick, label, count, icon }: { on: boolean; onClick: () => void; label: string; count: number; icon?: IconName }) {
  return (
    <button type="button" role="tab" aria-selected={on} className="shp-cat lq-press" data-on={on ? "" : undefined} onClick={onClick}>
      {icon && <Icon name={icon} size="xs" />}
      <span className="lq-t13">{label}</span>
      <span className="shp-cat-n lq-num">{count}</span>
    </button>
  );
}
