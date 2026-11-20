import Link from "next/link";
import { Button, Glass, Icon, ProgressBar } from "@/components/ui";
import type { LessonCatalog, PlanRaw } from "@/lib/loaders/today-plan-you";
import type { ScheduleData, ScheduleItem } from "@/lib/loaders/plan";
import type { NotificationsData } from "@/lib/loaders/notifications";
import { addDays, type IsoDate } from "@ms/core";
import { defaultDays, startOfWeek } from "@/components/today/dates";
import { lessonHref, plural, splitDayTitle } from "@/components/today/model";
import { PlanBoard } from "./PlanBoard";
import { ManagePlanActions } from "./ManagePlanActions";
import { WeekView } from "./WeekView";
import { PrefsAsk, PrefsChip } from "./WeekPrefs";
import { programColor } from "./programColor";
import { TrainingProfileEditor } from "@/components/profile/TrainingProfileEditor";
import type { TrainingProfile } from "@ms/api";
import { ConflictCard, MoreMenu, SubscribeRow, type Clash } from "./ScheduleParts";
import { BehindBanner, GuidedPatterns, MissedDayCard, RemindersCard, type Rule } from "./ScheduleControls";
import "./week.css";
import "@/components/today/tpy.css";
import "./pln.css";
import "./manage.css";

const SOURCE: Record<string, string> = { template: "Mike's plan", immersion_schedule: "Program schedule", custom: "Your own", ai: "Created for you" };

