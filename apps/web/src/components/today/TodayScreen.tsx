import Image from "next/image";
import Link from "next/link";
import { daysBetween, type IsoDate } from "@ms/core";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { BeyondTheSummit, Climb, PhotoHero, WeekDots, type ClimbPhase, type Peak, type WeekDot } from "@/components/signature";
import { Avatar, Button, Chip, Glass, Icon, ProgressBar, Rings, StepSegments, Tag } from "@/components/ui";
import { MIKE_FACE, programPhoto } from "@/lib/program-photos";
import type { ActivityTile, HomeItem, HomeView, RetreatCardModel } from "./buildHome";
import { money } from "./buildHome";
import type { TodayView } from "./buildToday";
import { dayLetter, fmt } from "./dates";
import { Checklist } from "./HomeParts";
import { JoinButton } from "./JoinButton";
import { plural, splitDayTitle } from "./model";
import { Rail } from "./Rail";
import "./summit-home.css";

/* ================================================================== model helpers */

const MILESTONES = [3, 7, 14, 30, 60, 100, 365];
const levelOf = (pathName: string | null | undefined) => pathName?.split("·")[0]?.trim() || null;
const shortPhase = (t: string) => t.replace(/\s+phase$/i, "");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** The Climb from the member's current path: phases as camps over training days. */
function climbOf(h: HomeView | null) {
  const j = h?.journey;
  if (!j?.length) return null;
  let from = 1;
  const phases: ClimbPhase[] = [];
  let done = 0;
  for (const s of j) {
    const n = s.days ?? s.total;
    if (!n) continue;
    phases.push({ label: shortPhase(s.title), from, to: from + n - 1 });
    from += n;
    done += s.daysDone ?? s.done;
  }
  const total = from - 1;
  return phases.length ? { phases, done, total } : null;
}

function weekDots(v: TodayView): WeekDot[] {
  const streak = v.rewards.streak_current;
  return v.week.map((d) => {
    const ago = daysBetween(d.date as IsoDate, v.today as IsoDate);
    const label = dayLetter(d.date as IsoDate);
    if (d.isToday) return { label, state: d.state === "done" ? "done" : "today", date: Number(d.date.slice(8, 10)) };
    if (d.date > v.today) return { label, state: "ahead" };
    if (d.state === "done" || d.state === "partial" || (ago > 0 && ago <= streak)) return { label, state: "done" };
    return { label, state: d.state === "missed" ? "missed" : "rest" };
  });
}

/** Progress-tied next programs: the next level, Mastering the Kettlebell, an open retreat. */
function peaksOf(h: HomeView, climb: ReturnType<typeof climbOf>, phaseLabel: string | null): Peak[] {
  const all = [...h.enrolled, ...h.joinable, ...h.locked];
  const cur = h.continuing;
  const peaks: Peak[] = [];
  if (cur?.pathKey) {
    const next = all.find((i) => i.slug === cur.slug && i.key !== cur.key && i.pathKey && i.pathKey !== cur.pathKey && !i.complete);
    if (next) {
      const included = next.access === "included" || next.access === "owned" || next.access === "free";
      const name = next.name.split(" · ").slice(1).join(" · ") || next.name;
      peaks.push({
        title: `${name}${next.pathKey === "intermediate" ? " · Intermediate" : ""}`,
        sub: cur.complete ? "You reached the summit. The next level is open." : climb ? `Unlocks when you reach the Day ${climb.total} summit.` : "Your next level.",
        href: `${next.pageHref}?path=${next.pathKey}`,
        cta: next.enrolled ? "Resume" : `Preview ${name}`,
        image: { src: next.image?.src ?? programPhoto(next.slug).src, alt: "", position: next.image?.position ?? "50% 25%" },
        badge: { label: included ? "Included" : "Next level", kind: "badge" },
        locked: !cur.complete && !next.enrolled,
      });
    }
  }
  const mtk = all.find((i) => i.slug === "mastering-the-kettlebell" && i.key !== cur?.key);
  if (mtk) {
    const ph = programPhoto(mtk.slug);
    peaks.push({
      title: "Mastering the Kettlebell",
      sub: mtk.enrolled
        ? `${mtk.percent}% through · technique for every ${phaseLabel ?? "phase"} lift`
        : `Technique for every ${phaseLabel ?? "phase"} lift${mtk.priceCents ? ` · ${money(mtk.priceCents)}` : mtk.access === "included" ? " · included" : ""}`,
      href: mtk.enrolled ? mtk.resumeHref : mtk.pageHref,
      cta: mtk.enrolled ? "Continue" : "See what's inside",
      image: { src: ph.src, alt: "", position: ph.position },
      badge: { label: "Best next step" },
    });
  }
  const run = h.retreats.find((r) => r.status === "open" || r.status === "waitlist");
  if (run) {
    peaks.push({
      title: `${run.name} retreat`,
      sub: `Train with Mike in person · ${run.line.split(" · ")[0]}`,
      href: run.href,
      cta: run.status === "open" ? "Apply" : "Join the waitlist",
      image: { src: run.image?.src ?? "/media/summit/summit-group.jpg", alt: "", position: "50% 40%" },
      badge: { label: run.statusLabel, kind: "badge" },
    });
  }
  return peaks.slice(0, 3);
}

