import type { Metadata } from "next";
import Image from "next/image";
import { Button, Icon } from "@/components/ui";
import { CallRoom } from "@/components/coaching/CallRoom";
import { HomeworkWeek } from "@/components/coaching/HomeworkWeek";
import { CoachingPaths, CoachingTiles, ExecutiveBand, PodcastShelf } from "@/components/coaching/Sections";
import { CoachingSubNav } from "@/components/coaching/SubNav";
import { currentHomework, loadCoachingHub } from "@/lib/loaders/coaching";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";
import "@/components/experiences/coaching.css";
import "@/components/coaching/coach.css";

export const metadata: Metadata = { title: "Coaching", description: "Work with Mike Salemi: Zen Savage live group, The Path to Grounded King, 1:1 Tuesday sessions and Executive Edge by application." };

const shortWhen = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));

/**
 * Coaching overview (spec 12). One hero: the call room when a call is booked, otherwise Mike and one
 * "Book" action. Then the current homework, the three paths, Executive Edge and the podcast.
 */
export default async function CoachingPage(props: PageProps<"/coaching">) {
  const sp = await props.searchParams;
  const hub = await loadCoachingHub(typeof sp.preview === "string" ? sp.preview : null);
  const next = hub.upcoming[0];
  const hw = currentHomework(hub);
  const ee = hub.packages.find((p) => p.requires_application);
  const unread = hub.messages.filter((m) => m.from_coach && !m.read_at).length;
  const lastFromMike = [...hub.messages].reverse().find((m) => m.from_coach);
  const nextLive = hub.lives.find((l) => new Date(l.starts_at).getTime() > Date.now());
  const q = typeof sp.preview === "string" ? `?preview=${sp.preview}` : "";

  return (
    <div className="com-page co-page" style={{ gap: 0 }}>
      <CoachingSubNav unread={unread} />
      <div className="co-page" style={{ paddingBottom: 0 }}>
        {next ? (
          <CallRoom s={next} homework={hw?.homework} />
        ) : (
          <section className="co-hero" aria-labelledby="co-h">
            <div className="co-hero-photo"><Image src="/media/summit/mike-coaching.jpg" alt="Mike coaching one to one" fill priority sizes="(min-width: 768px) 520px, 100vw" style={{ objectPosition: "26% 20%" }} /></div>
            <div className="co-hero-body">
              <div className="lq-eyebrow" data-tone="accent">Coaching with Mike</div>
              <h1 className="lq-d-xl">Train the body.<br />Steady the man.</h1>
              <p className="lq-lede">Physical performance and inner work, on your footage and your sticking point. Leave every call with notes and one clear next step.</p>
              <div className="co-acts">
                <Button href={`/coaching/book${q}`} size="lg" icon="calendar">{hub.credits > 0 ? "Book your Tuesday call" : "Book a 1:1 call"}</Button>
              </div>
              <ul className="co-facts" role="list">
                <li><Icon name="calendar" size="xs" />Tuesdays · {hub.schedule?.minutes ?? 45} min</li>
                <li><Icon name="video" size="xs" />Video call</li>
                {hub.credits > 0 && <li><Icon name="check" size="xs" />{hub.credits} session{hub.credits === 1 ? "" : "s"} ready</li>}
              </ul>
            </div>
          </section>
        )}

        {hw && <HomeworkWeek bookingId={hw.id} homework={hw.homework!} from={hw.starts_at} ticked={hub.ticks[hw.id] ?? []} />}

        {hub.member && <CoachingTiles sessions={hub.upcoming.length + hub.past.filter((s) => s.status === "completed").length} unread={unread} lastNote={lastFromMike ? `Mike: “${lastFromMike.body.slice(0, 64)}${lastFromMike.body.length > 64 ? "…" : ""}”` : null} />}

        <CoachingPaths nextLive={nextLive ? shortWhen(nextLive.starts_at) : null} oneToOneHref={`/coaching/book${q}`} />

        {ee && <ExecutiveBand packageId={ee.id} status={hub.applications?.[ee.id] ?? null} />}

        <PodcastShelf episodes={hub.podcast} />
      </div>
    </div>
  );
}
