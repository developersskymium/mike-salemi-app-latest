import { notFound } from "next/navigation";
import { GrantForm, RevokeButton } from "@/components/studio/pieces";
import { DataTable, PageHead, Panel, Stat, Status, fdate, money } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadMember } from "@/lib/studio/loaders";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  await studioAdmin();
  const { id } = await params;
  const d = await loadMember(id);
  if (!d) notFound();
  const pn = new Map(d.programs.map((p) => [p.id, p.name]));
  const p = d.profile;
  return (
    <>
      <PageHead eyebrow={[{ label: "Members", href: "/studio/members" }]} title={p.display_name ?? p.first_name ?? "Member"} sub={<span className="st-faint">Joined {fdate(p.created_at)} · {p.timezone}{d.roles.length ? ` · ${d.roles.map((r) => r.role).join(", ")}` : ""}</span>} />
      <div className="st-grid st-g4" style={{ marginBottom: 16 }}><Stat n={d.enrollments.length} label="Enrollments" /><Stat n={d.progress} label="Steps completed" /><Stat n={d.grants.filter((g) => !g.revoked_at).length} label="Active grants" /><Stat n={d.orders.length} label="Orders" /></div>
      <Panel title="Enrollments and progress">
        <DataTable rows={d.enrollments} empty="Not enrolled in anything." cols={[
          { label: "Program", render: (e) => pn.get(e.program_id) ?? e.program_id }, { label: "Mode", render: (e) => String(e.mode).replace("_", "-") }, { label: "Pace", render: (e) => e.pace },
          { label: "Started", render: (e) => fdate(e.started_at) }, { label: "Last active", render: (e) => fdate(e.last_active_at) }, { label: "State", render: (e) => <Status v={e.completed_at ? "completed" : "active"} /> },
        ]} />
      </Panel>
      <Panel title="Access grants" meta="what an admin has given or revoked">
        <DataTable rows={d.grants} empty="No grants." cols={[
          { label: "Program", render: (g) => pn.get(g.program_id) ?? g.program_id }, { label: "Source", render: (g) => g.source }, { label: "Starts", render: (g) => fdate(g.starts_at) }, { label: "Ends", render: (g) => fdate(g.ends_at) || "No end" },
          { label: "Note", render: (g) => <span className="st-faint">{g.note}</span> }, { label: "", render: (g) => (g.revoked_at ? <Status v="revoked" /> : g.source === "admin" || g.source === "migration" ? <RevokeButton grantId={g.id} /> : null) },
        ]} />
        <div style={{ marginTop: 14 }}><GrantForm userId={id} programs={d.programs as never} /></div>
      </Panel>
      <div className="st-grid st-g2">
        <Panel title="Subscriptions"><DataTable rows={d.subs} empty="No subscription." cols={[{ label: "Plan", render: (s) => s.plan_id }, { label: "Status", render: (s) => <Status v={s.status} /> }, { label: "Interval", render: (s) => s.interval }, { label: "Renews", render: (s) => fdate(s.current_period_end) }]} /></Panel>
        <Panel title="Orders"><DataTable rows={d.orders} empty="No orders." cols={[{ label: "Ref", render: (o) => o.reference }, { label: "Total", num: true, render: (o) => money(o.total_cents, o.currency) }, { label: "Status", render: (o) => <Status v={o.status} /> }, { label: "Date", render: (o) => fdate(o.created_at) }]} /></Panel>
      </div>
    </>
  );
}
