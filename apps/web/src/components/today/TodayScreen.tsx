import Image from "next/image";
import Link from "next/link";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { MedalPin } from "@/components/badges/MedalPin";
import { medalColorOf } from "@/components/badges/catalog";
import { PhotoHero } from "@/components/signature";
import { Button, Glass, Icon, ProgressBar, Tag } from "@/components/ui";
import type { BadgeDefinition, MikeNote } from "@ms/api";
import { PHOTO, photoByFile, programCover, surfacePhoto, type Photo, type PhotoName } from "@/lib/photos";
import { programHref } from "@/lib/hrefs";
import type { HomeItem, HomeView } from "./buildHome";
import type { TodayView } from "./buildToday";
import { JoinButton } from "./JoinButton";
import { plural, splitDayTitle } from "./model";
import { WeekStrip } from "./WeekStrip";
import "./summit-home.css";
import "./tpy.css";
import "./calm-home.css";

const levelOf = (pathName: string | null | undefined) => pathName?.split("·")[0]?.trim() || null;
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
export function TodayScreen({ v, home, homeError, retreat, latestBadge, mikeNote, firstWeek, now = 0 }: { v: TodayView; /** First-week host (welcome video, checklist, resume draft, install prompt); one card shows at a time. */ firstWeek?: React.ReactNode; home: HomeView | null; homeError?: boolean; /** The member's retreat journey card (streams in; renders nothing without a retreat). */ retreat?: React.ReactNode; /** Earned in the last 48 hours, else null (Home #9). */ latestBadge?: LatestBadge | null; mikeNote?: MikeNote | null; now?: number }) {
  const cur = home?.continuing ?? null;
  const enrolled = home?.enrolled ?? [];
  const isNew = !!home && !cur && enrolled.length === 0;
  const badge = latestBadge ?? null;
  const today = v.week.find((d) => d.isToday);
  const restDay = !!today && today.state === "rest" && !isNew;

  return (
    <div className="sh ch">
      <h1 className="lq-sr">Home</h1>

      {home && cur ? <ContinueHero v={v} h={home} now={now} /> : isNew && home?.featured ? <WelcomeHero v={v} item={home.featured} /> : <EmptyHero v={v} />}

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
          <ul className="ch-programs" role="list">
            {enrolled.slice(0, 4).map((i) => (
              <li key={i.key}>
                <ProgramRow item={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isNew && (
        <div className="ch-pair" data-single={badge ? undefined : ""}>
          <WeekCard v={v} />
          {badge && <BadgeCard b={badge} />}
        </div>
      )}

      {mikeNote && <MikeNoteCard note={mikeNote} />}

      <div className="sh-offer">
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
  const { day, name } = splitDayTitle((same ? p.current_lesson_title : null) ?? item.nextLabel ?? item.name);
  const cl = same ? v.currentLesson : null;
  const steps = cl?.steps ?? [];
  const minutes = cl?.minutes ?? (steps.length ? steps.reduce((n, s) => n + (parseInt(s.duration ?? "", 10) || 0), 0) || null : null);
  const started = steps.some((s) => s.done);
  const level = levelOf(p?.path_name);
  const photo = framed(item.image?.src, item.slug);
  const action = h.heroAction!;
  const week = day ? Math.ceil(Number(day) / 7) : null;
  const meta = [day ? `Week ${week} · Day ${day}` : item.name.split(" · ")[0], level, minutes ? `${minutes} min` : null].filter(Boolean).join(" · ");
  // Time-aware (Home #3) and comeback (Home #8) states.
  const hour = now ? localHour(now, v.timezone) : 12;
  const doneToday = v.week.find((d) => d.isToday)?.state === "done";
  const away = now && item.lastActivityAt ? Math.floor((now - Date.parse(item.lastActivityAt)) / 864e5) : 0;
  const mode: "comeback" | "tomorrow" | "morning" | "continue" = away >= 5 ? "comeback" : doneToday && hour >= 15 ? "tomorrow" : hour < 12 ? "morning" : "continue";
  const tag = { comeback: "Welcome back", tomorrow: "Done for today", morning: "This morning", continue: "Continue" }[mode];
  const title = mode === "tomorrow" ? `Tomorrow: ${name || item.name}` : name || item.name;
  const sub = mode === "comeback" ? `An easy restart day. Go at 70% and just move — ${meta}` : meta;
  const label = item.complete ? "Review" : mode === "comeback" ? "Restart easy" : mode === "tomorrow" ? "Preview tomorrow" : day ? `${started ? "Continue" : "Start"} Day ${day}` : action.label;
  return (
    <PhotoHero className="sh-hero ch-hero" image={{ src: photo.src, alt: photo.alt, focal: photo.focal, focalPhone: photo.focalPhone }} minHeight={440} priority>
      <Tag tone={mode === "tomorrow" ? "accent" : "warm"} size="lg">
        {mode === "tomorrow" ? <Icon name="check" size="xs" /> : null}
        {tag}
      </Tag>
      <h2 className="lq-d-xxl sh-hero-t">{title}</h2>
      <p className="sh-hero-meta">{sub}</p>
      <div className="ch-hero-prog">
        <ProgressBar value={item.percent / 100} tone="white" size="thin" label={`${item.name} progress`} />
        <span className="lq-num">{item.percent}%</span>
      </div>
      <div className="sh-hero-actions">
        <Button icon={item.complete ? "repeat" : mode === "tomorrow" ? "calendar" : "play"} variant={mode === "tomorrow" ? "onphoto" : undefined} href={action.href} size="lg" className="sh-hero-go">
          {label}
        </Button>
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

function ProgramRow({ item }: { item: HomeItem }) {
  const img = framed(item.image?.src, item.slug);
  return (
    <Link href={item.resumeHref} className="ch-prog lq-press" aria-label={`${item.verb.label} ${item.name}, ${item.percent}% complete`}>
      <span className="ch-thumb">
        <Image src={img.src} alt="" fill sizes="96px" style={{ objectPosition: img.focal }} />
      </span>
      <span className="ch-prog-b">
        <b className="ch-prog-t">{item.name}</b>
        <span className="ch-prog-s">{item.complete ? "Completed" : item.nextLabel ? `Up next · ${item.nextLabel}` : item.progressLabel}</span>
        <span className="ch-meter">
          <ProgressBar value={item.percent / 100} tone={item.complete ? "ok" : "accent"} size="thin" label={`${item.percent}% complete`} />
          <b className="lq-num">{item.percent}%</b>
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
    <Glass as="section" radius="card" className="ch-card ch-week" aria-labelledby="ch-week-t">
      <header className="ch-card-h">
        <h2 id="ch-week-t" className="lq-eyebrow" data-tone="warm">
          This week
        </h2>
        <Link href="/plan" className="lq-link ch-all">
          {planned ? `${v.weekSummary.done} of ${plural(planned, "session")}` : "Open schedule"} <Icon name="arrowRight" size="xs" />
        </Link>
      </header>
      <WeekStrip days={v.week} hrefFor={(d) => `/plan?d=${d}`} colors />
      <p className="ch-streak lq-t13 lq-c2">
        <Icon name="flame" size="xs" className="ch-flame" />
        {streak > 0 ? (
          <>
            <b className="lq-num">{plural(streak, "day")}</b> in a row · {plural(target - streak, "day")} to your {target}-day badge
          </>
        ) : (
          "Train today to start a streak."
        )}
      </p>
    </Glass>
  );
}

function BadgeCard({ b }: { b: LatestBadge }) {
  return (
    <Link href="/you?tab=achievements" className="ch-card ch-badge lq-press" aria-label={`Latest badge: ${b.name}. See all badges`}>
      <MedalPin tier={b.tier} icon={b.icon} color={medalColorOf(b)} size={72} />
      <span className="ch-badge-b">
        <span className="lq-eyebrow" data-tone="warm">
          Latest badge
        </span>
        <b className="lq-d-xs">{b.name}</b>
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

/** Mike's weekly note (Home #10): Instrument Serif italic beside a fresh photo, admin-set. */
function MikeNoteCard({ note }: { note: MikeNote }) {
  const ph = (note.photo && note.photo in PHOTO ? PHOTO[note.photo as PhotoName] : null) ?? photoByFile(note.photo) ?? surfacePhoto("coaching");
  return (
    <section className="ch-card ch-note" aria-label="A note from Mike this week">
      <span className="ch-note-ph">
        <Image src={ph.src} alt={ph.alt} fill sizes="(min-width: 720px) 220px, 100vw" style={{ objectPosition: ph.focal }} />
      </span>
      <figure className="ch-note-b">
        <span className="lq-eyebrow" data-tone="warm">
          This week from Mike
        </span>
        <blockquote className="lq-serif ch-note-q">{note.text}</blockquote>
        <figcaption className="lq-t13 lq-c3">— Mike Salemi</figcaption>
      </figure>
    </section>
  );
}
