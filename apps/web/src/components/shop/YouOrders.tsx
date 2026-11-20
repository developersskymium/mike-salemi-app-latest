import Link from "next/link";
import type { Order } from "@ms/api";
import { Glass, Icon } from "@/components/ui";
import { loadMyShopOrders, type ShopOrder, type ShopProduct } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { RateGear } from "./RateGear";
import "./shop.css";

const STEPS = ["Ordered", "Shipped", "Delivered"] as const;
const dateOf = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null);

/**
 * The Orders section of You: every order; shop orders with equipment get a tracking line
 * (Ordered → Shipped → Delivered, carrier link) and "Rate your gear" once paid.
 */
export async function YouOrders({ orders }: { orders: Order[] }) {
  const shop = await loadMyShopOrders().catch(() => ({ orders: [] as ShopOrder[], products: [] as ShopProduct[], myRatings: {} as Record<string, number>, ownsBell: false }));
  const tracked = new Map(shop.orders.map((o) => [o.id, o]));
  const all: ShopOrder[] = [...orders.map((o) => tracked.get(o.id) ?? o), ...shop.orders.filter((o) => !orders.some((x) => x.id === o.id))].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const productOf = (refId: string) => shop.products.find((p) => p.variants.some((v) => v.id === refId));

  if (!all.length) {
    return (
      <Glass radius="card" className="tpy-list">
        <div className="tpy-row"><span className="tpy-row-main"><span className="lq-t15 lq-c2">No orders yet.</span></span><Link href="/shop" className="yu-seeall lq-t15">Shop <Icon name="chevron" size="xs" /></Link></div>
      </Glass>
    );
  }

  return (
    <div className="shp-yo">
      {shop.ownsBell && (
        <Link href="/shop/first-sessions" className="shp-yo-series lq-press">
          <span className="shp-yo-series-ic" aria-hidden><Icon name="kettlebell" size="sm" /></span>
          <span>
            <b className="lq-t15">Your first 3 sessions with your new bell</b>
            <span className="lq-t13 lq-c2">Free series from Mike · about 20 minutes each</span>
          </span>
          <Icon name="chevron" size="xs" />
        </Link>
      )}
      <Glass radius="card" className="shp-yo-list">
        {all.slice(0, 6).map((o) => {
          const products = o.items.filter((i) => i.kind === "product").map((i) => productOf(i.ref_id)).filter((p, k, a): p is ShopProduct => !!p && a.indexOf(p) === k);
          const physical = products.some((p) => p.type === "physical") || !!o.fulfillment;
          const step = o.fulfillment === "delivered" ? 2 : o.fulfillment === "shipped" ? 1 : 0;
          const names = o.items.filter((i) => i.kind !== "shipping").map((i) => i.name).join(", ") || o.reference;
          return (
            <article key={o.id} className="shp-yo-order">
              <div className="shp-yo-top">
                <span className="shp-yo-main">
                  <span className="lq-t15 shp-yo-name">{names}</span>
                  <span className="lq-t13 lq-c2 lq-num">{dateOf(o.created_at)} · {o.reference}{o.status !== "paid" ? ` · ${o.status === "refunded" ? "Refunded" : o.status === "pending" ? "Pending" : "Failed"}` : ""}</span>
                </span>
                <span className="lq-t15 lq-num shp-yo-total">{o.total_cents ? money(o.total_cents, o.currency) : "Free"}</span>
              </div>
              {physical && o.status === "paid" && (
                <div className="shp-yo-track">
                  <ol className="shp-yo-steps" aria-label={`Shipping: ${STEPS[step]}`}>
                    {STEPS.map((s, k) => (
                      <li key={s} data-done={k <= step ? "" : undefined} data-now={k === step ? "" : undefined}>
                        <span className="shp-yo-dot" aria-hidden>{k < step || step === 2 ? <Icon name="check" size="xs" /> : null}</span>
                        <span className="lq-t12">{s}</span>
                        <span className="lq-t12 lq-c2 lq-num">{dateOf(k === 0 ? o.created_at : k === 1 ? o.shipped_at : o.delivered_at) ?? ""}</span>
                      </li>
                    ))}
                  </ol>
                  {o.tracking_number && (
                    <a className="shp-yo-link lq-t13" href={o.tracking_url ?? undefined} target="_blank" rel="noreferrer">
                      {o.tracking_carrier ?? "Tracking"} · <span className="lq-num">{o.tracking_number}</span> <Icon name="arrowRight" size="xs" />
                    </a>
                  )}
                </div>
              )}
              {o.status === "paid" && products.length > 0 && (step === 2 || !physical) && (
                <div className="shp-yo-rate">
                  {products.map((p) => (
                    <RateGear key={p.id} productId={p.id} name={p.name} initial={shop.myRatings[p.id] ?? 0} />
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </Glass>
    </div>
  );
}
