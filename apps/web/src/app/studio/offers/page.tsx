import Link from "next/link";
import { Button } from "@/components/ui";
import { DataTable, PageHead, Panel, Status } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadOffers } from "@/lib/studio/loaders";

export const metadata = { title: "Offers" };

export default async function OffersPage() {
  await studioAdmin();
  const offers = await loadOffers();
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
  return (
    <>
      <PageHead title="Offers" sub="Contextual prompts shown to members at the right moment. One offer shows per slot; lower priority number wins." actions={<Button href="/studio/offers/new" variant="filled" size="md" icon="plus">New offer</Button>} />
      <Panel title="Performance and rules">
        <DataTable rows={offers} empty="No offers yet." cols={[
          { label: "Offer", render: (o) => <span><Link href={`/studio/offers/${o.id}`} className="st-link">{o.name}</Link><br /><span className="st-faint">{o.headline}</span></span> },
          { label: "Status", render: (o) => <Status v={o.is_active ? "active" : "draft"} /> },
          { label: "Trigger", render: (o) => <span className="st-muted">{String(o.trigger?.kind ?? "always").replace(/_/g, " ")}</span> },
          { label: "Where", render: (o) => <span className="st-faint">{(o.placements ?? []).join(", ")}</span> },
          { label: "Priority", num: true, render: (o) => o.priority },
          { label: "Views", num: true, render: (o) => o.perf.view }, { label: "Clicks", num: true, render: (o) => o.perf.click },
          { label: "Conv.", num: true, render: (o) => o.perf.convert }, { label: "CTR", num: true, render: (o) => pct(o.perf.click, o.perf.view) },
        ]} />
      </Panel>
    </>
  );
}
