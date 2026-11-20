import type { Order } from "@ms/api";
import { Chip } from "@/components/ui";
import { dateShort, money } from "./format";

const STATUS: Record<Order["status"], string> = { paid: "Paid", refunded: "Refunded", failed: "Failed", pending: "Pending" };

/** Orders with their items; each expands to show the line items and any discount. */
export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul className="com-list" role="list">
      {orders.map((o) => (
        <li key={o.id}>
          <details className="com-order-d">
            <summary className="com-li com-order-sum">
              <div className="com-grow">
                <div className="lq-t15" style={{ fontWeight: 600 }}>{o.items.map((i) => i.name).join(", ") || o.reference}</div>
                <div className="lq-t13 lq-c2">
                  <span className="lq-num">{dateShort(o.created_at)}</span> · <span className="lq-num">{o.reference}</span>
                </div>
              </div>
              {o.status !== "paid" && <Chip variant="outline">{STATUS[o.status]}</Chip>}
              <span className="lq-t17 lq-num">{money(o.total_cents, o.currency)}</span>
            </summary>
            <div className="com-order-items">
              {o.items.map((i) => (
                <div key={i.id} className="com-between lq-t13">
                  <span>{i.quantity > 1 ? `${i.quantity} × ` : ""}{i.name}</span>
                  <span className="lq-num">{money(i.unit_cents * i.quantity, o.currency)}</span>
                </div>
              ))}
              {o.discount_cents > 0 && (
                <div className="com-between lq-t13 lq-c2">
                  <span>Discount</span>
                  <span className="lq-num">−{money(o.discount_cents, o.currency)}</span>
                </div>
              )}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
