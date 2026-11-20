import Link from "next/link";
import { daysBetween } from "@ms/core";
import { DayGlyph } from "@/components/graphics";
import { AmbientBackdrop, Glass, Icon, IconButton, LargeTitle, ProgressBar, StatTile } from "@/components/ui";
import type { PlanDetail } from "@/lib/loaders/today-plan-you";
import { dayShort, dayNum, shortDate, startOfWeek } from "@/components/today/dates";
import { dayTypeOf, GOAL_PHOTO, lessonHref, plural, splitDayTitle } from "@/components/today/model";
import { PHOTOS } from "@/components/today/photos";
import { PlanActions } from "./PlanActions";
import "@/components/today/tpy.css";

const SOURCE: Record<string, string> = { template: "Mike's plan", immersion_schedule: "Immersion schedule", custom: "Your own plan", ai: "Suggested plan" };

export function PlanDetailScreen({ d }: { d: PlanDetail }) {
  const { plan, items, today } = d;
  const work = items.filter((i) => i.kind !== "rest");
  const done = work.filter((i) => i.done).length;
  const missed = work.filter((i) => i.on_date < today && !i.done && !i.skipped).length;
  const first = startOfWeek(plan.starts_on);
  const weeks = new Map<number, typeof items>();
  for (const i of items) {
    const w = Math.floor(daysBetween(first, i.on_date) / 7) + 1;
    weeks.set(w, [...(weeks.get(w) ?? []), i]);
  }
  const last = items[items.length - 1]?.on_date;
  const photo = PHOTOS[GOAL_PHOTO[d.goal?.kind ?? "custom"] ?? "coaching"];

  return (
    <>
      <AmbientBackdrop src={photo.src} position={photo.position} fixed />
      <div className="tpy-title">
        <LargeTitle
          title={plan.name}
          eyebrow={[SOURCE[plan.source] ?? "Plan", d.goal?.title].filter(Boolean).join(" · ")}
          leading={<IconButton icon="back" label="Back to plan" href="/plan" size="sm" />}
        />
      </div>
      <div className="tpy-you-grid">
        <Glass as="section" radius="card" className="tpy-pad" aria-label="Progress" style={{ display: "grid", gap: 14 }}>
          <div className="tpy-stats3">
            <StatTile value={done} unit={`/${work.length}`} label="Sessions done" />
            <StatTile value={weeks.size} unit=" weeks" label={last ? `Until ${shortDate(last)}` : "Length"} />
            <StatTile value={missed} label="Missed" />
          </div>
          <ProgressBar value={work.length ? done / work.length : 0} label="Plan progress" />
          {plan.overview && <p className="lq-t15 lq-c2">{plan.overview}</p>}
          <PlanActions planId={plan.id} status={plan.status} missed={missed} />
        </Glass>

        <div style={{ display: "grid", gap: 4 }}>
          {[...weeks.entries()].map(([w, list]) => (
            <section key={w} aria-labelledby={`w-${w}`}>
              <h2 id={`w-${w}`} className="tpy-section-title">Week {w}</h2>
              <Glass radius="card" className="tpy-list">
                {list.map((i) => {
                  const dt = dayTypeOf(null, i.title, i.kind);
                  const { day, name } = splitDayTitle(i.title);
                  const isMissed = i.on_date < today && !i.done && !i.skipped && i.kind !== "rest";
                  const isNow = i.on_date === today && !i.done;
                  return (
                    <Link key={i.id} href={lessonHref(i.program_slug, i.lesson_id)} className="tpy-row">
                      <span className="tpy-glyph" data-done={i.done ? "" : undefined} data-now={isNow ? "" : undefined} aria-hidden>
                        {i.done ? <Icon name="check" size="sm" /> : dt ? <DayGlyph type={dt} size={22} tone={isNow ? "accent" : "mono"} /> : <Icon name="kettlebell" size="sm" />}
                      </span>
                      <span className="tpy-row-main">
                        <span className="lq-t15" style={{ fontWeight: 600 }}>{day ? `Day ${day} · ${name}` : name}</span>
                        <span className="lq-t13 lq-c2">
                          {dayShort(i.on_date)} {dayNum(i.on_date)} · {i.done ? "Done" : i.skipped ? "Skipped" : isMissed ? "Missed" : isNow ? "Today" : i.program_name ?? (i.kind === "recovery" ? "Recovery" : "Training")}
                        </span>
                      </span>
                      <Icon name="chevron" size="sm" className="tpy-chev" />
                    </Link>
                  );
                })}
              </Glass>
            </section>
          ))}
          {!items.length && <p className="lq-t15 lq-c2" style={{ padding: 16 }}>{plural(0, "session")} in this plan yet.</p>}
        </div>
      </div>
    </>
  );
}
