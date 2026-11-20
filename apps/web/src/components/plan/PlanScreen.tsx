import Link from "next/link";
import { EmptyScene } from "@/components/graphics";
import { UserButton } from "@/components/shell/ShellUser";
import { AmbientBackdrop, Button, EmptyState, Glass, Icon, LargeTitle, ProgressBar, Rings } from "@/components/ui";
import type { LessonCatalog, PlanRaw } from "@/lib/loaders/today-plan-you";
import type { ScheduleData, ScheduleItem } from "@/lib/loaders/plan";
import type { NotificationsData } from "@/lib/loaders/notifications";
import { timeFor } from "@/lib/email/reminders";
import { shortDate } from "@/components/today/dates";
import { GOAL_ICON, GOAL_PHOTO, lessonHref, plural, splitDayTitle } from "@/components/today/model";
import { PHOTOS } from "@/components/today/photos";
import { PlanBoard } from "./PlanBoard";
import { NextSessionCard, type NextSession } from "./NextSessionCard";
import { BehindBanner, GuidedPatterns, MissedDayCard, RemindersCard, type Rule } from "./ScheduleControls";
import { time12 } from "@/components/notifications/format";
import "@/components/today/tpy.css";
import "./pln.css";

const SOURCE: Record<string, string> = { template: "Mike's plan", immersion_schedule: "Immersion schedule", custom: "Your own", ai: "Created for you" };

const title = (t: string) => {
  const { day, name } = splitDayTitle(t);
  return day ? `Day ${day} · ${name}` : name;
};
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

