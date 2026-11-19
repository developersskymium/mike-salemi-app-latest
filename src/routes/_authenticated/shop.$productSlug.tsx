import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Download, Lock, ShieldCheck, Truck } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { ContextBar, Section } from "@/components/page-kit";
import { Pill } from "@/components/media";
import { Reveal } from "@/components/motion-kit";
import { buttonStyles } from "@/components/ui-kit";
import { CheckoutSheet, type CheckoutItem } from "@/components/checkout";
import { findProduct, formatPrice, productPriceLabel, shopProducts } from "@/content/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/shop/$productSlug")({
  head: ({ params }) => {
    const product = findProduct(params.productSlug);
    const title = product ? `${product.name} — Kettlebell Lifestyle Shop` : "Product — Kettlebell Lifestyle";
    const description = product?.tagline ?? "A product from the Kettlebell Lifestyle shop.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { productSlug } = Route.useParams();
  const product = findProduct(productSlug);
  const [variantId, setVariantId] = useState(product?.variants?.[0]?.id ?? "");
  const [checkout, setCheckout] = useState<CheckoutItem | null>(null);
  const [placed, setPlaced] = useState(false);

  if (!product) {
    return (
      <AppShell>
        <Container className="section">
          <p className="text-sm text-muted-foreground">That product does not exist.</p>
          <Link to="/shop" className={cn(buttonStyles.outline, "mt-4")}>
            Back to the shop
          </Link>
        </Container>
      </AppShell>
    );
  }

  const variant = product.variants?.find((v) => v.id === variantId);
  const price = variant?.priceCents ?? product.priceCents;
  const related = shopProducts.filter((p) => p.id !== product.id).slice(0, 3);

  const startCheckout = () =>
    setCheckout({
      productId: product.id,
      kind: "product",
      name: product.name,
      summary: product.tagline,
      variant: variant?.label,
      priceCents: price,
      terms:
        product.type === "physical"
          ? "We'll email shipping details once your order is confirmed."
          : "One-time payment · lifetime access.",
    });

  return (
    <AppShell>
      <ContextBar backTo="/shop" backLabel="Back to the shop" title={product.name} meta={productPriceLabel(product, price)} />

      <div className="animate-page pb-24 lg:pb-0">
        <Container className="pt-4">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            {product.image && (
              <Reveal>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-hairline bg-muted raise-soft">
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  <span className="absolute left-4 top-4">
                    <Pill>{product.type === "digital" ? "Digital" : "Equipment"}</Pill>
                  </span>
                </div>
              </Reveal>
            )}

            <Reveal delay={80}>
              <div className="rounded-3xl border border-hairline bg-surface p-5 sm:p-6">
                <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{product.name}</h1>
                <p className="lede mt-2">{product.tagline}</p>
                <p className="mt-4 text-sm text-muted-foreground">{product.description}</p>

                <ul className="mt-5 space-y-2">
                  {product.bullets.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {line}
                    </li>
                  ))}
                </ul>

                {product.variants && (
                  <div className="mt-6">
                    <p className="eyebrow text-muted-foreground">Choose a size</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {product.variants.map((v) => {
                        const active = v.id === variantId;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setVariantId(v.id)}
                            aria-pressed={active}
                            className={cn(
                              "tap rounded-2xl border px-3 py-2.5 text-left transition-colors duration-200",
                              active
                                ? "border-primary bg-primary/10"
                                : "border-hairline hover:border-primary/40",
                            )}
                          >
                            <span
                              className={cn(
                                "block text-sm font-semibold",
                                active ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {v.label}
                            </span>
                            <span className="numeric block text-xs text-muted-foreground">
                              {formatPrice(v.priceCents)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-6 hidden items-center gap-3 lg:flex">
                  <p className="numeric text-2xl font-semibold text-foreground">{productPriceLabel(product, price)}</p>
                  {product.inquiry ? (
                    <Link to={product.inquiry.to} className={buttonStyles.primary}>{product.inquiry.label}</Link>
                  ) : product.fileUrl ? (
                    <a href={product.fileUrl} download className={buttonStyles.primary}>
                      <Download className="h-4 w-4" /> Download
                    </a>
                  ) : (
                    <button type="button" disabled={placed} onClick={startCheckout} className={buttonStyles.primary}>
                      {placed ? "Order placed" : "Buy now"}
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {[
                    { icon: ShieldCheck, label: "Secure checkout" },
                    { icon: Truck, label: product.type === "physical" ? "Ships from the US" : "Instant access" },
                    { icon: Lock, label: "Yours for life" },
                  ].map((t) => (
                    <span
                      key={t.label}
                      className="flex items-center gap-2 rounded-xl border border-hairline bg-background/60 px-3 py-2 text-xs text-muted-foreground"
                    >
                      <t.icon className="h-3.5 w-3.5 text-primary" /> {t.label}
                    </span>
                  ))}
                </div>

                {placed && (
                  <p className="mt-4 text-sm text-primary">
                    Paid. It's in your orders and we'll email the details shortly.
                  </p>
                )}
                {product.note && <p className="mt-3 text-xs text-muted-foreground">{product.note}</p>}
              </div>
            </Reveal>
          </div>
        </Container>

        {related.length > 0 && (
          <Section>
            <p className="eyebrow text-muted-foreground">Also in the shop</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 60}>
                  <Link
                    to="/shop/$productSlug"
                    params={{ productSlug: p.slug }}
                    className="pressable group flex h-full gap-3 rounded-2xl border border-hairline bg-surface/60 p-3 transition-colors hover:border-primary/40"
                  >
                    {p.image && (
                      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                        <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{p.name}</span>
                      <span className="numeric block text-xs text-muted-foreground">{productPriceLabel(p)}</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Section>
        )}

        <Section>
          <p className="measure text-sm text-muted-foreground">
            Questions about sizing or delivery? Reply to any Kettlebell Lifestyle email and we'll point you in the
            right direction.
          </p>
        </Section>
      </div>

      {/* Sticky mobile purchase bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{variant?.label ?? product.tagline}</p>
            <p className="numeric text-lg font-semibold text-foreground">{productPriceLabel(product, price)}</p>
          </div>
          {product.inquiry ? (
            <Link to={product.inquiry.to} className={cn(buttonStyles.primary, "ml-auto")}>{product.inquiry.label}</Link>
          ) : product.fileUrl ? (
            <a href={product.fileUrl} download className={cn(buttonStyles.primary, "ml-auto")}>
              <Download className="h-4 w-4" /> Download
            </a>
          ) : (
            <button
              type="button"
              disabled={placed}
              onClick={startCheckout}
              className={cn(buttonStyles.primary, "ml-auto")}
            >
              {placed ? "Order placed" : "Buy now"}
            </button>
          )}
        </div>
      </div>

      <CheckoutSheet item={checkout} onClose={() => setCheckout(null)} onSuccess={() => setPlaced(true)} />
    </AppShell>
  );
}

