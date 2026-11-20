import Link from "next/link";
import Image from "next/image";
import { Button, Chip } from "@/components/ui";
import { DataTable, PageHead, Panel, Status } from "@/components/studio/ui";
import { loadPrograms } from "@/lib/studio/loaders";
import { studioAdmin } from "@/lib/studio/guard";

export const metadata = { title: "Programs" };

export default async function ProgramsPage() {
  await studioAdmin();
  const programs = await loadPrograms();
  return (
    <>
      <PageHead title="Programs" sub="Courses, day programs, challenges, retreats, coaching and tools." actions={<Button href="/studio/programs/new" variant="filled" size="md" icon="plus">New program</Button>} />
      <Panel>
        <DataTable rows={programs} empty="No programs yet. Create the first one." cols={[
          { label: "Program", render: (p) => (
            <span className="st-row" style={{ flexWrap: "nowrap" }}>
              {p.image ? <Image src={p.image} alt="" width={64} height={40} className="st-thumb" unoptimized /> : <span className="st-thumb" />}
              <span><Link href={`/studio/programs/${p.id}`} className="st-link">{p.name}</Link><br /><span className="st-faint">/{p.slug}</span></span>
            </span>
          ) },
          { label: "Type", render: (p) => String(p.type).replace(/_/g, " ") },
          { label: "Status", render: (p) => <Status v={p.status} /> },
          { label: "Group", render: (p) => p.catalog_group },
          { label: "Modes", render: (p) => <span className="st-row" style={{ gap: 4 }}>{p.modes.map((m: string) => <Chip key={m} variant="outline">{m.replace("_", "-")}</Chip>)}</span> },
          { label: "Access", render: (p) => (p.is_free ? "Free" : "Paid") },
          { label: "Note", render: (p) => <span className="st-faint">{p.draft_note ?? ""}</span> },
        ]} />
      </Panel>
    </>
  );
}
