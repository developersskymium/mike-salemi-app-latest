import Image from "next/image";
import { notFound } from "next/navigation";
import { Disclosure, RecordForm, RowTools } from "@/components/studio/forms";
import { DataTable, PageHead, Panel, Status, fdate } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadRun } from "@/lib/studio/loaders";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  await studioAdmin();
  const { id } = await params;
  const d = await loadRun(id);
  if (!d) notFound();
  const gallery: { url: string; caption?: string }[] = Array.isArray(d.run.gallery) ? d.run.gallery : [];
  return (
    <>
      <PageHead eyebrow={[{ label: "Experiences", href: "/studio/experiences" }, { label: d.run.name }]} title={d.run.name} sub={<><Status v={d.run.status} /> <span className="st-faint">{fdate(d.run.starts_at)} – {fdate(d.run.ends_at)}</span></>} />
      <Panel title="Run details"><RecordForm key={id} table="program_runs" row={d.run} /></Panel>
      <Panel title="Gallery" meta={`${gallery.length} photos · edit in “Gallery” above`}>
        <div className="st-row">{gallery.slice(0, 12).map((g, i) => <Image key={i} src={g.url} alt={g.caption ?? ""} width={96} height={64} unoptimized style={{ width: 96, height: 64, objectFit: "cover", borderRadius: 10 }} />)}</div>
        {!gallery.length && <div className="st-faint">No photos. Add {"{url, caption}"} entries to the Gallery field.</div>}
      </Panel>
      <Panel title="Itinerary" meta={`${d.itinerary.length}`}>
        <DataTable rows={d.itinerary} empty="No itinerary items yet." cols={[
          { label: "Day", num: true, render: (i) => i.day_index }, { label: "Item", render: (i) => <span><b style={{ fontWeight: 600 }}>{i.title}</b><br /><span className="st-faint">{i.description}</span></span> }, { label: "Where", render: (i) => i.location ?? "" },
          { label: "", render: (i) => <RowTools table="itinerary_items" pk={{ id: i.id }} label={i.title} /> },
        ]} />
        <div style={{ marginTop: 12 }}><Disclosure label="Add itinerary item"><RecordForm table="itinerary_items" fixed={{ run_id: id }} defaults={{ day_index: "1" }} /></Disclosure></div>
      </Panel>
      <Panel title="Applications" meta={`${d.applications.length}`}>
        <DataTable rows={d.applications} empty="No applications for this run." cols={[{ label: "Who", render: (a) => a.who }, { label: "Applied", render: (a) => fdate(a.created_at) }, { label: "Status", render: (a) => <Status v={a.status} /> }]} />
      </Panel>
    </>
  );
}
