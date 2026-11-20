import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { NextStepCard } from "@/components/signature";
import { JoinButton } from "@/components/today/JoinButton";
import { Button, Icon } from "@/components/ui";
import { coverFor } from "@/lib/covers";
import { FINISH_ALT, KIND_LABEL, buildChapters, chapterProgress, daysUntil, signatureOf, type SeriesChapter, type SeriesItem } from "@/lib/series";
import type { SeriesHomeData } from "@/lib/loaders/series";
import { IntroOnce } from "./IntroOnce";
import { SeriesNavigator } from "./SeriesNavigator";
import "./series.css";
import "../journey/accent.css";

/**
 * Program main page for Working-In, The Path, Men of Movement preparation and the free series
 * (spec 11, feedback 2 + 13): one big cover, title, promise, progress and ONE primary action;
 * one signature band; then the navigator (chapters strip + small thumbnail cards).
 */
export function SeriesHome({ home, offer, badges, finish }: { home: SeriesHomeData; offer?: ReactNode; badges?: ReactNode; finish?: ReactNode }) {
  const { data, media, retreat } = home;
  const { program } = data;
  const cfg = program.journey;
  const slug = program.slug;
  const sig = signatureOf(slug, cfg.kind);
  const chapters = buildChapters(data, media);
  const items = chapters.flatMap((c) => c.items).filter((i) => i.kind !== "welcome");
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? done / items.length : 0;
  const started = done > 0 || Boolean(data.lastLessonId);
  const lastIdx = items.findIndex((i) => i.id === data.lastLessonId);
  const next: SeriesItem | undefined =
    (lastIdx >= 0 && !items[lastIdx]!.done ? items[lastIdx] : items.slice(lastIdx + 1).find((i) => !i.done)) ?? items.find((i) => !i.done);
  const href = (id: string) => `/programs/${slug}/course/${id}`;
  const initialChapter = Math.max(0, chapters.findIndex((c) => c.items.some((i) => i.id === next?.id)));
  const locked = data.locked;

  // Not started or no access: the access-aware Start / Buy / Upgrade (components/access via JoinButton).
  const cta = locked || (!data.enrolled && !started) ? (
    <JoinButton programId={program.id} pathId={null} slug={slug} name={program.name} variant="filled" size="lg" label={locked ? undefined : "Start"} />
  ) : pct >= 1 ? (
    <Button href={href("start")} variant="filled" size="lg" icon="repeat">Watch again</Button>
  ) : (
    <Button href={next ? href(next.id) : href("start")} variant={started ? "warm" : "filled"} size="lg" icon="play" prefetch>
      {started ? "Continue" : "Start"}
    </Button>
  );

  const nextCover = cfg.next ? coverFor(cfg.next.slug) : null;

  return (
    <div className="sr" data-sig={sig} data-jy-theme={cfg.theme}>
      <nav className="sr-crumbs" aria-label="Breadcrumb">
        <Link href="/programs"><Icon name="back" size="xs" /> Programs</Link>
      </nav>

      <header className="sr-hero">
        <figure className="sr-hero-photo" style={{ "--focal": program.cover.focal, "--focal-phone": program.cover.focalPhone } as CSSProperties}>
          <Image src={program.cover.src} alt={program.cover.alt} fill priority sizes="(min-width: 1240px) 1240px, 100vw" />
        </figure>
        <div className="sr-hero-text">
          <p className="sr-eyebrow">{cfg.eyebrow}</p>
          <h1 className="sr-title">{program.name}</h1>
          <p className="sr-promise">{cfg.promise}</p>
          <div className="sr-hero-row">
            {cta}
            <details className="sr-more">
              <summary aria-label="More options"><Icon name="more" size="sm" /></summary>
              <div className="sr-more-menu" role="menu">
                {data.intro && !locked && <Link role="menuitem" href={href("start")}><Icon name="play" size="xs" />Watch intro</Link>}
                <a role="menuitem" href="#sr-about"><Icon name="info" size="xs" />About this program</a>
                {data.intake && !locked && <Link role="menuitem" href={`/intake/${slug}`}><Icon name="clipboard" size="xs" />{data.intake.done ? "Your program approach" : "Tailor it to you"}</Link>}
                {!locked && <Link role="menuitem" href="/plan"><Icon name="calendar" size="xs" />Add to my schedule</Link>}
              </div>
            </details>
            {!locked && items.length > 0 && (
              <span className="sr-prog" aria-label={`${done} of ${items.length} done`}>
                <span className="sr-prog-bar"><i style={{ "--p": pct } as CSSProperties} /></span>
                <span className="lq-num">{done}/{items.length} {cfg.unit.many}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {data.intro && !started && !locked && <IntroOnce slug={slug} href={href("start")} name={program.name} photo={chapters[0]?.items[0]?.photo ?? { src: program.cover.src, position: program.cover.focal }} />}
      {pct >= 1 && !locked && <FinishLine slug={slug} name={program.name} next={cfg.next ?? null} choose={finish} />}
      {sig === "practice" && next && !locked && pct < 1 && <TodayPractice item={next} href={href(next.id)} started={started} />}
      {sig === "pillars" && <Countdown retreat={retreat} chapters={chapters} />}
      {sig === "journey" && !locked && <ThisWeek chapters={chapters} at={initialChapter} href={href} />}

      <SeriesNavigator slug={slug} chapters={chapters} initial={initialChapter} nextId={next?.id ?? null} locked={locked} sig={sig} />

      <About highlights={program.highlights} description={program.description ?? program.summary} done={done} total={items.length} started={started} badges={badges} />

      {pct < 1 && (cfg.next || offer) && (
        <section className="sr-next" aria-labelledby="sr-next-h" data-offer-slot="series_end">
          <p className="sr-eyebrow" id="sr-next-h">{cfg.next ? "When you're ready for more" : "Pairs well with"}</p>
          {cfg.next && nextCover ? (
            (

              <NextStepCard
                title={cfg.next.label}
                meta={cfg.next.reason}
                href={cfg.next.href}
                cta={cfg.next.cta}
                image={{ src: nextCover.src, alt: nextCover.alt, position: nextCover.focal }}
              />
            )
          ) : offer}
        </section>
      )}
    </div>
  );
}

/** Working-In: the one short practice to do today, first. */
function TodayPractice({ item, href, started }: { item: SeriesItem; href: string; started: boolean }) {
  return (
    <Link href={href} className="sr-today lq-press" prefetch>
      <span className="sr-today-thumb">
        <Image src={item.thumb ?? item.photo.src} alt="" fill sizes="(min-width: 768px) 280px, 40vw" style={{ objectPosition: item.thumb ? "50% 50%" : item.photo.position }} />
        <span className="sr-play" aria-hidden><Icon name="play" size="sm" /></span>
      </span>
      <span className="sr-today-body">
        <span className="sr-eyebrow" data-tone="warm">{started ? "Today's practice" : "Your first practice"}</span>
        <b>{item.title}</b>
        <small>{KIND_LABEL[item.kind]}{item.minutes ? ` · ${item.minutes} min` : " · short session"} · best on a recovery day</small>
      </span>
      <Icon name="chevron" size="sm" className="sr-go" />
    </Link>
  );
}

/** Men of Movement: days to the retreat and the five pillars at a glance. */
function Countdown({ retreat, chapters }: { retreat: SeriesHomeData["retreat"]; chapters: SeriesChapter[] }) {
  const days = retreat ? daysUntil(retreat.startsAt) : null;
  const pillars = chapters.filter((c) => c.key !== "start" && c.key !== "after");
  return (
    <section className="sr-count" aria-label="Retreat countdown">
      <div className="sr-count-num">
        {days !== null ? (
          <>
            <b className="lq-num">{days}</b>
            <span>days to {retreat!.name}</span>
          </>
        ) : (
          <>
            <b><Icon name="mountain" size="lg" /></b>
            <span>Opens about three months before your retreat</span>
          </>
        )}
      </div>
      <ol className="sr-count-pillars">
        {pillars.map((p) => {
          const pr = chapterProgress(p);
          return (
            <li key={p.key} data-state={p.soon ? "soon" : pr.pct >= 1 ? "done" : pr.done > 0 ? "now" : undefined}>
              <i aria-hidden>{pr.pct >= 1 && !p.soon ? <Icon name="check" size="xs" /> : null}</i>
              <span>{p.label}</span>
            </li>
          );
        })}
      </ol>
      {days === null && <Link href="/experiences" className="sr-link">See the retreats</Link>}
    </section>
  );
}

/** The Path: this week's call and reflection, the journey's signature. */
function ThisWeek({ chapters, at, href }: { chapters: SeriesChapter[]; at: number; href: (id: string) => string }) {
  const week = chapters[at];
  if (!week) return null;
  const reflection = week.items.find((i) => i.kind === "reflection");
  const pr = chapterProgress(week);
  return (
    <section className="sr-week" aria-labelledby="sr-week-h">
      <div>
        <p className="sr-eyebrow" data-tone="warm">You're on {week.label} of {chapters.length}</p>
        <h2 id="sr-week-h" className="sr-h2">{pr.done ? `${pr.done} of ${pr.total} done this week` : "Start with the call, then sit with the playwork"}</h2>
      </div>
      {reflection && (
        <Link href={href(reflection.id)} className="sr-reflect lq-press" prefetch>
          <Icon name="leaf" size="sm" />
          <span>
            <small>This week's reflection</small>
            <b>{reflection.title}</b>
          </span>
          <Icon name="chevron" size="xs" className="sr-go" />
        </Link>
      )}
    </section>
  );
}

/** "What you'll get" in three lines (full copy behind Read more) and the program's badges, greyed until earned. */
function About({ highlights, description, done, total, started, badges }: { highlights: string[]; description: string | null; done: number; total: number; started: boolean; badges?: ReactNode }) {
  const medals = [
    { key: "start", label: "Started", earned: started || done > 0 },
    { key: "half", label: "Halfway", earned: total > 0 && done / total >= 0.5 },
    { key: "done", label: "Finished", earned: total > 0 && done >= total },
  ];
  return (
    <section className="sr-about" id="sr-about" aria-labelledby="sr-about-h">
      <div className="sr-about-get">
        <h2 id="sr-about-h" className="sr-h2">What you'll get</h2>
        {highlights.length > 0 && (
          <ul className="sr-ticks">
            {highlights.slice(0, 3).map((h) => <li key={h}><Icon name="check" size="xs" />{h}</li>)}
          </ul>
        )}
        {description && (
          <details className="sr-readmore">
            <summary>Read more</summary>
            {description.split(/\n{2,}/).map((p, i) => <p key={i}>{p.replace(/\*\*/g, "").replace(/^#+\s*/, "")}</p>)}
          </details>
        )}
      </div>
      {badges ? <div className="sr-about-medals" data-v2="">{badges}</div> : <div className="sr-about-medals">
        <p className="sr-eyebrow">Program badges</p>
        <ul className="sr-medals">
          {medals.map((m) => (
            <li key={m.key} data-earned={m.earned ? "" : undefined}>
              <span className="sr-medal" aria-hidden><Icon name={m.key === "done" ? "trophy" : "medal"} size="sm" /></span>
              <small>{m.label}</small>
              <span className="lq-sr">{m.earned ? "earned" : "not earned yet"}</span>
            </li>
          ))}
        </ul>
      </div>}
    </section>
  );
}

/** Finish line: the certificate and a choice of two next steps (spec 12 program idea 10). */
function FinishLine({ slug, name, next, choose }: { slug: string; name: string; next: { slug: string; href: string; label: string; reason: string } | null; choose?: ReactNode }) {
  const alt = FINISH_ALT[slug];
  const picks = [next, alt].filter(Boolean) as { slug: string; href: string; label: string; reason: string }[];
  return (
    <section className="sr-finish" aria-labelledby="sr-finish-h">
      <div className="sr-finish-cert">
        <span className="sr-medal" data-big="" aria-hidden><Icon name="trophy" size="md" /></span>
        <div>
          <p className="sr-eyebrow" data-tone="warm">Finished</p>
          <h2 id="sr-finish-h" className="sr-h2">You completed {name}</h2>
          <Link href="/you/certificates" className="sr-link">View your certificate</Link>
        </div>
      </div>
      {choose ?? (picks.length > 0 && (
        <div className="sr-finish-next">
          <p className="sr-eyebrow">Choose what's next</p>
          <div className="sr-finish-grid">
            {picks.slice(0, 2).map((p) => {
              const c = coverFor(p.slug);
              return (
                <Link key={p.href} href={p.href} className="sr-pick lq-press" prefetch>
                  <span className="sr-pick-photo"><Image src={c.src} alt="" fill sizes="(min-width: 768px) 300px, 100vw" style={{ objectPosition: c.focal }} /></span>
                  <span className="sr-pick-body"><b>{p.label}</b><small>{p.reason}</small></span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
