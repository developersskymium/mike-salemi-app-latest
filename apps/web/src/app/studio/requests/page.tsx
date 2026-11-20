import Link from "next/link";
import { StatusNote } from "@/components/studio/content";
import { DataTable, Note, PageHead, Panel, Status, Tabs, fdate } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadAccountRequests } from "@/lib/studio/loaders-new";
import { REQUEST_STATUS } from "@/lib/studio/tables";

export const metadata = { title: "Account requests" };

const KIND: Record<string, string> = { delete: "Delete account", export: "Download my data", support: "Support", billing: "Billing" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await studioAdmin();
  const sp = await searchParams;
  const status = (REQUEST_STATUS as readonly string[]).includes(sp.status ?? "") ? sp.status! : sp.status === "all" ? "" : "open";
  const list = await loadAccountRequests(status);
  return (
    <>
      <PageHead title="Account requests" sub="What members asked for from Settings: deleting their account, a copy of their data, support and billing. Nothing is deleted by the app; work each one, then mark it done." />
      <Tabs items={[...["open", "in_progress", "done"].map((s) => ({ href: `/studio/requests${s === "open" ? "" : `?status=${s}`}`, label: s.replace("_", " ").replace(/^./, (c) => c.toUpperCase()), active: status === s })), { href: "/studio/requests?status=all", label: "All", active: status === "" }]} />
      <Panel title="Requests" meta={`${list.length}`}>
        <DataTable rows={list} empty={status === "open" ? "No open requests. All caught up." : "No requests here."} cols={[
          { label: "Member", render: (r) => <span><Link className="st-link" href={`/studio/members/${r.user_id}`}>{r.who}</Link><br /><span className="st-faint">{fdate(r.created_at, true)}</span></span> },
          { label: "Request", render: (r) => <span><b style={{ fontWeight: 600 }}>{KIND[r.kind] ?? r.kind}</b>{r.topic ? <><br /><span className="st-faint">{r.topic}</span></> : null}</span> },
          { label: "Message", render: (r) => <span className="st-muted" style={{ whiteSpace: "pre-wrap" }}>{r.message ?? ""}</span> },
          { label: "Status", render: (r) => <span><Status v={r.status} />{r.handled_at ? <><br /><span className="st-faint">{fdate(r.handled_at)}</span></> : null}{r.admin_note ? <><br /><span className="st-faint">{r.admin_note}</span></> : null}</span> },
          { label: "Update", render: (r) => <details><summary className="st-link" style={{ cursor: "pointer" }}>Update</summary><div style={{ marginTop: 10 }}><StatusNote kind="request" id={r.id} status={r.status} note={r.admin_note} options={REQUEST_STATUS} /></div></details> },
        ]} />
        <div style={{ marginTop: 12 }}><Note>Delete requests: remove the member in Members (their page has “Remove member”) once billing is settled, then mark the request done.</Note></div>
      </Panel>
    </>
  );
}
