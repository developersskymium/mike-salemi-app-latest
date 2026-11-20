import Link from "next/link";
import { Avatar, Button, Chip } from "@/components/ui";
import { DataTable, PageHead, Panel, fdate } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadMembers } from "@/lib/studio/loaders";

export const metadata = { title: "Members" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await studioAdmin();
  const q = ((await searchParams).q ?? "").trim();
  const d = await loadMembers(q);
  return (
    <>
      <PageHead title="Members" sub={`${d.total} members. Search by name.`} />
      <Panel>
        <form className="st-row" style={{ marginBottom: 14 }} role="search">
          <input className="st-in" style={{ maxWidth: 360 }} name="q" defaultValue={q} placeholder="Search by name" aria-label="Search members" />
          <Button type="submit" variant="glass" size="md" icon="search">Search</Button>
        </form>
        <DataTable rows={d.members} empty="No members match." cols={[
          { label: "Member", render: (m) => <span className="st-row" style={{ flexWrap: "nowrap" }}><Avatar name={m.display_name ?? m.first_name ?? "?"} size="sm" /><Link href={`/studio/members/${m.id}`} className="st-link">{m.display_name ?? m.first_name ?? m.id}</Link></span> },
          { label: "Plan", render: (m) => <Chip variant={m.plan === "free" ? "outline" : "fill"}>{m.plan}</Chip> }, { label: "Time zone", render: (m) => <span className="st-faint">{m.timezone}</span> }, { label: "Joined", render: (m) => fdate(m.created_at) },
        ]} />
      </Panel>
    </>
  );
}