const title = (t: string) => {
  const { day, name } = splitDayTitle(t);
  return day ? `Day ${day} · ${name}` : name;
};
const weekday = (d: string, style: "long" | "short" = "long") => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: style, timeZone: "UTC" });
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Days (today on) with more than one open main session from different plans, newest-plan first to move. */
function findClashes(items: ScheduleItem[], plans: PlanRaw["plans"], today: string): Clash | null {
  const open = items.filter((i) => i.kind !== "rest" && !i.done && !i.skipped && !i.locked && i.on_date >= today);
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

const WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** This week in one plain sentence. */
function summary(items: ScheduleItem[], today: string, ws: string) {
  const we = addDays(ws, 6);
  const week = items.filter((i) => i.kind !== "rest" && !i.skipped && !i.locked && i.on_date >= ws && i.on_date <= we);
  if (!week.length) return null;
  const done = week.filter((i) => i.done).length;
  const left = week.filter((i) => !i.done && i.on_date >= today);
  const missed = week.filter((i) => !i.done && i.on_date < today).length;
  const n = week.length;
  if (done === n) return `All ${n} sessions done this week. Nice work.`;
  const nx = left[0];
  const when = nx ? (nx.on_date === today ? "next one is today" : `next one is ${WD_LONG[new Date(`${nx.on_date}T12:00:00Z`).getUTCDay()]}`) : "";
  return `${n} ${n === 1 ? "session" : "sessions"} this week, ${done} done${missed ? `, ${missed} missed` : ""}${when ? ` — ${when}` : ""}.`;
}

/**
 * Schedule — "Your week" (client note, Nov 20: one clear mental model). Header with this week in one sentence and
 * ONE primary button → your training days (from the training profile) → Self-Guided queues → the seven-day week.
 * Everything else (plan list, month view, build-your-own, pace, reminders, missed days, calendar sync) lives
 * behind "Manage plans" (?manage=1), still one tap away.
 */
export function PlanScreen({
  raw, catalog, schedule, n, anchor, view, build, selectedId, program, feedUrl, profile, manage = false, tab,
}: {
  raw: PlanRaw; catalog: LessonCatalog; schedule: ScheduleData; n: NotificationsData; anchor: string; view: "week" | "month"; build: boolean;
  selectedId?: string; origin?: string; program?: string | null; feedUrl: string; profile?: TrainingProfile | null; manage?: boolean; tab?: ManageTab;
}) {
  const today = raw.today;
  const plans = raw.plans;
  const items = program ? schedule.items.filter((i) => i.program_slug === program) : schedule.items;
  const queues = (schedule.queues ?? []).filter((q) => !program || q.program_slug === program);
  const open = (i: ScheduleItem) => i.kind !== "rest" && !i.done && !i.skipped && !i.locked;
  const todayItem = items.find((i) => open(i) && i.on_date === today) ?? null;
  const nextItem = items.filter((i) => open(i) && i.on_date >= today).sort((a, b) => a.on_date.localeCompare(b.on_date))[0] ?? null;
  const programs = [...new Map(schedule.items.filter((i) => i.program_slug).map((i) => [i.program_slug!, i.program_name ?? i.program_slug!])).entries()];
  const programName = program ? programs.find(([s]) => s === program)?.[1] ?? null : null;
  const weekStart = startOfWeek(anchor);
  const sentence = summary(items, today, weekStart);
  const prefDays = profile?.training_days?.length ? profile.training_days : profile?.days_per_week ? defaultDays(profile.days_per_week) : [];
  const minutes = profile?.session_minutes ?? null;
  const q0 = queues.find((q) => q.next && !q.locked) ?? null;
  const qs = (extra: Record<string, string>) => {
    const u = new URLSearchParams();
    if (program) u.set("program", program);
    for (const [k, v] of Object.entries(extra)) u.set(k, v);
    const t = u.toString();
    return t ? `/plan?${t}` : "/plan";
  };

  if (manage || build || view === "month") return <Manage {...{ raw, catalog, schedule, n, anchor, view, build, selectedId, program, feedUrl, profile, plans, today, tab }} />;

  const primary = todayItem ? (
    <Button icon="play" size="md" href={lessonHref(todayItem.program_slug, todayItem.lesson_id)}>Start today&apos;s session</Button>
  ) : q0?.next && !nextItem ? (
    <Button icon="play" size="md" href={lessonHref(q0.program_slug, q0.next.lesson_id)}>Do the next one</Button>
  ) : nextItem && nextItem.on_date <= addDays(weekStart, 6) ? (
    <Button icon="play" size="md" variant="secondary" href={lessonHref(nextItem.program_slug, nextItem.lesson_id)}>{`Next: ${weekday(nextItem.on_date)}`}</Button>
  ) : (
    <Button icon="plus" size="md" href="/plan/new">Plan my week</Button>
  );

  return (
    <div className="pln-page pln-calm wk-page">
      <header className="wk-head">
        <div className="wk-head-main">
          <h1 className="lq-d-lg pln-h1">{programName ? `Your week · ${programName}` : "Your week"}</h1>
          <p className="wk-sum">
            {sentence ?? (q0 ? `Nothing on the calendar this week. Your Self-Guided order is ready whenever you are.` : "Nothing planned yet. Pick a plan and we'll put it on your training days.")}
          </p>
        </div>
        <div className="wk-head-acts">
          {primary}
          <Link href={qs({ manage: "1" })} className="wk-manage">Manage plans</Link>
        </div>
      </header>

      {prefDays.length ? <PrefsChip days={prefDays} minutes={minutes} editHref="/plan?manage=1&tab=prefs" /> : <PrefsAsk />}

      {queues.map((q) => (
        <Link key={q.plan_id} href={q.locked && q.program_slug ? `/programs/${q.program_slug}/unlock` : q.next ? lessonHref(q.program_slug, q.next.lesson_id) : `/plan/${q.plan_id}`} className="wk-queue lq-press" data-locked={q.locked ? "" : undefined} style={{ ["--pc" as string]: programColor(q.program_slug) }}>
          <span className="wk-queue-main">
            <span className="wk-queue-t">Self-Guided order{q.program_name ? `, ${q.program_name}` : ""}</span>
            <span className="wk-queue-s">{q.locked ? <><Icon name="lock" size="xs" /> Locked · <span className="wk-unlock">Unlock</span></> : q.next ? <>Next is <b>{title(q.next.title)}</b>. No dates — do it whenever you&apos;re ready.</> : "All done."}</span>
          </span>
          <span className="wk-queue-n lq-num">{q.total - q.left}/{q.total}</span>
          <Icon name="chevron" size="sm" />
        </Link>
      ))}

      <WeekView
        items={items} today={today as IsoDate} start={weekStart as IsoDate} preferred={prefDays} minutes={minutes} hrefFor={(d) => qs(d === today ? {} : { d })}
        events={raw.entries.filter((e) => e.kind === "coaching" || e.kind === "run_session").map((e) => ({ on_date: e.on_date, kind: e.kind as "coaching" | "run_session", starts_at: e.starts_at }))}
        timezone={n.timezone}
      />
    </div>
  );
}

export type ManageTab = "plans" | "calendar" | "prefs" | "sync";
const TABS: { id: ManageTab; label: string }[] = [
  { id: "plans", label: "Plans" },
  { id: "calendar", label: "Calendar" },
  { id: "prefs", label: "Preferences" },
  { id: "sync", label: "Reminders & sync" },
];
const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Manage plans (client note, Nov 21: "too long — tabbed, easier to understand"). Four short tabs, URL-synced
 * (?manage=1&tab=plans|calendar|prefs|sync): your plans as cards · the month / build board (+ clash and catch-up
 * notices only when relevant) · training profile, how often and missed days · reminders and calendar sync.
 */
function Manage({
  raw, catalog, schedule, n, anchor, view, build, selectedId, program, feedUrl, profile, plans, today, tab,
}: {
  raw: PlanRaw; catalog: LessonCatalog; schedule: ScheduleData; n: NotificationsData; anchor: string; view: "week" | "month"; build: boolean;
  selectedId?: string; program?: string | null; feedUrl: string; profile?: TrainingProfile | null; plans: PlanRaw["plans"]; today: string; tab?: ManageTab;
}) {
  const open = (i: ScheduleItem) => i.kind !== "rest" && !i.done && !i.skipped && !i.locked;
  const active: ManageTab = tab ?? (build || view === "month" ? "calendar" : "plans");
  const clash = program ? null : findClashes(schedule.items, plans, today);
  const behind = plans
    .map((pl) => ({ pl, missed: schedule.items.filter((i) => i.plan_id === pl.id && open(i) && i.on_date < today) }))
    .find((x) => x.missed.length > 0 && (!program || x.missed.some((m) => m.program_slug === program)));
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0] ?? null;
  const rule = ((selected ? schedule.rules[selected.id] : "shift") ?? "shift") as Rule;
  const href = (t: ManageTab, extra: Record<string, string> = {}) => {
    const u = new URLSearchParams({ manage: "1", tab: t, ...extra });
    if (program) u.set("program", program);
    return `/plan?${u}`;
  };
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl.replace(/^https?:/, "webcal:"))}`;

  return (
    <div className="pln-page pln-calm wk-page mng-page">
      <header className="wk-head">
        <div className="wk-head-main">
          <Link href="/plan" className="wk-back"><Icon name="back" size="xs" /> Your week</Link>
          <h1 className="lq-d-lg pln-h1">Manage plans</h1>
          <p className="wk-sum">Your plans, calendar and preferences.</p>
        </div>
      </header>

      <nav className="mng-tabs" aria-label="Manage plans">
        {TABS.map((t) => (
          <Link key={t.id} href={href(t.id)} scroll={false} replace className="mng-tab" aria-current={t.id === active ? "page" : undefined}>{t.label}</Link>
        ))}
      </nav>

      {active === "plans" && (
        <section aria-label="Your plans" className="mng-sec">
          <div className="mng-row">
            <p className="mng-lede">{plans.length ? `You have ${plural(plans.length, "active plan")}.` : "No plans yet. Add one and we'll put it on your training days."}</p>
            <div className="mng-row-acts">
              <Button icon="plus" size="md" href="/plan/new">New plan</Button>
              <MoreMenu items={[{ label: "Create my plan", href: "/plan/create", icon: "sparkle" }, { label: "Build my own week", href: href("calendar", { build: "1" }), icon: "plan" }]} />
            </div>
          </div>
          <div className="mng-cards">
            {plans.map((pl) => {
              const c = raw.planCounts.find((x) => x.plan_id === pl.id);
              const mine = schedule.items.filter((i) => i.plan_id === pl.id);
              const prog = mine.find((i) => i.program_name);
              const nx = mine.find((i) => open(i) && i.on_date >= today);
              const undated = (pl.inputs as { undated?: boolean }).undated === true;
              const soon = mine.filter((i) => i.kind !== "rest" && i.on_date >= today && i.on_date < addDays(today, 14));
              const wd = [...new Set(soon.map((i) => new Date(`${i.on_date}T12:00:00Z`).getUTCDay()))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
              return (
                <article key={pl.id} className="mng-card" style={{ ["--pc" as string]: programColor(prog?.program_slug ?? null) }}>
                  <div className="mng-card-top">
                    <Link href={`/plan/${pl.id}`} className="mng-card-t">{pl.name}</Link>
                    <span className="mng-card-k">{undated ? "Self-Guided" : SOURCE[pl.source] ?? "Plan"}</span>
                  </div>
                  <dl className="mng-facts">
                    <div><dt>Program</dt><dd>{prog?.program_name ?? "Mixed"}</dd></div>
                    <div><dt>Days</dt><dd>{undated ? "Any day" : wd.length ? wd.map((d) => WD_SHORT[d]).join(", ") : "—"}</dd></div>
                    <div><dt>Next</dt><dd className="lq-num">{nx ? (undated ? title(nx.title) : `${dayLabel(nx.on_date)} · ${title(nx.title)}`) : "All done"}</dd></div>
                  </dl>
                  {c && c.total > 0 && (
                    <div className="mng-prog">
                      <ProgressBar value={c.done / c.total} label={`${pl.name} progress`} size="thin" />
                      <span className="lq-num">{c.done} of {plural(c.total, "session")} done</span>
                    </div>
                  )}
                  <ManagePlanActions planId={pl.id} name={pl.name} status={pl.status} />
                </article>
              );
            })}
          </div>
          {(raw.pausedPlans?.length ?? 0) > 0 && (
            <div className="mng-paused">
              <h2 className="mng-paused-h">Paused <span className="lq-num">· {raw.pausedPlans!.length}</span></h2>
              <p className="mng-lede">Off your calendar for now. Resume to put one back.</p>
              <div className="mng-cards">
                {raw.pausedPlans!.map((pl) => {
                  const c = raw.planCounts.find((x) => x.plan_id === pl.id);
                  return (
                    <article key={pl.id} className="mng-card" data-paused="">
                      <div className="mng-card-top">
                        <Link href={`/plan/${pl.id}`} className="mng-card-t">{pl.name}</Link>
                        <span className="mng-card-k">Paused</span>
                      </div>
                      {c && c.total > 0 && (
                        <div className="mng-prog">
                          <ProgressBar value={c.done / c.total} label={`${pl.name} progress`} size="thin" />
                          <span className="lq-num">{c.done} of {plural(c.total, "session")} done</span>
                        </div>
                      )}
                      <ManagePlanActions planId={pl.id} name={pl.name} status="paused" />
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {active === "calendar" && (
        <section aria-label="Calendar" className="mng-sec">
          {clash && <ConflictCard c={clash} />}
          {!clash && behind && (
            <BehindBanner planId={behind.pl.id} count={behind.missed.length} rule={(schedule.rules[behind.pl.id] ?? "shift") as Rule} missed={behind.missed.map((m) => ({ title: title(m.title), date: m.on_date }))} />
          )}
          <PlanBoard today={today as IsoDate} from={raw.from} to={raw.to} anchor={anchor} initialView={build ? view : "month"} entries={raw.entries} plans={raw.plans} catalog={catalog} build={build} program={program} />
          {!build && <p className="pln-help">Want to place sessions yourself? <Link href={href("calendar", { build: "1" })} className="lq-ink">Build my own week</Link></p>}
        </section>
      )}

      {active === "prefs" && (
        <section aria-label="Preferences" className="mng-sec pln-settings-body">
          {profile && (
            <Glass as="section" radius="card" className="ntf-card" aria-label="Training days" id="prefs">
              <TrainingProfileEditor initial={profile} title="Your training days and session length" />
            </Glass>
          )}
          {selected && (
            <Glass as="section" radius="card" className="ntf-card" aria-label="How often">
              <h2 className="ntf-title">How often</h2>
              {plans.length > 1 && (
                <nav className="pln-pills" aria-label="Plans">
                  {plans.map((pl) => (
                    <Link key={pl.id} href={href("prefs", { plan: pl.id })} scroll={false} replace className="pln-pill" aria-current={pl.id === selected.id ? "true" : undefined}>{pl.name}</Link>
                  ))}
                </nav>
              )}
              <GuidedPatterns key={selected.id} planId={selected.id} current={schedule.days[selected.id]} />
              <p className="pln-help">Pick how often, and the rest of <b>{selected.name}</b> moves to those days from today, in order.</p>
            </Glass>
          )}
          {selected && <MissedDayCard key={selected.id} planId={selected.id} planName={selected.name} rule={rule} />}
          {!profile && !selected && <p className="mng-lede">Add a plan first, then set how often you train here.</p>}
        </section>
      )}

      {active === "sync" && (
        <section aria-label="Reminders and sync" className="mng-sec pln-settings-body">
          <RemindersCard prefs={n.prefs} timezone={n.timezone} today={today} now={n.now} />
          <Glass as="section" radius="card" className="ntf-card" aria-labelledby="pln-sync-t">
            <header className="ntf-head">
              <span className="ntf-ic" aria-hidden><Icon name="calendar" size="sm" /></span>
              <div>
                <h2 id="pln-sync-t" className="ntf-title">Add to your calendar app</h2>
                <p className="ntf-sub">A private link that keeps Apple, Google or Outlook in step with your week. Don&apos;t share it.</p>
              </div>
            </header>
            <SubscribeRow url={feedUrl} />
            <div className="mng-row-acts">
              <Button size="sm" variant="secondary" href={google} target="_blank" rel="noreferrer">Add to Google Calendar</Button>
              <a href="/plan/calendar.ics" download className="lq-ink mng-dl">Download .ics file</a>
            </div>
          </Glass>
        </section>
      )}
    </div>
  );
}
