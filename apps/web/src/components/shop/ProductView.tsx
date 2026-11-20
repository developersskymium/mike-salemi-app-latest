"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button, Glass, Icon, IconButton, Sheet, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import type { ShopData, ShopImage, ShopProduct, ShopVariant } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { cart } from "./cart";
import { CartButton, CartSheet, Stepper } from "./CartSheet";
import { buyable, CATEGORY, PreviewBanner, priceLabel, Stars, TRUST } from "./ShopIndex";
import { unitCents } from "./pricing";
import "./shop.css";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
const SIZE_NAME: Record<string, string> = { XS: "X-Small", S: "Small", M: "Medium", L: "Large", XL: "X-Large", XXL: "XX-Large" };

/** "M · 22 lb / 10 kg" → { size: "M", weight: "22 lb / 10 kg", lb: 22 } */
const split = (label: string) => {
  const [size, detail] = label.split("·").map((x) => x.trim());
  return { size: size ?? label, weight: detail ?? "", lb: Number(/(\d+(?:\.\d+)?)\s*lb/i.exec(label)?.[1] ?? 0) };
};

/** Mike's size guide for the Bulgarian Bag (mikesalemi.io). */
const BAG_GUIDE: { who: string; bag: string; lbs: [number, number] }[] = [
  { who: "Women under 120 lb", bag: "11–13 lb bag", lbs: [11, 13] },
  { who: "Women over 120 lb", bag: "13–17 lb bag", lbs: [13, 17] },
  { who: "Men under 170 lb", bag: "17–22 lb bag", lbs: [17, 22] },
  { who: "Men 170–199 lb", bag: "22–26 lb bag", lbs: [22, 26] },
  { who: "Men over 200 lb", bag: "26–37 lb bag", lbs: [26, 37] },
];

