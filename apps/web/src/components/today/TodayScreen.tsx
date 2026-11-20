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
import type { HomeItem, HomeView, PlanPanel, PlanRow } from "./buildHome";
import { programColor } from "@/components/plan/programColor";
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
export function TodayScreen({ v, home, homeError, retreat, latestBadge, mikeNote, firstWeek, suggested = [], plans = null, now = 0 }: { v: TodayView; /** Active plans with an open session: the hero takes a third and this panel the rest (desktop). */ plans?: PlanPanel | null; /** Onboarding suggestions, shown until the member joins a program. */ suggested?: SuggestedProgram[]; /** First-week host (welcome video, checklist, resume draft, install prompt); one card shows at a time. */ firstWeek?: React.ReactNode; home: HomeView | null; homeError?: boolean; /** The member's retreat journey card (streams in; renders nothing without a retreat). */ retreat?: React.ReactNode; /** Earned in the last 48 hours, else null (Home #9). */ latestBadge?: LatestBadge | null; mikeNote?: MikeNote | null; now?: number }) {
  const cur = home?.continuing ?? null;
  const enrolled = home?.enrolled ?? [];
  const isNew = !!home && !cur && enrolled.length === 0;
  const badge = latestBadge ?? null;
  const today = v.week.find((d) => d.isToday);
  const restDay = !!today && today.state === "rest" && !isNew;
  // With schedules the hero shrinks to a third and "Continue your plans" takes the rest; otherwise the full-width hero.
  const split = !!plans && !(isNew && suggested.length > 0);
  const hero =
    home && cur ? <ContinueHero v={v} h={home} now={now} compact={split} /> : isNew && suggested.length ? <SuggestedHero v={v} s={suggested[0]!} /> : isNew && home?.featured ? <WelcomeHero v={v} item={home.featured} /> : <EmptyHero v={v} />;

  return (
    <div className="sh ch pk">
      <h1 className="lq-sr">Home</h1>

      {split ? (
        <div className="pk-top">
          <div className="pk-top-hero">{hero}</div>
          <PlansPanel p={plans!} avoid={home?.continuing ? framed(home.continuing.image?.src, home.continuing.slug).src : null} />
        </div>
      ) : (
        hero
      )}

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

function ContinueHero({ v, h, now, compact = false }: { v: TodayView; h: HomeView; now: number; /** A third of the row (plans beside it): no stat panel, the thin progress line instead. */ compact?: boolean }) {
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
    <PhotoHero className="sh-hero ch-hero pk-hero" image={{ src: photo.src, alt: photo.alt, focal: photo.focal, focalPhone: photo.focalPhone }} minHeight={compact ? 420 : 520} sizes={compact ? "(min-width: 1100px) 440px, (min-width: 720px) 50vw, 100vw" : undefined} priority overlay={compact ? undefined : <HeroStat item={item} h={h} />}>
      <p className="pk-hero-k">{item.name}</p>
      <Tag tone={mode === "tomorrow" ? "accent" : "warm"} size="lg">
        {mode === "tomorrow" ? <Icon name="check" size="xs" /> : null}
        {tag}
      </Tag>
      <h2 className="lq-d-xxl sh-hero-t">{title}</h2>
      {sub ? <p className="sh-hero-meta">{sub}</p> : null}
      <div className="ch-hero-prog pk-hero-prog">
        <ProgressBar value={item.percent / 100} tone="white" size="thin" label={`${item.name} progress`} />
        <span className="lq-num">{compact ? item.progressLabel : `${item.percent}%`}</span>
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

/* ================================================================== continue your plans */

/** Photos for plan cards and session thumbnails: the program cover first, then the move or kind of day, never twice. */
const MOVE_PHOTO: [RegExp, PhotoName][] = [
  [/get ?up/i, "getup"],
  [/windmill/i, "windmill"],
  [/press|overhead/i, "press"],
  [/goblet/i, "goblet"],
  [/squat|lunge/i, "squat"],
  [/deadlift|hinge|row/i, "deadlift"],
  [/swing/i, "swingGym"],
  [/bag/i, "bagSpin"],
  [/breath/i, "breathwork"],
];
const RECOVERY_POOL: PhotoName[] = ["qiGong", "breathwork", "walk", "facingShasta", "valley"];
const TRAINING_POOL: PhotoName[] = ["press", "windmill", "deadlift", "goblet", "getup", "hinge", "swingGym", "squat", "bagSpin"];

function photoPicker(avoid: string | null) {
  const used = new Set<string>(avoid ? [avoid] : []);
  const take = (p: Photo | null | undefined) => (p && !used.has(p.src) ? (used.add(p.src), p) : null);
  const pool = (kind: string) => (kind === "recovery" || /recovery|mobility|breath/i.test(kind) ? RECOVERY_POOL : TRAINING_POOL);
  const byMove = (title: string) => MOVE_PHOTO.filter(([re]) => re.test(title)).map(([, n]) => PHOTO[n]);
  const pick = (cands: (Photo | null | undefined)[], kind: string): Photo => {
    for (const c of cands) {
      const t = take(c);
      if (t) return t;
    }
    for (const n of pool(kind)) {
      const t = take(PHOTO[n]);
      if (t) return t;
    }
    return PHOTO[pool(kind)[0]!];
  };
  return {
    /** A plan card: its program cover, else the session's move, else a photo of the kind of day. */
    plan: (r: PlanRow) => pick([programCover(r.slug), ...byMove(r.title)], /recovery/i.test(r.title) ? "recovery" : r.kind),
    /** A session thumbnail: the move first (Goblet Squat → goblet), then the kind of day. */
    session: (raw: string, kind: string) => pick(byMove(raw), kind === "recovery" || /recovery/i.test(raw) ? "recovery" : kind),
  };
}

/** "Continue your plans" beside the one-third hero: the plan due first as a large photo card, the rest as compact cards.
 *  One plan: "Up next in your plan" with its week and the next few sessions as photo tiles. */
function PlansPanel({ p, avoid }: { p: PlanPanel; /** The hero's photo, so the panel never repeats it. */ avoid: string | null }) {
  const pick = photoPicker(avoid);
  const one = p.mode === "sessions" ? p.plan : null;
  const [lead, ...rest] = p.rows;
  const scroll = rest.length > 2;
  return (
    <section className="pk-plans" aria-labelledby="pk-plans-t" data-mode={one ? "one" : "many"}>
      <header className="pk-plans-h">
        <h2 id="pk-plans-t" className="pk-h3">
          {one ? "Up next in your plan" : "Continue your plans"}
        </h2>
        <Link href="/plan?manage=1" className="lq-link ch-all">
          All plans <Icon name="arrowRight" size="xs" />
        </Link>
      </header>
      {one ? (
        <OnePlan r={one} sessions={p.sessions} pick={pick} />
      ) : (
        <>
          {lead && <LeadPlan r={lead} photo={pick.plan(lead)} />}
          {rest.length > 0 && (
            <ul className="pk-pc-row" role="list" data-scroll={scroll ? "" : undefined} data-n={rest.length}>
              {rest.map((r) => (
                <li key={r.id}>
                  <CompactPlan r={r} photo={pick.plan(r)} />
                </li>
              ))}
              {(scroll || p.more > 0) && (
                <li>
                  <Link href="/plan?manage=1" className="pk-pc-all">
                    <span className="pk-pc-all-i">
                      <Icon name="grid" size="sm" />
                    </span>
                    <b>All plans</b>
                    <span>{p.more > 0 ? `${p.more} more` : "Manage and reschedule"}</span>
                  </Link>
                </li>
              )}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

const planLabel = (r: PlanRow) => [r.name, r.sub].filter(Boolean).join(" · ");
const whenLabel = (r: PlanRow) => (r.isToday ? "Today" : r.undated ? "Next in order" : `Next · ${r.when}`);

/** The plan due first: a photo block, the session title large, the week, progress and a solid Start. */
function LeadPlan({ r, photo }: { r: PlanRow; photo: Photo }) {
  return (
    <Link href={r.href} className="pk-lead" style={{ ["--pc" as string]: programColor(r.slug) }} aria-label={`${r.cta} ${planLabel(r)}: ${r.when}, ${r.session}. ${r.done} of ${r.total} sessions done`}>
      <span className="pk-lead-ph">
        <Image src={photo.src} alt="" fill sizes="(min-width: 1100px) 260px, (min-width: 720px) 300px, 100vw" loading="eager" style={{ objectPosition: photo.focal }} />
        <span className="pk-lead-when" data-today={r.isToday ? "" : undefined}>
          {r.isToday && <i aria-hidden />}
          {whenLabel(r)}
        </span>
      </span>
      <span className="pk-lead-b">
        <span className="pk-lead-prog">{planLabel(r)}</span>
        <b className="pk-lead-t">{r.title || "Your next session"}</b>
        {(r.minutes || r.undated) && <span className="pk-lead-meta">{[r.minutes ? `${r.minutes} min` : null, r.undated ? "Self-guided" : null].filter(Boolean).join(" · ")}</span>}
        {r.week ? <WeekDots week={r.week} labels /> : <span className="pk-order">Next in order, at your own pace</span>}
        <span className="pk-lead-foot">
          <ProgressFigure r={r} ring />
          <span className="pk-lead-go">
            <Icon name={r.locked ? "lock" : "play"} size="xs" /> {r.cta}
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Another active plan: thumbnail, when, session, a mini week and the count. The whole card opens the session. */
function CompactPlan({ r, photo }: { r: PlanRow; photo: Photo }) {
  return (
    <Link href={r.href} className="pk-pc" style={{ ["--pc" as string]: programColor(r.slug) }} aria-label={`${r.cta} ${planLabel(r)}: ${r.when}, ${r.session}. ${r.done} of ${r.total} sessions done`}>
      <span className="pk-pc-ph">
        <Image src={photo.src} alt="" fill sizes="96px" style={{ objectPosition: photo.focal }} />
        {r.locked && (
          <span className="pk-pc-lock">
            <Icon name="lock" size="xs" />
          </span>
        )}
      </span>
      <span className="pk-pc-b">
        <span className="pk-pc-when" data-today={r.isToday ? "" : undefined}>
          {whenLabel(r)}
        </span>
        <b className="pk-pc-t">{r.title || r.cta}</b>
        <span className="pk-pc-prog">{planLabel(r)}</span>
        <span className="pk-pc-foot">
          {r.week ? <WeekDots week={r.week} /> : <span className="pk-pc-order">At your own pace</span>}
          <ProgressFigure r={r} />
        </span>
      </span>
      <span className="pk-pc-go" aria-hidden>
        <Icon name="arrowRight" size="xs" />
      </span>
    </Link>
  );
}

/** Monday to Sunday: done (filled), today (ring), planned (outline), missed (soft dash), nothing (faint). */
function WeekDots({ week, labels = false }: { week: NonNullable<PlanRow["week"]>; labels?: boolean }) {
  const words = { done: "done", missed: "missed", today: "today", planned: "planned", none: "no session" } as const;
  return (
    <span className="pk-wk" data-labels={labels ? "" : undefined} role="img" aria-label={`This week: ${week.map((w) => `${w.d} ${words[w.state]}`).join(", ")}`}>
      {week.map((w) => (
        <span key={w.date} className="pk-wk-d" data-s={w.state} data-today={w.isToday ? "" : undefined}>
          {labels && <span className="pk-wk-l">{w.d}</span>}
          <i>{w.state === "done" && <Icon name="check" size="xs" />}</i>
        </span>
      ))}
    </span>
  );
}

function ProgressFigure({ r, ring = false }: { r: PlanRow; ring?: boolean }) {
  const pct = r.total ? r.done / r.total : 0;
  if (!ring)
    return (
      <span className="pk-fig lq-num">
        <b>{r.done}</b>/{r.total}
      </span>
    );
  const C = 2 * Math.PI * 19;
  return (
    <span className="pk-ring-w">
      <svg className="pk-ring" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r="19" />
        <circle cx="22" cy="22" r="19" strokeDasharray={`${Math.max(pct * C, pct ? 2 : 0)} ${C}`} />
      </svg>
      <span className="pk-ring-t">
        <b className="lq-num">
          {r.done} <span>of {r.total}</span>
        </b>
        <span>sessions done</span>
      </span>
    </span>
  );
}

/** One plan: its name, week and progress, then the next sessions as photo tiles (the first one starts). */
function OnePlan({ r, sessions, pick }: { r: PlanRow; sessions: PlanPanel["sessions"]; pick: ReturnType<typeof photoPicker> }) {
  return (
    <div className="pk-one" style={{ ["--pc" as string]: programColor(r.slug) }}>
      <div className="pk-one-sum">
        <span className="pk-one-name">
          <b>{r.name}</b>
          {r.sub && <span>{r.sub}</span>}
        </span>
        {r.week ? <WeekDots week={r.week} labels /> : <span className="pk-order">Next in order, at your own pace</span>}
        <ProgressFigure r={r} ring />
      </div>
      <ul className="pk-up" role="list" data-n={sessions.length}>
        {sessions.map((s, n) => {
          const ph = pick.session(s.raw, s.kind);
          return (
            <li key={s.id}>
              <Link href={s.href} className="pk-up-c" data-today={s.isToday ? "" : undefined} data-first={n === 0 ? "" : undefined}>
                <span className="pk-up-ph">
                  <Image src={ph.src} alt="" fill sizes="(min-width: 720px) 200px, 88px" style={{ objectPosition: ph.focal }} />
                  <span className="pk-up-when" data-today={s.isToday ? "" : undefined}>
                    {s.when}
                  </span>
                  {n === 0 && (
                    <span className="pk-up-play" aria-hidden>
                      <Icon name="play" size="xs" />
                    </span>
                  )}
                </span>
                <span className="pk-up-b">
                  <span className="pk-up-when2" data-today={s.isToday ? "" : undefined}>
                    {s.when}
                  </span>
                  <b>{s.title}</b>
                  <span>{s.meta ?? (s.kind === "recovery" ? "Recovery" : "Training")}</span>
                </span>
                <Icon name="chevron" size="sm" className="pk-up-chev" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
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
