import type { Metadata } from "next";
import { Glass, LargeTitle, Ticker } from "@/components/ui";
import { CoachingFlow, PastSessions, UpcomingSessions } from "@/components/experiences/CoachingBoard";
import { loadCoaching } from "@/lib/loaders/commerce";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";

export const metadata: Metadata = { title: "Coaching", description: "Book a private coaching session with Mike Salemi, review your technique on video and keep every session note in one place." };

/**
 * Legacy coaching page (L28): head → 3 stat tiles → Coming up → Step one package → Step two time →
 * Step three focus + booking summary → History → footer note.
 */
export default async function CoachingPage(props: PageProps<"/coaching">) {
  const sp = await props.searchParams;
  const data = await loadCoaching(typeof sp.preview === "string" ? sp.preview : null);
  const recommended = data.packages.find((p) => /deep dive/i.test(p.name) || p.price?.label?.toLowerCase().includes("recommended"))?.id;
  const done = data.past.filter((s) => s.status === "completed" || s.status === "booked").length;
  const minutes = data.packages.find((p) => p.id === recommended)?.duration_minutes ?? data.packages[0]?.duration_minutes ?? 60;
  const tiles = [
    { n: data.upcoming.length, label: "Upcoming" },
    { n: done, label: "Sessions done" },
    { n: minutes, label: "Minutes per session" },
  ];

  return (
    <div className="com-page">
      <LargeTitle title="Work directly with Mike" eyebrow="Coaching" />
      <div className="exp-pagehead">
        <p>Bring your footage and your sticking point. Every session ends with a written plan you can train tomorrow.</p>
      </div>

      <div className="coa-tiles">
        {tiles.map((t) => (
          <Glass key={t.label} radius="card" className="coa-tile">
            <span className="coa-tile-n lq-num"><Ticker value={t.n} /></span>
            <span className="coa-tile-l">{t.label}</span>
          </Glass>
        ))}
      </div>

      {data.upcoming.length > 0 && (
        <section className="exp-section" aria-labelledby="next">
          <header className="exp-heading"><div><div className="exp-kicker">Coming up</div><h2 id="next" className="lq-t22">Your next session</h2></div></header>
          <UpcomingSessions sessions={data.upcoming} />
        </section>
      )}

      <CoachingFlow packages={data.packages} slots={data.slots} credits={data.credits} recommended={recommended} />

      <section className="exp-section" aria-labelledby="hist">
        <header className="exp-heading"><div><div className="exp-kicker">History</div><h2 id="hist" className="lq-t22">Previous sessions</h2></div></header>
        <PastSessions sessions={data.past} />
      </section>

      <p className="exp-measure lq-c2 coa-foot">
        Bookings are confirmed by Mike&rsquo;s team, usually within a day, and the video link arrives before the call. Cancel or move a session up to 24 hours before it starts and the session comes back to you.
      </p>
    </div>
  );
}
