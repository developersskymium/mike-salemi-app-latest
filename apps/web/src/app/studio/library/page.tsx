import Image from "next/image";
import { Disclosure, RecordForm, RowTools } from "@/components/studio/forms";
import { KeyField } from "@/components/studio/pieces";
import { DataTable, Note, PageHead, Panel } from "@/components/studio/ui";
import { Button, Chip } from "@/components/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadLibrary } from "@/lib/studio/loaders";

export const metadata = { title: "Library" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; missing?: string }> }) {
  await studioAdmin();
  const sp = await searchParams;
  const d = await loadLibrary(sp.q?.trim() ?? "", sp.missing === "1");
  return (
    <>
      <PageHead title="Library" sub={`${d.total} videos. Private Vimeo videos need their key (the short code after the id in the link) before members can play them.`} />
      <Panel title="Missing Vimeo key" meta={`${d.missing.length}`}>
        {d.missing.length ? (
          <DataTable rows={d.missing} cols={[
            { label: "Video", render: (v) => <span><b style={{ fontWeight: 600 }}>{v.title}</b><br /><a className="st-faint" href={`https://vimeo.com/${v.provider_id}`} target="_blank" rel="noreferrer">vimeo.com/{v.provider_id}</a></span> },
            { label: "Add the key", render: (v) => <KeyField videoId={v.id} providerId={v.provider_id} /> },
          ]} />
        ) : <Note>Every video has what it needs to play.</Note>}
      </Panel>
      <Panel title="Videos" meta={sp.q ? `matching “${sp.q}”` : sp.missing ? "missing key only" : `latest ${d.videos.length}`}>
        <form className="st-row" style={{ marginBottom: 14 }} role="search">
          <input className="st-in" style={{ maxWidth: 360 }} name="q" defaultValue={sp.q} placeholder="Search title or Vimeo id" aria-label="Search videos" />
          <Button type="submit" variant="glass" size="md" icon="search">Search</Button>
          {(sp.q || sp.missing) && <Button href="/studio/library" variant="plain" size="md">Clear</Button>}
        </form>
        <DataTable rows={d.videos} empty="No videos match." cols={[
          { label: "Video", render: (v) => <span className="st-row" style={{ flexWrap: "nowrap" }}>{v.thumbnail_url ? <Image src={v.thumbnail_url} alt="" width={64} height={40} className="st-thumb" unoptimized /> : <span className="st-thumb" />}<span>{v.title}</span></span> },
          { label: "Vimeo", render: (v) => <span className="st-faint">{v.provider_id}</span> },
          { label: "Category", render: (v) => v.category ?? "" }, { label: "Level", render: (v) => v.level ?? "" },
          { label: "Key", render: (v) => (v.needs_key ? <Chip variant="outline">missing</Chip> : v.privacy_hash ? <Chip variant="fill">set</Chip> : <span className="st-faint">public</span>) },
        ]} />
      </Panel>
      <Panel title="Tags" meta={`${d.tags.length}`}>
        <div className="st-row" style={{ marginBottom: 12 }}>{d.tags.map((t) => <span key={t.id} className="st-row" style={{ gap: 2 }}><Chip variant="fill">{t.namespace}: {t.name}</Chip><RowTools table="tags" pk={{ id: t.id }} orderable={false} label={t.name} /></span>)}</div>
        <Disclosure label="New tag"><RecordForm table="tags" defaults={{ namespace: "category" }} cols={3} /></Disclosure>
      </Panel>
      <Panel title="Add a video"><Disclosure label="New video"><RecordForm table="videos" defaults={{ provider: "vimeo" }} /></Disclosure></Panel>
    </>
  );
}
