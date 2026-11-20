import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button, Chip, Glass, Icon } from "@/components/ui";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateRange, money } from "@/components/commerce/format";
import { RetreatSteps } from "@/components/experiences/RetreatSteps";
import { loadRetreats, type RetreatCard } from "@/lib/loaders/experiences";
import { retreatStage, retreatSteps, STAGE_LABEL } from "@/lib/retreat-stage";
import "@/components/commerce/commerce.css";
import "@/components/experiences/retreat.css";

export const metadata: Metadata = {
  title: "Retreats",
  description: "Four-day Men of Movement retreats in Mount Shasta, capped at 20 men: movement, breathwork, ceremony and honest brotherhood.",
};

const STATUS: Record<string, string> = { open: "Applications open", waitlist: "Waitlist", full: "Full", past: "Past retreat", in_progress: "Happening now" };
const TRACK_PHOTO: Record<string, string> = { "Hold Your Ground": "/media/retreats/live/qi-gong.png", "Primal Reset": "/media/retreats/live/group-tims-land.jpg" };
const PILLAR_PHOTO: Record<string, string> = {
  Rotation: "/media/retreats/ridge-circle.jpg",
  Movement: "/media/retreats/live/qi-gong.png",
  Breathwork: "/media/retreats/live/breathwork.jpg",
  Nature: "/media/retreats/live/facing-shasta.png",
  Storywork: "/media/retreats/live/fire.jpg",
};

function ListingCard({ r, priority }: { r: RetreatCard; priority?: boolean }) {
  const stage = r.mine ? retreatStage({ runStatus: r.status, startsAt: r.starts_at, endsAt: r.ends_at, application: { status: r.mine, call_at: r.mineCallAt, call_done_at: r.mineCallDone ? "x" : null } }) : null;
  const photos = r.photos?.length ? r.photos : r.cover ? [r.cover] : [];
  const past = r.status === "past";
  return (
    <article className="rt-listing" data-past={past ? "" : undefined} aria-labelledby={`r-${r.id}`}>
      <div className="rt-listing-photos" data-n={photos.length}>
        <Link href={`/experiences/${r.id}`} className="rt-listing-track" tabIndex={-1} aria-hidden>
          {photos.map((src, i) => (
            <div key={src} className="rt-listing-shot">
              <Image src={src} alt={i === 0 ? `${r.name}${r.location ? `, ${r.location}` : ""}` : ""} fill priority={priority && i === 0} sizes="(min-width: 1024px) 540px, 100vw" />
            </div>
          ))}
        </Link>
        <div className="rt-listing-badges">
          <Chip variant="clear" dot={r.status === "open"}>{stage ? STAGE_LABEL[stage] : STATUS[r.status] ?? r.status}</Chip>
          <DraftChip note={r.draft_note} onPhoto />
        </div>
        {photos.length > 1 && <div className="rt-listing-dots" aria-hidden>{photos.map((p, i) => <i key={p} data-on={i === 0 ? "" : undefined} />)}</div>}
      </div>
      <Link href={`/experiences/${r.id}`} className="rt-listing-body">
        <div className="lq-eyebrow" data-tone="accent">{[r.track, r.season].filter(Boolean).join(" · ") || "Men of Movement"}</div>
        <h3 id={`r-${r.id}`} className="lq-d-sm">{r.name}</h3>
        <p className="lq-t15 lq-c2">{r.tagline}</p>
        <p className="rt-listing-meta">
          <span className="lq-num">{dateRange(r.starts_at, r.ends_at, r.timezone)}</span>
          {r.location && <><span aria-hidden>·</span><span>{r.location.split(",").slice(-2).join(",").trim()}</span></>}
        </p>
        <div className="rt-listing-foot">
          {r.price && !past ? (
            <span className="rt-listing-price"><b className="lq-num">{money(r.price.amountCents, r.price.currency)}</b>{r.price.compareLabel && <s className="lq-c3 lq-num">{r.price.compareLabel}</s>}<span className="lq-c2">per man</span></span>
          ) : (
            <span className="lq-t13 lq-c2">{r.capacity ? `${r.capacity} men maximum` : ""}{r.durationLabel ? ` · ${r.durationLabel}` : ""}</span>
          )}
          <span className="rt-listing-go">{past ? "See the retreat" : stage && ["booked", "live", "after"].includes(stage) ? "Your hub" : stage ? "Continue" : "View and apply"}<Icon name="arrowRight" size="xs" /></span>
        </div>
        {stage && !["booked", "live", "after"].includes(stage) && <RetreatSteps steps={retreatSteps(stage)} variant="bar" />}
      </Link>
    </article>
  );
}