/* ================================================================== screen */

/** Home (legacy /home order) in Summit: continue hero, the climb + this week, your programs, upcoming, start something new, retreats, explore next. */
export function TodayScreen({ v, home, homeError }: { v: TodayView; home: HomeView | null; homeError?: boolean }) {
  const climb = climbOf(home);
  const cur = home?.continuing ?? null;
  const p = v.primary;
  const phaseLabel = p?.current_section_title ? shortPhase(p.current_section_title) : null;
  const peaks = home ? peaksOf(home, climb, phaseLabel) : [];
  const level = levelOf(p?.path_name);
  const includedCount = home ? home.joinable.length : 0;

  return (
    <div className="sh">
      <h1 className="lq-sr">Home</h1>
      {/* (1) Hero */}
      {home && cur ? <ContinueHero v={v} h={home} climb={climb} /> : home?.featured ? <JoinHero item={home.featured} eyebrow={home.settings.heroEyebrow} /> : <EmptyHero v={v} />}

      {/* (2) Error banner */}
      {homeError && (
        <Glass radius="card" className="sh-error" role="alert">
          <Icon name="info" size="sm" />
          <span className="lq-t15">Your programs couldn&apos;t load right now. Refresh to try again.</span>
        </Glass>
      )}

      {/* Your climb + this week */}
      <div className="sh-grid" data-rise style={{ ["--i" as string]: 1 }}>
        {climb && cur ? (
          <Glass as="section" radius="card" className="sh-climb" aria-labelledby="sh-climb-t">
            <div className="sh-climb-head">
              <div>
                <p className="lq-eyebrow" data-tone="accent">
                  Your climb · <span className="sh-desk-in">{cur.name.replace(" · ", " ")}</span>
                  <span className="sh-phone-in">{level ?? cur.name}</span>
                </p>
                <h2 id="sh-climb-t" className="lq-d-md">
                  <span className="sh-desk-in">You&apos;re {pct(climb.done, climb.total)}% of the way up.</span>
                  <span className="sh-phone-in">{pct(climb.done, climb.total)}% of the way up</span>
                </h2>
              </div>
              <div className="sh-climb-num">
                <div className="sh-desk-b">
                  <div className="lq-dnum sh-big">
                    {climb.done}
                    <span className="lq-c3">/{climb.total}</span>
                  </div>
                  <div className="lq-t12 lq-c3">days complete</div>
                </div>
                <Rings size={58} stroke={6} rings={[{ value: climb.done / climb.total, tone: 1 }]} label={`${pct(climb.done, climb.total)}% of ${level ?? "the level"}`}>
                  <span className="sh-ring-n">{pct(climb.done, climb.total)}%</span>
                </Rings>
              </div>
            </div>
            <Link href={cur.pageHref} className="sh-climb-art" aria-label={`Open ${cur.name}`}>
              <Climb id="sh-climb" phases={climb.phases} done={climb.done} total={climb.total} member={{ name: v.firstName }} className="sh-desk-b" />
              <Climb id="sh-climb-p" phases={climb.phases} done={climb.done} total={climb.total} member={{ name: v.firstName }} labels={false} height={250} className="sh-phone-b" />
            </Link>
            <ol className="sh-camps sh-phone-f" aria-label="Phases">
              {climb.phases.map((ph) => {
                const today = climb.done + 1;
                const st = climb.done >= ph.to ? "done" : today >= ph.from ? "now" : "";
                return (
                  <li key={ph.label} data-state={st || undefined}>
                    {ph.label}
                    {st === "done" && <Icon name="check" size="xs" />}
                  </li>
                );
              })}
              <li>Summit</li>
            </ol>
            {peaks.length > 0 && (
              <div className="sh-beyond sh-desk-b">
                <BeyondTheSummit sub={`Where members go after ${level ?? "this level"} — picked for your pace and goals.`} more={{ href: "/programs", label: "See your full path" }} peaks={peaks} />
              </div>
            )}
          </Glass>
        ) : (
          <WizardCard />
        )}
        <WeekCard v={v} />
      </div>

      {/* Phone: Beyond the summit as its own rail */}
      {peaks.length > 0 && (
        <section className="sh-sec sh-phone-b" aria-labelledby="sh-beyond-t">
          <RowHead id="sh-beyond-t" title="Beyond the summit" seeAll="/programs" seeAllLabel="Your path" />
          <Rail label="Beyond the summit" item="74%">
            {peaks.map((pk) => (
              <PeakCard key={pk.href + pk.title} p={pk} />
            ))}
          </Rail>
        </section>
      )}

      {home && home.checklistDone < home.checklist.length && home.enrolled.length <= 1 && <Checklist items={home.checklist} done={home.checklistDone} />}

      {home && (
        <>
          {/* (3) Your programs */}
          <section className="sh-sec" aria-labelledby="sh-mine-t" data-rise style={{ ["--i" as string]: 2 }}>
            <RowHead id="sh-mine-t" title={home.settings.enrolledTitle || "Your programs"} sub="Pick up exactly where you left off." seeAll="/programs" />
            <Rail label="Your programs" item="17.5rem">
              {[
                ...home.enrolled.map((i, n) => <ProgramCard key={i.key} item={i} first={n === 0} />),
                <StartNewCard key="new" count={includedCount} />,
              ]}
            </Rail>
          </section>

          {/* (4) Upcoming activity */}
          <section className="sh-sec" aria-labelledby="sh-up-t">
            <RowHead id="sh-up-t" title="Upcoming activity" seeAll="/plan" seeAllLabel="Open schedule" />
            <Upcoming tiles={home.tiles} />
          </section>

          {/* (5) Programs you can join */}
          {home.joinable.length > 0 && (
            <section className="sh-sec" aria-labelledby="sh-join-t">
              <RowHead id="sh-join-t" title="Programs you can join" sub="Included with your membership — one tap and you're in." seeAll="/programs" />
              <Rail label="Programs you can join" item="15rem">
                {home.joinable.map((i) => (
                  <JoinCard key={i.key} item={i} />
                ))}
              </Rail>
            </section>
          )}
          <div className="sh-offer">
            <OfferSlot placement="today" />
          </div>

          {/* (6) Retreats & gatherings */}
          {home.retreats.length > 0 && (
            <section className="sh-sec" aria-labelledby="sh-ret-t">
              <RowHead id="sh-ret-t" title="Retreats & gatherings" sub="Train with Mike in person, on Mount Shasta." seeAll={home.retreatsHref} />
              <div className="sh-retreats">
                {home.retreats.slice(0, 2).map((r, i) => (
                  <RetreatCard key={r.id} r={r} first={i === 0} />
                ))}
              </div>
            </section>
          )}

          {/* (7) Explore next */}
          {home.locked.length > 0 && (
            <section className="sh-sec" aria-labelledby="sh-next-t">
              <RowHead id="sh-next-t" title="Explore next" sub="Go deeper when you're ready." seeAll="/programs" />
              <Rail label="Programs to unlock" item="15rem">
                {home.locked.map((i) => (
                  <JoinCard key={i.key} item={i} />
                ))}
              </Rail>
            </section>
          )}
        </>
      )}
      {!home && <OfferSlot placement="today" />}
    </div>
  );
}

