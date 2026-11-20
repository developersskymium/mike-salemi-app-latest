import Link from "next/link";
import { EmptyScene } from "@/components/graphics";
import { Button, EmptyState, Glass, Icon, ProgressBar } from "@/components/ui";
import type { LessonCatalog, PlanRaw } from "@/lib/loaders/today-plan-you";
import type { ScheduleData, ScheduleItem } from "@/lib/loaders/plan";
import type { NotificationsData } from "@/lib/loaders/notifications";
import { addDays } from "@ms/core";
import { shortDate, startOfWeek } from "@/components/today/dates";
import { lessonHref, plural, splitDayTitle } from "@/components/today/model";
import { PlanBoard } from "./PlanBoard";
import { programColor } from "./programColor";
import { TrainingProfileEditor } from "@/components/profile/TrainingProfileEditor";
import type { TrainingProfile } from "@ms/api";
import { ConflictCard, MoreMenu, SubscribeRow, type Clash } from "./ScheduleParts";
import { BehindBanner, GuidedPatterns, MissedDayCard, RemindersCard, type Rule } from "./ScheduleControls";
import "@/components/today/tpy.css";
import "./pln.css";

const SOURCE: Record<string, string> = { template: "Mike's plan", immersion_schedule: "Program schedule", custom: "Your own", ai: "Created for you" };

const title = (t: string) => {
  const { day, name } = splitDayTitle(t);
  return day ? `Day ${day} · ${name}` : name;
};
const weekday = (d: string, style: "long" | "short" = "long") => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: style, timeZone: "UTC" });
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Days (today on) with more than one open main session from different plans, newest-plan first to move. */
function findClashes(items: ScheduleItem[], plans: PlanRaw["plans"], today: string): Clash | null {
  const open = items.filter((i) => i.kind !== "rest" && !i.done && !i.skipped && i.on_date >= today);
  const byDay = new Map<string, ScheduleItem[]>();
  for (const i of open) byDay.set(i.on_date, [...(byDay.get(i.on_date) ?? []), i]);
  const keep = new Set(plans.filter((p) => (p.inputs as { conflicts?: string }).conflicts === "keep").map((p) => p.id));
  const days = [...byDay].filter(([, l]) => new Set(l.map((x) => x.plan_id)).size > 1).sort(([a], [b]) => a.localeCompare(b));
  if (!days.length) return null;
  // Move the plan that started last (the one just added); the member's main rhythm stays put.
  const order = [...plans].sort((a, b) => (b.starts_on ?? "").localeCompare(a.starts_on ?? ""));
  for (const [date, list] of days) {
    const mover = order.find((p) => !keep.has(p.id) && list.some((x) => x.plan_id === p.id));
    if (!mover) continue;
    let free = addDays(date, 1);
    while (byDay.has(free) && free < addDays(date, 30)) free = addDays(free, 1);
    const item = list.find((x) => x.plan_id === mover.id)!;
    return {
      planId: mover.id, planName: mover.name, program: item.program_name, date, dateLabel: dayLabel(date),
      suggestion: free === addDays(date, 1) ? `${weekday(free)} (the next day)` : weekday(free), more: days.length - 1,
    };
  }
  return null;
}

/** Plan health in one sentence (spec 12 Plan #10). */
function health(items: ScheduleItem[], today: string) {
  const ws = startOfWeek(today);
  const we = addDays(ws, 6);
  const week = items.filter((i) => i.kind !== "rest" && !i.skipped && i.on_date >= ws && i.on_date <= we);
  const done = week.filter((i) => i.done).length;
  const missed = items.filter((i) => i.kind !== "rest" && !i.done && !i.skipped && i.on_date < today && i.on_date >= addDays(today, -14)).length;
  const left = week.filter((i) => !i.done && i.on_date >= today).length;
  if (!week.length) return "A light week — nothing planned. Add a session or enjoy the rest.";
  if (missed > 1) return `${done} of ${week.length} done this week, ${missed} sessions behind. One tap slides them forward.`;
  if (done === week.length) return `All ${week.length} sessions done this week. That's the rhythm.`;
  return `${done} of ${week.length} sessions done this week${left ? `, ${left} to go` : ""}${missed ? " — one to catch up" : " — on track"}.`;
}

