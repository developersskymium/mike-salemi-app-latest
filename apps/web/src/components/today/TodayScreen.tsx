import Image from "next/image";
import Link from "next/link";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { MedalPin } from "@/components/badges/MedalPin";
import { medalColorOf } from "@/components/badges/catalog";
import { PhotoHero } from "@/components/signature";
import { Button, Glass, Icon, ProgressBar, Tag } from "@/components/ui";
import type { BadgeDefinition, MikeNote } from "@ms/api";
import type { SuggestedProgram } from "@/lib/settings/suggestions";
import { PHOTO, photoByFile, programCover, surfacePhoto, type Photo, type PhotoName } from "@/lib/photos";
import { programHref } from "@/lib/hrefs";
import type { HomeItem, HomeView } from "./buildHome";
import type { TodayView } from "./buildToday";
import { JoinButton } from "./JoinButton";
import { dayKindLabel, dayNumberOf, phaseLabel, plural, splitDayTitle } from "./model";
import { WeekStrip } from "./WeekStrip";
import "./summit-home.css";
import "./tpy.css";
import "./calm-home.css";
import "./peak-home.css";
import { PROGRAM_MEDAL } from "@/components/badges/catalog";

const STREAK_GOALS = [3, 7, 14, 30, 60, 100, 365];

/** The member's most recent badge (from my_rewards), dressed with its definition when we have it. */
export type LatestBadge = Pick<BadgeDefinition, "id" | "name" | "tier" | "icon"> & { earned_at: string; description?: string; medal_color?: string | null; program_slug?: string | null };

/** Photo for a Home card/hero from the central photo map (framing included). */
function framed(src: string | null | undefined, slug: string | null | undefined, fallback: Photo = surfacePhoto("homeHero")): Photo {
  return photoByFile(src) ?? programCover(slug) ?? (src ? { ...fallback, src } : fallback);
}

/** Member-local hour, for the time-aware hero. */
function localHour(now: number, tz: string | null | undefined) {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz || "UTC" }).format(new Date(now)));
  } catch {
    return new Date(now).getUTCHours();
  }
}

/**
 * Home (Today), calm: one Continue hero, your programs (compact), this week, one offer, the latest badge.
 * The retreat card appears only when the member has a retreat application or booking (`retreat`).
 * New members get one welcoming start state with the recommended first program.
 */
