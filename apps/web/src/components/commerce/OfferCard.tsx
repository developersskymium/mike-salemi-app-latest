"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Glass, Icon, IconButton, cx } from "@/components/ui";
import { logOfferEventAction } from "@/lib/actions/commerce";
import type { OfferSlotPlacement, OfferView } from "@/lib/loaders/commerce";
import "./commerce.css";

type Props = {
  view: OfferView;
  placement: OfferSlotPlacement;
  variant: "compact" | "feature";
  className?: string;
};

const KIND_ICON = { program: "programs", plan: "sparkle", bundle: "sparkle", run: "mountain", coaching: "people", resource: "library", url: "compass" } as const;

/** The offer itself. Logs a view once it is actually on screen, a click on the CTA, and dismissals. */
export function OfferCard({ view, placement, variant, className }: Props) {
  const { offer, href, external, image, eyebrow } = view;
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"shown" | "leaving" | "gone">("shown");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          void logOfferEventAction(offer.id, placement, "view");
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [offer.id, placement]);

  if (state === "gone") return null;

  const dismiss = () => {
    void logOfferEventAction(offer.id, placement, "dismiss");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setState("gone");
    else {
      setState("leaving");
      window.setTimeout(() => setState("gone"), 420);
    }
  };
  const click = () => void logOfferEventAction(offer.id, placement, "click");

  const cta = (
    <Link
      href={href}
      onClick={click}
      className="lq-btn lq-fx lq-press com-offer-cta"
      data-variant={variant === "feature" ? "white" : "glass"}
      data-size="sm"
      data-fx=""
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
    >
      <span>{offer.cta_label}</span>
      <Icon name="chevron" size="xs" />
    </Link>
  );
  const coupon = offer.coupon_code ? (
    <span className="com-offer-coupon lq-t12">
      Code <b className="lq-num">{offer.coupon_code}</b> applied at checkout
    </span>
  ) : null;

  return (
    <div ref={ref} className={cx("com-offer-wrap", className)} data-state={state} aria-label="Suggestion" role="complementary">
      <div className="com-offer-clip">
        {variant === "feature" && image ? (
          <div className="com-offer com-offer-feature lq-fx lq-lift" data-fx="">
            <div className="com-offer-photo">
              <Image src={image.url} alt={image.alt} fill sizes="(min-width: 1024px) 640px, 100vw" style={{ objectPosition: image.focal }} />
              <div className="lq-photo-scrim" />
            </div>
            <Glass level="clear" radius="panel" className="com-offer-feature-body">
              {eyebrow && <div className="lq-t12 com-offer-eyebrow">{eyebrow}</div>}
              <h3 className="lq-t20">{offer.headline}</h3>
              {offer.body && <p className="lq-t13 com-offer-bodytext">{offer.body}</p>}
              <div className="com-offer-actions">
                {cta}
                {coupon}
              </div>
            </Glass>
            <IconButton icon="close" label="Not now" variant="clear" size="sm" className="com-offer-x" onClick={dismiss} />
          </div>
        ) : (
          <Glass radius="card" className="com-offer com-offer-compact lq-lift">
            <div className="com-offer-thumb">
              {image ? (
                <Image src={image.url} alt={image.alt} fill sizes="112px" style={{ objectPosition: image.focal }} />
              ) : (
                <span className="com-offer-glyph" aria-hidden>
                  <Icon name={KIND_ICON[offer.target_kind] ?? "sparkle"} size="lg" />
                </span>
              )}
            </div>
            <div className="com-offer-text">
              {eyebrow && <div className="lq-t12 lq-c2 com-offer-eyebrow">{eyebrow}</div>}
              <h3 className="lq-t17">{offer.headline}</h3>
              {offer.body && <p className="lq-t13 lq-c2 com-offer-bodytext">{offer.body}</p>}
              <div className="com-offer-actions">
                {cta}
                {coupon}
              </div>
            </div>
            <IconButton icon="close" label="Not now" variant="plain" size="sm" className="com-offer-x" onClick={dismiss} />
          </Glass>
        )}
      </div>
    </div>
  );
}
