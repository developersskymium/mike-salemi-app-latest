import { DayGlyph, StreakFlame } from "@/components/graphics";
import { UserButton } from "@/components/shell/ShellUser";
import { AmbientBackdrop, Button, Card, Glass, HeroPhoto, Icon, IconButton, LargeTitle, ProgressBar, Rings, StatTile } from "@/components/ui";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import type { TodayView } from "./buildToday";
import { fmt, shortDate } from "./dates";
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

export function TodayScreen({ v }: { v: TodayView }) {
  const photo = PHOTOS[v.next?.photo ?? "coaching"];
  const hello = `${greeting(hourIn(v.timezone))}, ${v.firstName}`;
  return (
    <>
      <AmbientBackdrop src={photo.src} position={photo.position} fixed />
      <div className="tpy-hero">
        <HeroPhoto image={{ src: photo.src, alt: "", position: photo.position }} height={560} />
      </div>
      <div className="tpy-title" data-photo="">
        <LargeTitle
          title="Today"
          eyebrow={`${fmt(v.today, { weekday: "short", day: "numeric", month: "short" })} · ${hello}`}
          onPhoto
          trailing={
            <>
              <span className="tpy-desk"><IconButton icon="plan" label="Open your plan" href="/plan" /></span>
              <span className="tpy-phone"><UserButton variant="clear" /></span>
            </>
          }
        />
      </div>

      <div className="tpy-today">
        <NowCard v={v} />

        <div className="tpy-today-side">
          <ProgressCard v={v} />
          <WeekCard v={v} />
        </div>

        <div className="tpy-below">
          {v.goal ? <GoalCard goal={v.goal} today={v.today} /> : <NoGoalCard />}
          <Events v={v} />
          <OfferSlot placement="today" />
        </div>
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

function Events({ v }: { v: TodayView }) {
  const inv = v.invitation;
  return (
    <>
      {v.upcoming.length > 0 && (
        <Glass as="section" radius="card" aria-labelledby="up-t" style={{ padding: "14px 0 4px" }}>
          <div className="tpy-sech" style={{ padding: "0 18px", marginBottom: 4 }}><h3 id="up-t">Coming up</h3></div>
          <div className="tpy-list">
            {v.upcoming.slice(0, 3).map((e) => (
              <a key={e.id} className="tpy-row" href={e.href}>
                <span className="tpy-row-icon" aria-hidden><Icon name={e.kind === "coaching" ? "people" : e.kind === "run" ? "mountain" : "calendar"} size="sm" /></span>
                <span className="tpy-row-main">
                  <span className="lq-t15" style={{ fontWeight: 600 }}>{e.title}</span>
                  <span className="lq-t13 lq-c2">{e.subtitle}</span>
                </span>
                <span className="lq-t13 lq-c2 lq-num">{/^\d{4}-\d{2}-\d{2}/.test(e.when) ? shortDate(e.when.slice(0, 10)) : e.when}</span>
              </a>
            ))}
          </div>
        </Glass>
      )}
      {inv && inv.image && (
        <Card
          className="tpy-invite"
          height={250}
          image={{ src: inv.image.url, alt: inv.image.alt, position: "50% 55%" }}
          footer={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="lq-t13" style={{ opacity: 0.85, fontWeight: 600 }}>Retreat invitation</div>
                <div className="lq-t22">{inv.name}</div>
                <div className="lq-t13" style={{ opacity: 0.92 }}>
                  {[inv.place, dateSpan(inv.starts_at, inv.ends_at)].filter(Boolean).join(", ")}
                </div>
              </div>
              <Button variant="white" size="sm" href={`/programs/${inv.program_slug}`}>See dates</Button>
            </div>
          }
        />
      )}
    </>
  );
}

function dateSpan(a: string, b: string | null) {
  const s = a.slice(0, 10);
  if (!b) return shortDate(s);
  const e = b.slice(0, 10);
  return s.slice(0, 7) === e.slice(0, 7) ? `${fmt(s, { month: "long" })} ${Number(s.slice(8))}–${Number(e.slice(8))}` : `${shortDate(s)} – ${shortDate(e)}`;
}