export function TodayScreen({ v, home, homeError, retreat, latestBadge, mikeNote, firstWeek, suggested = [], now = 0 }: { v: TodayView; /** Onboarding suggestions, shown until the member joins a program. */ suggested?: SuggestedProgram[]; /** First-week host (welcome video, checklist, resume draft, install prompt); one card shows at a time. */ firstWeek?: React.ReactNode; home: HomeView | null; homeError?: boolean; /** The member's retreat journey card (streams in; renders nothing without a retreat). */ retreat?: React.ReactNode; /** Earned in the last 48 hours, else null (Home #9). */ latestBadge?: LatestBadge | null; mikeNote?: MikeNote | null; now?: number }) {
  const cur = home?.continuing ?? null;
  const enrolled = home?.enrolled ?? [];
  const isNew = !!home && !cur && enrolled.length === 0;
  const badge = latestBadge ?? null;
  const today = v.week.find((d) => d.isToday);
  const restDay = !!today && today.state === "rest" && !isNew;

  return (
    <div className="sh ch pk">
      <h1 className="lq-sr">Home</h1>

      {home && cur ? <ContinueHero v={v} h={home} now={now} /> : isNew && suggested.length ? <SuggestedHero v={v} s={suggested[0]!} /> : isNew && home?.featured ? <WelcomeHero v={v} item={home.featured} /> : <EmptyHero v={v} />}

      {isNew && suggested.length > 0 && <SuggestedRow items={suggested} />}

      {firstWeek && <div className="ch-first">{firstWeek}</div>}

      {restDay && <RestDayCard />}

      {homeError && (
        <Glass radius="card" className="sh-error" role="alert">
          <Icon name="info" size="sm" />
          <span className="lq-t15">Your programs couldn&apos;t load right now. Refresh to try again.</span>
        </Glass>
      )}

      {retreat}

      {enrolled.length > 0 && (
        <section className="ch-sec" aria-labelledby="ch-mine-t">
          <header className="ch-head">
            <h2 id="ch-mine-t" className="lq-d-sm">
              Your programs
            </h2>
            <Link href="/programs" className="lq-link ch-all">
              All programs <Icon name="arrowRight" size="xs" />
            </Link>
          </header>
          <ul className="pk-tiles" role="list" data-n={Math.min(enrolled.length, 4)}>
            {enrolled.slice(0, 4).map((i, n) => (
              <li key={i.key}>
                <ProgramTile item={i} first={n === 0} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isNew && (
        <div className="ch-pair pk-pair" data-single={badge ? undefined : ""}>
          <WeekCard v={v} />
          {badge && <BadgeCard b={badge} />}
        </div>
      )}

      {mikeNote && <MikeNoteCard note={mikeNote} />}

      <div className="sh-offer pk-offer">
        <OfferSlot placement="today" />
      </div>
    </div>
  );
}

/* ================================================================== heroes */

function ContinueHero({ v, h, now }: { v: TodayView; h: HomeView; now: number }) {
  const item = h.continuing!;
  const p = v.primary;
  const same = p && p.program_slug === item.slug;
  const cl = same && v.currentLesson?.lessonId === p.current_lesson_id ? v.currentLesson : null;
  // The lesson's own title ("Day 3", "Day 24 - Recovery Day", or a course lesson name).
  const lessonTitle = (same ? p.current_lesson_title : null) ?? item.nextTitle ?? null;
  const day = dayNumberOf(lessonTitle);
  const { name } = splitDayTitle(lessonTitle ?? "");
  const steps = cl?.steps ?? [];
  const minutes = cl?.minutes ?? (steps.length ? steps.reduce((n, s) => n + (parseInt(s.duration ?? "", 10) || 0), 0) || null : null);
  const started = steps.some((s) => s.done);
  const photo = framed(item.image?.src, item.slug);
  const action = h.heroAction!;
  // Phase (or course section) and the kind of day, from the lesson data.
  const phase = phaseLabel(cl?.sectionTitle ?? (same ? p.current_section_title : null) ?? item.sectionTitle);
  const kind = day ? dayKindLabel(cl?.dayType ?? (/^day\s+\d+\s*[-–—:]/i.test(lessonTitle ?? "") ? name : null)) : null;
  // Time-aware (Home #3) and comeback (Home #8) states.
  const hour = now ? localHour(now, v.timezone) : 12;
  const doneToday = v.week.find((d) => d.isToday)?.state === "done";
  const away = now && item.lastActivityAt ? Math.floor((now - Date.parse(item.lastActivityAt)) / 864e5) : 0;
  const mode: "comeback" | "tomorrow" | "morning" | "continue" = away >= 5 ? "comeback" : doneToday && hour >= 15 ? "tomorrow" : hour < 12 ? "morning" : "continue";
  const tag = { comeback: "Welcome back", tomorrow: "Done for today", morning: "This morning", continue: "Continue" }[mode];
  // Program (and level) sits on top; the title names the day, the line under it the phase and the kind of day.
  const lessonName = name && name !== phase ? name : null;
  const title = day ? `${mode === "tomorrow" ? "Tomorrow" : "Today"}: Day ${day}` : mode === "tomorrow" && lessonName ? `Tomorrow: ${lessonName}` : lessonName ?? phase ?? item.name;
  const meta = [day || lessonName ? phase : null, kind, minutes ? `${minutes} min` : null].filter(Boolean).join(" · ");
  const sub = mode === "comeback" ? ["Easy restart, go at 70%", meta].filter(Boolean).join(" · ") : meta;
  const label = item.complete ? "Review" : mode === "comeback" ? "Restart easy" : mode === "tomorrow" ? "Preview tomorrow" : day ? `${started ? "Continue" : "Start"} Day ${day}` : action.label;
  return (
    <PhotoHero className="sh-hero ch-hero pk-hero" image={{ src: photo.src, alt: photo.alt, focal: photo.focal, focalPhone: photo.focalPhone }} minHeight={520} priority overlay={<HeroStat item={item} h={h} />}>
      <p className="pk-hero-k">{item.name}</p>
      <Tag tone={mode === "tomorrow" ? "accent" : "warm"} size="lg">
        {mode === "tomorrow" ? <Icon name="check" size="xs" /> : null}
        {tag}
      </Tag>
      <h2 className="lq-d-xxl sh-hero-t">{title}</h2>
      {sub ? <p className="sh-hero-meta">{sub}</p> : null}
      <div className="ch-hero-prog pk-hero-prog">
        <ProgressBar value={item.percent / 100} tone="white" size="thin" label={`${item.name} progress`} />
        <span className="lq-num">{item.percent}%</span>
      </div>
      <div className="sh-hero-actions">
        <Button icon={item.complete ? "repeat" : mode === "tomorrow" ? "calendar" : "play"} variant={mode === "tomorrow" ? "onphoto" : undefined} href={action.href} size="lg" className="sh-hero-go">
          {label}
        </Button>
        <Link href={item.pageHref} className="pk-hero-alt">
          Program overview <Icon name="arrowRight" size="xs" />
        </Link>
      </div>
    </PhotoHero>
  );
}

/** New member: one welcome, the recommended first program, one button. */
function WelcomeHero({ v, item }: { v: TodayView; item: HomeItem }) {
  const photo = framed(item.image?.src, item.slug, surfacePhoto("homeEmpty"));
  return (
    <PhotoHero className="sh-hero ch-hero" image={{ src: photo.src, alt: photo.alt, focal: photo.focal, focalPhone: photo.focalPhone }} minHeight={440} priority>
      <Tag tone="accent" size="lg">
        Start here
      </Tag>
      <h2 className="lq-d-xxl sh-hero-t">Welcome{v.firstName ? `, ${v.firstName}` : ""}.</h2>
      <p className="sh-hero-meta">
        Mike recommends starting with <b className="ch-on-photo">{item.name}</b>. {item.sizeLabel}.
      </p>
      <div className="sh-hero-actions">
        <JoinButton programId={item.programId} pathId={item.pathId} name={item.name} variant="filled" size="lg" />
      </div>
      <Link href="/programs" className="ch-hero-alt">
        Or browse every program <Icon name="arrowRight" size="xs" />
      </Link>
    </PhotoHero>
  );
}

/** New member who finished onboarding: their best fit, opening the program's home (not a lesson). */
function SuggestedHero({ v, s }: { v: TodayView; s: SuggestedProgram }) {
  const photo = framed(s.photo.src, s.slug, surfacePhoto("homeEmpty"));
  return (
    <PhotoHero className="sh-hero ch-hero" image={{ src: photo.src, alt: photo.alt, focal: photo.focal, focalPhone: photo.focalPhone }} minHeight={440} priority>
      <Tag tone="accent" size="lg">
        Best fit for you
      </Tag>
      <h2 className="lq-d-xxl sh-hero-t">Welcome{v.firstName ? `, ${v.firstName}` : ""}.</h2>
      <p className="sh-hero-meta">
        <b className="ch-on-photo">{s.title}</b> fits your answers best. Start when you&apos;re ready, or pick another below.
      </p>
      <div className="sh-hero-actions">
        <Button href={s.href} size="lg" iconAfter="arrowRight" className="sh-hero-go">
          Open {s.title}
        </Button>
      </div>
    </PhotoHero>
  );
}

/** "Suggested for you": the onboarding suggestions (best fit first), each opening the program home. */
function SuggestedRow({ items }: { items: SuggestedProgram[] }) {
  return (
    <section className="ch-sec" aria-labelledby="ch-sug-t">
      <header className="ch-head">
        <h2 id="ch-sug-t" className="lq-d-sm">
          Suggested for you
        </h2>
        <Link href="/programs" className="lq-link ch-all">
          All programs <Icon name="arrowRight" size="xs" />
        </Link>
      </header>
      <p className="lq-t13 lq-c2 pk-sug-lede">From your answers. Start any of these when you&apos;re ready.</p>
      <ul className="pk-sug" role="list">
        {items.map((s, i) => (
          <li key={s.slug}>
            <Link href={s.href} className="pk-sug-card" aria-label={`${s.title}${i === 0 ? ", best fit" : ""}. ${s.access.label}`}>
              <span className="pk-sug-ph">
                <Image src={s.photo.src} alt="" fill sizes="(min-width: 900px) 120px, 96px" style={{ objectFit: "cover", objectPosition: s.photo.position }} />
              </span>
              <span className="pk-sug-b">
                {i === 0 && <em className="pk-sug-best">Best fit</em>}
                <b className="pk-sug-t">{s.title}</b>
                {s.reason && <span className="pk-sug-r">{s.reason}</span>}
                <span className="pk-sug-a" data-tone={s.access.tone}>
                  {s.access.tone === "open" && <Icon name="check" size="xs" />}
                  {s.access.label}
                </span>
              </span>
              <Icon name="chevron" size="sm" className="pk-sug-go" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyHero({ v }: { v: TodayView }) {
  const n = v.next;
  const photo = surfacePhoto("homeEmpty");
  return (
    <PhotoHero className="sh-hero ch-hero" image={{ src: photo.src, alt: photo.alt, focal: photo.focal, focalPhone: photo.focalPhone }} minHeight={440} priority>
      <Tag tone="warm" size="lg">
        {n ? n.eyebrow : "Start here"}
      </Tag>
      <h2 className="lq-d-xxl sh-hero-t">{n ? n.title : `Welcome${v.firstName ? `, ${v.firstName}` : ""}.`}</h2>
      <p className="sh-hero-meta">{n ? n.meta.map((m) => m.text).join(" · ") : "Pick a program and Mike takes it from there."}</p>
      <div className="sh-hero-actions">
        <Button icon="play" href={n?.href ?? "/programs"} size="lg" className="sh-hero-go">
          {n?.cta ?? "Choose a program"}
        </Button>
      </div>
    </PhotoHero>
  );
}

/* ================================================================== programs */

const accentOf = (slug: string) => PROGRAM_MEDAL[slug]?.color ?? "var(--accent)";

/** Hero stat panel: an ember progress ring for the program (named once, above the title), and the readiness hint when we have one. */
function HeroStat({ item, h }: { item: HomeItem; h: HomeView }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const rd = h.readiness;
  return (
    <div className="pk-stat" aria-hidden>
      <div className="pk-stat-ring">
        <svg viewBox="0 0 108 108">
          <circle cx="54" cy="54" r={r} className="pk-ring-track" />
          <circle cx="54" cy="54" r={r} className="pk-ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - item.percent / 100)} transform="rotate(-90 54 54)" />
        </svg>
        <span className="pk-stat-pct">
          <b className="lq-num">{item.percent}</b>
          <small>%</small>
        </span>
      </div>
      <div className="pk-stat-b">
        <b className="lq-num">{item.progressLabel}</b>
        <span>done so far</span>
        {rd ? (
          <span className="pk-stat-rd">
            <i data-band={rd.band} /> Readiness <b className="lq-num">{rd.score}</b>
            {rd.band === "red" ? " · go easy today" : rd.band === "green" ? " · ready to train" : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** A joined program as a photo tile: cover, program colour, next lesson, progress. */
function ProgramTile({ item, first }: { item: HomeItem; first?: boolean }) {
  const img = framed(item.image?.src, item.slug);
  const color = accentOf(item.slug);
  const [prog, level] = item.name.split(" · ");
  return (
    <Link href={item.resumeHref} className="pk-tile" style={{ ["--pc" as string]: color }} data-first={first ? "" : undefined} aria-label={`${item.verb.label} ${item.name}, ${item.percent}% complete`}>
      <span className="pk-tile-ph">
        <Image src={img.src} alt="" fill sizes="(min-width: 1100px) 270px, (min-width: 720px) 45vw, 78vw" loading="eager" style={{ objectPosition: img.focal }} />
      </span>
      <span className="pk-tile-top">
        <span className="pk-tile-chip">
          <i />
          {level ?? item.kicker ?? "Program"}
        </span>
        {item.complete && (
          <span className="pk-tile-done">
            <Icon name="check" size="xs" />
          </span>
        )}
      </span>
      <span className="pk-tile-b">
        <b className="pk-tile-t">{prog}</b>
        <span className="pk-tile-s">{item.complete ? "Completed. Review any lesson." : item.nextLabel ? `Next: ${item.nextLabel}` : item.progressLabel}</span>
        <span className="pk-tile-m">
          <span className="pk-tile-bar">
            <span style={{ width: `${Math.max(item.percent, 2)}%` }} />
          </span>
          <b className="lq-num">{item.percent}%</b>
        </span>
        <span className="pk-tile-go">
          <Icon name={item.verb.icon} size="xs" /> {item.verb.label}
        </span>
      </span>
    </Link>
  );
}

/* ================================================================== this week + badge */

function WeekCard({ v }: { v: TodayView }) {
  const streak = v.rewards.streak_current;
  const target = STREAK_GOALS.find((m) => m > streak) ?? streak + 1;
  const planned = v.weekSummary.planned;
  return (
    <section className="ch-card ch-week pk-week" aria-labelledby="ch-week-t">
      <div className="pk-week-streak">
        <span className="pk-week-flame" aria-hidden>
          <Icon name="flame" size="sm" />
        </span>
        <b className="pk-week-n lq-num">{streak}</b>
        <span className="pk-week-l">
          <b>{streak === 1 ? "day" : "days"} in a row</b>
          <span>{streak > 0 ? `${plural(target - streak, "day")} to your ${target}-day badge` : "Train today to start a streak."}</span>
        </span>
        <span className="pk-week-goal" aria-hidden>
          <span style={{ width: `${Math.min(100, (streak / target) * 100)}%` }} />
        </span>
      </div>
      <div className="pk-week-days">
        <header className="ch-card-h">
          <h2 id="ch-week-t" className="pk-h3">
            This week
          </h2>
          <Link href="/plan" className="lq-link ch-all">
            {planned ? `${v.weekSummary.done} of ${plural(planned, "session")}` : "Open schedule"} <Icon name="arrowRight" size="xs" />
          </Link>
        </header>
        <WeekStrip days={v.week} hrefFor={(d) => `/plan?d=${d}`} colors />
      </div>
    </section>
  );
}

function BadgeCard({ b }: { b: LatestBadge }) {
  return (
    <Link href="/you?tab=achievements" className="ch-card ch-badge pk-badge lq-press" style={{ ["--mc" as string]: medalColorOf(b) ?? "var(--gold)" }} aria-label={`Latest badge: ${b.name}. See all badges`}>
      <span className="pk-badge-medal">
        <MedalPin tier={b.tier} icon={b.icon} color={medalColorOf(b)} size={84} />
      </span>
      <span className="ch-badge-b">
        <span className="pk-badge-k">New badge</span>
        <b className="pk-badge-t">{b.name}</b>
        {b.description ? <span className="lq-t13 lq-c2 sh-clamp2">{b.description}</span> : null}
        <span className="ch-badge-go">
          All badges <Icon name="arrowRight" size="xs" />
        </span>
      </span>
    </Link>
  );
}

/* ================================================================== rest day + Mike's note */

/** Rest day (Home #7): one calm line with a 10-minute Working-In practice. */
function RestDayCard() {
  const ph = programCover("working-in") ?? surfacePhoto("homeEmpty");
  return (
    <Link href={programHref("working-in", "course")} className="ch-card ch-rest lq-press">
      <span className="ch-thumb ch-thumb-sm">
        <Image src={ph.src} alt="" fill sizes="72px" style={{ objectPosition: ph.focal }} />
      </span>
      <span className="ch-rest-b">
        <span className="lq-eyebrow" data-tone="accent">
          Rest day
        </span>
        <b className="lq-t15">Ten minutes of Working-In keeps you moving without spending energy.</b>
      </span>
      <Icon name="arrowRight" size="sm" className="lq-c3" />
    </Link>
  );
}

/** Mike's weekly note (Home #10): a warm portrait card, Mike's photo with the note in Instrument Sans. */
function MikeNoteCard({ note }: { note: MikeNote }) {
  const ph = (note.photo && note.photo in PHOTO ? PHOTO[note.photo as PhotoName] : null) ?? photoByFile(note.photo) ?? surfacePhoto("coaching");
  const face = PHOTO.standing;
  return (
    <section className="pk-note" aria-label="A note from Mike this week">
      <span className="pk-note-ph">
        <Image src={ph.src} alt={ph.alt} fill loading="eager" sizes="(min-width: 720px) 520px, 100vw" style={{ objectPosition: ph.focal }} />
      </span>
      <figure className="pk-note-b">
        <blockquote className="pk-note-q">{note.text}</blockquote>
        <figcaption className="pk-note-by">
          <span className="pk-note-face">
            <Image src={face.src} alt="" fill loading="eager" sizes="48px" style={{ objectPosition: "54% 14%" }} />
          </span>
          <span>
            <b>Mike Salemi</b>
            <span>Your note for this week</span>
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