/* ================================================================== hero */

function ContinueHero({ v, h, climb }: { v: TodayView; h: HomeView; climb: ReturnType<typeof climbOf> }) {
  const item = h.continuing!;
  const p = v.primary;
  const same = p && p.program_slug === item.slug;
  const { day, name } = splitDayTitle((same ? p.current_lesson_title : null) ?? item.nextLabel ?? item.name);
  const steps = same ? v.next?.steps ?? null : null;
  const cl = same ? v.currentLesson : null;
  const stepList = cl?.steps ?? [];
  const minutes = cl?.minutes ?? (stepList.length ? stepList.reduce((n, s) => n + (parseInt(s.duration ?? "", 10) || 0), 0) || null : null);
  const level = levelOf(p?.path_name);
  const phase = same ? p.current_section_title : null;
  const total = climb?.total ?? (same ? p.lessons_total : null);
  const doneDays = climb?.done ?? 0;
  const photo = programPhoto(item.slug);
  const nextStep = stepList.findIndex((s) => !s.done);
  const action = h.heroAction!;
  const label = item.complete ? "Review" : day ? `${steps && steps.done > 0 ? "Continue" : "Start"} Day ${day}` : action.label;
  const meta = [[item.name.split(" · ")[0], level, phase].filter(Boolean).join(" · "), [stepList.length ? plural(stepList.length, "step") : null, minutes ? `${minutes} min` : null].filter(Boolean).join(" · ")].filter(Boolean);
  return (
    <PhotoHero
      className="sh-hero"
      image={{ src: photo.src, alt: photo.alt, focal: "62% 26%", focalPhone: "56% 18%" }}
      minHeight={500}
      priority
      overlay={
        cl?.focus ? (
          <Glass level="clear" radius={20} className="sh-quote">
            <Avatar name="Mike Salemi" src={MIKE_FACE} size="lg" />
            <p className="lq-t13">
              “{cl.focus}”<small>Mike · note for {day ? `Day ${day}` : "today"}</small>
            </p>
          </Glass>
        ) : null
      }
    >
      <div className="sh-row">
        <Tag tone="warm" size="lg">
          Continue training
        </Tag>
        {day && total ? <Chip variant="clear">{`Day ${day} of ${total}`}</Chip> : null}
      </div>
      <h2 className="lq-d-xxl sh-hero-t">{name || item.name}</h2>
      <p className="sh-hero-meta">{meta.join("  ·  ")}</p>
      {stepList.length > 0 && (
        <div className="sh-steps">
          <StepSegments total={stepList.length} done={stepList.filter((s) => s.done).length} current={Math.max(0, nextStep)} onPhoto label={`${stepList.filter((s) => s.done).length} of ${stepList.length} steps done`} />
          <div className="sh-steps-l sh-desk-g">
            {stepList.map((s, i) => (
              <span key={i} data-done={s.done ? "" : undefined}>
                <b>{s.title}</b>
                {s.duration}
              </span>
            ))}
          </div>
          {nextStep >= 0 && (
            <p className="sh-upnext sh-phone-f">
              <span>
                Up next · <b>{stepList[nextStep]!.title}</b>
              </span>
              <span>{stepList[nextStep]!.duration}</span>
            </p>
          )}
        </div>
      )}
      <div className="sh-hero-actions">
        <Button icon={item.complete ? "repeat" : "play"} href={action.href} size="lg" className="sh-hero-go">
          {label}
        </Button>
        <Button variant="onphoto" href={item.pageHref} size="lg" className="sh-desk-in">
          View the program
        </Button>
      </div>
      {total ? (
        <div className="sh-level sh-desk-f">
          <span>{level ?? "Progress"}</span>
          <ProgressBar value={doneDays / total} tone="white" size="thin" label={`${level ?? "Program"} progress`} style={{ width: 200 }} />
          <b>
            {doneDays} / {total} days · {pct(doneDays, total)}%
          </b>
        </div>
      ) : null}
    </PhotoHero>
  );
}

