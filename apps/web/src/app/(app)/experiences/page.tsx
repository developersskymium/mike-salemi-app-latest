import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button, Chip, Glass, Icon, type IconName } from "@/components/ui";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateRange, money } from "@/components/commerce/format";
import { RetreatLeadForm } from "@/components/experiences/RetreatLead";
import { RetreatSteps } from "@/components/experiences/RetreatSteps";
import { loadRetreats, type RetreatCard } from "@/lib/loaders/experiences";
import { requestTime } from "@/lib/request-time";
import { retreatStage, retreatSteps } from "@/lib/retreat-stage";
import { getUser } from "@/lib/supabase/server";
import "@/components/commerce/commerce.css";
import "@/components/experiences/retreat.css";
import "@/components/experiences/retreat-plus.css";

export const metadata: Metadata = {
  title: "Retreats",
  description: "Four-day Men of Movement retreats in Mount Shasta, capped at 20 men: movement, breathwork, ceremony and honest brotherhood.",
};

const PILLAR_PHOTO: Record<string, string> = {
  Rotation: "/media/retreats/ridge-circle.jpg",
  Movement: "/media/retreats/live/qi-gong.png",
  Breathwork: "/media/retreats/live/breathwork.jpg",
  Nature: "/media/retreats/live/facing-shasta.png",
  Storywork: "/media/retreats/live/fire.jpg",
};

/** One status label per card (spec 12 · All retreats #3). */
function cardStatus(r: RetreatCard, now: number): { label: string; tone: "open" | "wait" | "mine" | "going" } {
  const days = Math.max(0, Math.ceil((Date.parse(r.starts_at) - now) / 86400000));
  if (r.mine === "booked") return { label: `You’re going · ${days} ${days === 1 ? "day" : "days"}`, tone: "going" };
  if (r.mine === "accepted") return { label: "You’re approved", tone: "mine" };
  if (r.mine === "waitlist") return { label: "You’re on the waitlist", tone: "mine" };
  if (r.mine && !["declined", "cancelled"].includes(r.mine)) return { label: "You’ve applied", tone: "mine" };
  if (r.status === "waitlist" || r.status === "full" || r.seatsLeft === 0) return { label: "Waitlist", tone: "wait" };
  return { label: "Applications open", tone: "open" };
}

function seatsLine(r: RetreatCard) {
  if (r.seatsLeft == null || !r.capacity) return r.capacity ? `${r.capacity} men max` : null;
  if (r.seatsLeft === 0) return "Full · waitlist open";
  if (r.seatsLeft <= 3) return `Only ${r.seatsLeft} ${r.seatsLeft === 1 ? "place" : "places"} left`;
  return `${r.seatsLeft} of ${r.capacity} places left`;
}

