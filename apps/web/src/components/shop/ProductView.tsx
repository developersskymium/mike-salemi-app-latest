"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Glass, Icon, IconButton, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import type { ShopData, ShopImage, ShopProduct } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { cart } from "./cart";
import { CartButton, CartSheet, Stepper } from "./CartSheet";
import { buyable, CATEGORY, PreviewBanner, priceLabel, ProductCard, Stars } from "./ShopIndex";
import { BellArt, bellWeights } from "./BellArt";
import { bundleFor, unitCents } from "./pricing";
import "./shop.css";

const split = (label: string) => {
  const [size, detail] = label.split("·").map((x) => x.trim());
  return { size: size ?? label, detail: detail ?? "" };
};
const weightOf = (label: string) => Number(/(\d+(?:\.\d+)?)\s*(lb|kg)/i.exec(label)?.[1] ?? 0);

/** Product page (legacy L29): context bar, gallery | buy panel, "Also in the shop", phone buy bar. */
export function ProductView({ p, d }: { p: ShopProduct; d: ShopData }) {
  const [variant, setVariant] = useState(p.variants.length === 1 ? p.variants[0]!.id : "");
  const [qty, setQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const toast = useToast();
  const v = p.variants.find((x) => x.id === variant);
  const canBuy = buyable(p);
  const unitC = v ? unitCents(v, d.member) : 0;
  const unit = v ? money(unitC, v.currency) : priceLabel(p, d.member);
  const total = v ? money(unitC * qty, v.currency) : priceLabel(p, d.member);
  const listUnit = v && d.member && v.member_price_cents != null && v.member_price_cents < v.price_cents ? money(v.price_cents, v.currency) : null;
  const memberOffer = v && !d.member && v.member_price_cents != null && v.member_price_cents < v.price_cents ? money(v.member_price_cents, v.currency) : null;
  const bundle = bundleFor(p, v ?? p.variants[0], d.products, d.member);
  const rating = d.ratings[p.id];
  const bells = bellWeights(p, v?.key);
  const others = d.products
    .filter((x) => x.id !== p.id)
    .sort((a, b) => Number(b.need === p.need) - Number(a.need === p.need) || Number(b.category === p.category) - Number(a.category === p.category))
    .slice(0, 3);
  const images: ShopImage[] = dedupe([...(p.image ? [{ src: p.image, alt: p.name, focal: p.gallery[0]?.focal ?? p.mike_photo?.focal } as ShopImage] : []), ...p.gallery]);
  const trust =
    p.category === "equipment"
      ? ["Secure Stripe checkout", "Ships within the US", "Handmade leather"]
      : p.file_url
        ? ["Instant download", "Print or save to phone", "Yours for life"]
        : ["Personal reply from Mike's team", "No payment to apply", "Fit and timing first"];

  const needSize = () => {
    haptic(12);
    toast("Choose a size first", { icon: "info" });
    document.getElementById("shp-sizes")?.focus();
  };
  const add = () => {
    if (!v) return needSize();
    haptic(8);
    cart.add(p.id, v.id, qty);
    toast(`${qty > 1 ? `${qty} × ` : ""}${p.name} added`, { tone: "success", icon: "check" });
    setCartOpen(true);
  };
  const primary = p.inquiry ? (
    <Button block href={p.inquiry.href} iconAfter="arrowRight">{p.inquiry.label}</Button>
  ) : p.file_url ? (
    p.unlocked ? (
      <Button block href={p.file_url} icon="download" target="_blank">Download the PDF</Button>
    ) : (
      <Button block href="/programs/kettlebell-lifestyle" iconAfter="arrowRight">Included with Kettlebell Lifestyle</Button>
    )
  ) : (
    <Button block icon="shop" onClick={add}>{v ? `Add to cart · ${total}` : p.variants.length > 1 ? "Choose a size" : "Add to cart"}</Button>
  );

  return (
    <>
      <div className="shp-ctx-wrap">
        <Glass className="shp-ctx" radius="pill">
          <IconButton icon="back" label="Back to the shop" href="/shop" size="sm" />
          <span className="shp-ctx-mid">
            <b className="lq-t15">{p.name}</b>
            <span className="lq-t13 lq-c2 lq-num">{unit}</span>
          </span>
          <span className="shp-ctx-act">
            <CartButton onOpen={() => setCartOpen(true)} size="sm" />
          </span>
        </Glass>
      </div>

      <div className="shp-page">
        {!d.enabled && <PreviewBanner payments={d.payments} />}
        <div className="shp-product">
          {bells.length && !p.image ? (
            <div className="shp-gal">
              <div className="shp-gallery shp-gallery-bells" role="img" aria-label={`${p.name}${v ? `, ${v.label}` : ""}`}>
                <BellArt weights={bells} size={240} />
              </div>
            </div>
          ) : (
            <Gallery images={images} name={p.name} />
          )}
          <section className="shp-buy" aria-labelledby="shp-name">
            <span className="lq-eyebrow" data-tone="accent">{CATEGORY[p.category].label}</span>
            <h1 id="shp-name" className="lq-d-lg shp-name">{p.name}</h1>
            <div className="shp-price-row">
              <p className="lq-d-sm lq-num shp-price">
                {unit}
                {listUnit && <s className="lq-t15 lq-c2 shp-was">{listUnit}</s>}
              </p>
              {rating && <Stars value={rating.average} count={rating.count} />}
            </div>
            {listUnit && <p className="lq-t13 shp-save-line">Member price, included with your plan</p>}
            {memberOffer && <p className="lq-t13 lq-c2">{memberOffer} for Pro and Max members · <Link href="/you/billing" className="shp-inline">See plans</Link></p>}
            {p.description && <p className="lq-t15 lq-c2 shp-desc">{p.description}</p>}
            {bundle && bundle.parts.length > 0 && (
              <div className="shp-bundle">
                <p className="lq-t13 shp-bundle-h">In the box</p>
                <ul>
                  {bundle.parts.map((x) => (
                    <li key={x.variant.id} className="lq-t15">
                      <span>{x.qty > 1 ? `${x.qty} × ` : ""}{x.product.name} · {x.variant.label.split("·")[0]!.trim()}</span>
                      <span className="lq-num lq-c2">{money(unitCents(x.variant, d.member) * x.qty, x.variant.currency)}</span>
                    </li>
                  ))}
                </ul>
                {bundle.saving > 0 && <p className="lq-t13 shp-save-line lq-num">You save {money(bundle.saving, p.variants[0]!.currency)} against buying them separately</p>}
              </div>
            )}
            {p.bullets.length > 0 && !bundle && (
              <ul className="shp-bullets">
                {p.bullets.map((b) => (
                  <li key={b} className="lq-t15"><span className="shp-bullet-ic" aria-hidden><Icon name="check" size="xs" /></span>{b}</li>
                ))}
              </ul>
            )}

            {p.variants.length > 1 && (
              <fieldset className="shp-sizes" id="shp-sizes" tabIndex={-1}>
                <legend className="shp-legend">
                  <span className="lq-t13">Size</span>
                  <span className="lq-t12 lq-c2">{v ? split(v.label).detail : p.variants.some((x) => x.weight_kg) ? "Pick the weight you'll train with" : "Pick your size"}</span>
                </legend>
                <div className="shp-size-grid" role="radiogroup" aria-label="Size">
                  {p.variants.map((x) => {
                    const s = split(x.label);
                    const w = weightOf(x.label);
                    const max = Math.max(...p.variants.map((y) => weightOf(y.label)), 1);
                    return (
                      <button
                        key={x.id}
                        type="button"
                        role="radio"
                        aria-checked={variant === x.id}
                        className="shp-size lq-press"
                        onClick={() => {
                          haptic(6);
                          setVariant(x.id);
                        }}
                      >
                        <span className="lq-t15 shp-size-name">{s.size}</span>
                        <span className="lq-t12 lq-c2 lq-num">{s.detail}</span>
                        <span className="lq-t13 lq-num shp-size-price">{money(unitCents(x, d.member), x.currency)}</span>
                        {w > 0 && <span className="shp-size-bar" aria-hidden><i style={{ width: `${Math.max(14, (w / max) * 100)}%` }} /></span>}
                      </button>
                    );
                  })}
                </div>
                {p.slug === "suples-bulgarian-bag" && (
                  <p className="lq-t12 lq-c2 shp-guide">
                    <Icon name="info" size="xs" /> Most men start with Medium, most women with Small. Go lighter for rotational work, heavier for carries.
                  </p>
                )}
                {p.variants.some((x) => x.weight_kg) && (
                  <p className="lq-t12 lq-c2 shp-guide">
                    <Icon name="info" size="xs" /> Not sure? <Link href="/shop#shp-sel-h" className="shp-inline">The Kettlebell Selector</Link> picks your weight in four questions.
                  </p>
                )}
              </fieldset>
            )}

            {canBuy && (
              <div className="shp-qty">
                <span className="lq-t13">Quantity</span>
                <Stepper value={qty} onChange={(n) => setQty(Math.max(1, n))} label={p.name} />
              </div>
            )}

            <div className="shp-action">
              {primary}
            </div>
            {p.note && <p className="lq-t13 lq-c2">{p.note}</p>}
            {canBuy && p.type === "physical" && <p className="lq-t13 lq-c2">Free US shipping over {money(d.shipping.free_cents, "usd")}. Tracking shows in You as soon as it leaves.</p>}
            <div className="shp-chips">
              {trust.map((t) => (
                <span key={t} className="shp-chip lq-t12"><Icon name="check" size="xs" /> {t}</span>
              ))}
            </div>
          </section>
        </div>

        {(p.mike_photo || p.used_in.length > 0) && (
          <section className="shp-mike" aria-labelledby="shp-mike-h">
            {p.mike_photo && (
              <figure className="shp-mike-fig">
                <Image src={p.mike_photo.src} alt={p.mike_photo.alt} fill sizes="(min-width: 1024px) 520px, 100vw" style={{ objectFit: "cover", objectPosition: p.mike_photo.focal ?? "50% 30%" }} />
              </figure>
            )}
            <div className="shp-mike-text">
              <p className="lq-eyebrow" data-tone="accent">{p.mike_photo ? "Mike using it" : "Where you'll use it"}</p>
              <h2 id="shp-mike-h" className="lq-d-md">{p.mike_photo?.caption ?? "In your programs"}</h2>
              {p.used_in.length > 0 && (
                <ul className="shp-used">
                  {p.used_in.map((u) => (
                    <li key={u.label}>
                      <Link href={u.href} className="shp-used-link lq-press">
                        <span className="shp-used-ic" aria-hidden><Icon name="kettlebell" size="sm" /></span>
                        <span className="lq-t15"><span className="lq-c2">Used in </span>{u.label}</span>
                        <Icon name="chevron" size="xs" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section aria-labelledby="shp-also" className="shp-block">
            <div className="shp-sech">
              <h2 id="shp-also" className="lq-d-md">Also in the shop</h2>
            </div>
            <div className="shp-grid">{others.map((x) => <ProductCard key={x.id} p={x} d={d} />)}</div>
          </section>
        )}
      </div>

      <div className="shp-bar-wrap">
        <div className="shp-bar">
          <span className="shp-bar-price">
            <b className="lq-t17 lq-num">{total}</b>
            <span className="lq-t12 lq-c2">{v ? `${qty > 1 ? `${qty} × ` : ""}${split(v.label).size}` : p.variants.length > 1 ? "Choose a size" : p.tagline}</span>
          </span>
          <span className="shp-bar-act">{canBuy ? <Button size="md" icon="shop" onClick={add}>Add to cart</Button> : primary}</span>
        </div>
      </div>

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} d={d} />
    </>
  );
}

function dedupe(list: ShopImage[]) {
  const seen = new Set<string>();
  return list.filter((i) => (seen.has(i.src) ? false : (seen.add(i.src), true)));
}

/** Gallery: one large image (cover with a focal point, or contain for documents), thumbnails, arrows, swipe. */
function Gallery({ images, name }: { images: ShopImage[]; name: string }) {
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  const n = images.length;
  const go = (k: number) => setI(((k % n) + n) % n);
  if (!n) return <div className="shp-gallery shp-gallery-empty" aria-hidden><Icon name="shop" size="lg" /></div>;
  const img = images[i]!;
  return (
    <div className="shp-gal">
      <div
        className="shp-gallery"
        data-fit={img.fit ?? "cover"}
        onTouchStart={(e) => (touch.current = e.touches[0]!.clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0]!.clientX - touch.current;
          if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${name} photos`}
      >
        {images.map((x, k) => (
          <Image
            key={x.src}
            src={x.src}
            alt={x.alt || name}
            fill
            priority={k === 0}
            sizes="(min-width: 1024px) 660px, 100vw"
            className="shp-gallery-img"
            data-on={k === i ? "" : undefined}
            aria-hidden={k !== i}
            style={{ objectFit: x.fit === "contain" ? "contain" : "cover", objectPosition: x.focal ?? "50% 50%" }}
          />
        ))}
        {n > 1 && (
          <>
            <IconButton icon="arrowLeft" label="Previous photo" variant="clear" size="sm" className="shp-gal-prev" onClick={() => go(i - 1)} />
            <IconButton icon="arrowRight" label="Next photo" variant="clear" size="sm" className="shp-gal-next" onClick={() => go(i + 1)} />
            <span className="shp-gal-count lq-t12 lq-num" aria-live="polite">{i + 1} / {n}</span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="shp-thumbs" role="tablist" aria-label="Choose a photo">
          {images.map((x, k) => (
            <button key={x.src} type="button" role="tab" aria-selected={k === i} aria-label={`Photo ${k + 1}`} className="shp-thumb lq-press" onClick={() => setI(k)}>
              <Image src={x.src} alt="" fill sizes="96px" style={{ objectFit: "cover", objectPosition: x.fit === "contain" ? "50% 0%" : x.focal ?? "50% 50%" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