/**
 * Schedule — the ONE schedule (spec 11 #1, spec 12 Plan). Every program's plan feeds this calendar, tagged by
 * program with a colour dot; program pages link here with ?program=<slug>. Calm layout: header with one primary
 * action → plan health → (one clash card) → week canvas → programs on your schedule → settings (folded).
 */
export function PlanScreen({
  raw, catalog, schedule, n, anchor, view, build, selectedId, program, feedUrl, profile,
}: {
  raw: PlanRaw; catalog: LessonCatalog; schedule: ScheduleData; n: NotificationsData; anchor: string; view: "week" | "month"; build: boolean;
  selectedId?: string; origin?: string; program?: string | null; feedUrl: string; profile?: TrainingProfile | null;
}) {
  const today = raw.today;
  const plans = raw.plans;
  const items = program ? schedule.items.filter((i) => i.program_slug === program) : schedule.items;
  const open = (i: ScheduleItem) => i.kind !== "rest" && !i.done && !i.skipped;
  const nextItem = items.filter((i) => open(i) && i.on_date >= today).sort((a, b) => a.on_date.localeCompare(b.on_date))[0] ?? null;
  const programs = [...new Map(schedule.items.filter((i) => i.program_slug).map((i) => [i.program_slug!, i.program_name ?? i.program_slug!])).entries()];
  const programName = program ? programs.find(([s]) => s === program)?.[1] ?? null : null;
  const clash = program ? null : findClashes(schedule.items, plans, today);
  const behind = plans
    .map((pl) => ({ pl, missed: schedule.items.filter((i) => i.plan_id === pl.id && open(i) && i.on_date < today) }))
    .find((x) => x.missed.length > 0 && (!program || x.missed.some((m) => m.program_slug === program)));
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0] ?? null;
  const rule = ((selected ? schedule.rules[selected.id] : "shift") ?? "shift") as Rule;
  const hasAnything = plans.length > 0 || raw.entries.length > 0 || build;
  const goal = raw.goals.find((g) => g.status === "active") ?? null;

  return (
    <div className="pln-page pln-calm">
      <header className="pln-head">
        <div className="pln-head-main">
          <p className="lq-eyebrow" data-tone="accent">{programName ? `Schedule · ${programName}` : goal ? `Schedule · ${goal.title}${goal.target_date ? ` by ${shortDate(goal.target_date)}` : ""}` : "Schedule"}</p>
          <h1 className="lq-d-lg pln-h1">Your week</h1>
          {hasAnything && <p className="pln-health">{health(items, today)}</p>}
        </div>
        <div className="pln-head-acts">
          {nextItem ? (
            <Button icon="play" size="md" href={lessonHref(nextItem.program_slug, nextItem.lesson_id)}>
              {nextItem.on_date === today ? "Start today's session" : `Next: ${weekday(nextItem.on_date, "short")}`}
            </Button>
          ) : (
            <Button icon="plus" size="md" href="/plan/new">Add a plan</Button>
          )}
          <MoreMenu
            items={[
              ...(nextItem ? [{ label: "Add a plan", href: "/plan/new", icon: "plus" as const }] : []),
              { label: "Create my plan", href: "/plan/create", icon: "sparkle" },
              { label: "Build my own week", href: "/plan?build=1", icon: "plan" },
              { label: "Reminders & calendar", href: "#pln-settings", icon: "bell" },
              { label: "Download .ics", href: "/plan/calendar.ics", icon: "down", download: true },
            ]}
          />
        </div>
      </header>

      {programs.length > 1 && (
        <nav className="pln-filter" aria-label="Filter by program">
          <Link href="/plan" scroll={false} className="pln-fchip" aria-current={!program ? "true" : undefined}>All</Link>
          {programs.map(([slug, name]) => (
            <Link key={slug} href={`/plan?program=${slug}`} scroll={false} className="pln-fchip" aria-current={program === slug ? "true" : undefined}>
              <i className="pln-dot" style={{ background: programColor(slug) }} aria-hidden /> {name}
            </Link>
          ))}
        </nav>
      )}

      {!hasAnything ? (
        <Glass radius="card">
          <EmptyState
            title="No schedule yet"
            body="Pick one of Mike's plans, let us build one around your goal, or place lessons on your own week."
            illustration={<EmptyScene scene="plan-empty" size={200} />}
            action={
              <div className="pln-empty-actions">
                <Button icon="plus" href="/plan/new">Add a plan</Button>
                <Button variant="plain" href="/plan?build=1">Build my own</Button>
              </div>
            }
          />
        </Glass>
      ) : (
        <>
          {clash && <ConflictCard c={clash} />}
          {!clash && behind && (
            <BehindBanner
              planId={behind.pl.id}
              count={behind.missed.length}
              rule={(schedule.rules[behind.pl.id] ?? "shift") as Rule}
              missed={behind.missed.map((m) => ({ title: title(m.title), date: m.on_date }))}
            />
          )}

          <PlanBoard today={today} from={raw.from} to={raw.to} anchor={anchor} initialView={view} entries={raw.entries} plans={raw.plans} catalog={catalog} build={build} program={program} />

          {plans.length > 0 && (
            <section aria-labelledby="pln-plans-t" className="pln-onsched">
              <h2 id="pln-plans-t" className="pln-h2s">On your schedule</h2>
              <Glass radius="card" className="pln-planlist">
                {plans.map((pl) => {
                  const c = raw.planCounts.find((x) => x.plan_id === pl.id);
                  const slug = schedule.items.find((i) => i.plan_id === pl.id && i.program_slug)?.program_slug ?? null;
                  const nx = schedule.items.find((i) => i.plan_id === pl.id && open(i) && i.on_date >= today);
                  return (
                    <Link key={pl.id} href={`/plan/${pl.id}`} className="pln-planrow">
                      <i className="pln-dot pln-dot-lg" style={{ background: programColor(slug) }} aria-hidden />
                      <span className="pln-planrow-main">
                        <span className="pln-planrow-t">{pl.name}</span>
                        <span className="pln-sub lq-num">
                          {SOURCE[pl.source] ?? "Plan"}
                          {c ? ` · ${c.done}/${plural(c.total, "session")}` : ""}
                          {nx ? ` · next ${dayLabel(nx.on_date)}` : " · all done"}
                        </span>
                      </span>
                      {c && c.total > 0 && <ProgressBar value={c.done / c.total} label={`${pl.name} progress`} size="thin" className="pln-planrow-bar" />}
                      <Icon name="chevron" size="sm" className="tpy-chev" />
                    </Link>
                  );
                })}
              </Glass>
            </section>
          )}

          <details className="pln-settings" id="pln-settings">
            <summary className="lq-press">
              <span className="pln-settings-ic" aria-hidden><Icon name="settings" size="sm" /></span>
              <span>
                <b>Schedule settings</b>
                <small>Pace, training days, reminder time, missed days, calendar sync</small>
              </span>
              <Icon name="chevronDown" size="sm" className="pln-settings-chev" />
            </summary>
            <div className="pln-settings-body">
              {selected && (
                <Glass as="section" radius="card" className="ntf-card" aria-label="Pace">
                  {plans.length > 1 && (
                    <nav className="pln-pills" aria-label="Plans">
                      {plans.map((pl) => (
                        <Link key={pl.id} href={`/plan?plan=${pl.id}#pln-settings`} scroll={false} className="pln-pill" aria-current={pl.id === selected.id ? "true" : undefined}>{pl.name}</Link>
                      ))}
                    </nav>
                  )}
                  <GuidedPatterns key={selected.id} planId={selected.id} current={schedule.days[selected.id]} />
                  <p className="pln-help">Pick a pace and the rest of <b>{selected.name}</b> re-flows from today, in order.</p>
                </Glass>
              )}
              {profile && (
                <Glass as="section" radius="card" className="ntf-card" aria-label="Training profile">
                  <TrainingProfileEditor initial={profile} title="Your training profile" />
                </Glass>
              )}
              <div className="ntf-grid">
                <RemindersCard prefs={n.prefs} timezone={n.timezone} today={today} now={n.now} />
                {selected && <MissedDayCard key={selected.id} planId={selected.id} planName={selected.name} rule={rule} />}
              </div>
              <Glass as="section" radius="card" className="ntf-card" aria-labelledby="pln-sync-t">
                <header className="ntf-head">
                  <span className="ntf-ic" aria-hidden><Icon name="calendar" size="sm" /></span>
                  <div>
                    <h2 id="pln-sync-t" className="ntf-title">Subscribe in your calendar</h2>
                    <p className="ntf-sub">A private link that keeps Apple, Google or Outlook in step with this schedule. Don&apos;t share it.</p>
                  </div>
                </header>
                <SubscribeRow url={feedUrl} />
              </Glass>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
