import Link from "next/link";
import { addDays, weekday, type IsoDate } from "@ms/core";
import { Icon } from "@/components/ui";
import type { ScheduleItem } from "@/lib/loaders/plan";
import { dayNum, dayShort, weekDates, weekRange } from "@/components/today/dates";
import { lessonHref, splitDayTitle } from "@/components/today/model";
import { programColor } from "./programColor";

const cardTitle = (t: string) => {
  const { day, name } = splitDayTitle(t);
  return day ? `Day ${day} · ${name}` : name;
};

/**
 * "Your week" — seven days, Monday first. Columns on desktop, a list on phones. Each day shows its sessions as
 * compact cards (program colour, title, minutes) or "Rest". Preferred training days carry a marker; the other
 * days are visually quiet.
 */
export function WeekView({
  items, today, start, preferred, minutes, hrefFor,
}: {
  items: ScheduleItem[];
  today: IsoDate;
  start: IsoDate;
  preferred: number[];
  minutes?: number | null;
  hrefFor: (d: IsoDate) => string;
}) {
  const days = weekDates(start);
  const thisWeek = start <= today && today <= addDays(start, 6);
  const label = thisWeek ? "This week" : start > today ? (addDays(start, -7) <= today ? "Next week" : weekRange(start)) : addDays(start, 7) > today ? "Last week" : weekRange(start);
  return (
    <section className="wk" aria-labelledby="wk-label">
      <nav className="wk-nav" aria-label="Change week">
        <Link className="wk-arrow lq-press" href={hrefFor(addDays(start, -7))} scroll={false} aria-label="Previous week"><Icon name="back" size="sm" /></Link>
        <h2 id="wk-label" className="wk-label">
          {label} <span className="wk-range lq-num">{weekRange(start)}</span>
        </h2>
        <Link className="wk-arrow lq-press" href={hrefFor(addDays(start, 7))} scroll={false} aria-label="Next week"><Icon name="chevron" size="sm" /></Link>
        {!thisWeek && <Link className="wk-today" href={hrefFor(today)} scroll={false}>Back to this week</Link>}
      </nav>
      <ol className="wk-days">
        {days.map((d) => {
          const list = items.filter((i) => i.on_date === d && i.kind !== "rest");
          const pref = preferred.includes(weekday(d));
          const isToday = d === today;
          const past = d < today;
          return (
            <li key={d} className="wk-day" data-pref={pref ? "" : undefined} data-today={isToday ? "" : undefined} data-past={past ? "" : undefined}>
              <div className="wk-dh">
                <span className="wk-dname">{isToday ? "Today" : dayShort(d)}</span>
                <span className="wk-dnum lq-num">{dayNum(d)}</span>
                {pref && <span className="wk-pref" title="One of your training days"><i aria-hidden /> <span className="lq-sr">Training day</span></span>}
              </div>
              <div className="wk-items">
                {list.length ? (
                  list.map((i) => (
                    <Link key={i.id} href={lessonHref(i.program_slug, i.lesson_id)} className="wk-card" data-done={i.done ? "" : undefined} data-skipped={i.skipped ? "" : undefined} data-missed={past && !i.done && !i.skipped ? "" : undefined} style={{ ["--pc" as string]: programColor(i.program_slug) }}>
                      <span className="wk-ct">{cardTitle(i.title)}</span>
                      <span className="wk-cm lq-num">
                        {i.done ? <><Icon name="check" size="xs" /> Done</> : i.skipped ? "Skipped" : past ? "Missed" : `${i.minutes ?? minutes ?? 30} min`}
                        {i.program_name ? <span className="wk-cp"> · {i.program_name}</span> : null}
                      </span>
                    </Link>
                  ))
                ) : (
                  <span className="wk-rest">{pref && !past ? "Free training day" : "Rest"}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
