import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Package, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { Pill, SectionHeading } from "@/components/media";
import { CountUp, Reveal } from "@/components/motion-kit";
import { buttonStyles } from "@/components/ui-kit";
import { getOrders } from "@/lib/entitlements.functions";
import { useSession } from "@/hooks/use-session";
import { shopProducts, formatPrice, productPriceLabel, type ShopProduct } from "@/content/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/shop/")({
  head: () => ({
    meta: [
      { title: "Shop — Mike Salemi App" },
      {
        name: "description",
        content:
          "Workshops, printable training plans and equipment: the 5-Minute Downshift Workshop and leather Bulgarian Bags.",
      },
      { property: "og:title", content: "Shop — Mike Salemi App" },
      { property: "og:description", content: "Workshops, printable plans and training equipment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

type OrderRow = { id: string; product_id: string; variant: string | null; price_cents: number; created_at: string };

type FilterId = "all" | "digital" | "physical";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "digital", label: "Digital" },
  { id: "physical", label: "Equipment" },
];

function ShopPage() {
  const { user } = useSession();
  const fetchOrders = useServerFn(getOrders);
  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders() as Promise<OrderRow[]>,
    enabled: Boolean(user),
  });

  const [filter, setFilter] = useState<FilterId>("all");

  const featured = shopProducts.find((p) => p.slug === "suples-bulgarian-bag") ?? shopProducts[0];
  const items = useMemo(
    () => shopProducts.filter((p) => (filter === "all" ? true : p.type === filter) && p.id !== featured?.id),
    [filter, featured?.id],
  );

  const spent = (orders ?? []).reduce((sum, o) => sum + o.price_cents, 0);

  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow="Shop"
          title="Tools for the practice"
          lede="A short workshop, printable plans for training away from a screen, and the one piece of equipment that does something a kettlebell cannot."
          meta={`${shopProducts.length} items`}
        />

        {featured && (
          <Container className="pt-2">
            <Reveal>
              <Link
                to="/shop/$productSlug"
                params={{ productSlug: featured.slug }}
                className="pressable group relative block overflow-hidden rounded-3xl border border-hairline bg-surface raise-soft"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted sm:aspect-[21/8]">
                  {featured.image && (
                    <img
                      src={featured.image}
                      alt={featured.name}
                      className="h-full w-full object-cover transition-transform duration-[900ms] [transition-timing-function:var(--ease-spring)] group-hover:scale-[1.04]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                    <span className="eyebrow inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-primary-foreground">
                      <Sparkles className="h-3 w-3" /> Featured
                    </span>
                    <h2 className="mt-3 max-w-xl text-xl font-semibold text-background sm:text-3xl">{featured.name}</h2>
                    <p className="mt-1 max-w-lg text-sm text-background/80">{featured.tagline}</p>
                    <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground">
                      From {formatPrice(featured.priceCents)}
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          </Container>
        )}

        <Container className="pt-5">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={active}
                  className={cn(
                    "tap rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-hairline text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
            <span className="ml-auto text-xs text-muted-foreground">
              <CountUp value={items.length + (featured ? 1 : 0)} /> shown
            </span>
          </div>
        </Container>

        <Section>
          <SectionHeading eyebrow={filter === "all" ? "Catalogue" : FILTERS.find((f) => f.id === filter)!.label} title="Pick your next tool" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((product, i) => (
              <Reveal key={product.id} delay={i * 60} className="h-full">
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
          {items.length === 0 && (
            <p className="mt-6 text-sm text-muted-foreground">Nothing else in this category yet.</p>
          )}
        </Section>

        <Section>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Secure checkout", body: "Card details never touch our servers." },
              { icon: Truck, title: "Shipping updates", body: "Emailed the moment your order moves." },
              { icon: Package, title: "Built to last", body: "Leather goods made in Bulgaria." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 70}>
                <div className="flex h-full items-start gap-3 rounded-2xl border border-hairline bg-surface/60 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">{item.body}</span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {orders && orders.length > 0 && (
          <Section>
            <SectionHeading eyebrow="History" title="Your orders" />
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-hairline bg-surface/60 px-4 py-3">
                <p className="eyebrow text-muted-foreground">Orders</p>
                <p className="text-xl font-semibold text-foreground">
                  <CountUp value={orders.length} />
                </p>
              </div>
              <div className="rounded-2xl border border-hairline bg-surface/60 px-4 py-3">
                <p className="eyebrow text-muted-foreground">Total spent</p>
                <p className="text-xl font-semibold text-foreground">
                  <CountUp value={spent / 100} decimals={2} prefix="$" />
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {orders.map((order, i) => {
                const product = shopProducts.find((p) => p.id === order.product_id);
                return (
                  <Reveal key={order.id} delay={i * 50}>
                    <li className="flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface/50 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {product?.name ?? order.product_id}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {order.variant ? `${order.variant} · ` : ""}
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="numeric shrink-0 text-sm font-semibold text-foreground">
                        {formatPrice(order.price_cents)}
                      </span>
                    </li>
                  </Reveal>
                );
              })}
            </ul>
          </Section>
        )}
      </div>
    </AppShell>
  );
}

function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <Link
      to="/shop/$productSlug"
      params={{ productSlug: product.slug }}
      className="pressable steel-card group flex h-full flex-col overflow-hidden rounded-3xl transition-colors hover:border-primary/40"
    >
      {product.image && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-[1.04]"
          />
          <span className="absolute left-3 top-3">
            <Pill>{product.type === "digital" ? "Digital" : "Equipment"}</Pill>
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="numeric text-sm font-semibold text-primary">
          {product.variants ? `From ${formatPrice(product.priceCents)}` : productPriceLabel(product)}
        </p>
        <h3 className="mt-2 text-base font-semibold text-foreground">{product.name}</h3>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">{product.tagline}</p>
        <span className={cn(buttonStyles.outline, "mt-4 w-full justify-center")}>
          View details <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
