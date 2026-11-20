import type { Metadata } from "next";
import { CoachingSubNav } from "@/components/coaching/SubNav";
import { Thread } from "@/components/coaching/Thread";
import { loadCoachingHub } from "@/lib/loaders/coaching";
import "@/components/commerce/commerce.css";
import "@/components/coaching/coach.css";

export const metadata: Metadata = { title: "Messages · Coaching" };

/** Idea 7 · Messages with Mike between calls. */
export default async function MessagesPage(props: PageProps<"/coaching/messages">) {
  const sp = await props.searchParams;
  const hub = await loadCoachingHub(typeof sp.preview === "string" ? sp.preview : null);
  return (
    <div className="com-page co-page" style={{ gap: 0 }}>
      <CoachingSubNav />
      <header style={{ marginBottom: 20 }}>
        <div className="lq-eyebrow" data-tone="accent">Between calls</div>
        <h1 className="lq-d-lg" style={{ margin: 0 }}>Message Mike</h1>
      </header>
      <div style={{ maxWidth: 820 }}>
        <Thread initial={hub.messages} canWrite={hub.member} />
      </div>
    </div>
  );
}
