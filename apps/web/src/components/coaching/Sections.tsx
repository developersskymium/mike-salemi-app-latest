import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { ExecutiveApply } from "@/components/experiences/CoachingBooker";
import type { PodcastEpisode } from "@/lib/loaders/coaching";
import { photo, programCover, surfacePhoto } from "@/lib/photos";

/** Idea 1 · Three ways to work with Mike. Executive Edge sits below, by application. */
export function CoachingPaths({ nextLive, oneToOneHref = "/coaching/book" }: { nextLive?: string | null; oneToOneHref?: string }) {
  const paths = [
    {
      kind: "Group · live",
      name: "Zen Savage",
      text: "The live group challenge that replaces group coaching: breath, kettlebell and one decisive act each week.",
      href: "/coaching/zen-savage",
      cta: nextLive ? `Next live ${nextLive}` : "See the live schedule",
      img: programCover("zen-savage") ?? photo("getup"),
    },
    {
      kind: "Course · inner work",
      name: "The Path → Grounded King",
      text: "The Path to Inspired Action becomes The Grounded King: strength, presence and nervous-system work with other men.",
      href: "/programs/the-path-to-inspired-action",
      cta: "Open the program",
      img: programCover("the-path-to-inspired-action") ?? photo("valley"),
    },
    {
      kind: "1:1 · Tuesdays",
      name: "Private session",
      text: "45 minutes with Mike on your footage and your sticking point. Notes and one next step after every call.",
      href: oneToOneHref,
      cta: "Book a Tuesday",
      img: surfacePhoto("coaching"),
    },
  ];
  return (
    <section aria-labelledby="paths-h">
      <header className="co-head"><div><div className="lq-eyebrow" data-tone="accent">Ways to work with Mike</div><h2 id="paths-h" className="lq-d-md">Choose your path</h2></div></header>
      <div className="co-paths">
        {paths.map((p) => (
          <Link key={p.name} href={p.href} className="co-card co-path lq-press">
            <div className="co-path-photo"><Image src={p.img.src} alt={p.img.alt} fill sizes="(min-width: 1024px) 360px, 132px" style={{ objectPosition: p.img.focal }} /></div>
            <div className="co-path-body">
              <span className="co-path-kind">{p.kind}</span>
              <h3 className="lq-d-sm">{p.name}</h3>
              <p>{p.text}</p>
              <span className="co-path-foot"><span>{p.cta}</span><Icon name="arrowRight" size="xs" /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Idea 9 · Executive Edge: premium dark band; the price is shared only after the call with Mike. */
export function ExecutiveBand({ packageId, status }: { packageId: string; status: string | null }) {
  return (
    <section id="executive" className="co-ee" aria-labelledby="ee-h">
      <div className="co-ee-photo"><Image src={surfacePhoto("executiveEdge").src} alt={surfacePhoto("executiveEdge").alt} fill sizes="(min-width: 768px) 480px, 100vw" style={{ objectPosition: surfacePhoto("executiveEdge").focal }} /></div>
      <div className="co-ee-body">
        <span className="co-ee-tag">By application · limited places</span>
        <h2 id="ee-h" className="lq-d-lg">Executive Edge</h2>
        <p>Eight weeks for leaders who want mental focus, energy and antifragility, and a body that keeps up. Five minutes a day on your highest-priority thing, with Mike in your corner. Investment is shared on your call with Mike.</p>
        <ul className="co-ee-facts" role="list">
          <li><b>8 weeks</b><span>60 days, start to finish</span></li>
          <li><b>3–4</b><span>direct sessions with Mike</span></li>
          <li><b>5 min</b><span>daily practice</span></li>
        </ul>
        <div className="co-acts"><ExecutiveApply packageId={packageId} status={status} /></div>
        {status && <p className="co-room-note"><Icon name="lock" size="xs" />Investment is shared on your call with Mike, once you are a fit.</p>}
      </div>
    </section>
  );
}

const showDate = (d: string | null) => (d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`)) : "");

/** Idea 10 · The King Within podcast. Hidden when there are no episodes. */
export function PodcastShelf({ episodes }: { episodes: PodcastEpisode[] }) {
  if (!episodes.length) return null;
  return (
    <section aria-labelledby="pod-h">
      <header className="co-head">
        <div className="co-pod-head">
          <span className="co-pod-art"><Image src="/media/summit/mike-face.png" alt="" fill sizes="56px" /></span>
          <div><div className="lq-eyebrow" data-tone="accent">Podcast</div><h2 id="pod-h" className="lq-d-md">The King Within</h2></div>
        </div>
        <a className="lq-t13 co-ic" href="https://podcasts.apple.com/us/podcast/the-path-with-mike-salemi/id1643622665" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 600 }}>All episodes<Icon name="external" size="xs" /></a>
      </header>
      <div className="co-shelf" role="list">
        {episodes.map((e) => (
          <a key={e.id} role="listitem" href={e.url} target="_blank" rel="noreferrer" className="co-card co-ep lq-press">
            <span className="co-ep-top"><span className="co-num">{showDate(e.published_on)}</span><Icon name="speaker" size="xs" /></span>
            <h3>{e.title}</h3>
            <span className="co-ep-foot"><Icon name="play" size="xs" />Listen</span>
          </a>
        ))}
      </div>
    </section>
  );
}

/** Two quiet doors: the sessions timeline and the message thread. */
export function CoachingTiles({ sessions, unread, lastNote }: { sessions: number; unread: number; lastNote?: string | null }) {
  return (
    <div className="co-tiles">
      <Link href="/coaching/sessions" className="co-card co-tile lq-press">
        <span className="co-tile-ic"><Icon name="route" size="sm" /></span>
        <span className="com-grow" style={{ flex: 1 }}><b>Your coaching timeline</b><span>{sessions ? `${sessions} call${sessions === 1 ? "" : "s"} · notes and homework` : "Every call, note and homework"}</span></span>
        <Icon name="chevron" size="sm" />
      </Link>
      <Link href="/coaching/messages" className="co-card co-tile lq-press">
        <span className="co-tile-ic"><Icon name="file" size="sm" /></span>
        <span style={{ flex: 1 }}><b>Message Mike{unread ? ` · ${unread} new` : ""}</b><span>{lastNote ?? "Ask between calls · reply within 48 hours"}</span></span>
        <Icon name="chevron" size="sm" />
      </Link>
    </div>
  );
}