/** Retreats index (legacy L24 in the Summit style): photo hero, listing cards, the two tracks, the pillars, how it works, what it is not. */
export default async function RetreatsPage() {
  const d = await loadRetreats();
  const upcoming = d.runs.filter((r) => r.status !== "past");
  const past = d.runs.filter((r) => r.status === "past");
  const next = upcoming[0];
  return (
    <div className="com-page rt-page rt-index">
      <section className="rt-ihero" aria-labelledby="ih">
        <Image src="/media/retreats/summit-group.jpg" alt="Men of Movement on a ridge facing Mount Shasta" fill priority sizes="(min-width: 1024px) 1100px, 100vw" className="rt-ihero-img" />
        <div className="rt-ihero-body">
          <div className="rt-hero-eyebrow">Men of Movement · Retreats</div>
          <h1 id="ih" className="lq-d-xxl">Four days on<br />the mountain.</h1>
          <p className="rt-ihero-lede">Mount Shasta with nineteen other men. Movement in the morning, ceremony at night, and the kind of conversation most men never get to have.</p>
          <div className="rt-ihero-acts">
            {next && <Button href={`/experiences/${next.id}`} variant="white" size="lg" iconAfter="arrowRight">See {next.name}</Button>}
            <span className="rt-ihero-facts"><Icon name="people" size="xs" /> 20 men max <Icon name="mountain" size="xs" /> Mount Shasta, CA <Icon name="check" size="xs" /> By application</span>
          </div>
        </div>
      </section>

      <section className="rt-sec" aria-labelledby="up">
        <header className="rt-sec-head"><div><div className="lq-eyebrow" data-tone="accent">Upcoming</div><h2 id="up" className="lq-d-md">Choose your dates</h2></div><span className="lq-t13 lq-c2 lq-num">{upcoming.length} upcoming</span></header>
        {upcoming.length ? (
          <div className="rt-listings" data-feature={upcoming.length === 1 ? "" : undefined}>{upcoming.map((r, i) => <ListingCard key={r.id} r={r} priority={i === 0} />)}</div>
        ) : (
          <Glass radius="card" className="rt-empty"><Icon name="calendar" size="md" /><div><b>New dates are on their way</b><p className="lq-t13 lq-c2">Mike announces each retreat here first.</p></div></Glass>
        )}
      </section>

      {d.tracks?.length ? (
        <section className="rt-sec" aria-labelledby="tr">
          <header className="rt-sec-head"><div><div className="lq-eyebrow" data-tone="accent">Two retreats</div><h2 id="tr" className="lq-d-md">Different land, different fire</h2></div><DraftChip note={d.tracksDraftNote} /></header>
          <div className="rt-tracks">
            {d.tracks.map((t) => (
              <article key={t.name} className="rt-track">
                {TRACK_PHOTO[t.name] && <Image src={TRACK_PHOTO[t.name]!} alt="" fill sizes="(min-width: 1024px) 540px, 100vw" className="rt-track-img" />}
                <div className="rt-track-body">
                  <span className="rt-hero-eyebrow">{t.venue}</span>
                  <h3 className="lq-d-md">{t.name}</h3>
                  <p>{t.focus}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {d.pillars?.length ? (
        <section className="rt-sec" aria-labelledby="pl">
          <header className="rt-sec-head"><div><div className="lq-eyebrow" data-tone="accent">What the work rests on</div><h2 id="pl" className="lq-d-md">Five pillars</h2></div><DraftChip note={d.pillarsDraftNote} /></header>
          <ol className="rt-pillstrip" role="list">
            {d.pillars.map((p, i) => (
              <li key={p}>
                <div className="rt-pillstrip-photo">{PILLAR_PHOTO[p] && <Image src={PILLAR_PHOTO[p]!} alt="" fill sizes="(min-width: 1024px) 210px, 40vw" />}</div>
                <span className="lq-num rt-pillstrip-n">{String(i + 1).padStart(2, "0")}</span>
                <b className="lq-d-xs">{p}</b>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="rt-sec" aria-labelledby="how">
        <header className="rt-sec-head"><div><div className="lq-eyebrow" data-tone="accent">How it comes together</div><h2 id="how" className="lq-d-md">Three steps to the mountain</h2></div></header>
        <ol className="rt-how" role="list">
          {[
            { t: "Apply", s: "Five minutes, nothing charged. Almost every man who applies is accepted.", i: "clipboard" as const },
            { t: "Schedule a call", s: "Pick a time with Mike’s team to talk through what’s calling you, health and travel.", i: "video" as const },
            { t: "If approved, pay", s: "Confirm your place. Your hub opens with the countdown, preparation and the pre-retreat program.", i: "check" as const },
          ].map((x, n) => (
            <li key={x.t} className="rt-how-step">
              <span className="rt-how-n lq-num">{n + 1}</span>
              <Icon name={x.i} size="md" />
              <b className="lq-d-xs">{x.t}</b>
              <span className="lq-t13 lq-c2">{x.s}</span>
            </li>
          ))}
        </ol>
      </section>

      {past.length > 0 && (
        <section className="rt-sec" aria-labelledby="pa">
          <header className="rt-sec-head"><div><div className="lq-eyebrow">Past retreats</div><h2 id="pa" className="lq-d-sm">Where we&rsquo;ve been</h2></div></header>
          <div className="rt-listings" data-small="">{past.map((r) => <ListingCard key={r.id} r={r} />)}</div>
        </section>
      )}

      <Glass as="section" radius="card" className="rt-notice" aria-labelledby="not">
        <div className="lq-eyebrow" data-tone="warm">What it is not</div>
        <h2 id="not" className="lq-d-sm">No performance, no forcing.</h2>
        <p className="lq-t15 lq-c2">Around half the men who come have never done work like this. Everything is scalable, nothing is forced, and you decide how far you go. You leave with practices you can keep, a brotherhood group, and an integration call a week later.</p>
      </Glass>
    </div>
  );
}
