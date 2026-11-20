import Link from "next/link";
import { DataTable, PageHead, Panel, Status, Tabs, fdate } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadEntries } from "@/lib/studio/loaders";

export const metadata = { title: "Form entries" };

/** Legacy "KBL form entries": every readiness check-in, filterable by form. */
export default async function EntriesPage({ searchParams }: { searchParams: Promise<{ form?: string }> }) {
  await studioAdmin();
  const { form } = await searchParams;
  const formId = form && /^[\w-]{1,80}$/.test(form) ? form : null;
  const d = await loadEntries(formId);
  const forms = d.forms.filter((f) => f.used || f.id === formId);
  return (
    <>
      <PageHead eyebrow={[{ label: "Readiness", href: "/studio/readiness" }, { label: "Entries" }]} title="Form entries" sub="Every readiness check-in members submitted: the score, the band and the table it prescribed." />
      <Tabs items={[{ href: "/studio/readiness", label: "Forms & tables", active: false }, { href: "/studio/readiness/entries", label: "Entries", active: true }]} />
      <nav className="st-filter" aria-label="Filter by form">
        <Link href="/studio/readiness/entries" aria-current={!formId ? "true" : undefined}>All forms</Link>
        {forms.map((f) => <Link key={f.id} href={`/studio/readiness/entries?form=${encodeURIComponent(f.id)}`} aria-current={formId === f.id ? "true" : undefined}>{f.title}</Link>)}
      </nav>
      <Panel title={formId ? forms.find((f) => f.id === formId)?.title ?? formId : "All entries"} meta={`${d.entries.length}${d.entries.length === 200 ? "+ (latest 200)" : ""}`}>
        <DataTable rows={d.entries} empty="No entries yet. They appear as soon as members answer a readiness check on a training day." cols={[
          { label: "Submitted", render: (e) => <span className="st-faint" style={{ fontSize: 13 }}>{fdate(e.created_at, true)}</span> },
          { label: "Member", render: (e) => <Link className="st-link" href={`/studio/members/${e.user_id}`}>{e.who}</Link> },
          { label: "Day", render: (e) => e.lesson ? <span>{e.lesson.day_number ? `Day ${e.lesson.day_number} · ` : ""}{e.lesson.title}</span> : <span className="st-faint">—</span> },
          { label: "Form", render: (e) => <span className="st-faint">{e.form}</span> },
          { label: "Score", render: (e) => <span className="st-score"><i aria-hidden><b style={{ width: `${e.max ? Math.min(100, (e.score / e.max) * 100) : 0}%` }} /></i>{e.score}{e.max ? <span className="st-faint">/{e.max}</span> : null}</span> },
          { label: "Result", render: (e) => <span><span className={`st-swatch st-sw-${e.band}`} aria-hidden />{e.band_name} <Status v={e.outcome} />{e.table_id ? <span className="st-faint"> · {e.table_id}</span> : null}</span> },
        ]} />
      </Panel>
    </>
  );
}
