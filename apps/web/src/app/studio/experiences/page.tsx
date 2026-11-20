import Link from "next/link";
import { Disclosure, RecordForm, RowTools } from "@/components/studio/forms";
import { SlotsForm } from "@/components/studio/pieces";
import { ApplicationActions, OpenWeeks } from "@/components/studio/site";
import { Answers } from "@/components/studio/Answers";
import { DataTable, Note, PageHead, Panel, Status, Tabs, fdate, money } from "@/components/studio/ui";
import { Chip } from "@/components/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadExperiences } from "@/lib/studio/loaders";
import { CoachingApplicationActions, RetreatPipeline } from "./_p3/Pipeline";

export const metadata = { title: "Experiences" };
const TABS = [["runs", "Runs"], ["applications", "Applications"], ["packages", "Coaching packages"], ["coaching-apps", "Coaching applications"], ["slots", "Coaching slots"], ["bookings", "Bookings"]] as const;
const PIPE = ["submitted", "call_booked", "accepted", "waitlist", "declined", "booked"] as const;
const PIPE_LABEL: Record<string, string> = { submitted: "New", call_booked: "Call booked", accepted: "Accepted", waitlist: "Waitlist", declined: "Declined", booked: "Booked" };

export default async function ExperiencesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await studioAdmin();
  const { tab: t } = await searchParams;
  const tab = TABS.find(([k]) => k === t)?.[0] ?? "runs";
  const d = await loadExperiences();
  const now = new Date().toISOString();
  const upcoming = d.slots.filter((x) => x.starts_at > now);
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
          <div className="st-grid st-g3">
            {PIPE.map((st) => {
              const list = d.applications.filter((a) => a.status === st);
              return (
                <Panel key={st} title={PIPE_LABEL[st]} meta={`${list.length}`}>
                  {list.map((a) => <div key={a.id} className="st-faint" style={{ padding: "4px 0", fontSize: 13 }}><b style={{ color: "var(--label)", fontWeight: 600 }}>{a.who}</b><br />{a.runName}</div>)}
                  {!list.length && <div className="st-faint">Empty</div>}
                </Panel>
              );
            })}
          </div>
          <Panel title="Review" meta={`${d.applications.length}`}>
            {d.applications.length ? d.applications.map((a) => (
              <div key={a.id} className="st-app-card">
                <div className="st-row" style={{ justifyContent: "space-between" }}>
                  <span><b style={{ fontWeight: 600 }}>{a.who}</b> <span className="st-faint">· {a.runName} · applied {fdate(a.created_at)}</span></span>
                  <Status v={a.status} />
                </div>
                <RetreatPipeline a={a as never} />
                <details>
                  <summary className="st-link" style={{ cursor: "pointer", fontSize: 13 }}>Answers, notes and other statuses</summary>
                  <Answers answers={a.answers} />
                  <ApplicationActions id={a.id} status={a.status} note={a.admin_note} />
                </details>
              </div>
            )) : <div className="st-empty">No applications yet. Members apply from a retreat&rsquo;s page; they land here as “New”.</div>}
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
      {tab === "coaching-apps" && (
        <Panel title="Coaching applications" meta={`${d.coachingApplications.length}`}>
          {d.coachingApplications.length ? d.coachingApplications.map((a) => (
            <div key={a.id} className="st-app-card">
              <div className="st-row" style={{ justifyContent: "space-between" }}>
                <span><b style={{ fontWeight: 600 }}>{a.who}</b> <span className="st-faint">· {a.packageName} · applied {fdate(a.created_at)}</span></span>
                <Status v={a.status} />
              </div>
              <Answers answers={a.answers} />
              <CoachingApplicationActions id={a.id} status={a.status} />
            </div>
          )) : <div className="st-empty">No applications yet. Members apply for Executive Edge from the Coaching page.</div>}
          <div style={{ marginTop: 10 }}><Note>Accepted members buy the package from the Coaching page; their sessions appear as credits.</Note></div>
        </Panel>
      )}
      {tab === "slots" && (
        <>
          <Panel title="Open from the schedule" meta="members book these"><OpenWeeks schedule={d.schedule} openAhead={d.openAhead} /></Panel>
          <Disclosure label="Add custom slots"><Panel title="Add slots in bulk"><SlotsForm /></Panel></Disclosure>
          <Panel title="Upcoming slots" meta={`${upcoming.length}${upcoming.length > 60 ? " · first 60 shown" : ""}`}>
            <DataTable rows={upcoming.slice(0, 60)} empty="No upcoming slots. Open the next weeks above and members can book them." cols={[
              { label: "Starts (Pacific)", render: (s) => new Date(s.starts_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: d.schedule?.timezone ?? "America/Los_Angeles" }) }, { label: "Minutes", num: true, render: (s) => s.duration_minutes }, { label: "State", render: (s) => (s.is_open ? "Open" : "Taken") },
              { label: "", render: (s) => <RowTools table="coaching_slots" pk={{ id: s.id }} orderable={false} label={fdate(s.starts_at, true)} /> },
            ]} />
          </Panel>
        </>
      )}
      {tab === "bookings" && (
        <Panel title="Bookings" meta={`${d.bookings.length}`}>
          <DataTable rows={d.bookings} empty="No bookings yet." cols={[
            { label: "Member", render: (b) => b.who }, { label: "When (UTC)", render: (b) => fdate(b.starts_at, true) }, { label: "Minutes", num: true, render: (b) => b.duration_minutes }, { label: "Status", render: (b) => <Status v={b.status} /> },
            { label: "Member prep", render: (b) => <span style={{ fontSize: 13 }}>{b.prep?.goals ?? b.member_note ?? <span className="st-faint">None</span>}{b.prep?.footage_url ? <><br /><a className="st-link" href={b.prep.footage_url} target="_blank" rel="noopener">Footage</a></> : null}</span> },
            { label: "Edit", render: (b) => <details><summary className="st-link" style={{ cursor: "pointer" }}>Open</summary><div style={{ minWidth: 320, marginTop: 8 }}><RecordForm table="coaching_bookings" row={b} cols={1} /></div></details> },
          ]} />
          <div style={{ marginTop: 10 }}><Note>Prices for packages live in Commerce → Prices ({money(18000)} single session is the legacy price).</Note></div>
        </Panel>
      )}
    </>
  );
}