function ListingCard({ r, priority, now }: { r: RetreatCard; priority?: boolean; now: number }) {
  const status = cardStatus(r, now);
  const stage = r.mine ? retreatStage({ runStatus: r.status, startsAt: r.starts_at, endsAt: r.ends_at, application: { status: r.mine, call_at: r.mineCallAt, call_done_at: r.mineCallDone ? "x" : null } }, now) : null;
  const photos = r.photos?.length ? r.photos : r.cover ? [r.cover] : [];
  const seats = seatsLine(r);
  const place = r.location ? r.location.split(",").slice(-2).join(",").trim() : null;
  const href = `/experiences/${r.id}`;
  const cta = status.tone === "going" ? "Your hub" : status.tone === "mine" ? "Continue" : status.tone === "wait" ? "Join the waitlist" : "View and apply";
  return (
    <article className="rt-listing rtp-card" aria-labelledby={`r-${r.id}`} data-tone={status.tone}>
      <div className="rt-listing-photos">
        <Link href={href} className="rt-listing-track" tabIndex={-1} aria-hidden>
          {photos.map((src, i) => (
            <div key={src} className="rt-listing-shot">
              <Image src={src} alt={i === 0 ? `${r.name}${r.location ? `, ${r.location}` : ""}` : ""} fill priority={priority && i === 0} sizes="(min-width: 1024px) 540px, 100vw" />
            </div>
          ))}
        </Link>
        <div className="rt-listing-badges">
          <Chip variant="clear" dot={status.tone === "open" || status.tone === "going"}>{status.label}</Chip>
          <DraftChip note={r.draft_note} onPhoto />
        </div>
        {photos.length > 1 && <div className="rt-listing-dots" aria-hidden>{photos.map((p, i) => <i key={p} data-on={i === 0 ? "" : undefined} />)}</div>}
      </div>
      <div className="rt-listing-body">
        <div className="lq-eyebrow" data-tone="accent">{[r.track, r.season].filter(Boolean).join(" · ") || "Men of Movement"}</div>
        <h3 id={`r-${r.id}`} className="lq-d-sm"><Link href={href} className="rtp-cardlink">{r.name}</Link></h3>
        <p className="rt-listing-meta">
          <span className="lq-num">{dateRange(r.starts_at, r.ends_at, r.timezone)}</span>
          {r.nights ? <><span aria-hidden>·</span><span className="lq-num">{r.nights} nights</span></> : null}
          {seats && <><span aria-hidden>·</span><span className="lq-num" data-few={r.seatsLeft != null && r.seatsLeft > 0 && r.seatsLeft <= 3 ? "" : undefined}>{seats}</span></>}
        </p>
        {place && (
          <a className="rtp-pin" href={`https://maps.google.com/?q=${encodeURIComponent(r.mapQuery ?? place)}`} target="_blank" rel="noopener">
            <Icon name="map" size="xs" />
            <span>{place}{r.travelTime ? <span className="lq-c2"> · {r.travelTime}</span> : null}</span>
          </a>
        )}
        <div className="rt-listing-foot">
          {r.price ? (
            <span className="rtp-price">
              <b className="lq-num">{money(r.price.amountCents, r.price.currency)}</b>
              {r.price.compareLabel && <span className="lq-c2 lq-num">regular <s>{r.price.compareLabel}</s></span>}
              <span className="lq-c2">includes the pre-retreat program</span>
            </span>
          ) : (
            <span className="lq-t13 lq-c2">By application</span>
          )}
          <Link href={href} className="rt-listing-go">{cta}<Icon name="arrowRight" size="xs" /></Link>
        </div>
        {stage && !["booked", "live", "after"].includes(stage) && <RetreatSteps steps={retreatSteps(stage)} variant="bar" />}
      </div>
    </article>
  );
}

const FOR_ME: { i: IconName; t: string; s: string }[] = [
  { i: "people", t: "New to this?", s: "About half the men are. The other half come back." },
  { i: "kettlebell", t: "Not in great shape?", s: "Everything scales. If you can walk and breathe, you can do this." },
  { i: "heart", t: "Single, partnered, a father?", s: "The work starts with you, wherever you are." },
  { i: "mountain", t: "Four days, 20 men", s: "Mount Shasta. Phones away. Nothing forced." },
];

/**
 * Retreats index (spec 12 · All retreats): upcoming only; photo cards with location, dates, nights,
 * seats left, one status label, honest price and the map pin; "Is this for me?"; a clip from a past
 * retreat when there is one; Pillar 1 free; notify me and a 15-minute questions call.
 */