/** Google Calendar "add event" link for one session (member-local time, with the zone). */
function googleUrl(item: ScheduleItem, time: string, tz: string, origin: string) {
  const [h, m] = time.split(":").map(Number);
  const start = `${item.on_date.replace(/-/g, "")}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
  const endMin = h! * 60 + m! + (item.minutes ?? 45);
  const end = `${item.on_date.replace(/-/g, "")}T${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}${String(endMin % 60).padStart(2, "0")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Kettlebell · ${title(item.title)}`,
    dates: `${start}/${end}`,
    details: `${item.program_name ?? "Training"} — open your session: ${origin}${lessonHref(item.program_slug, item.lesson_id)}`,
    ctz: tz,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Plan — the original "Build your schedule" layout: plans created for you → plan selector with guided
 * patterns → next session → plan overview → behind-the-plan fix → calendar with the lessons tray →
 * upcoming → Reminders | If you miss a day → calendar sync.
 */
export function PlanScreen({
  raw, catalog, schedule, n, anchor, view, build, selectedId, origin,
}: {
  raw: PlanRaw; catalog: LessonCatalog; schedule: ScheduleData; n: NotificationsData; anchor: string; view: "week" | "month"; build: boolean; selectedId?: string; origin: string;
}) {
  const today = raw.today;
  const goal = raw.goals.find((g) => g.status === "active") ?? null;
  const backdrop = PHOTOS[GOAL_PHOTO[goal?.kind ?? "custom"] ?? "coaching"];
  const plans = raw.plans;
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0] ?? null;
  const open = (i: ScheduleItem) => i.kind !== "rest" && !i.done && !i.skipped;
  const upcoming = schedule.items.filter((i) => open(i) && i.on_date >= today).sort((a, b) => a.on_date.localeCompare(b.on_date));
  const nextItem = upcoming[0] ?? null;
  const work = selected ? schedule.items.filter((i) => i.plan_id === selected.id && i.kind !== "rest") : [];
  const placed = work.filter((i) => !i.skipped).length;
  const done = work.filter((i) => i.done).length;
  const missed = work.filter((i) => open(i) && i.on_date < today);
  const selNext = work.find((i) => open(i) && i.on_date >= today);
  const rule = (selected ? schedule.rules[selected.id] : "shift") ?? "shift";
  const nextSession: NextSession | null = nextItem && {
    title: nextItem.title,
    program: nextItem.program_name,
    date: nextItem.on_date,
    href: lessonHref(nextItem.program_slug, nextItem.lesson_id),
    kind: nextItem.kind,
    reminderTime: timeFor(n.prefs, dow(nextItem.on_date)),
    timezone: n.timezone,
    remindersOn: n.prefs.reminders_enabled,
  };
  const hasAnything = plans.length > 0 || raw.entries.length > 0 || build;

  return (
    <>
      <AmbientBackdrop src={backdrop.src} position={backdrop.position} fixed />
      <div className="tpy-title">
        <LargeTitle
          title="Build your schedule"
          eyebrow={goal ? `Plan · ${goal.title}${goal.target_date ? ` by ${shortDate(goal.target_date)}` : ""}` : "Plan"}
          trailing={
            <>
              <span className="tpy-desk"><Button size="md" variant="glass" icon="sparkle" href="/plan/create">Create my plan</Button></span>
              <span className="tpy-desk"><Button size="md" variant="glass" icon="plus" href="/plan/new">New plan</Button></span>
              <span className="tpy-phone"><UserButton /></span>
            </>
          }
        />
      </div>
      <p className="pln-lede">Drop training days onto the calendar in whatever rhythm fits your week. Set reminders and decide what happens when life gets in the way.</p>

      <div className="pln-page">
        {/* 1 · Created for you */}
        {plans.length > 0 && (
          <section aria-labelledby="pln-plans-t">
            <div className="pln-sechead">
              <div>
                <span className="pln-eyebrow">Created for you</span>
                <h2 id="pln-plans-t" className="pln-h2">Your plans</h2>
              </div>
              <Link href="/plan/create" className="pln-link">Create another</Link>
            </div>
            <div className="pln-plans">
              {plans.map((pl) => {
                const c = raw.planCounts.find((x) => x.plan_id === pl.id);
                const nx = schedule.items.find((i) => i.plan_id === pl.id && open(i) && i.on_date >= today);
                return (
                  <Glass key={pl.id} as={Link} href={`/plan/${pl.id}`} radius="card" interactive className="pln-plancard">
                    <div className="pln-plancard-top">
                      <div>
                        <h3 className="pln-h3">{pl.name}</h3>
                        <p className="pln-sub lq-num">{SOURCE[pl.source] ?? "Plan"}{c ? ` · ${plural(c.total, "session")} · ${c.done} done` : ""}</p>
                      </div>
                      <span className="pln-plancard-ic" aria-hidden><Icon name={pl.source === "ai" ? "sparkle" : pl.source === "immersion_schedule" ? "mountain" : "plan"} size="sm" /></span>
                    </div>
                    {nx ? (
                      <div className="pln-plancard-next">
                        <span className="pln-mini">Next · {new Date(`${nx.on_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</span>
                        <span className="pln-plancard-nt">{title(nx.title)}</span>
                        {nx.program_name && <span className="pln-sub">{nx.program_name}</span>}
                      </div>
                    ) : (
                      <div className="pln-plancard-next"><span className="pln-sub">Every session is behind you.</span></div>
                    )}
                    {c && c.total > 0 && <ProgressBar value={c.done / c.total} label={`${pl.name} progress`} />}
                  </Glass>
                );
              })}
              {goal && (
                <Glass as={Link} href="/onboarding" radius="card" interactive className="pln-plancard pln-goalcard">
                  <span className="pln-plancard-ic" aria-hidden><Icon name={GOAL_ICON[goal.kind] ?? "sparkle"} size="sm" /></span>
                  <div>
                    <span className="pln-mini">Your goal</span>
                    <h3 className="pln-h3">{goal.title}</h3>
                    <p className="pln-sub">{goal.target_date ? `Target ${shortDate(goal.target_date)} ${goal.target_date.slice(0, 4)} · ` : ""}Change goal</p>
                  </div>
                </Glass>
              )}
            </div>
          </section>
        )}

        {!hasAnything ? (
          <Glass radius="card">
            <EmptyState
              title="No schedule yet"
              body="Start one of Mike's plans, let us create one around your goal and time, or build your own week from the lessons you can open."
              illustration={<EmptyScene scene="plan-empty" size={220} />}
              action={
                <div className="pln-empty-actions">
                  <Button icon="sparkle" href="/plan/create">Create my plan</Button>
                  <Button variant="fill" href="/plan/new">Choose Mike's plan</Button>
                  <Button variant="plain" href="/plan?build=1">Build my own</Button>
                </div>
              }
            />
          </Glass>
        ) : (
          <>
            {/* 2 · Plan selector + guided schedule */}
            {selected && (
              <section className="pln-selector" aria-label="Plan settings">
                <nav className="pln-pills" aria-label="Plans">
                  {plans.map((pl) => (
                    <Link key={pl.id} href={`/plan?plan=${pl.id}`} scroll={false} className="pln-pill" aria-current={pl.id === selected.id ? "true" : undefined}>{pl.name}</Link>
                  ))}
                  <Link href="/plan/new" className="pln-pill pln-pill-new"><Icon name="plus" size="xs" /> New</Link>
                </nav>
                <GuidedPatterns key={selected.id} planId={selected.id} current={schedule.days[selected.id]} />
                <p className="pln-help">Pick a pace and the rest of <b>{selected.name}</b> re-flows from today, in order. Or move single days on the calendar.</p>
              </section>
            )}

            {/* 3 · Next session */}
            {nextSession && <NextSessionCard s={nextSession} today={today} now={n.now} snoozedUntil={n.prefs.snoozed_until} skipDate={n.prefs.skip_date} />}

            {/* 4 · Plan overview */}
            {selected && (
              <Glass as="section" radius="card" className="pln-overview" aria-labelledby="pln-ov-t">
                <Rings rings={[{ value: placed ? done / placed : 0, tone: 2 }]} size={96} stroke={11} label={`${done} of ${placed} sessions done`}>
                  <span className="pln-ring-n lq-num">{placed ? Math.round((done / placed) * 100) : 0}%</span>
                </Rings>
                <div className="pln-ov-main">
                  <span className="pln-eyebrow">Plan overview</span>
                  <h2 id="pln-ov-t" className="pln-h3 lq-num">{done} of {plural(placed, "session")} done</h2>
                  <p className="pln-sub">{selNext ? `Next up: ${title(selNext.title)} on ${new Date(`${selNext.on_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}.` : "Every session in this plan is behind you."}</p>
                </div>
                <div className="pln-ov-stats">
                  <div><b className="lq-num">{placed}</b><span>Placed</span></div>
                  <div><b className="lq-num">{done}</b><span>Done</span></div>
                  <div data-alert={missed.length ? "" : undefined}><b className="lq-num">{missed.length}</b><span>Missed</span></div>
                </div>
              </Glass>
            )}

            {/* 5 · Behind the plan */}
            {selected && missed.length > 0 && (
              <BehindBanner planId={selected.id} count={missed.length} rule={rule as Rule} missed={missed.map((m) => ({ title: title(m.title), date: m.on_date }))} />
            )}

            {/* 6 · Calendar + lessons tray */}
            <PlanBoard today={today} from={raw.from} to={raw.to} anchor={anchor} initialView={view} entries={raw.entries} plans={raw.plans} catalog={catalog} build={build} />

            {/* 7 · Upcoming */}
            {upcoming.length > 0 && (
              <section aria-labelledby="pln-up-t">
                <h2 id="pln-up-t" className="tpy-section-title">Upcoming</h2>
                <Glass radius="card" className="tpy-list">
                  {upcoming.slice(0, 6).map((i) => (
                    <Link key={i.id} href={lessonHref(i.program_slug, i.lesson_id)} className="tpy-row pln-uprow">
                      <span className="pln-update lq-num">{new Date(`${i.on_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
                      <span className="tpy-row-main">
                        <span className="lq-t15" style={{ fontWeight: 600 }}>{title(i.title)}</span>
                        <span className="lq-t13 lq-c2">{[i.program_name, plans.find((p) => p.id === i.plan_id)?.name].filter(Boolean).join(" · ")}</span>
                      </span>
                      <Icon name="chevron" size="sm" className="tpy-chev" />
                    </Link>
                  ))}
                </Glass>
              </section>
            )}

            {/* 8 · Reminders | If you miss a day */}
            <div className="ntf-grid">
              <RemindersCard prefs={n.prefs} timezone={n.timezone} today={today} now={n.now} />
              {selected ? (
                <MissedDayCard key={selected.id} planId={selected.id} planName={selected.name} rule={rule as Rule} />
              ) : (
                <Glass radius="card" className="ntf-card"><p className="pln-sub">Start a plan to choose what happens when you miss a day.</p></Glass>
              )}
            </div>

            {/* 9 · Calendar sync */}
            <Glass as="section" radius="card" className="ntf-card" aria-labelledby="pln-sync-t">
              <header className="ntf-head">
                <span className="ntf-ic" aria-hidden><Icon name="calendar" size="sm" /></span>
                <div>
                  <h2 id="pln-sync-t" className="ntf-title">Calendar sync</h2>
                  <p className="ntf-sub">Put your {plural(upcoming.length, "upcoming session")} into Apple Calendar, Google Calendar or Outlook.</p>
                </div>
              </header>
              <div className="pln-sync">
                <a href="/plan/calendar.ics" download className="lq-btn lq-fx lq-press" data-fx="" data-variant="fill" data-size="md">
                  <Icon name="down" size="sm" /><span>Add to Apple Calendar (.ics)</span>
                </a>
                {nextItem && (
                  <Button variant="fill" size="md" icon="calendar" href={googleUrl(nextItem, timeFor(n.prefs, dow(nextItem.on_date)), n.timezone, origin)} target="_blank" rel="noreferrer">
                    Add next session to Google
                  </Button>
                )}
              </div>
              <p className="ntf-foot">The .ics file works with Apple Calendar, Outlook and Google Calendar (Settings → Import). Sessions start at your reminder time{nextItem ? ` (${time12(timeFor(n.prefs, dow(nextItem.on_date)))} next)` : ""}. Download it again after you change your plan.</p>
            </Glass>

            <p className="pln-note"><Icon name="sparkle" size="xs" /> Every plan shares this calendar. Immersion keeps its own day order, so you can run a plan and Immersion side by side.</p>
          </>
        )}
      </div>
    </>
  );
}
