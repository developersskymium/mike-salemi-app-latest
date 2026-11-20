"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Button, Glass, Icon, IconButton, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { buyShopItem } from "@/lib/actions/shop";
import type { ShopData, ShopImage, ShopProduct } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { cart } from "./cart";
import { CartButton, CartSheet, CHECKOUT_ERR, Stepper } from "./CartSheet";
import { buyable, CATEGORY, PreviewBanner, priceLabel, ProductCard } from "./ShopIndex";
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
  const [pending, start] = useTransition();
  const toast = useToast();
  const v = p.variants.find((x) => x.id === variant);
  const canBuy = buyable(p);
  const unit = v ? money(v.price_cents, v.currency) : priceLabel(p);
  const total = v ? money(v.price_cents * qty, v.currency) : priceLabel(p);
  const others = d.products.filter((x) => x.id !== p.id).sort((a, b) => Number(b.category === p.category) - Number(a.category === p.category)).slice(0, 3);
  const images: ShopImage[] = dedupe([...(p.image ? [{ src: p.image, alt: p.name, focal: p.gallery[0]?.focal } as ShopImage] : []), ...p.gallery]);
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
  const buyNow = () => {
    if (!v) return needSize();
    if (!d.payments) {
      toast(CHECKOUT_ERR.payments_not_configured!, { icon: "info" });
      return;
    }
    haptic(8);
    start(async () => {
      const r = await buyShopItem(v.id, qty);
      if (r.ok) window.location.href = r.url;
      else toast(CHECKOUT_ERR[r.error] ?? CHECKOUT_ERR.failed!, { icon: "close" });
    });
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
    <Button block icon="shop" onClick={add}>{v ? `Add to cart · ${total}` : "Add to cart"}</Button>
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
          <Gallery images={images} name={p.name} />
          <section className="shp-buy" aria-labelledby="shp-name">
            <span className="lq-eyebrow" data-tone="accent">{CATEGORY[p.category].label}</span>
            <h1 id="shp-name" className="lq-d-lg shp-name">{p.name}</h1>
            <p className="lq-d-sm lq-num shp-price">
              {unit}
              {v && p.variants.length > 1 && <span className="lq-t13 lq-c2"> · {split(v.label).size}</span>}
            </p>
            {p.description && <p className="lq-t15 lq-c2 shp-desc">{p.description}</p>}
            {p.bullets.length > 0 && (
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
                  <span className="lq-t12 lq-c2">{v ? split(v.label).detail : "Pick the weight you'll train with"}</span>
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
                        <span className="lq-t13 lq-num shp-size-price">{money(x.price_cents, x.currency)}</span>
                        {w > 0 && <span className="shp-size-bar" aria-hidden><i style={{ width: `${Math.max(14, (w / max) * 100)}%` }} /></span>}
                      </button>
                    );
                  })}
                </div>
                {p.category === "equipment" && (
                  <p className="lq-t12 lq-c2 shp-guide">
                    <Icon name="info" size="xs" /> Most men start with Medium, most women with Small. Go lighter for rotational work, heavier for carries.
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
              {canBuy && (
                <Button block variant="secondary" onClick={buyNow} disabled={pending}>
                  {pending ? "Opening secure checkout…" : "Buy now"}
                </Button>
              )}
            </div>
            {canBuy && !d.payments && <p className="lq-t12 lq-c2 shp-paynote"><Icon name="info" size="xs" /> Payments aren&apos;t switched on yet. Add to your cart now and check out when they are.</p>}
            {p.note && <p className="lq-t13 lq-c2">{p.note}</p>}
            {canBuy && <p className="lq-t13 lq-c2">{p.type === "physical" ? "Ships within the US. We email tracking as soon as it leaves." : "One-time payment · lifetime access."}</p>}
            <div className="shp-chips">
              {trust.map((t) => (
                <span key={t} className="shp-chip lq-t12"><Icon name="check" size="xs" /> {t}</span>
              ))}
            </div>
          </section>
        </div>

        {others.length > 0 && (
          <section aria-labelledby="shp-also" className="shp-block">
            <div className="shp-sech">
              <h2 id="shp-also" className="lq-d-md">Also in the shop</h2>
            </div>
            <div className="shp-grid">{others.map((x) => <ProductCard key={x.id} p={x} />)}</div>
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

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} products={d.products} payments={d.payments} />
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
