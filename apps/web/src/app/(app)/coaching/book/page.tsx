import type { Metadata } from "next";
import { BookCalendar } from "@/components/coaching/BookCalendar";
import { CoachingSubNav } from "@/components/coaching/SubNav";
import { loadCoachingHub } from "@/lib/loaders/coaching";
import "@/components/commerce/commerce.css";
import "@/components/coaching/coach.css";

export const metadata: Metadata = { title: "Book a call · Coaching" };

/** Idea 2 · Book a 1:1 Tuesday call in your own time zone. */
export default async function BookPage(props: PageProps<"/coaching/book">) {
  const sp = await props.searchParams;
  const preview = typeof sp.preview === "string" ? sp.preview : null;
  const hub = await loadCoachingHub(preview);
  const unread = hub.messages.filter((m) => m.from_coach && !m.read_at).length;
  return (
    <div className="com-page co-page" style={{ gap: 0 }}>
      <CoachingSubNav unread={unread} />
      <header className="co-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="lq-eyebrow" data-tone="accent">1:1 with Mike · Tuesdays</div>
          <h1 className="lq-d-lg" style={{ margin: 0 }}>Pick your time</h1>
          <p className="lq-t15 co-muted" style={{ margin: "8px 0 0", maxWidth: "52ch" }}>{hub.schedule?.minutes ?? 45} minutes on video. Open days are marked; times show in your own time zone.</p>
        </div>
      </header>
      <BookCalendar slots={hub.slots} credits={hub.credits} packages={hub.packages} mikeTz={hub.schedule?.timezone} preview={preview} />
    </div>
  );
}
