import Link from "next/link";
import { Disclosure, RecordForm, RowTools } from "@/components/studio/forms";
import { SlotsForm } from "@/components/studio/pieces";
import { DataTable, Note, PageHead, Panel, Status, Tabs, fdate, money } from "@/components/studio/ui";
import { Chip } from "@/components/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadExperiences } from "@/lib/studio/loaders";

export const metadata = { title: "Experiences" };
const TABS = [["runs", "Runs"], ["applications", "Applications"], ["packages", "Coaching packages"], ["slots", "Coaching slots"], ["bookings", "Bookings"]] as const;
const PIPE = ["submitted", "reviewing", "accepted", "waitlist", "declined"] as const;

export default async function ExperiencesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await studioAdmin();
  const { tab: t } = await searchParams;
  const tab = TABS.find(([k]) => k === t)?.[0] ?? "runs";
  const d = await loadExperiences();
  const retreats = d.programs.filter((p) => ["retreat", "live", "challenge"].includes(p.type));
  return (
    <>
      <PageHead title="Experiences" sub="Retreat and live runs, the application pipeline, and 1:1 coaching." />
      <Tabs items={TABS.map(([k, l]) => ({ href: `/studio/experiences?tab=${k}`, label: l, active: tab === k }))} />
      {tab === "runs" && (
        <Panel title="Runs" meta={`${d.runs.length}`}>
          <DataTable rows={d.runs} empty="No runs yet." cols={[
            { label: "Run", render: (r) => <span><Link href={`/studio/experiences/runs/${r.id}`} className="st-link">{r.name}</Link><br /><span className="st-faint">{r.programName}</span></span> },
            { label: "Dates", render: (r) => `${fdate(r.starts_at)} – ${fdate(r.ends_at)}` }, { label: "Status", render: (r) => <Status v={r.status} /> },
            { label: "Where", render: (r) => r.location?.label ?? r.location?.city ?? "" }, { label: "Capacity", num: true, render: (r) => r.capacity ?? "" },
            { label: "Apps", num: true, render: (r) => r.applicationCount }, { label: "Itinerary", num: true, render: (r) => r.itineraryCount },
          ]} />
          <div style={{ marginTop: 12 }}><Disclosure label="New run"><RecordForm table="program_runs" redirectBase="/studio/experiences/runs" defaults={{ status: "upcoming", timezone: "America/Los_Angeles", program_id: retreats[0]?.id ?? "" }} choices={{ program_id: retreats.map((p) => ({ value: p.id, label: p.name })) }} /></Disclosure></div>
        </Panel>
      )}
      {tab === "applications" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="st-grid st-g4">
            {PIPE.slice(0, 4).map((s) => <Panel key={s} title={s} meta={`${d.applications.filter((a) => a.status === s).length}`}>{d.applications.filter((a) => a.status === s).map((a) => <div key={a.id} className="st-faint" style={{ padding: "4px 0" }}>{a.who}<br />{a.runName}</div>) }{!d.applications.some((a) => a.status === s) && <div className="st-faint">Empty</div>}</Panel>)}
          </div>
          <Panel title="All applications">
            <DataTable rows={d.applications} empty="No applications yet. Members apply from a run's page." cols={[
              { label: "Who", render: (a) => a.who }, { label: "Run", render: (a) => a.runName }, { label: "Applied", render: (a) => fdate(a.created_at) }, { label: "Status", render: (a) => <Status v={a.status} /> },
              { label: "Review", render: (a) => <details><summary className="st-link" style={{ cursor: "pointer" }}>Open</summary><div style={{ minWidth: 320, marginTop: 8 }}><RecordForm table="run_applications" row={a} cols={1} /></div></details> },
            ]} />
          </Panel>
        </div>
      )}
      {tab === "packages" && (
        <>
          <Panel title="Coaching packages">
            <DataTable rows={d.packages} cols={[
              { label: "Package", render: (p) => <b style={{ fontWeight: 600 }}>{p.name}</b> }, { label: "Format", render: (p) => String(p.format).replace("_", " ") }, { label: "Sessions", num: true, render: (p) => p.sessions }, { label: "Minutes", num: true, render: (p) => p.duration_minutes },
              { label: "Active", render: (p) => (p.is_active ? "Yes" : "No") }, { label: "Application", render: (p) => (p.requires_application ? <Chip variant="outline">required</Chip> : "") },
              { label: "", render: (p) => <RowTools table="coaching_packages" pk={{ id: p.id }} label={p.name} /> },
            ]} />
          </Panel>
          {d.packages.map((p) => <Panel key={p.id} title={`Edit · ${p.name}`}><details><summary className="st-link" style={{ cursor: "pointer" }}>Edit package</summary><div style={{ marginTop: 12 }}><RecordForm table="coaching_packages" row={p} /></div></details></Panel>)}
          <Panel title="New package"><RecordForm table="coaching_packages" defaults={{ format: "one_to_one", is_active: true }} /></Panel>
        </>
      )}
      {tab === "slots" && (
        <>
          <Panel title="Add slots in bulk"><SlotsForm /></Panel>
          <Panel title="Open and booked slots" meta={`${d.slots.length}`}>
            <DataTable rows={d.slots} empty="No slots yet. Add some above and members can book them." cols={[
              { label: "Starts (UTC)", render: (s) => fdate(s.starts_at, true) }, { label: "Minutes", num: true, render: (s) => s.duration_minutes }, { label: "State", render: (s) => (s.is_open ? "Open" : "Taken") },
              { label: "", render: (s) => <RowTools table="coaching_slots" pk={{ id: s.id }} orderable={false} label={fdate(s.starts_at, true)} /> },
            ]} />
          </Panel>
        </>
      )}
      {tab === "bookings" && (
        <Panel title="Bookings" meta={`${d.bookings.length}`}>
          <DataTable rows={d.bookings} empty="No bookings yet." cols={[
            { label: "Member", render: (b) => b.who }, { label: "When (UTC)", render: (b) => fdate(b.starts_at, true) }, { label: "Minutes", num: true, render: (b) => b.duration_minutes }, { label: "Status", render: (b) => <Status v={b.status} /> },
            { label: "Edit", render: (b) => <details><summary className="st-link" style={{ cursor: "pointer" }}>Open</summary><div style={{ minWidth: 320, marginTop: 8 }}><RecordForm table="coaching_bookings" row={b} cols={1} /></div></details> },
          ]} />
          <div style={{ marginTop: 10 }}><Note>Prices for packages live in Commerce → Prices ({money(18000)} single session is the legacy price).</Note></div>
        </Panel>
      )}
    </>
  );
}