function JoinHero({ item, eyebrow }: { item: HomeItem; eyebrow: string | null }) {
  const photo = item.image ?? { src: programPhoto(item.slug).src, alt: item.name, position: programPhoto(item.slug).position };
  return (
    <PhotoHero className="sh-hero" image={{ src: photo.src, alt: photo.alt, focal: photo.position ?? "62% 26%", focalPhone: "56% 18%" }} minHeight={460} priority>
      <Tag tone="accent" size="lg">
        {eyebrow || "Featured program"}
      </Tag>
      <h2 className="lq-d-xxl sh-hero-t">{item.name}</h2>
      {item.summary && <p className="sh-hero-meta">{item.summary}</p>}
      <p className="sh-hero-meta">{item.sizeLabel}</p>
      <div className="sh-hero-actions">
        <JoinButton programId={item.programId} pathId={item.pathId} name={item.name} variant="filled" size="lg" />
        <Button variant="onphoto" href={item.pageHref} size="lg">
          Preview
        </Button>
      </div>
    </PhotoHero>
  );
}

function EmptyHero({ v }: { v: TodayView }) {
  const n = v.next;
  const photo = programPhoto("kettlebell-lifestyle");
  return (
    <PhotoHero className="sh-hero" image={{ src: photo.src, alt: photo.alt, focal: "62% 26%", focalPhone: "56% 18%" }} minHeight={440} priority>
      <Tag tone="warm" size="lg">
        {n ? n.eyebrow : "Start here"}
      </Tag>
      <h2 className="lq-d-xxl sh-hero-t">{n ? n.title : "Choose where to start"}</h2>
      <p className="sh-hero-meta">{n ? n.meta.map((m) => m.text).join(" · ") : "Pick a program, or let a plan lay out your week."}</p>
      <div className="sh-hero-actions">
        <Button icon="play" href={n?.href ?? "/programs"} size="lg">
          {n?.cta ?? "Explore programs"}
        </Button>
        {!n && (
          <Button variant="onphoto" href={WIZARD} size="lg">
            Plan my weeks
          </Button>
        )}
      </div>
    </PhotoHero>
  );
}

