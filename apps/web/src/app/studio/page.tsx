import Link from "next/link";
import { Button } from "@/components/ui";
import { DataTable, Note, PageHead, Panel, Stat, Status, fdate } from "@/components/studio/ui";
import { loadDashboard } from "@/lib/studio/loaders";
import { studioAdmin } from "@/lib/studio/guard";

export default async function StudioHome() {
  await studioAdmin();
  const d = await loadDashboard();
  return (
    <>
      <PageHead title="Overview" sub="What needs attention across content, commerce and members." actions={<Button href="/studio/programs/new" variant="filled" size="md" icon="plus">New program</Button>} />
      <div className="st-grid st-g4" style={{ marginBottom: 16 }}>
        <Stat n={d.programs} label="Programs" /><Stat n={d.videos} label="Videos in library" /><Stat n={d.members} label="Members" /><Stat n={d.offers} label="Active offers" />
      </div>
      <div className="st-grid st-g2">
        <Panel title="Needs attention">
          <div style={{ display: "grid", gap: 8 }}>
            {d.needsKey > 0 ? <Note tone="warn"><Link href="/studio/library?missing=1" className="st-link">{d.needsKey} videos are missing a Vimeo key</Link> and will not play for members.</Note> : <Note>All videos have their Vimeo key.</Note>}
            {d.apps > 0 ? <Note tone="warn"><Link href="/studio/experiences?tab=applications">{d.apps} retreat applications</Link> are waiting for review.</Note> : <Note>No applications waiting.</Note>}
            {d.drafts.map((p) => (
              <Note key={p.id}><Link href={`/studio/programs/${p.id}`} className="st-link" style={{ fontWeight: 600 }}>{p.name}</Link> <Status v={p.status} />{p.draft_note ? <span className="st-muted"> · {p.draft_note}</span> : null}</Note>
            ))}
          </div>
        </Panel>
        <Panel title="Recent changes" meta="audit log">
          <DataTable rows={d.audit} empty="No changes recorded yet. Every write in the studio lands here." cols={[
            { label: "When", render: (r) => <span className="st-faint">{fdate(r.created_at, true)}</span> },
            { label: "Action", render: (r) => `${r.action} ${r.entity ?? ""}` },
          ]} />
          <div style={{ marginTop: 10 }}><Link href="/studio/settings?tab=audit" className="st-faint">See full log</Link></div>
        </Panel>
      </div>
    </>
  );
}
