import { FulfilmentForm } from "@/components/studio/content";
import { DataTable, PageHead, Panel, Status, Tabs, fdate, money } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadShopOrders } from "@/lib/studio/loaders-new";

export const metadata = { title: "Shop orders" };

const FILTERS = [["", "All"], ["to_ship", "To ship"], ["shipped", "Shipped"], ["delivered", "Delivered"]] as const;

type Addr = { name?: string; line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string };
const addr = (a: Addr | null) => (a ? [a.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" "), a.country].filter(Boolean).join(", ") : "");

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await studioAdmin();
  const sp = await searchParams;
  const f = FILTERS.find(([k]) => k === sp.f)?.[0] ?? "";
  const orders = await loadShopOrders(f);
  return (
    <>
      <PageHead title="Shop orders" sub="Every order, newest first. Add tracking, then mark it shipped and delivered; members see the status and tracking link on their order." />
      <Tabs items={FILTERS.map(([k, label]) => ({ href: k ? `/studio/orders?f=${k}` : "/studio/orders", label, active: f === k }))} />
      <Panel title="Orders" meta={`${orders.length}`}>
        <DataTable rows={orders} empty={f === "to_ship" ? "Nothing waiting to ship." : "No orders yet."} cols={[
          { label: "Order", render: (o) => <span><b style={{ fontWeight: 600 }}>{o.reference}</b>{o.is_test ? " · test" : ""}<br /><span className="st-faint">{fdate(o.created_at, true)} · {o.who}</span></span> },
          { label: "Items", render: (o) => <span className="st-muted">{(o.items as { name: string; quantity: number }[]).map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span> },
          { label: "Total", num: true, render: (o) => money(o.total_cents, o.currency) },
          { label: "Payment", render: (o) => <Status v={o.status} /> },
          { label: "Fulfilment", render: (o) => <span><Status v={o.fulfillment ?? "processing"} />{o.shipped_at ? <><br /><span className="st-faint">shipped {fdate(o.shipped_at)}</span></> : null}{o.delivered_at ? <><br /><span className="st-faint">delivered {fdate(o.delivered_at)}</span></> : null}</span> },
          { label: "Ship", render: (o) => <details><summary className="st-link" style={{ cursor: "pointer" }}>{o.tracking_number ? `${o.tracking_carrier ?? ""} ${o.tracking_number}`.trim() : "Add tracking"}</summary><div style={{ marginTop: 10, minWidth: 520 }}>{o.shipping_address ? <p className="st-faint" style={{ margin: "0 0 10px" }}>Ship to: {addr(o.shipping_address)}</p> : null}<FulfilmentForm o={o as never} /></div></details> },
        ]} />
      </Panel>
    </>
  );
}
