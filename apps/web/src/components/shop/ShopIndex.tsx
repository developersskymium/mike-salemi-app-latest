"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AmbientBackdrop, Glass, Icon, LargeTitle, Segmented, StatTile } from "@/components/ui";
import type { ShopData, ShopProduct } from "@/lib/loaders/shop";
import { fmtDayYear, money } from "@/components/you/format";
import "./shop.css";

type Filter = "all" | "digital" | "physical";

export function priceLabel(p: ShopProduct) {
  if (p.inquiry) return "By application";
  if (p.file_url) return "Included";
  const prices = p.variants.map((v) => v.price_cents);
  if (!prices.length) return "—";
  const min = Math.min(...prices);
  return `${prices.length > 1 && Math.max(...prices) !== min ? "From " : ""}${money(min, p.variants[0]!.currency)}`;
}

export const TRUST = [
  { icon: "lock" as const, title: "Secure checkout", body: "Card details never touch our servers." },
  { icon: "bell" as const, title: "Shipping updates", body: "Emailed the moment your order moves." },
  { icon: "sparkle" as const, title: "Built to last", body: "Leather goods made in Bulgaria." },
];

export function PreviewBanner() {
  return (
    <Glass radius="card" className="shp-preview" role="note">
      <Icon name="lock" size="sm" />
      <span className="lq-t13">
        <b>Preview.</b> The shop is hidden from members until it is switched on in Studio (Settings › <code>shop</code>). Checkout needs Stripe keys.
      </span>
    </Glass>
  );
}

export function ProductCard({ p }: { p: ShopProduct }) {
  return (
    <Link href={`/shop/${p.slug}`} className="shp-card lq-glass lq-fx lq-press" data-fx="">
      <span className="shp-card-img">
        {p.image && <Image src={p.image} alt="" fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" style={{ objectFit: "cover" }} />}
        <span className="shp-pill">{p.type === "physical" ? "Equipment" : p.file_url ? "Download" : "Digital"}</span>
      </span>
      <span className="shp-card-body">
        <span className="lq-t17 shp-card-name">{p.name}</span>
        <span className="lq-t13 lq-c2 shp-card-line">{p.tagline}</span>
        <span className="shp-card-foot">
          <b className="lq-t15 lq-num">{priceLabel(p)}</b>
          <Icon name="chevron" size="sm" className="lq-c3" />
        </span>
      </span>
    </Link>
  );
}

/** Shop (legacy layout): head, filter, product grid, trust row, your orders. */
export function ShopIndex({ d }: { d: ShopData }) {
  const [filter, setFilter] = useState<Filter>("all");
  const list = d.products.filter((p) => filter === "all" || p.type === filter);
  const spent = d.orders.filter((o) => o.status === "paid").reduce((n, o) => n + o.total_cents, 0);
  return (
    <>
      <AmbientBackdrop src="/media/shop/bulgarian-bag.jpg" position="50% 50%" fixed />
      <div className="tpy-title">
        <LargeTitle title="Tools for the practice" eyebrow="Shop" />
        <p className="lq-t17 lq-c2 shp-lede">Equipment Mike trains with, printable phase plans and sessions with Mike himself.</p>
      </div>
      <div className="shp-page">
        {!d.enabled && <PreviewBanner />}
        <Segmented<Filter>
          label="Filter products"
          value={filter}
          onChange={setFilter}
          className="shp-filter"
          options={[
            { value: "all", label: "Everything" },
            { value: "digital", label: "Digital" },
            { value: "physical", label: "Equipment" },
          ]}
        />
        <section aria-labelledby="shp-pick" className="shp-block">
          <h2 id="shp-pick" className="lq-t22 shp-h">Pick your next tool</h2>
          <div className="shp-grid">
            {list.map((p) => <ProductCard key={p.id} p={p} />)}
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
        <section aria-labelledby="shp-orders" className="shp-block">
          <h2 id="shp-orders" className="lq-t22 shp-h">Your orders</h2>
          <div className="shp-order-stats">
            <Glass radius="card" className="shp-stat"><StatTile value={d.orders.length} label="Orders" /></Glass>
            <Glass radius="card" className="shp-stat"><StatTile value={Math.round(spent / 100)} unit=" USD" label="Total spent" /></Glass>
          </div>
          <Glass radius="card" className="tpy-list">
            {d.orders.length ? (
              d.orders.map((o) => (
                <Link key={o.id} href="/you/billing" className="tpy-row">
                  <span className="tpy-row-icon" aria-hidden><Icon name="bookmark" size="sm" /></span>
                  <span className="tpy-row-main">
                    <span className="lq-t15">{o.items.map((i) => i.name).join(", ")}</span>
                    <span className="lq-t13 lq-c2 lq-num">{o.reference} · {fmtDayYear(o.created_at)} · {o.status === "paid" ? "Paid" : o.status}</span>
                  </span>
                  <b className="lq-t15 lq-num">{money(o.total_cents, o.currency)}</b>
                </Link>
              ))
            ) : (
              <div className="tpy-row"><span className="tpy-row-main"><span className="lq-t15 lq-c2">No orders yet. What you buy here shows up with its shipping updates.</span></span></div>
            )}
          </Glass>
        </section>
      </div>
    </>
  );
}
