import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@/components/ui";
import { CurriculumTab } from "@/components/studio/CurriculumTab";
import { Disclosure, RecordForm, RowTools } from "@/components/studio/forms";
import { BenefitCell, ModesEditor } from "@/components/studio/pieces";
import { DataTable, Note, PageHead, Panel, Status, Tabs, money } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadProgram } from "@/lib/studio/loaders";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; lesson?: string; step?: string; section?: string }> };
const TABS = [["details", "Details"], ["curriculum", "Curriculum"], ["pricing", "Pricing & access"], ["intake", "Intake"]] as const;

export default async function ProgramPage({ params, searchParams }: Props) {
  await studioAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const d = await loadProgram(id);
  if (!d) notFound();
  const tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? "details";
  const p = d.program;
  return (
    <>
      <PageHead eyebrow={[{ label: "Programs", href: "/studio/programs" }, { label: p.name }]} title={p.name} sub={<><Status v={p.status} /> <span className="st-faint">/{p.slug} · {String(p.type).replace(/_/g, " ")}</span></>} actions={<Link href={`/programs/${p.slug}`} className="st-faint">View in app</Link>} />
      <Tabs items={TABS.map(([k, l]) => ({ href: `/studio/programs/${id}?tab=${k}`, label: l, active: tab === k }))} />

      {tab === "details" && (
        <>
          <Panel title="Details"><RecordForm key={p.updated_at} table="programs" row={p} /></Panel>
          <Panel title="Learning modes"><ModesEditor programId={id} modes={d.modes.map((m) => m.mode)} defaultMode={d.modes.find((m) => m.is_default)?.mode ?? ""} /></Panel>
          <Panel title="Imagery" meta="by URL">
            {d.media.map((m, i) => (
              <div key={m.id} className="st-row" style={{ padding: "8px 0", borderTop: i ? "1px solid var(--sep)" : 0, flexWrap: "nowrap" }}>
                <Image src={m.url} alt={m.alt} width={64} height={40} className="st-thumb" unoptimized />
                <span style={{ flex: 1, minWidth: 0 }}><Chip variant="outline">{m.role}</Chip> <span className="st-muted">{m.alt}</span><br /><span className="st-faint" style={{ overflowWrap: "anywhere" }}>{m.url}</span></span>
                <RowTools table="program_media" pk={{ id: m.id }} first={i === 0} last={i === d.media.length - 1} label={m.alt || m.role} />
              </div>
            ))}
            {!d.media.length && <div className="st-faint" style={{ marginBottom: 10 }}>No images yet.</div>}
            <Disclosure label="Add image"><RecordForm table="program_media" fixed={{ program_id: id }} defaults={{ role: "gallery", alt: p.name }} cols={1} /></Disclosure>
          </Panel>
          {(d.paths.length > 0 || p.type === "day_program") && (
            <Panel title="Paths and levels">
              <DataTable rows={d.paths} empty="No paths." cols={[{ label: "Name", render: (x) => x.name }, { label: "Kind", render: (x) => x.kind }, { label: "Key", render: (x) => x.key }, { label: "", render: (x) => <RowTools table="program_paths" pk={{ id: x.id }} label={x.name} /> }]} />
              <div style={{ marginTop: 12 }}><Disclosure label="Add path"><RecordForm table="program_paths" fixed={{ program_id: id }} only={["name", "short_name", "key", "kind", "description"]} defaults={{ kind: "level" }} /></Disclosure></div>
            </Panel>
          )}
          <Panel title="Resources" meta="downloads and PDFs">
            <DataTable rows={d.resources} empty="No resources." cols={[{ label: "Title", render: (x) => x.title }, { label: "Kind", render: (x) => x.kind }, { label: "URL", render: (x) => <span className="st-faint">{x.url}</span> }, { label: "", render: (x) => <RowTools table="resources" pk={{ id: x.id }} label={x.title} /> }]} />
            <div style={{ marginTop: 12 }}><Disclosure label="Add resource"><RecordForm table="resources" fixed={{ program_id: id }} defaults={{ kind: "pdf" }} /></Disclosure></div>
          </Panel>
        </>
      )}

      {tab === "curriculum" && <CurriculumTab program={p} sp={sp} />}

      {tab === "pricing" && (
        <>
          <Panel title="Access" meta={p.is_free ? "free for everyone" : "paid"}>
            <Note>{p.is_free ? "This program is free: every signed-in member can open it." : "Members get access by buying it, by a plan benefit below, by an organization, or from a grant you give them in Members."}</Note>
            <div className="st-faint" style={{ marginTop: 8 }}>Change “Free” on the Details tab.</div>
          </Panel>
          <Panel title="Included by plan" meta="none · discount · included">
            <div className="st-grid st-g3">
              {d.plans.map((pl) => {
                const b = d.benefits.find((x) => x.plan_id === pl.id && x.scope === "content");
                return <div key={pl.id}><div className="st-label" style={{ marginBottom: 6 }}>{pl.name}</div><BenefitCell key={pl.id + (b?.benefit ?? "")} planId={pl.id} programId={id} benefit={b?.benefit ?? "none"} percent={b?.discount_percent ?? null} /></div>;
              })}
            </div>
          </Panel>
          <Panel title="Prices">
            <DataTable rows={d.prices} empty="No price. This program cannot be bought on its own." cols={[
              { label: "Label", render: (x) => x.label }, { label: "Amount", num: true, render: (x) => money(x.amount_cents, x.currency) }, { label: "Interval", render: (x) => String(x.interval).replace("_", " ") },
              { label: "Active", render: (x) => (x.is_active ? "Yes" : "No") }, { label: "Draft note", render: (x) => <span className="st-faint">{x.draft_note}</span> }, { label: "", render: (x) => <RowTools table="prices" pk={{ id: x.id }} orderable={false} label={x.label ?? "price"} /> },
            ]} />
            <div style={{ marginTop: 12 }}><Disclosure label="Add price"><RecordForm table="prices" defaults={{ kind: "program", ref_id: id, currency: "usd", interval: "one_time", label: p.name, draft_note: "Draft - price awaiting Mike" }} /></Disclosure></div>
          </Panel>
          {d.inclusions.length > 0 && <Panel title="Includes other programs"><div className="st-faint">{d.inclusions.length} included program(s) grant access with this one.</div></Panel>}
        </>
      )}

      {tab === "intake" && (
        <>
          <Note>An intake is the short questionnaire a member answers when they start: it can recommend a path.</Note>
          <div style={{ height: 14 }} />
          {d.intakes.map((f) => <Panel key={f.id} title={f.title} meta={f.is_published ? "published" : "draft"}><RecordForm table="intake_forms" row={f} cols={1} /></Panel>)}
          <Panel title="New intake"><RecordForm table="intake_forms" fixed={{ program_id: id }} defaults={{ questions: "[]", result_rules: "{}" }} /></Panel>
        </>
      )}
    </>
  );
}
