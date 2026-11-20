import { DayGlyph, StreakFlame } from "@/components/graphics";
import { UserButton } from "@/components/shell/ShellUser";
import { AmbientBackdrop, Button, Card, Glass, Icon, IconButton, LargeTitle, ProgressBar, Rings, StatTile } from "@/components/ui";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import type { HomeView } from "./buildHome";
import type { TodayView } from "./buildToday";
import { fmt, shortDate } from "./dates";
import { ActivityTiles, AlsoToday, Checklist, EmptyEnrolled, EnrolledCard, HomeHero, JoinCard, RetreatCard, RowHead } from "./HomeParts";
import { Rail } from "./Rail";
import { entryHref, GOAL_ICON, greeting, plural, relDay, splitDayTitle } from "./model";
import { PHOTOS } from "./photos";
import { WeekStrip } from "./WeekStrip";
import "./tpy.css";

function hourIn(tz: string) {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date()));
  } catch {
    return new Date().getUTCHours();
  }
}

export function TodayScreen({ v, home, homeError, retreat }: { v: TodayView; home: HomeView | null; homeError?: boolean; /** P3: the member's retreat journey card (streams in). */ retreat?: React.ReactNode }) {
  const hour = hourIn(v.timezone);
  const hello = `${greeting(hour)}, ${v.firstName}`;
  const art = home?.continuing?.image ?? home?.featured?.image;
  const photo = PHOTOS[v.next?.photo ?? "coaching"];
  return (
    <>
      <AmbientBackdrop src={art?.src ?? photo.src} position={art ? "50% 30%" : photo.position} fixed />
      <div className="tpy-title w1-title">
        <LargeTitle
          title="Today"
          eyebrow={fmt(v.today, { weekday: "long", day: "numeric", month: "long" })}
          trailing={
            <>
              <span className="tpy-desk"><IconButton icon="plan" label="Open your plan" href="/plan" /></span>
              <span className="tpy-phone"><UserButton /></span>
            </>
          }
        />
      </div>

      <div className="w1-home">
        {/* (1) Hero: continue training, or the featured program for members without one */}
        {home && (home.continuing || home.featured) ? (
          <HomeHero h={home} hour={hour} streak={v.rings.streak.days} greeting={hello} />
        ) : (
          <NowCard v={v} />
        )}
        {home?.alsoToday && <AlsoToday a={home.alsoToday} />}
        {retreat}

        {/* (2) Error banner: the rails failed but Today still works */}
        {homeError && (
          <Glass radius="card" className="w1-error" role="alert">
            <Icon name="close" size="sm" />
            <span className="lq-t15">Your programs couldn&apos;t load right now. Refresh to try again.</span>
          </Glass>
        )}

        {/* v2 extras, compact: progress rings, this week, goal */}
        <div className="w1-pulse">
          <ProgressCard v={v} />
          <WeekCard v={v} />
          {v.goal ? <GoalCard goal={v.goal} today={v.today} /> : <NoGoalCard />}
        </div>
        {home && home.checklistDone < home.checklist.length && home.enrolled.length <= 2 && <Checklist items={home.checklist} done={home.checklistDone} />}

        {home && (
          <>
            {/* (3) Your programs */}
            <section aria-labelledby="mine-t">
              <RowHead id="mine-t" title={home.settings.enrolledTitle || "Your programs"} seeAll="/programs" />
              {home.enrolled.length ? (
                <Rail label="Your programs" item="17rem">
                  {home.enrolled.map((i, n) => (
                    <EnrolledCard key={i.key} item={i} first={n === 0} />
                  ))}
                </Rail>
              ) : (
                <EmptyEnrolled />
              )}
            </section>

            {/* (4) Upcoming activity */}
            <section aria-labelledby="up-t">
              <RowHead id="up-t" title="Upcoming activity" seeAll="/plan" seeAllLabel="Plan" />
              <ActivityTiles tiles={home.tiles} />
            </section>

            {/* (5) Start something new: programs you can join */}
            {home.joinable.length > 0 && (
              <section aria-labelledby="join-t">
                <RowHead id="join-t" eyebrow="Programs you can join" title="Start something new" seeAll="/programs" />
                <Rail label="Programs you can join" item="15rem">
                  {home.joinable.map((i) => (
                    <JoinCard key={i.key} item={i} />
                  ))}
                </Rail>
              </section>
            )}
            <div className="w1-offer">
              <OfferSlot placement="today" />
            </div>

            {/* (6) Retreats & gatherings */}
            {home.retreats.length > 0 && (
              <section aria-labelledby="ret-t">
                <RowHead id="ret-t" title="Retreats & gatherings" seeAll={home.retreatsHref} />
                <Rail label="Retreats" item="17rem">
                  {home.retreats.map((r) => (
                    <RetreatCard key={r.id} r={r} />
                  ))}
                </Rail>
              </section>
            )}

            {/* (7) Explore next: locked programs */}
            {home.locked.length > 0 && (
              <section aria-labelledby="next-t">
                <RowHead id="next-t" title="Explore next" seeAll="/programs" />
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
    </>
  );
}

function NowCard({ v }: { v: TodayView }) {
  const n = v.next;
  if (!n) {
    return (
      <Glass as="section" radius="hero" className="tpy-now" aria-labelledby="now-t">
        <div className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Nothing planned yet</div>
        <h2 id="now-t" className="lq-t28" style={{ marginTop: 4 }}>Choose where to start</h2>
        <p className="lq-t15 lq-c2" style={{ marginTop: 6 }}>Pick a program, or let a plan lay out your week.</p>
        <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
          <Button block icon="programs" href="/programs">Explore programs</Button>
          <Button block variant="plain" href="/plan/new">Start a plan</Button>
        </div>
      </Glass>
    );
  }
  const photo = PHOTOS[n.photo];
  return (
    <Card height={452} radius="hero" interactive className="tpy-nowcard" image={{ src: photo.src, alt: photo.alt, position: photo.position, priority: true }}>
      <Glass level="clear" radius="hero" className="tpy-now" aria-labelledby="now-t">
        <div className="lq-t13" style={{ fontWeight: 600, opacity: 0.92, display: "flex", alignItems: "center", gap: 6 }}>
          {n.dayType && <DayGlyph type={n.dayType} size={16} tone="mono" />}
          {n.eyebrow}
        </div>
        <h2 id="now-t" className="lq-t34">{n.title}</h2>
        <div className="lq-t15 tpy-meta">
          {n.meta.map((m) => (
            <span key={m.text}><Icon name={m.icon} size="sm" /><span className="lq-num">{m.text}</span></span>
          ))}
        </div>
        <Button block icon="play" href={n.href} target={n.external ? "_blank" : undefined} style={{ marginTop: 18 }}>
          {n.cta}
        </Button>
        {n.hint && <div className="lq-t13 tpy-now-hint">{n.hint}</div>}
      </Glass>
    </Card>
  );
}

function ProgressCard({ v }: { v: TodayView }) {
  const { program, today, streak } = v.rings;
  const rings = [
    { value: program ? program.done / program.total : 0, tone: 1 as const },
    { value: today.total ? today.done / today.total : 0, tone: 2 as const },
    { value: streak.target ? streak.days / streak.target : 0, tone: 3 as const },
  ];
  const label = `${program ? `${program.done} of ${program.total} days in ${program.label}, ` : ""}${today.done} of ${today.total} ${today.unit} today, ${streak.days} day streak`;
  return (
    <Glass as="section" radius="card" interactive className="tpy-pad" aria-label="Progress">
      <div className="tpy-sech tpy-desk-flex">
        <h3>Progress</h3>
        <span className="lq-t13 lq-c2">{program?.label}</span>
      </div>
      <div className="tpy-rings">
        <Rings size={104} stroke={12} label={label} rings={rings} />
        <div className="lq-legend">
          {program && <StatTile swatch={1} value={program.done} unit={`/${program.total} days`} label="Program" />}
          <StatTile swatch={2} value={today.done} unit={`/${today.total} ${today.unit}`} label="Today" />
          <StatTile
            swatch={3}
            value={streak.days}
            unit=" days"
            label={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                Streak <StreakFlame size={13} lit={streak.days > 0} animated={false} title="" />
              </span>
            }
          />
        </div>
      </div>
    </Glass>
  );
}

function WeekCard({ v }: { v: TodayView }) {
  const missed = v.missed.reduce((n, m) => n + m.count, 0);
  return (
    <Glass as="section" radius="card" style={{ padding: "16px 14px 14px" }} aria-labelledby="week-t">
      <div className="tpy-sech" style={{ padding: "0 4px" }}>
        <h3 id="week-t">This week</h3>
        <span className="lq-t13 lq-c2 lq-num">
          {v.weekSummary.planned ? `${v.weekSummary.done} of ${plural(v.weekSummary.planned, "session")}` : "Nothing planned"}
        </span>
      </div>
      <WeekStrip days={v.week} hrefFor={(d) => `/plan?d=${d}`} />
      {missed > 0 && (
        <div className="tpy-weekfoot">
          <span className="lq-t13 lq-c2">{plural(missed, "missed session")}</span>
          <Button size="sm" variant="tint" href="/plan#missed" iconAfter="chevron">Fix my plan</Button>
        </div>
      )}
    </Glass>
  );
}

function GoalCard({ goal, today }: { goal: NonNullable<TodayView["goal"]>; today: string }) {
  const p = goal.total ? goal.done / goal.total : 0;
  return (
    <Glass as="section" radius="card" interactive className="tpy-pad" aria-labelledby="goal-t">
      <div className="tpy-sech">
        <h3 id="goal-t">Your goal</h3>
        {goal.planId && <a className="lq-t13" href={`/plan/${goal.planId}`}>View plan</a>}
      </div>
      <div className="tpy-goal">
        <span className="tpy-goal-icon" aria-hidden><Icon name={GOAL_ICON[goal.kind] ?? "sparkle"} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="lq-t20">{goal.title}</div>
          <div className="lq-t13 lq-c2">{goal.planName ?? "No plan yet"}</div>
        </div>
      </div>
      {goal.total > 0 ? (
        <>
          <ProgressBar value={p} label="Goal plan progress" style={{ marginTop: 14 }} />
          <div className="tpy-goal-foot lq-t13 lq-c2 lq-num">
            <span>{goal.done} of {plural(goal.total, "session")}</span>
            {goal.daysLeft !== null && goal.daysLeft >= 0 && goal.targetDate && (
              <span>{plural(goal.daysLeft, "day")} to {shortDate(goal.targetDate)}{goal.targetDate.slice(0, 4) !== today.slice(0, 4) ? ` ${goal.targetDate.slice(0, 4)}` : ""}</span>
            )}
          </div>
          {goal.next && (
            <a className="tpy-row" href={entryHref(goal.next)} style={{ margin: "12px -18px -16px", width: "auto", borderTop: "1px solid var(--sep)" }}>
              <span className="tpy-row-icon" aria-hidden><Icon name={goal.next.item_kind === "recovery" ? "leaf" : "kettlebell"} size="sm" /></span>
              <span className="tpy-row-main">
                <span className="lq-t13 lq-c2">Next in your plan · {relDay(goal.next.on_date, today)}</span>
                <span className="lq-t15" style={{ fontWeight: 600 }}>{splitDayTitle(goal.next.title).name}</span>
              </span>
              <Icon name="chevron" size="sm" className="tpy-chev" />
            </a>
          )}
        </>
      ) : (
        <Button size="sm" variant="fill" href="/plan/new" style={{ marginTop: 14 }}>Choose a plan</Button>
      )}
    </Glass>
  );
}

function NoGoalCard() {
  return (
    <Glass as="section" radius="card" interactive className="tpy-pad" aria-labelledby="goal-t">
      <div className="tpy-goal">
        <span className="tpy-goal-icon" aria-hidden><Icon name="sparkle" /></span>
        <div>
          <h3 id="goal-t" className="lq-t17">Set a goal</h3>
          <div className="lq-t13 lq-c2">Five quick questions, then a plan that fits your week.</div>
        </div>
      </div>
      <Button size="sm" variant="fill" href="/onboarding" style={{ marginTop: 14 }}>Set my goal</Button>
    </Glass>
  );
}

