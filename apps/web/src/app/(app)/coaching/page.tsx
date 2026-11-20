import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button, Chip, Glass, Icon } from "@/components/ui";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateShort, money } from "@/components/commerce/format";
import { CoachingBooker, ExecutiveApply } from "@/components/experiences/CoachingBooker";
import { SessionCard } from "@/components/experiences/SessionCard";
import { Faq } from "@/components/experiences/RunParts";
import { loadCoaching } from "@/lib/loaders/commerce";
import { programPhoto } from "@/lib/program-photos";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";
import "@/components/experiences/retreat.css";
import "@/components/experiences/coaching.css";

export const metadata: Metadata = { title: "Coaching", description: "1:1 coaching with Mike Salemi: physical performance and inner work, 45 minutes on Tuesdays, with notes and one clear next step after every session." };

const DAY = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

/**
 * The full coaching experience (legacy L28 order, Summit look): hero → your next session with prep →
 * stats → what coaching is → step one package (and Executive Edge by application) → step two/three
 * time, focus and summary → history with Mike's notes and homework → group path → rules and FAQ.
 */
export default async function CoachingPage(props: PageProps<"/coaching">) {
  const sp = await props.searchParams;
  const data = await loadCoaching(typeof sp.preview === "string" ? sp.preview : null);
  const recommended = data.packages.find((p) => /deep dive/i.test(p.name) || p.price?.label?.toLowerCase().includes("recommended"))?.id;
  const done = data.past.filter((s) => s.status === "completed").length;
  const ee = data.packages.find((p) => p.requires_application);
  const sched = data.schedule;
  const days = sched ? sched.weekdays.map((d) => DAY[d]).join(", ") : "Tuesdays";
  const next = data.upcoming[0];
  const lastHomework = data.past.find((s) => s.homework)?.homework ?? null;
  const hero = programPhoto("coaching");

  return (
    <div className="com-page ch-page">
      <section className="ch-hero" aria-labelledby="ch-h">
        <div className="ch-hero-photo"><Image src={hero.src} alt={hero.alt} fill priority sizes="(min-width: 1024px) 520px, 100vw" style={{ objectPosition: hero.position }} /></div>
        <div className="ch-hero-body">
          <div className="lq-eyebrow" data-tone="accent">1:1 coaching with Mike</div>
          <h1 id="ch-h" className="lq-d-xl">Train the body.<br />Steady the man.</h1>
          <p className="lq-lede">Private sessions on the two things that move everything else: physical performance and inner work. Bring your footage and your sticking point; leave with notes and one clear next step.</p>
          <div className="ch-hero-acts">
            {data.credits > 0 ? <Button href="#book" size="lg" icon="calendar">Book a session</Button> : <Button href="#packages" size="lg" iconAfter="arrowRight">Choose a package</Button>}
            {ee && <Button href="#executive" size="lg" variant="glass">Executive Edge</Button>}
          </div>
          <ul className="ch-hero-facts" role="list">
            <li><Icon name="calendar" size="xs" />{days}, {sched?.minutes ?? 45} min</li>
            <li><Icon name="video" size="xs" />Video call</li>
            <li><Icon name="people" size="xs" />Men and women</li>
            {sched?.draftNote && <li><DraftChip note={sched.draftNote} /></li>}
          </ul>
        </div>
      </section>

      <div className="ch-stats">
        <div><b className="lq-num">{data.credits}</b><span>Sessions ready to book</span></div>
        <div><b className="lq-num">{data.upcoming.length}</b><span>Upcoming</span></div>
        <div><b className="lq-num">{done}</b><span>Sessions done</span></div>
        <div><b className="lq-num">{sched?.minutes ?? 45}</b><span>Minutes per session</span></div>
      </div>

      {next && (
        <section className="ch-sec" aria-labelledby="next-h">
          <header className="ch-sec-head"><div><div className="lq-eyebrow" data-tone="warm">Coming up</div><h2 id="next-h" className="lq-d-sm">Your next session</h2></div></header>
          <div className="ch-next">
            <SessionCard s={next} slots={data.slots} primary />
            {lastHomework && (
              <Glass radius="card" className="ch-homework">
                <div className="lq-eyebrow" data-tone="warm">Your one thing until then</div>
                <p className="ch-homework-text">{lastHomework}</p>
                <span className="lq-t12 lq-c2">Mike&rsquo;s homework from your last session · 5 minutes a day</span>
              </Glass>
            )}
          </div>
          {data.upcoming.slice(1).map((s) => <div key={s.id} style={{ marginTop: 12 }}><SessionCard s={s} slots={data.slots} /></div>)}
        </section>
      )}

      <section className="ch-sec" aria-labelledby="what-h">
        <header className="ch-sec-head"><div><div className="lq-eyebrow" data-tone="accent">What coaching is</div><h2 id="what-h" className="lq-d-sm">Two sides of the same work</h2></div></header>
        <div className="ch-what">
          {[
            { photo: "/media/summit/mike-getup.jpg", pos: "50% 25%", k: "Physical performance", pts: ["Technique review on your own footage", "Strength, mobility and kettlebell programming adjusted to you", "A written plan you can train tomorrow"] },
            { photo: "/media/summit/breathwork.jpg", pos: "50% 45%", k: "Inner work", pts: ["Mental focus, energy and staying steady under pressure", "Breath and nervous-system practices", "One highest-priority thing to do every day"] },
          ].map((c) => (
            <article key={c.k} className="ch-what-card">
              <div className="ch-what-photo"><Image src={c.photo} alt="" fill sizes="(min-width: 1024px) 520px, 100vw" style={{ objectPosition: c.pos }} /></div>
              <div className="ch-what-body">
                <h3 className="lq-d-xs">{c.k}</h3>
                <ul role="list">{c.pts.map((p) => <li key={p}><Icon name="check" size="xs" />{p}</li>)}</ul>
              </div>
            </article>
          ))}
        </div>
        <ol className="ch-how" role="list">
          {[
            ["Book a Tuesday time", "45 minutes on video, in your own time zone."],
            ["Prepare in five minutes", "Your goals and a link to your footage, so the call goes straight to the fix."],
            ["Train with one clear next step", "Mike’s notes and your one highest-priority thing land here after the call."],
          ].map(([t, s], i) => (
            <li key={t}><span className="lq-num">{i + 1}</span><div><b>{t}</b><span className="lq-c2">{s}</span></div></li>
          ))}
        </ol>
      </section>

      <CoachingBooker packages={data.packages} slots={data.slots} credits={data.credits} recommended={recommended} />

      {ee && (
        <section id="executive" className="ch-sec" aria-labelledby="ee-h">
          <article className="ch-ee">
            <Image src="/media/summit/mike-standing.jpg" alt="" fill sizes="(min-width: 1024px) 1100px, 100vw" className="ch-ee-img" />
            <div className="ch-ee-body">
              <div className="ch-ee-top"><span className="ch-ee-tag">By application</span>{ee.price?.draftNote && <DraftChip note={ee.price.draftNote} onPhoto />}</div>
              <h2 id="ee-h" className="lq-d-lg">Executive Edge</h2>
              <p className="ch-ee-lede">Eight weeks of daily five-minute practice, three to four direct sessions with Mike, and one highest-priority thing every day.</p>
              <ul className="ch-ee-facts" role="list">
                <li><b>8 weeks</b><span>60 days, start to finish</span></li>
                <li><b>3–4</b><span>direct interactions with Mike</span></li>
                <li><b>5 min</b><span>daily homework: your one thing</span></li>
                <li><b className="lq-num">{ee.price ? money(ee.price.amountCents, ee.price.currency) : data.executive?.priceLabel ?? "By application"}</b><span>{data.executive?.priceLabel ?? "draft"}</span></li>
              </ul>
              <p className="ch-ee-note">Built for leaders who want mental focus, energy and antifragility, and a body that keeps up.</p>
              <ExecutiveApply packageId={ee.id} status={data.applications?.[ee.id] ?? null} />
            </div>
          </article>
        </section>
      )}

      <section className="ch-sec" aria-labelledby="hist-h">
        <header className="ch-sec-head"><div><div className="lq-eyebrow" data-tone="accent">History</div><h2 id="hist-h" className="lq-d-sm">Previous sessions</h2></div><span className="lq-t13 lq-c2 lq-num">{data.past.length}</span></header>
        {data.past.length ? (
          <ol className="ch-hist" role="list">
            {data.past.map((s) => (
              <li key={s.id} className="ch-hist-item" data-status={s.status}>
                <div className="ch-hist-when">
                  <b className="lq-num">{dateShort(s.starts_at)}</b>
                  <span className="lq-t13 lq-c2">{s.package ?? "Session"} · {s.duration_minutes} min</span>
                  {s.status !== "completed" && s.status !== "booked" && <Chip variant="outline" size="sm">{s.status === "no_show" ? "Missed" : "Cancelled"}</Chip>}
                </div>
                <div className="ch-hist-body">
                  {s.member_note && <p className="lq-t13 lq-c2"><span className="lq-c3">You asked · </span>{s.member_note}</p>}
                  {s.coach_note ? <div className="ch-note"><span className="ch-note-k">Mike&rsquo;s notes</span><p>{s.coach_note}</p></div> : s.status === "completed" ? <p className="lq-t13 lq-c3">Mike&rsquo;s notes appear here after the session.</p> : null}
                  {s.homework && <div className="ch-hw"><Icon name="flag" size="sm" /><div><span className="ch-note-k">Your one thing</span><p>{s.homework}</p></div></div>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Glass radius="card" className="rt-empty"><Icon name="clipboard" size="md" /><div><b>No sessions yet</b><p className="lq-t13 lq-c2">Every session, Mike&rsquo;s notes and your homework live here.</p></div></Glass>
        )}
      </section>

      {data.group && (
        <section className="ch-sec" aria-labelledby="grp-h">
          <Link href={`/programs/${data.group.slug}`} className="ch-group lq-press">
            <div className="ch-group-photo"><Image src={programPhoto(data.group.slug).src} alt="" fill sizes="240px" /></div>
            <div className="com-grow">
              <div className="lq-eyebrow" data-tone="warm">Group coaching</div>
              <h2 id="grp-h" className="lq-d-xs">{data.group.name}</h2>
              <p className="lq-t13 lq-c2">The {data.group.name} replaces group coaching. See what&rsquo;s planned and when it starts.</p>
            </div>
            <Icon name="chevron" size="sm" />
          </Link>
        </section>
      )}

      <section className="ch-sec" aria-labelledby="rules-h">
        <header className="ch-sec-head"><div><div className="lq-eyebrow" data-tone="accent">Good to know</div><h2 id="rules-h" className="lq-d-sm">Rules and questions</h2></div></header>
        <div className="ch-rules">
          <Glass radius="card" className="ch-rules-card">
            <ul role="list">
              <li><Icon name="calendar" size="sm" /><span><b>Move or cancel 24 hours ahead</b> and the session comes back to you.</span></li>
              <li><Icon name="clock" size="sm" /><span><b>Inside 24 hours</b> a cancelled or missed session counts as used.</span></li>
              <li><Icon name="video" size="sm" /><span><b>The video link</b> arrives before the call and shows on your session card.</span></li>
              <li><Icon name="file" size="sm" /><span><b>Notes and homework</b> stay here after every session.</span></li>
            </ul>
          </Glass>
          {data.faq?.length ? <Faq items={data.faq} /> : null}
        </div>
      </section>
    </div>
  );
}
