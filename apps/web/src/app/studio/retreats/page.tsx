import Link from "next/link";
import { FacilitatorsForm, StatusNote, TestimonialForm } from "@/components/studio/content";
import { ActionButton } from "@/components/studio/forms";
import { DataTable, PageHead, Panel, Status, Tabs, fdate } from "@/components/studio/ui";
import { setWallHidden } from "@/lib/studio/actions-new";
import { studioAdmin } from "@/lib/studio/guard";
import { loadRetreatsAdmin } from "@/lib/studio/loaders-new";
import { LEAD_STATUS } from "@/lib/studio/tables";

export const metadata = { title: "Retreats" };

const TABS = [["enquiries", "Enquiries"], ["wall", "Photo wall"], ["facilitators", "Facilitators"], ["testimonial", "Testimonial"]] as const;
type Tab = (typeof TABS)[number][0];
const KIND: Record<string, string> = { notify: "Notify me", question_call: "15-min question call" };

export default async function RetreatsAdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await studioAdmin();
  const sp = await searchParams;
  const tab: Tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? "enquiries";
  const d = await loadRetreatsAdmin();
  const fresh = d.leads.filter((l) => l.status === "new").length;
  return (
    <>
      <PageHead title="Retreats" sub={<>Enquiries from the retreat pages, the members' photo wall, who leads each run and the testimonial clip. Run dates, itinerary and applications live in <Link className="st-link" href="/studio/experiences">Experiences</Link>.</>} />
      <Tabs items={TABS.map(([k, label]) => ({ href: k === "enquiries" ? "/studio/retreats" : `/studio/retreats?tab=${k}`, label: k === "enquiries" && fresh ? `${label} · ${fresh}` : label, active: tab === k }))} />

      {tab === "enquiries" && (
        <Panel title="Enquiries" meta={`${d.leads.length} · ${fresh} new`}>
          <DataTable rows={d.leads} empty="No enquiries yet. “Notify me” sign-ups and question-call requests from the retreat pages land here." cols={[
            { label: "Who", render: (l) => <span><a className="st-link" href={`mailto:${l.email}`}>{l.email}</a><br /><span className="st-faint">{fdate(l.created_at, true)}</span></span> },
            { label: "Wants", render: (l) => <span>{KIND[l.kind] ?? l.kind}<br /><span className="st-faint">{l.runName || "Any retreat"}</span></span> },
            { label: "Their note", render: (l) => <span className="st-muted">{l.note ?? ""}</span> },
            { label: "Status", render: (l) => <Status v={l.status} /> },
            { label: "Update", render: (l) => <details><summary className="st-link" style={{ cursor: "pointer" }}>Update</summary><div style={{ marginTop: 10 }}><StatusNote kind="lead" id={l.id} status={l.status} note={l.admin_note} options={LEAD_STATUS} /></div></details> },
          ]} />
        </Panel>
      )}

      {tab === "wall" && (
        <Panel title="Photo wall" meta={`${d.wall.length} posts · ${d.wall.filter((w) => w.hidden_at).length} hidden`}>
          {d.wall.length ? (
            <div className="st-wall">
              {d.wall.map((w) => (
                <figure key={w.id} data-hidden={w.hidden_at ? "" : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {w.src ? <img src={w.src} alt={w.caption ?? `Photo from ${w.who}`} loading="lazy" /> : <div className="st-empty">{w.path}</div>}
                  <figcaption>
                    <span><b style={{ fontWeight: 600 }}>{w.who}</b> · {w.runName}<br />{w.caption}</span>
                    <span className="st-row" style={{ justifyContent: "space-between" }}>
                      {w.hidden_at ? <Status v="hidden" /> : <span className="st-faint">{fdate(w.created_at)}</span>}
                      <ActionButton variant={w.hidden_at ? "glass" : "fill"} action={setWallHidden.bind(null, w.id, !w.hidden_at)} ok={w.hidden_at ? "Shown again" : "Hidden"} confirmText={w.hidden_at ? undefined : "Hide this photo from the wall? You can show it again later."}>{w.hidden_at ? "Show" : "Hide"}</ActionButton>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : <div className="st-empty">No photos yet. Booked members can post to their run's wall; hide anything that should not be there.</div>}
        </Panel>
      )}

      {tab === "facilitators" && (d.runs.length ? d.runs.map((r) => (
        <Panel key={r.id} title={r.name} meta={`${fdate(r.starts_at)} · ${r.facilitators.length} facilitators`}>
          <FacilitatorsForm runId={r.id} list={r.facilitators} />
        </Panel>
      )) : <Panel><div className="st-empty">No retreat runs yet. Add one in Experiences.</div></Panel>)}

      {tab === "testimonial" && (d.programs.length ? d.programs.map((p) => (
        <Panel key={p.id} title={p.name} meta={p.testimonial?.video_url ? "showing" : "hidden until a video is added"}>
          <TestimonialForm programId={p.id} t={p.testimonial} />
        </Panel>
      )) : <Panel><div className="st-empty">No retreat programs.</div></Panel>)}
    </>
  );
}
