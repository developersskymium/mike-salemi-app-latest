import { notFound } from "next/navigation";
import { ReplyBox } from "@/components/studio/content";
import { ActionButton } from "@/components/studio/forms";
import { PageHead, Panel, fdate } from "@/components/studio/ui";
import { markThreadRead } from "@/lib/studio/actions-new";
import { studioAdmin } from "@/lib/studio/guard";
import { loadThread } from "@/lib/studio/loaders-new";

export const metadata = { title: "Thread" };

export default async function ThreadPage({ params }: { params: Promise<{ member: string }> }) {
  await studioAdmin();
  const { member } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(member)) notFound();
  const d = await loadThread(member);
  const unread = d.messages.filter((m) => !m.from_coach && !m.read_at).length;
  return (
    <>
      <PageHead eyebrow={[{ label: "Coaching", href: "/studio/coaching" }, { label: "Inbox", href: "/studio/coaching" }]} title={d.who}
        sub={`${d.messages.length} message${d.messages.length === 1 ? "" : "s"}${unread ? ` · ${unread} unread` : ""}`}
        actions={unread ? <ActionButton variant="glass" action={markThreadRead.bind(null, member)} ok="Marked read">Mark read</ActionButton> : undefined} />
      <Panel title="Thread">
        {d.messages.length ? (
          <div className="st-thread">
            {d.messages.map((m) => (
              <div key={m.id} className="st-msg" data-coach={m.from_coach ? "" : undefined}>
                {m.body}
                {m.attachment_url && <><br /><a className="st-link" href={m.attachment_url} target="_blank" rel="noreferrer">Attachment</a></>}
                <small>{m.from_coach ? "Mike" : d.who} · {fdate(m.created_at, true)}{!m.from_coach && !m.read_at ? " · unread" : ""}</small>
              </div>
            ))}
          </div>
        ) : <div className="st-empty">No messages in this thread yet.</div>}
        <ReplyBox memberId={member} />
      </Panel>
    </>
  );
}