export default async function RetreatsPage() {
  const [d, { user }] = await Promise.all([loadRetreats(), getUser().catch(() => ({ user: null }))]);
  const now = requestTime();
  const runs = d.runs;
  const next = runs.find((r) => r.mine === "booked") ?? runs.find((r) => r.status === "open") ?? runs[0];
  const email = user?.email ?? null;
  return (
    <div className="com-page rt-page rt-index rtp-index">
      <section className="rt-ihero rtp-ihero" aria-labelledby="ih">
        <Image src="/media/retreats/summit-group.jpg" alt="Men of Movement on a ridge facing Mount Shasta" fill priority sizes="(min-width: 1024px) 1100px, 100vw" className="rt-ihero-img" />
        <div className="rt-ihero-body">
          <div className="rt-hero-eyebrow">Men of Movement · Retreats</div>
          <h1 id="ih" className="lq-d-xxl">Four days on<br />the mountain.</h1>
          <p className="rt-ihero-lede">Mount Shasta with nineteen other men. Movement in the morning, ceremony at night, and the kind of conversation most men never get to have.</p>
          <div className="rt-ihero-acts">
            {next && <Button href={`/experiences/${next.id}`} variant="white" size="lg" iconAfter="arrowRight">{next.mine === "booked" ? "Open your retreat" : `See ${next.name}`}</Button>}
            <span className="rt-ihero-facts"><Icon name="people" size="xs" /> 20 men max <Icon name="mountain" size="xs" /> Mount Shasta, CA <Icon name="check" size="xs" /> By application</span>
          </div>
        </div>
      </section>

      <section className="rt-sec" aria-labelledby="up">
        <header className="rt-sec-head"><div><div className="lq-eyebrow" data-tone="accent">Upcoming</div><h2 id="up" className="lq-d-md">Choose your dates</h2></div><span className="lq-t13 lq-c2 lq-num">{runs.length} upcoming</span></header>
        {runs.length ? (
          <div className="rt-listings rtp-listings" data-feature={runs.length === 1 ? "" : undefined}>{runs.map((r, i) => <ListingCard key={r.id} r={r} priority={i === 0} now={now} />)}</div>
        ) : (
          <Glass radius="card" className="rt-empty"><Icon name="calendar" size="md" /><div><b>New dates are on their way</b><p className="lq-t13 lq-c2">Leave your email below and you&rsquo;ll hear first.</p></div></Glass>
        )}
      </section>

      <section className="rt-sec" aria-labelledby="fit">
        <header className="rt-sec-head"><div><div className="lq-eyebrow" data-tone="accent">Before you apply</div><h2 id="fit" className="lq-d-md">Is this for me?</h2></div></header>
        <ul className="rtp-fit" role="list">
          {FOR_ME.map((x) => (
            <li key={x.t}><span className="rtp-fit-i" aria-hidden><Icon name={x.i} size="sm" /></span><b>{x.t}</b><span className="lq-t13 lq-c2">{x.s}</span></li>
          ))}
        </ul>
      </section>

      {d.testimonial && (
        <section className="rt-sec" aria-labelledby="clip">
          <header className="rt-sec-head"><div><div className="lq-eyebrow" data-tone="accent">From a man who went</div><h2 id="clip" className="lq-d-md">In his words</h2></div></header>
          <figure className="rtp-clip">
            <video src={d.testimonial.videoUrl} poster={d.testimonial.poster ?? undefined} controls playsInline preload="none" />
            <figcaption><span className="lq-t17">&ldquo;{d.testimonial.line}&rdquo;</span><span className="lq-t13 lq-c2">{d.testimonial.name}</span></figcaption>
          </figure>
        </section>
      )}

      {d.pillars?.length ? (
        <section className="rt-sec" aria-labelledby="pl">
          <header className="rt-sec-head">
            <div><div className="lq-eyebrow" data-tone="accent">The pre-retreat program · included</div><h2 id="pl" className="lq-d-md">Five pillars, six videos</h2></div>
            <DraftChip note={d.pillarsDraftNote} />
          </header>
          <div className="rtp-pillars">
            <ol className="rt-pillstrip" role="list">
              {d.pillars.map((p, i) => (
                <li key={p}>
                  <div className="rt-pillstrip-photo">{PILLAR_PHOTO[p] && <Image src={PILLAR_PHOTO[p]!} alt="" fill sizes="(min-width: 1024px) 210px, 40vw" />}</div>
                  <span className="lq-num rt-pillstrip-n">{String(i + 1).padStart(2, "0")}</span>
                  <b className="lq-d-xs">{p}</b>
                </li>
              ))}
            </ol>
            <div className="rtp-pillars-foot">
              <p className="lq-t15 lq-c2">Every man booked gets the program about three months before his retreat, so he arrives already practising. Try the first one now.</p>
              {d.pillarPreview && <Button href={d.pillarPreview.href} variant="glass" size="md" icon="play">Watch Pillar 1 free</Button>}
            </div>
          </div>
        </section>
      ) : null}

      <section className="rt-sec" aria-labelledby="how">
        <header className="rt-sec-head"><div><div className="lq-eyebrow" data-tone="accent">How it comes together</div><h2 id="how" className="lq-d-md">Apply, a call, then confirm</h2></div></header>
        <ol className="rt-how" role="list">
          {[
            { t: "Apply", s: "Five minutes, nothing charged. Almost every man who applies is accepted.", i: "clipboard" as const },
            { t: "Schedule a call", s: "Talk through what’s calling you, health and travel with Mike’s team.", i: "video" as const },
            { t: "Confirm & pay", s: "Once approved, confirm your place. Your hub opens with the countdown and preparation.", i: "check" as const },
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

      <section className="rtp-reach" aria-label="Stay in touch">
        <div className="rtp-reach-card">
          <Icon name="bell" size="md" />
          <div><h2 className="lq-d-xs">Notify me about new dates</h2><p className="lq-t13 lq-c2">One email when a retreat opens. Nothing else.</p></div>
          <RetreatLeadForm kind="notify" email={email} />
        </div>
        <div className="rtp-reach-card">
          <Icon name="phone" size="md" />
          <div><h2 className="lq-d-xs">Questions? Book a 15-min call</h2><p className="lq-t13 lq-c2">Health, travel, whether it&rsquo;s right for you: ask Mike&rsquo;s team before you apply.</p></div>
          <RetreatLeadForm kind="question_call" email={email} runId={next?.id} callUrl={d.questionCallUrl} />
        </div>
      </section>
    </div>
  );
}
