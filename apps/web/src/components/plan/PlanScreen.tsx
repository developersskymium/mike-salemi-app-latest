import Link from "next/link";
import { EmptyScene } from "@/components/graphics";
import { UserButton } from "@/components/shell/ShellUser";
import { AmbientBackdrop, Button, EmptyState, Glass, Icon, LargeTitle, ProgressBar } from "@/components/ui";
import type { LessonCatalog, PlanRaw } from "@/lib/loaders/today-plan-you";
import { shortDate } from "@/components/today/dates";
import { GOAL_ICON, GOAL_PHOTO, plural } from "@/components/today/model";
import { PHOTOS } from "@/components/today/photos";
import { PlanBoard } from "./PlanBoard";
import "@/components/today/tpy.css";

const SOURCE: Record<string, string> = { template: "Mike's plan", immersion_schedule: "Immersion schedule", custom: "Your own", ai: "Suggested" };

export function PlanScreen({ raw, catalog, anchor, view, build }: { raw: PlanRaw; catalog: LessonCatalog; anchor: string; view: "week" | "month"; build: boolean }) {
  const goal = raw.goals.find((g) => g.status === "active") ?? null;
  const backdrop = PHOTOS[GOAL_PHOTO[goal?.kind ?? "custom"] ?? "coaching"];
  const hasAnything = raw.plans.length > 0 || raw.entries.length > 0;
  return (
    <>
      <AmbientBackdrop src={backdrop.src} position={backdrop.position} fixed />
      <div className="tpy-title">
        <LargeTitle
          title="Plan"
          eyebrow={goal ? `${goal.title}${goal.target_date ? ` · by ${shortDate(goal.target_date)}` : ""}` : "Your training calendar"}
          trailing={
            <>
              <a href="/plan/calendar.ics" download className="lq-iconbtn lq-glass lq-fx lq-press" data-fx="" aria-label="Export to calendar" title="Export to calendar">
                <Icon name="calendar" />
              </a>
              <span className="tpy-desk"><Button size="md" variant="glass" icon="plus" href="/plan/new">New plan</Button></span>
              <span className="tpy-phone"><UserButton /></span>
            </>
          }
        />
      </div>

      {hasAnything ? (
        <PlanBoard
          today={raw.today}
          from={raw.from}
          to={raw.to}
          anchor={anchor}
          initialView={view}
          entries={raw.entries}
          plans={raw.plans}
          catalog={catalog}
          build={build}
        />
      ) : (
        <Glass radius="card">
          <EmptyState
            title="Nothing planned yet"
            body="Start one of Mike's plans or build your own week from the lessons you can open."
            illustration={<EmptyScene scene="plan-empty" size={220} />}
            action={<Button icon="sparkle" href="/plan/new">Choose a plan</Button>}
          />
        </Glass>
      )}

      <div className="tpy-you-grid" style={{ marginTop: 20 }}>
        <section aria-labelledby="plans-t">
          <h2 id="plans-t" className="tpy-section-title">Goals and plans</h2>
          <Glass radius="card" className="tpy-list">
            {goal && (
              <Link className="tpy-row" href="/onboarding">
                <span className="tpy-row-icon" aria-hidden><Icon name={GOAL_ICON[goal.kind] ?? "sparkle"} size="sm" /></span>
                <span className="tpy-row-main">
                  <span className="lq-t15" style={{ fontWeight: 600 }}>{goal.title}</span>
                  <span className="lq-t13 lq-c2">Goal{goal.target_date ? ` · target ${shortDate(goal.target_date)} ${goal.target_date.slice(0, 4)}` : ""} · change</span>
                </span>
                <Icon name="chevron" size="sm" className="tpy-chev" />
              </Link>
            )}
            {raw.plans.map((pl) => {
              const c = raw.planCounts.find((x) => x.plan_id === pl.id);
              return (
                <Link key={pl.id} className="tpy-row" href={`/plan/${pl.id}`}>
                  <span className="tpy-row-icon" aria-hidden><Icon name="plan" size="sm" /></span>
                  <span className="tpy-row-main">
                    <span className="lq-t15" style={{ fontWeight: 600 }}>{pl.name}</span>
                    <span className="lq-t13 lq-c2 lq-num">{SOURCE[pl.source] ?? "Plan"}{c ? ` · ${c.done} of ${plural(c.total, "session")}` : ""}</span>
                    {c && c.total > 0 && <ProgressBar value={c.done / c.total} label={`${pl.name} progress`} style={{ marginTop: 6 }} />}
                  </span>
                  <Icon name="chevron" size="sm" className="tpy-chev" />
                </Link>
              );
            })}
            <Link className="tpy-row" href="/plan/new">
              <span className="tpy-row-icon" aria-hidden><Icon name="plus" size="sm" /></span>
              <span className="tpy-row-main"><span className="lq-t15">Start a new plan</span></span>
              <Icon name="chevron" size="sm" className="tpy-chev" />
            </Link>
          </Glass>
        </section>
        <section aria-labelledby="more-t">
          <h2 id="more-t" className="tpy-section-title">Stay on track</h2>
          <Glass radius="card" className="tpy-list">
            <Link className="tpy-row" href="/you/settings#reminders">
              <span className="tpy-row-icon" aria-hidden><Icon name="bell" size="sm" /></span>
              <span className="tpy-row-main"><span className="lq-t15">Reminders</span><span className="lq-t13 lq-c2">Days and time we nudge you</span></span>
              <Icon name="chevron" size="sm" className="tpy-chev" />
            </Link>
            <a className="tpy-row" href="/plan/calendar.ics" download>
              <span className="tpy-row-icon" aria-hidden><Icon name="calendar" size="sm" /></span>
              <span className="tpy-row-main"><span className="lq-t15">Add to your calendar</span><span className="lq-t13 lq-c2">Download an .ics file of the next 13 weeks</span></span>
              <Icon name="down" size="sm" className="tpy-chev" />
            </a>
          </Glass>
        </section>
      </div>
    </>
  );
}