/* ================================================================== this week */

const WIZARD = "/programs/kettlebell-lifestyle/session/wizard";

function WeekCard({ v }: { v: TodayView }) {
  const streak = v.rewards.streak_current;
  const best = v.rewards.streak_best;
  const target = MILESTONES.find((m) => m > streak) ?? streak + 1;
  const toGo = target - streak;
  const planned = v.weekSummary.planned;
  return (
    <Glass as="section" radius="card" className="sh-week" aria-labelledby="sh-week-t">
      <div className="sh-between">
        <p id="sh-week-t" className="lq-eyebrow" data-tone="warm">
          This week
        </p>
        <span className="lq-t12 lq-c3 sh-phone-in lq-num">{planned ? `${v.weekSummary.done} of ${plural(planned, "session")}` : ""}</span>
      </div>
      <div className="sh-streak sh-desk-f">
        <span className="sh-flame" aria-hidden>
          <Icon name="flame" />
        </span>
        <div>
          <div className="lq-dnum sh-streak-n">
            {streak} <span>{streak === 1 ? "day" : "days"}</span>
          </div>
          <div className="lq-t13 lq-c2">{streak > 0 && streak >= best ? "Your longest streak yet" : best > 0 ? `Best: ${plural(best, "day")}` : "Train today to start a streak"}</div>
        </div>
      </div>
      <div className="sh-dots">
        <WeekDots days={weekDots(v)} />
      </div>
      <hr className="lq-hair sh-desk-b" />
      <div className="sh-badge">
        <span className="sh-medal" aria-hidden>
          <Icon name="medal" size="sm" />
        </span>
        <div className="sh-badge-t">
          <p className="lq-t13">
            <b className="lq-num">{plural(toGo, "day")}</b> to your {target}-day badge
          </p>
          <p className="lq-t12 lq-c3 sh-desk-b">{toGo === 1 ? "Train tomorrow to earn it." : `Keep the streak going ${toGo} more days to earn it.`}</p>
        </div>
        <ProgressBar value={streak / target} tone="warm" size="thin" label="Badge progress" className="sh-phone-b sh-badge-bar" />
      </div>
      <div className="sh-desk-b">
        <div className="sh-between lq-t12 lq-c3" style={{ marginTop: 14 }}>
          <span>Badge progress</span>
          <b className="lq-c2 lq-num">
            {streak} / {target}
          </b>
        </div>
        <ProgressBar value={streak / target} tone="warm" size="thin" label="Badge progress" style={{ marginTop: 6 }} />
        <hr className="lq-hair" />
        {planned > 0 ? (
          <div className="sh-between">
            <div>
              <div className="lq-t12 lq-c3">Planned this week</div>
              <div className="lq-dnum sh-mid">
                {v.weekSummary.done}
                <span className="lq-c3">/{planned}</span>
              </div>
              <div className="lq-t12 lq-c3">sessions done</div>
            </div>
            <Button size="sm" variant="tint" href="/plan" iconAfter="chevron">
              Open plan
            </Button>
          </div>
        ) : (
          <div className="sh-noplan">
            <p className="lq-t13">Nothing planned this week.</p>
            <p className="lq-t12 lq-c3">Pick your days and Mike&apos;s program lays out the weeks for you.</p>
            <Button size="sm" variant="tint" icon="calendar" href={WIZARD}>
              Plan my weeks
            </Button>
          </div>
        )}
      </div>
    </Glass>
  );
}

