import Link from "next/link";
import { Disclosure, RecordForm } from "@/components/studio/forms";
import { DataTable, PageHead, Panel, Tabs, fdate } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadReadiness } from "@/lib/studio/loaders";

export const metadata = { title: "Readiness" };

export default async function ReadinessPage() {
  await studioAdmin();
  const d = await loadReadiness();
  return (
    <>
      <PageHead title="Readiness" sub="The daily check-in a member answers, the score bands it maps to, and the workout tables each band prescribes." />
      <Tabs items={[{ href: "/studio/readiness", label: "Forms & tables", active: true }, { href: "/studio/readiness/entries", label: "Entries", active: false }]} />
      <Panel title="Forms" meta={`${d.forms.length}`}>
        <DataTable rows={d.forms} empty="No readiness forms yet." cols={[
          { label: "Form", render: (f) => <Link className="st-link" href={`/studio/readiness/forms/${f.id}`}>{f.title}</Link> },
          { label: "Id", render: (f) => <span className="st-faint">{f.id}</span> },
          { label: "Max score", num: true, render: (f) => f.max_score }, { label: "Bands", num: true, render: (f) => f.bands },
        ]} />
        <div style={{ marginTop: 12 }}><Disclosure label="New form"><RecordForm table="forms" redirectBase="/studio/readiness/forms" cols={3} /></Disclosure></div>
      </Panel>
      <Panel title="Workout tables" meta={`${d.tables.length}`}>
        <DataTable rows={d.tables} empty="No tables yet." cols={[
          { label: "Table", render: (t) => <Link className="st-link" href={`/studio/readiness/tables/${t.id}`}>{t.title}</Link> },
          { label: "Id", render: (t) => <span className="st-faint">{t.id}</span> }, { label: "Rows", num: true, render: (t) => t.rowCount }, { label: "Updated", render: (t) => <span className="st-faint">{fdate(t.updated_at)}</span> },
        ]} />
        <div style={{ marginTop: 12 }}><Disclosure label="New table"><RecordForm table="workout_tables" only={["title"]} redirectBase="/studio/readiness/tables" cols={2} /></Disclosure></div>
      </Panel>
    </>
  );
}
