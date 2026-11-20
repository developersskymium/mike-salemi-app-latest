import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrepForm } from "@/components/coaching/PrepForm";
import { CoachingSubNav } from "@/components/coaching/SubNav";
import { currentHomework, loadCoachingHub } from "@/lib/loaders/coaching";
import "@/components/commerce/commerce.css";
import "@/components/coaching/coach.css";

export const metadata: Metadata = { title: "Prepare your call · Coaching" };

const firstSentence = (t: string | null | undefined) => (t ?? "").split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
const ymd = (iso: string) => iso.slice(0, 10);

/** Idea 3 · Three questions before the call, prefilled from what the app already knows. */
export default async function PrepPage(props: PageProps<"/coaching/prep/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const preview = typeof sp.preview === "string" ? sp.preview : null;
  const hub = await loadCoachingHub(preview);
  const s = hub.upcoming.find((x) => x.id === id);
  if (!s) notFound();
  const hw = currentHomework(hub);
  const lastNote = hub.past.find((x) => x.coach_note)?.coach_note ?? null;

  let sinceLast = s.prep?.since_last ?? "";
  if (!sinceLast && hw) {
    const done = (hub.ticks[hw.id] ?? []).filter((d) => d > ymd(hw.starts_at)).length;
    sinceLast = `“${hw.homework}” — ticked ${done} day${done === 1 ? "" : "s"} so far. `;
  }
  const watch = s.prep?.watch ?? (lastNote ? `Follow-up on your last notes: ${firstSentence(lastNote)}` : "");
  const goals = s.prep?.goals ?? s.member_note ?? "";
  const back = `/coaching${preview ? `?preview=${preview}` : ""}`;
  const when = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(s.starts_at));

  return (
    <div className="com-page co-page" style={{ gap: 0 }}>
      <CoachingSubNav />
      <header style={{ marginBottom: 20 }}>
        <div className="lq-eyebrow" data-tone="warm">Before your call · {when}</div>
        <h1 className="lq-d-lg" style={{ margin: 0 }}>Three questions for Mike</h1>
        <p className="lq-t15 co-muted" style={{ margin: "8px 0 0", maxWidth: "56ch" }}>So the call goes straight to the fix. We filled in what we already know; change anything.</p>
      </header>
      <PrepForm
        bookingId={s.id}
        back={back}
        init={{ goals, since_last: sinceLast, watch, footage_url: s.prep?.footage_url ?? "" }}
        prefilled={{ goals: Boolean(goals) && !s.prep?.goals, since_last: Boolean(sinceLast) && !s.prep?.since_last, watch: Boolean(watch) && !s.prep?.watch }}
      />
    </div>
  );
}