function WizardCard() {
  const ph = programPhoto("kettlebell-lifestyle");
  return (
    <Glass as="section" radius="card" className="sh-wizard" aria-labelledby="sh-wiz-t">
      <div className="sh-wizard-ph">
        <Image src={ph.src} alt="" fill sizes="(min-width: 1180px) 420px, 100vw" style={{ objectPosition: ph.position }} />
      </div>
      <div className="sh-wizard-t">
        <p className="lq-eyebrow" data-tone="accent">
          Self-Guided
        </p>
        <h2 id="sh-wiz-t" className="lq-d-md">
          Plan your weeks in four taps.
        </h2>
        <p className="lq-t15 lq-c2">Pick your level, your days and a start date. Kettlebell Lifestyle&apos;s day-by-day plan turns into your schedule.</p>
        <Button icon="calendar" href={WIZARD}>
          Plan my weeks
        </Button>
      </div>
    </Glass>
  );
}

/* ================================================================== rails */

function RowHead({ id, title, sub, seeAll, seeAllLabel = "See all" }: { id: string; title: string; sub?: string; seeAll?: string; seeAllLabel?: string }) {
  return (
    <div className="sh-rowhead">
      <div>
        <h2 id={id} className="lq-d-sm sh-rowhead-t">
          {title}
        </h2>
        {sub && <p className="lq-t13 lq-c3">{sub}</p>}
      </div>
      {seeAll && (
        <Link href={seeAll} className="lq-link sh-seeall">
          {seeAllLabel} <Icon name="arrowRight" size="xs" />
        </Link>
      )}
    </div>
  );
}

function tagFor(i: HomeItem) {
  if (i.type === "day_program") return i.mode === "self_guided" ? "Self-Guided" : "Immersion";
  if (i.type === "tool") return "Tool";
  return "Course";
}

function Cover({ image, sizes, priority, children }: { image: HomeItem["image"]; sizes: string; priority?: boolean; children?: React.ReactNode }) {
  return (
    <span className="sh-cover">
      {image ? <Image src={image.src} alt="" fill sizes={sizes} priority={priority} style={{ objectPosition: image.position ?? "50% 30%" }} /> : <Icon name="kettlebell" className="sh-cover-ic" />}
      {children}
    </span>
  );
}

function ProgramCard({ item, first }: { item: HomeItem; first?: boolean }) {
  return (
    <Link href={item.resumeHref} className="sh-card lq-press" aria-label={`${item.verb.label} ${item.name}, ${item.percent}% complete`} prefetch>
      <Cover image={item.image} sizes="280px" priority={first}>
        <Tag tone={first ? "accent" : "light"} className="sh-cover-tag">
          {item.complete ? "Completed" : tagFor(item)}
        </Tag>
      </Cover>
      <span className="sh-card-b">
        <b className="sh-card-t">{item.name}</b>
        <span className="sh-meter">
          <ProgressBar value={item.percent / 100} tone={first ? "accent" : "label"} size="thin" label={`${item.percent}% complete`} />
          <b className="lq-num">{item.percent}%</b>
        </span>
        <span className="sh-card-s">
          {item.nextLabel ? (
            <>
              Up next · <b>{item.nextLabel}</b>
            </>
          ) : (
            item.progressLabel
          )}
        </span>
        <span className="sh-card-cta">
          {item.verb.label} <Icon name="arrowRight" size="xs" />
        </span>
      </span>
    </Link>
  );
}

function StartNewCard({ count }: { count: number }) {
  return (
    <Link href="/programs" className="sh-card sh-new lq-press">
      <span className="sh-new-plus" aria-hidden>
        <Icon name="plus" />
      </span>
      <b>Start something new</b>
      <span className="lq-t12 lq-c3">{count > 0 ? `${plural(count, "program")} ${count === 1 ? "is" : "are"} included with your membership.` : "Browse every program and course."}</span>
      <span className="sh-card-cta">
        Browse <Icon name="arrowRight" size="xs" />
      </span>
    </Link>
  );
}

function accessWord(item: HomeItem) {
  if (item.draft) return "Draft";
  if (item.access === "free") return "Free";
  if (item.access === "owned") return "Owned";
  if (item.access === "included") return "Included";
  return item.kicker ?? "Locked";
}

