import { notFound } from "next/navigation";
import { RecordForm } from "@/components/studio/forms";
import { InviteForm } from "@/components/studio/pieces";
import { RemoveMember } from "@/components/studio/RemoveMember";
import { DataTable, PageHead, Panel, Stat, Status, fdate } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadOrg } from "@/lib/studio/loaders";

export default async function OrgPage({ params }: { params: Promise<{ id: string }> }) {
  await studioAdmin();
  const { id } = await params;
  const d = await loadOrg(id);
  if (!d) notFound();
  const live = d.members.filter((m) => !m.removed_at);
  return (
    <>
      <PageHead eyebrow={[{ label: "Organizations", href: "/studio/organizations" }, { label: d.org.name }]} title={d.org.name} sub={<Status v={d.org.status} />} />
      <div className="st-grid st-g3" style={{ marginBottom: 16 }}><Stat n={`${live.length} / ${d.org.seats}`} label="Seats used" /><Stat n={d.invites.filter((i) => !i.accepted_at).length} label="Open invites" /><Stat n={d.programs.length} label="Programs included" /></div>
      <Panel title="Organization"><RecordForm key={d.org.id} table="organizations" row={d.org} cols={3} /></Panel>
      <Panel title="Members" meta={`${live.length}`}>
        <DataTable rows={live} empty="No members yet. Send an invite below." cols={[{ label: "Member", render: (m) => m.who }, { label: "Role", render: (m) => m.role }, { label: "Joined", render: (m) => fdate(m.joined_at) }, { label: "", render: (m) => <RemoveMember orgId={id} userId={m.user_id} name={m.who} /> }]} />
      </Panel>
      <Panel title="Invites" meta={`${d.invites.length}`}>
        <DataTable rows={d.invites} empty="No invites." cols={[{ label: "Email", render: (i) => i.email }, { label: "Role", render: (i) => i.role }, { label: "Expires", render: (i) => fdate(i.expires_at) }, { label: "State", render: (i) => <Status v={i.accepted_at ? "accepted" : "open"} /> }]} />
        <div style={{ marginTop: 14 }}><InviteForm orgId={id} /></div>
      </Panel>
      {d.programs.length > 0 && <Panel title="Programs">{d.programs.join(", ")}</Panel>}
    </>
  );
}
