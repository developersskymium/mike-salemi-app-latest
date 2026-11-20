import Link from "next/link";
import { Disclosure, RecordForm } from "@/components/studio/forms";
import { DataTable, PageHead, Panel, Status } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadOrgs } from "@/lib/studio/loaders";

export const metadata = { title: "Organizations" };

export default async function OrgsPage() {
  await studioAdmin();
  const orgs = await loadOrgs();
  return (
    <>
      <PageHead title="Organizations" sub="Teams and partners with seats, coaches and invites." />
      <Panel>
        <DataTable rows={orgs} empty="No organizations yet. Create the first one." cols={[
          { label: "Organization", render: (o) => <Link href={`/studio/organizations/${o.id}`} className="st-link">{o.name}</Link> }, { label: "Status", render: (o) => <Status v={o.status} /> },
          { label: "Seats", num: true, render: (o) => `${o.used} / ${o.seats}` }, { label: "Domain", render: (o) => <span className="st-faint">{o.join_domain}</span> }, { label: "Partner", render: (o) => (o.is_partner ? "Yes" : "") },
        ]} />
        <div style={{ marginTop: 12 }}><Disclosure label="New organization"><RecordForm table="organizations" redirectBase="/studio/organizations" defaults={{ status: "active", seats: "10" }} /></Disclosure></div>
      </Panel>
    </>
  );
}
