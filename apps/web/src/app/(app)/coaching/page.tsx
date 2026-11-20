import type { Metadata } from "next";
import { Chip, Glass, Icon, LargeTitle } from "@/components/ui";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { DraftChip } from "@/components/commerce/DraftChip";
import { money } from "@/components/commerce/format";
import { BookingCalendar, CreditsCard, PastSessions, UpcomingSessions } from "@/components/experiences/CoachingBoard";
import { SectionHead } from "@/components/experiences/RunParts";
import { loadCoaching, type CoachingPackageView } from "@/lib/loaders/commerce";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";

export const metadata: Metadata = { title: "Coaching" };

/** Description = intro paragraph + "- " bullet lines. */
function splitDescription(d: string | null) {
  const lines = (d ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  return { intro: lines.filter((l) => !l.startsWith("- ")).join(" "), bullets: lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2)) };
}

function Package({ p, highlight }: { p: CoachingPackageView; highlight: boolean }) {
  const { intro, bullets } = splitDescription(p.description);
  return (
    <Glass as="article" radius="card" className="coa-pkg lq-lift" aria-label={p.name}>
      <div className="com-between">
        <span className="exp-kicker">{p.sessions} × {p.duration_minutes} min</span>
        <span className="com-row" style={{ gap: 6 }}>
          {highlight && <Chip variant="fill">Recommended</Chip>}
          <DraftChip note={p.price?.draftNote} />
        </span>
      </div>
      <h3 className="lq-t22">{p.name}</h3>
      {p.price ? <div className="coa-price">{money(p.price.amountCents, p.price.currency)}</div> : <div className="lq-t17 lq-c2">By application</div>}
      {intro && <p className="lq-t13 lq-c2">{intro}</p>}
      {bullets.length > 0 && (
        <ul>
          {bullets.map((b) => (
            <li key={b}><Icon name="check" size="xs" />{b}</li>
          ))}
        </ul>
      )}
      {p.requires_application || !p.price ? (
        <p className="lq-t13 lq-c2" style={{ marginTop: "auto" }}>Ask Mike&rsquo;s team about joining on your next call, or reply to any email from Mike.</p>
      ) : (
        <CheckoutButton kind="coaching" refId={p.id} label={p.sessions > 1 ? `Get ${p.sessions} sessions` : "Get this session"} variant="glass" size="md" block />
      )}
    </Glass>
  );
}

export default async function CoachingPage(props: PageProps<"/coaching">) {
  const sp = await props.searchParams;
  const data = await loadCoaching(typeof sp.preview === "string" ? sp.preview : null);
  const recommended = data.packages.find((p) => p.price?.label?.toLowerCase().includes("recommended"))?.id;

  const packages = (
    <section id="packages" className={data.credits > 0 ? "exp-section" : "coa-first"} aria-label="Packages">
      <SectionHead title={data.credits > 0 ? "Packages" : "Start with a package"} kicker="Work with Mike" />
      <div className="coa-packages">
        {data.packages.map((p) => <Package key={p.id} p={p} highlight={p.id === recommended} />)}
      </div>
    </section>
  );

  return (
    <div className="com-page">
      <LargeTitle title="Coaching" eyebrow="1:1 with Mike" />
      {data.credits === 0 && packages}

      <div className={data.credits === 0 ? "coa-layout exp-section" : "coa-layout"}>
        <div className="com-stack">
          <CreditsCard credits={data.credits} nextHref={data.credits ? "#book" : "#packages"} />
          {data.upcoming.length > 0 && (
            <section aria-labelledby="up-h">
              <h2 id="up-h" className="lq-t17" style={{ margin: "8px 4px 10px" }}>Coming up</h2>
              <UpcomingSessions sessions={data.upcoming} />
            </section>
          )}
        </div>
        <section id="book" aria-labelledby="book-h" style={{ scrollMarginTop: 64 }}>
          <h2 id="book-h" className="lq-t17" style={{ margin: "0 4px 10px" }}>Book a time</h2>
          <BookingCalendar slots={data.slots} credits={data.credits} />
        </section>
      </div>

      {data.credits > 0 && packages}

      {data.past.length > 0 && (
        <section className="exp-section" aria-label="Past sessions">
          <SectionHead title="Past sessions" kicker="Notes from Mike" />
          <PastSessions sessions={data.past} />
        </section>
      )}
    </div>
  );
}
