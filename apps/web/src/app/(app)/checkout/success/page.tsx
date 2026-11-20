import type { Metadata } from "next";
import { Button, Glass } from "@/components/ui";
import { Completion } from "@/components/graphics";
import { PendingRefresh } from "@/components/commerce/PendingRefresh";
import { money } from "@/components/commerce/format";
import { loadOrder } from "@/lib/loaders/commerce";
import { ClearCart } from "@/components/shop/ClearCart";
import "@/components/commerce/commerce.css";
import "@/components/shop/shop.css";

export const metadata: Metadata = { title: "You're in" };

/** Where an item lives after purchase. */
function nextFor(kind: string | undefined, ref: string | undefined): { href: string; label: string } {
  switch (kind) {
    case "run":
      return { href: `/experiences/${ref}`, label: "Open your retreat" };
    case "coaching":
      return { href: "/coaching", label: "Book your session" };
    case "plan":
      return { href: "/programs", label: "Explore your programs" };
    case "product":
      return { href: "/shop#orders", label: "See your order" };
    default:
      return { href: "/today", label: "Go to Today" };
  }
}

export default async function CheckoutSuccess(props: PageProps<"/checkout/success">) {
  const sp = await props.searchParams;
  const orderId = typeof sp.order === "string" ? sp.order : undefined;
  const order = await loadOrder(orderId);
  const pending = order?.status === "pending";
  const item = order?.items[0];
  const next = nextFor(item?.kind, item?.ref_id);
  const shop = sp.from === "shop" || item?.kind === "product";

  return (
    <div className="com-result">
      {shop && !pending && order && <ClearCart />}
      <Glass radius="card" className="com-result-card">
        <Completion variant="milestone" size={168} label={pending ? "Confirming payment" : "Purchase complete"} />
        <p className="lq-t13 lq-c2" style={{ fontWeight: 600, marginTop: 4 }}>{pending ? "Almost there" : "Payment received"}</p>
        <h1 className="lq-t28">{pending ? "Confirming your payment" : "You’re in"}</h1>
        {order && order.items.length > 0 ? (
          <div className="com-receipt">
            {order.items.map((i) => (
              <div key={i.id} className="com-between lq-t15">
                <span>{i.name}</span>
                <span className="lq-num">{money(i.unit_cents * i.quantity, order.currency)}</span>
              </div>
            ))}
            {order.discount_cents > 0 && (
              <div className="com-between lq-t13 lq-c2">
                <span>Discount</span>
                <span className="lq-num">−{money(order.discount_cents, order.currency)}</span>
              </div>
            )}
            <div className="com-between lq-t13 lq-c2">
              <span className="lq-num">{order.reference}</span>
              <span className="lq-num">Total {money(order.total_cents, order.currency)}</span>
            </div>
          </div>
        ) : (
          <p className="lq-t15 lq-c2">Thank you. Your access is ready and a receipt is on its way to your inbox.</p>
        )}
        {shop && !pending && (
          <p className="shp-done-ship lq-t13">
            <span aria-hidden>✓</span>
            <span>Order {order?.reference ?? ""} is confirmed. A receipt is on its way to your inbox{order?.items.some((i) => /bag|leather/i.test(i.name)) ? ", and we email tracking as soon as your order ships" : ""}.</span>
          </p>
        )}
        {pending ? <PendingRefresh /> : <Button block href={next.href} iconAfter="chevron">{next.label}</Button>}
        {shop ? (
          <Button variant="plain" size="md" href="/shop">Back to the shop</Button>
        ) : (
          <Button variant="plain" size="md" href="/you/billing">See billing</Button>
        )}
      </Glass>
    </div>
  );
}
