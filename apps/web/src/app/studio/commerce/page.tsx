import { Disclosure, RecordForm, RowTools } from "@/components/studio/forms";
import { BenefitCell } from "@/components/studio/pieces";
import { DataTable, Note, PageHead, Panel, Status, Tabs, fdate, money } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadCommerce } from "@/lib/studio/loaders";

export const metadata = { title: "Commerce" };
const TABS = [["plans", "Plans"], ["prices", "Prices"], ["benefits", "Benefits grid"], ["coupons", "Coupons"]] as const;

export default async function CommercePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await studioAdmin();
  const { tab: t } = await searchParams;
  const tab = TABS.find(([k]) => k === t)?.[0] ?? "plans";
  const d = await loadCommerce();
  return (
    <>
      <PageHead title="Commerce" sub="Plans, prices and what each plan gives on every program. Prices marked draft are placeholders until Mike confirms." />
      <Tabs items={TABS.map(([k, l]) => ({ href: `/studio/commerce?tab=${k}`, label: l, active: tab === k }))} />
      {tab === "plans" && (
        <>
          {d.plans.map((p) => <Panel key={p.id} title={p.name} meta={p.is_active ? "active" : "inactive"}><RecordForm key={p.id} table="plans" row={p} cols={2} /></Panel>)}
          <Panel title="New plan"><RecordForm table="plans" /></Panel>
        </>
      )}
      {tab === "prices" && (
        <>
          <Panel title="Prices" meta={`${d.prices.length}`}>
            <DataTable rows={d.prices} cols={[
              { label: "Label", render: (x) => <b style={{ fontWeight: 600 }}>{x.label}</b> }, { label: "For", render: (x) => <span>{x.kind}: {x.refName}</span> },
              { label: "Amount", num: true, render: (x) => money(x.amount_cents, x.currency) }, { label: "Interval", render: (x) => String(x.interval).replace("_", " ") },
              { label: "Status", render: (x) => <Status v={x.is_active ? "active" : "archived"} /> }, { label: "Draft note", render: (x) => <span className="st-faint">{x.draft_note}</span> },
              { label: "", render: (x) => <RowTools table="prices" pk={{ id: x.id }} orderable={false} label={x.label ?? "price"} /> },
            ]} />
          </Panel>
          <Panel title="Edit a price"><Note>Open a price from the Programs → Pricing tab to edit it in context, or add a new one here.</Note><div style={{ height: 12 }} /><Disclosure label="New price"><RecordForm table="prices" defaults={{ currency: "usd", interval: "one_time", kind: "program" }} /></Disclosure></Panel>
        </>
      )}
      {tab === "benefits" && (
        <Panel title="Benefits" meta="programs × plans">
          <div className="st-scroll">
            <table className="st-tbl">
              <thead><tr><th>Program</th>{d.plans.map((p) => <th key={p.id}>{p.name}</th>)}</tr></thead>
              <tbody>
                {d.programs.filter((p) => p.catalog_group !== "experiences" || true).map((p) => (
                  <tr key={p.id}>
                    <td><b style={{ fontWeight: 600 }}>{p.name}</b><br /><span className="st-faint">{p.status}{p.is_free ? " · free" : ""}</span></td>
                    {d.plans.map((pl) => {
                      const b = d.benefits.find((x) => x.plan_id === pl.id && x.program_id === p.id && x.scope === "content");
                      return <td key={pl.id} style={{ minWidth: 150 }}><BenefitCell key={(b?.benefit ?? "none") + (b?.discount_percent ?? "")} planId={pl.id} programId={p.id} benefit={b?.benefit ?? "none"} percent={b?.discount_percent ?? null} /></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {tab === "coupons" && (
        <>
          <Panel title="Coupons" meta={`${d.coupons.length}`}>
            <DataTable rows={d.coupons} empty="No coupons yet." cols={[
              { label: "Code", render: (c) => <b style={{ fontWeight: 600 }}>{c.code}</b> }, { label: "Off", render: (c) => (c.percent_off ? `${c.percent_off}%` : money(c.amount_off_cents)) },
              { label: "Used", num: true, render: (c) => `${c.redeemed}${c.max_redemptions ? ` / ${c.max_redemptions}` : ""}` }, { label: "Expires", render: (c) => fdate(c.expires_at) }, { label: "Active", render: (c) => (c.is_active ? "Yes" : "No") },
              { label: "", render: (c) => <RowTools table="coupons" pk={{ id: c.id }} orderable={false} label={c.code} /> },
            ]} />
          </Panel>
          <Panel title="New coupon"><RecordForm table="coupons" defaults={{ applies_to: "{}" }} /></Panel>
        </>
      )}
    </>
  );
}