/** Product page: gallery | buy panel (size → weight, quantity, add to cart), details, learn-to-use-it, slide-in cart. */
export function ProductView({ p, d }: { p: ShopProduct; d: ShopData }) {
  const isBag = p.slug === "suples-bulgarian-bag";
  const groups = useMemo(() => {
    const m = new Map<string, ShopVariant[]>();
    for (const v of p.variants) {
      const k = split(v.label).size;
      m.set(k, [...(m.get(k) ?? []), v]);
    }
    return [...m.entries()].sort((a, b) => (SIZE_ORDER.indexOf(a[0]) + 99) % 99 - (SIZE_ORDER.indexOf(b[0]) + 99) % 99);
  }, [p.variants]);
  const twoStep = groups.length > 1 && groups.some(([, vs]) => vs.length > 1);
  const [size, setSize] = useState<string>(p.variants.length === 1 ? split(p.variants[0]!.label).size : "");
  const [variant, setVariant] = useState(p.variants.length === 1 ? p.variants[0]!.id : "");
  const [qty, setQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const toast = useToast();
  const v = p.variants.find((x) => x.id === variant);
  const canBuy = buyable(p);
  const inSize = groups.find(([k]) => k === size)?.[1] ?? [];
  const sizeFrom = (vs: ShopVariant[]) => Math.min(...vs.map((x) => unitCents(x, d.member)));
  const unitC = v ? unitCents(v, d.member) : 0;
  const unit = v ? money(unitC, v.currency) : size && inSize.length ? `From ${money(sizeFrom(inSize), "usd")}` : priceLabel(p, d.member);
  const total = v ? money(unitC * qty, v.currency) : unit;
  const rating = d.ratings[p.id];
  const images: ShopImage[] = dedupe([...(p.image ? [{ src: p.image, alt: p.name, fit: "cover", focal: "50% 50%" } as ShopImage] : []), ...p.gallery]);

  const pickSize = (k: string) => {
    haptic(6);
    setSize(k);
    const vs = groups.find(([g]) => g === k)?.[1] ?? [];
    setVariant(vs.length === 1 ? vs[0]!.id : "");
  };
  const needChoice = () => {
    haptic(12);
    toast(size ? "Choose a weight" : "Choose a size first", { icon: "info" });
    document.getElementById(size ? "shp-weights" : "shp-sizes")?.focus();
  };
  const add = () => {
    if (!v) return needChoice();
    haptic(8);
    cart.add(p.id, v.id, qty);
    toast(`${qty > 1 ? `${qty} × ` : ""}${p.name} added`, { tone: "success", icon: "check" });
    setCartOpen(true);
  };
  const cta = v ? `Add to cart · ${total}` : !size && p.variants.length > 1 ? "Choose a size" : "Choose a weight";
  const primary = p.inquiry ? (
    <Button block href={p.inquiry.href} iconAfter="arrowRight">{p.inquiry.label}</Button>
  ) : (
    <Button block size="lg" icon="shop" onClick={add}>{cta}</Button>
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
            <span className="lq-eyebrow" data-tone="accent">{isBag ? "Suples · Made in Bulgaria" : CATEGORY[p.category].label}</span>
            <h1 id="shp-name" className="lq-d-lg shp-name">{p.name}</h1>
            <div className="shp-price-row">
              <p className="lq-d-md lq-num shp-price">{unit}</p>
              {rating && <Stars value={rating.average} count={rating.count} />}
            </div>
            {v && <p className="lq-t13 lq-c2 lq-num">{SIZE_NAME[split(v.label).size] ?? split(v.label).size} · {split(v.label).weight}</p>}
            {p.tagline && <p className="lq-t15 shp-desc">{p.tagline}</p>}

            {p.variants.length > 1 && (
              <fieldset className="shp-sizes" id="shp-sizes" tabIndex={-1}>
                <legend className="shp-legend">
                  <span className="lq-t13"><b>Size</b>{size && <span className="lq-c2"> · {SIZE_NAME[size] ?? size}</span>}</span>
                  {isBag && <button type="button" className="shp-inline lq-t13" onClick={() => setGuide(true)}><Icon name="info" size="xs" /> Which size do I need?</button>}
                </legend>
                <div className="shp-chiprow" role="radiogroup" aria-label="Size">
                  {groups.map(([k, vs]) => (
                    <button key={k} type="button" role="radio" aria-checked={size === k} className="shp-opt lq-press" onClick={() => (twoStep ? pickSize(k) : (setSize(k), setVariant(vs[0]!.id)))}>
                      <span className="lq-t15 shp-opt-main">{k}</span>
                      <span className="lq-t12 lq-c2 lq-num">from {money(sizeFrom(vs), "usd")}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {twoStep && (
              <fieldset className="shp-sizes" id="shp-weights" tabIndex={-1} data-off={size ? undefined : ""}>
                <legend className="shp-legend">
                  <span className="lq-t13"><b>Weight</b>{!size && <span className="lq-c2"> · choose a size first</span>}</span>
                </legend>
                <div className="shp-chiprow" role="radiogroup" aria-label="Weight">
                  {(size ? inSize : []).map((x) => {
                    const s = split(x.label);
                    return (
                      <button key={x.id} type="button" role="radio" aria-checked={variant === x.id} className="shp-opt shp-opt-w lq-press" onClick={() => { haptic(6); setVariant(x.id); }}>
                        <span className="lq-t15 shp-opt-main lq-num">{s.weight.split("/")[0]!.trim()}</span>
                        <span className="lq-t12 lq-c2 lq-num">{s.weight.split("/")[1]?.trim()} · {money(unitCents(x, d.member), x.currency)}</span>
                      </button>
                    );
                  })}
                  {!size && <span className="lq-t13 lq-c2 shp-opt-empty">Pick XS to XXL above to see the weights.</span>}
                </div>
              </fieldset>
            )}

            {canBuy && (
              <div className="shp-qty">
                <span className="lq-t13"><b>Quantity</b></span>
                <Stepper value={qty} onChange={(n) => setQty(Math.max(1, n))} label={p.name} />
              </div>
            )}

            <div className="shp-action">{primary}</div>
            {p.type === "physical" && (
              <p className="lq-t13 lq-c2 shp-shipnote"><Icon name="check" size="xs" /> {p.note ?? "Ships within the US."}{d.payments ? "" : " · Payments switch on soon."}</p>
            )}

            <div className="shp-acc">
              {p.description && (
                <details open>
                  <summary className="lq-t15"><b>Details</b><Icon name="chevronDown" size="xs" /></summary>
                  <p className="lq-t15 lq-c2">{p.description}</p>
                  {p.bullets.length > 0 && (
                    <ul className="shp-bullets">
                      {p.bullets.map((b) => (
                        <li key={b} className="lq-t15"><span className="shp-bullet-ic" aria-hidden><Icon name="check" size="xs" /></span>{b}</li>
                      ))}
                    </ul>
                  )}
                </details>
              )}
              {isBag && (
                <>
                  <details>
                    <summary className="lq-t15"><b>Size guide</b><Icon name="chevronDown" size="xs" /></summary>
                    <GuideTable />
                  </details>
                  <details>
                    <summary className="lq-t15"><b>Warranty, shipping and returns</b><Icon name="chevronDown" size="xs" /></summary>
                    <p className="lq-t15 lq-c2">Two-year warranty on the genuine leather. USA orders only, and shipping is included in the price. Mike is an authorized Suples distributor and educator, so your bag is the original, made in Bulgaria.</p>
                  </details>
                </>
              )}
            </div>
          </section>
        </div>

        <ul className="shp-trust" aria-label="Why buy from Mike">
          {TRUST.map((t) => (
            <li key={t.label} className="shp-trust-item">
              <span className="shp-trust-ic" aria-hidden><Icon name={t.icon} size="sm" /></span>
              <span><b className="lq-t13">{t.label}</b><span className="lq-t12 lq-c2">{t.line}</span></span>
            </li>
          ))}
        </ul>

        {isBag && (
          <section aria-labelledby="shp-learn" className="shp-block">
            <div className="shp-sech">
              <div>
                <p className="lq-eyebrow" data-tone="warm">Learn to use it</p>
                <h2 id="shp-learn" className="lq-d-md">Train it the way Mike teaches it</h2>
              </div>
            </div>
            <div className="shp-grid" data-cols="2">
              <Link href="/programs/athleticism-4-life" className="shp-learn lq-press">
                <span className="shp-learn-img">
                  <Image src="/media/l5e/f9cc9459-fd95-4602-9ba0-1137217fdbfa/athleticism-4-life.png" alt="" fill sizes="(min-width: 640px) 50vw, 100vw" style={{ objectFit: "cover", objectPosition: "30% 30%" }} />
                </span>
                <span className="shp-card-body">
                  <span className="lq-eyebrow" data-tone="accent">Program</span>
                  <span className="lq-d-xs">Athleticism 4 Life</span>
                  <span className="lq-t13 lq-c2">The 30-day Bulgarian Bag program: swings, spins, throws and carries, coached step by step.</span>
                  <span className="shp-card-go lq-t13">See the program <Icon name="chevron" size="xs" /></span>
                </span>
              </Link>
              <a href="https://mikesalemi.io/bulgarianbagcertifications" target="_blank" rel="noreferrer" className="shp-learn lq-press">
                <span className="shp-learn-img">
                  <Image src="/media/summit/mike-coaching.jpg" alt="" fill sizes="(min-width: 640px) 50vw, 100vw" style={{ objectFit: "cover", objectPosition: "26% 20%" }} />
                </span>
                <span className="shp-card-body">
                  <span className="lq-eyebrow" data-tone="accent">In person</span>
                  <span className="lq-d-xs">Level 1 Bulgarian Bag Certification</span>
                  <span className="lq-t13 lq-c2">Learn the system in person with Mike and teach it to others.</span>
                  <span className="shp-card-go lq-t13">Certification details <Icon name="arrowRight" size="xs" /></span>
                </span>
              </a>
            </div>
          </section>
        )}
      </div>

      <div className="shp-bar-wrap">
        <div className="shp-bar">
          <span className="shp-bar-price">
            <b className="lq-t17 lq-num">{total}</b>
            <span className="lq-t12 lq-c2">{v ? `${qty > 1 ? `${qty} × ` : ""}${split(v.label).size} · ${split(v.label).weight.split("/")[0]!.trim()}` : size ? "Choose a weight" : "Choose a size"}</span>
          </span>
          <span className="shp-bar-act">{canBuy ? <Button size="md" icon="shop" onClick={add}>{v ? "Add to cart" : "Choose"}</Button> : primary}</span>
        </div>
      </div>

      <Sheet open={guide} onClose={() => setGuide(false)} title="Which size do I need?" description="Mike's guide for the Suples Bulgarian Bag" desktop="side" detents={["large"]}>
        <div className="shp-guide-sheet">
          <p className="lq-t15 lq-c2">Pick by your body weight. Between two? Go lighter: the bag is about speed and range, not grinding.</p>
          <GuideTable
            onPick={(lbs) => {
              const target = p.variants.find((x) => split(x.label).lb === lbs[0]) ?? p.variants.find((x) => split(x.label).lb >= lbs[0]);
              if (target) {
                setSize(split(target.label).size);
                setVariant(target.id);
              }
              setGuide(false);
            }}
          />
        </div>
      </Sheet>

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} d={d} />
    </>
  );
}

function GuideTable({ onPick }: { onPick?: (lbs: [number, number]) => void }) {
  return (
    <ul className="shp-guide-list">
      {BAG_GUIDE.map((g) => (
        <li key={g.who}>
          {onPick ? (
            <button type="button" className="shp-guide-row lq-press" onClick={() => onPick(g.lbs)}>
              <span className="lq-t15">{g.who}</span>
              <b className="lq-t15 lq-num">{g.bag}</b>
              <Icon name="chevron" size="xs" />
            </button>
          ) : (
            <span className="shp-guide-row">
              <span className="lq-t15">{g.who}</span>
              <b className="lq-t15 lq-num">{g.bag}</b>
            </span>
          )}
        </li>
      ))}
    </ul>
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