function JoinCard({ item }: { item: HomeItem }) {
  const open = item.access === "included" || item.access === "owned" || item.access === "free";
  return (
    <div className="sh-card sh-join">
      <Link href={item.pageHref} className="sh-join-link" aria-label={`${item.name}: details`} prefetch={false}>
        <Cover image={item.image} sizes="240px">
          {item.access === "free" && (
            <Tag tone="light" className="sh-cover-tag">
              Free
            </Tag>
          )}
          {item.draft && (
            <Tag tone="light" className="sh-cover-tag">
              Coming soon
            </Tag>
          )}
        </Cover>
      </Link>
      <span className="sh-card-b">
        <b className="sh-card-t sh-clamp2">{item.name}</b>
        <span className="lq-t12 lq-c3">
          {item.sizeLabel} · {accessWord(item)}
        </span>
        <span className="sh-join-cta">
          {open ? (
            <JoinButton programId={item.programId} pathId={item.pathId} name={item.name} variant="tint" size="sm" />
          ) : item.priceCents ? (
            <Button variant="secondary" size="sm" icon="lock" href={item.pageHref}>
              Unlock · {money(item.priceCents)}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" iconAfter="chevron" href={item.pageHref}>
              {item.draft ? "Preview" : item.kicker === "Coaching" ? "Book a call" : "View program"}
            </Button>
          )}
        </span>
      </span>
    </div>
  );
}

function PeakCard({ p }: { p: Peak }) {
  return (
    <Link href={p.href} className="sh-card lq-press" data-locked={p.locked ? "" : undefined}>
      <span className="sh-cover">
        <Image src={p.image.src} alt="" fill sizes="300px" style={{ objectPosition: p.image.position }} />
        {p.badge && (
          <Tag tone={p.badge.kind === "badge" ? "light" : "accent"} className="sh-cover-tag">
            {p.badge.label}
          </Tag>
        )}
      </span>
      <span className="sh-card-b">
        <b className="sh-card-t">{p.title}</b>
        <span className="lq-t12 lq-c3 sh-clamp2">{p.sub}</span>
      </span>
    </Link>
  );
}

function Upcoming({ tiles }: { tiles: ActivityTile[] }) {
  return (
    <div className="sh-tiles">
      {tiles.map((t) => (
        <Link key={t.id} href={t.href} className="sh-tile lq-press" data-now={t.now ? "" : undefined} prefetch={false}>
          <span className="sh-date" aria-hidden>
            {t.date ? (
              <>
                <small>{fmt(t.date as IsoDate, { month: "short" })}</small>
                <b className="lq-num">{String(Number(t.date.slice(8, 10))).padStart(2, "0")}</b>
              </>
            ) : (
              <Icon name={t.icon} />
            )}
          </span>
          <span className="sh-tile-t">
            <span className="sh-tile-e">{t.eyebrow}</span>
            <b>{t.title}</b>
            <span className="lq-t12 lq-c3 sh-clamp1">{t.line}</span>
          </span>
          <Icon name="chevron" size="sm" className="sh-tile-go" />
        </Link>
      ))}
    </div>
  );
}

function RetreatCard({ r, first }: { r: RetreatCardModel; first: boolean }) {
  const img = r.image ?? { src: "/media/summit/summit-group.jpg", alt: r.name };
  return (
    <Link href={r.href} className="sh-retreat lq-press" data-past={r.status === "past" ? "" : undefined} prefetch={false}>
      <Image src={img.src} alt={img.alt} fill sizes="(min-width: 900px) 560px, 100vw" style={{ objectPosition: "50% 45%" }} priority={false} />
      <span className="sh-retreat-c">
        <span className="sh-row">
          {r.statusLabel && (
            <Tag tone={r.status === "open" ? "warm" : "light"}>
              {r.statusLabel}
            </Tag>
          )}
        </span>
        <b className="lq-d-lg sh-retreat-t">{r.name}</b>
        <span className="sh-retreat-l">
          <span>{r.line}</span>
          <span className="lq-btn" data-variant={first && r.status === "open" ? "white" : "onphoto"} data-size="sm">
            <span>{r.status === "open" ? "Apply" : r.status === "waitlist" ? "Join waitlist" : "View"}</span>
            <Icon name="arrowRight" size="xs" />
          </span>
        </span>
      </span>
    </Link>
  );
}
