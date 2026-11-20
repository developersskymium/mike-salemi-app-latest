import { Disclosure, RecordForm, RowTools } from "@/components/studio/forms";
import { DataTable, PageHead, Panel, Status, fdate } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadNotices } from "@/lib/studio/loaders";

export const metadata = { title: "Notices" };

export default async function NoticesPage() {
  await studioAdmin();
  const notices = await loadNotices();
  return (
    <>
      <PageHead title="Notices" sub="Short messages shown to members in a placement, for a date range and audience." />
      <Panel title="Where notices show" meta="placement">
        <div className="st-grid st-g4">
          {[["banner", "Announcement bar", "Full width above every member page (legacy announcement bar). One at a time: the lowest position that is active and in its dates."], ["today", "Home", "A card on Home, under the hero."], ["program_page", "Program pages", "Under the program hero."], ["you", "You", "Top of the You tab."]].map(([k, t, b]) => (
            <div key={k}><div className="st-label">{t} <span className="st-faint">· {k}</span></div><p className="st-faint" style={{ margin: "4px 0 0", fontSize: 13 }}>{b}</p></div>
          ))}
        </div>
      </Panel>
      <Panel title="All notices" meta={`${notices.length}`}>
        <DataTable rows={notices} empty="No notices. Add one for a launch, a maintenance window or a retreat reminder." cols={[
          { label: "Notice", render: (n) => <span><b style={{ fontWeight: 600 }}>{n.title ?? "Untitled"}</b><br /><span className="st-faint">{n.body}</span></span> }, { label: "Placement", render: (n) => n.placement },
          { label: "Shows", render: (n) => `${fdate(n.starts_at) || "now"} – ${fdate(n.ends_at) || "no end"}` }, { label: "Status", render: (n) => <Status v={n.is_active ? "active" : "draft"} /> },
          { label: "", render: (n) => <RowTools table="notices" pk={{ id: n.id }} first={false} last={false} label={n.title ?? "notice"} /> },
        ]} />
        {notices.map((n) => <details key={n.id} style={{ marginTop: 10 }}><summary className="st-link" style={{ cursor: "pointer" }}>Edit “{n.title ?? "Untitled"}”</summary><div style={{ marginTop: 12 }}><RecordForm table="notices" row={n} /></div></details>)}
        <div style={{ marginTop: 14 }}><Disclosure label="New notice"><RecordForm table="notices" defaults={{ placement: "banner", audience: "{}" }} /></Disclosure></div>
      </Panel>
    </>
  );
}
