import Link from "next/link";
import { HomeworkForm } from "@/components/studio/content";
import { ActionButton, Disclosure, RecordForm, RowTools } from "@/components/studio/forms";
import { DataTable, Note, PageHead, Panel, Status, Tabs, fdate } from "@/components/studio/ui";
import { confirmLiveDate } from "@/lib/studio/actions-new";
import { studioAdmin } from "@/lib/studio/guard";
import { loadCoachingAdmin } from "@/lib/studio/loaders-new";

export const metadata = { title: "Coaching" };

const TABS = [["inbox", "Inbox"], ["homework", "Homework"], ["live", "Zen Savage live"], ["podcast", "Podcast"]] as const;
type Tab = (typeof TABS)[number][0];

export default async function CoachingAdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await studioAdmin();
  const sp = await searchParams;
  const tab: Tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "inbox");
  const d = await loadCoachingAdmin();
  const waiting = d.threads.filter((t) => t.waiting).length;
  return (
    <>
      <PageHead title="Coaching" sub="Member messages, homework from each session, the Zen Savage live calls and the King Within podcast shelf." />
      <Tabs items={TABS.map(([k, label]) => ({ href: k === "inbox" ? "/studio/coaching" : `/studio/coaching?tab=${k}`, label: k === "inbox" && waiting ? `${label} · ${waiting}` : label, active: tab === k }))} />

      {tab === "inbox" && (
        <Panel title="Message threads" meta={`${d.threads.length} · ${waiting} waiting on Mike`}>
          <DataTable rows={d.threads} empty="No messages yet. When a coaching member writes to Mike, the thread shows here." cols={[
            { label: "Member", render: (t) => <Link className="st-link" href={`/studio/coaching/thread/${t.member_id}`}>{t.who}</Link> },
            { label: "Last message", render: (t) => <span className="st-muted">{t.last.from_coach ? "Mike: " : ""}{String(t.last.body).slice(0, 110)}{String(t.last.body).length > 110 ? "…" : ""}</span> },
            { label: "When", render: (t) => fdate(t.last.created_at, true) },
            { label: "Messages", num: true, render: (t) => t.count },
            { label: "Status", render: (t) => <Status v={t.waiting ? "waiting" : "sent"} /> },
          ]} />
          <div style={{ marginTop: 12 }}><Note>Mike promises a reply within 48 hours. Threads waiting on him sit at the top.</Note></div>
        </Panel>
      )}

      {tab === "homework" && (
        <Panel title="Homework per session" meta={`${d.bookings.length} sessions`}>
          <DataTable rows={d.bookings} empty="No coaching sessions booked yet." cols={[
            { label: "Session", render: (b) => <span><b style={{ fontWeight: 600 }}>{b.who}</b><br /><span className="st-faint">{fdate(b.starts_at, true)}</span></span> },
            { label: "Status", render: (b) => <Status v={b.status} /> },
            { label: "Homework", render: (b) => b.homework ? <ul style={{ margin: 0, paddingLeft: 18 }}>{String(b.homework).split("\n").map((x, i) => <li key={i}>{x}</li>)}</ul> : <span className="st-faint">None set</span> },
            { label: "Edit", render: (b) => <details><summary className="st-link" style={{ cursor: "pointer" }}>{b.homework ? "Edit" : "Write"}</summary><div style={{ marginTop: 10, minWidth: 320 }}><HomeworkForm bookingId={b.id} homework={b.homework} /></div></details> },
          ]} />
        </Panel>
      )}

      {tab === "live" && (
        <Panel title="Zen Savage live sessions" meta={`${d.live.length}`}>
          <DataTable rows={d.live} empty="No live sessions yet." cols={[
            { label: "Session", render: (s) => <span><b style={{ fontWeight: 600 }}>{s.title}</b><br /><span className="st-faint">{s.summary}</span></span> },
            { label: "When", render: (s) => <span>{fdate(s.starts_at, true)} UTC<br /><span className="st-faint">{s.duration_minutes} min</span></span> },
            { label: "Date", render: (s) => s.draft_note ? <span><Status v="pending" /><br /><span className="st-faint">{s.draft_note}</span></span> : <Status v="scheduled" /> },
            { label: "Links", render: (s) => <span className="st-faint">{s.join_url ? <a className="st-link" href={s.join_url} target="_blank" rel="noreferrer">Join</a> : "No join link"}{" · "}{s.replay_url ? <a className="st-link" href={s.replay_url} target="_blank" rel="noreferrer">Replay</a> : "No replay"}</span> },
            { label: "", render: (s) => s.draft_note ? <ActionButton action={confirmLiveDate.bind(null, s.id)} ok="Date confirmed" confirmText={`Confirm ${fdate(s.starts_at, true)} for “${s.title}”? Members will see it as set.`}>Confirm date</ActionButton> : null },
          ]} />
          {d.live.map((s) => <details key={s.id} style={{ marginTop: 10 }}><summary className="st-link" style={{ cursor: "pointer" }}>Edit “{s.title}”</summary><div style={{ marginTop: 12 }}><RecordForm table="coaching_live_sessions" row={s} /></div></details>)}
          <div style={{ marginTop: 14 }}><Disclosure label="New live session"><RecordForm table="coaching_live_sessions" defaults={{ series: "zen-savage", duration_minutes: "60", is_published: true }} /></Disclosure></div>
        </Panel>
      )}

      {tab === "podcast" && (
        <Panel title="King Within podcast" meta={`${d.podcast.length} episodes`}>
          <DataTable rows={d.podcast} empty="No episodes yet." cols={[
            { label: "Episode", render: (e) => <span><b style={{ fontWeight: 600 }}>{e.title}</b><br /><a className="st-faint" href={e.url} target="_blank" rel="noreferrer">{String(e.url).replace(/^https?:\/\//, "").slice(0, 60)}</a></span> },
            { label: "Published", render: (e) => e.published_on ? fdate(e.published_on) : "" },
            { label: "Status", render: (e) => <Status v={e.is_published ? "published" : "draft"} /> },
            { label: "", render: (e) => <RowTools table="podcast_episodes" pk={{ id: e.id }} deletable={false} first={e === d.podcast[0]} last={e === d.podcast[d.podcast.length - 1]} label={e.title} /> },
          ]} />
          {d.podcast.map((e) => <details key={e.id} style={{ marginTop: 10 }}><summary className="st-link" style={{ cursor: "pointer" }}>Edit “{e.title}”</summary><div style={{ marginTop: 12 }}><RecordForm table="podcast_episodes" row={e} /></div></details>)}
          <div style={{ marginTop: 14 }}><Disclosure label="New episode"><RecordForm table="podcast_episodes" defaults={{ show: "king-within", is_published: true }} /></Disclosure></div>
        </Panel>
      )}
    </>
  );
}
