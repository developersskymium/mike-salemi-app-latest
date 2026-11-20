import Link from "next/link";
import { Icon } from "@/components/ui";
import { addDays, type IsoDate } from "@ms/core";
import type { ScheduleItem } from "@/lib/loaders/plan";
import type { PlanRaw } from "@/lib/loaders/today-plan-you";
import { startOfWeek } from "@/components/today/dates";
import { lessonHref, splitDayTitle } from "@/components/today/model";
import { programColor } from "./programColor";
import "./progweeks.css";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Wed 30 Dec" / "30 Dec" / "Wed 30" (day first, like the rest of the schedule). */
const fmt = (d: string, o: { wd?: boolean; mon?: boolean; year?: boolean } = {}) => {
  const x = new Date(`${d}T12:00:00Z`);
  return [o.wd ? WD[x.getUTCDay()] : null, x.getUTCDate(), o.mon ? MON[x.getUTCMonth()] : null, o.year ? x.getUTCFullYear() : null].filter((v) => v != null).join(" ");
};
const range = (ws: string) => {
  const we = addDays(ws as IsoDate, 6);
  return ws.slice(5, 7) === we.slice(5, 7) ? `${fmt(ws)} – ${fmt(we, { mon: true })}` : `${fmt(ws, { mon: true })} – ${fmt(we, { mon: true })}`;
};
const name = (t: string) => {
  const { day, name: n } = splitDayTitle(t);
  return day ? `Day ${day} · ${n}` : n;
};

type State = "done" | "skipped" | "missed" | "next" | "upcoming" | "rest";

/**
 * "Whole program" (client, Nov 21: "it just shows a week"): one dated plan laid out from its first week to its
 * last, Week 1 … Week N with dates, each session's day and state (done, next, missed). Weeks already finished fold.
 */
export function ProgramWeeks({ items, plans, today, planId, hrefFor }: { items: ScheduleItem[]; plans: PlanRaw["plans"]; today: string; planId?: string; hrefFor: (planId: string) => string }) {
  const withItems = plans.filter((p) => items.some((i) => i.plan_id === p.id));
  if (!withItems.length) return null;
  const open = (i: ScheduleItem) => i.kind !== "rest" && !i.done && !i.skipped;
  // Default: the plan with the next open session, else the first.
  const nextOf = (pid: string) => items.filter((i) => i.plan_id === pid && open(i) && i.on_date >= today).sort((a, b) => a.on_date.localeCompare(b.on_date))[0] ?? null;
  const plan =
    withItems.find((p) => p.id === planId) ??
    [...withItems].sort((a, b) => (nextOf(a.id)?.on_date ?? "9999").localeCompare(nextOf(b.id)?.on_date ?? "9999"))[0]!;
  const mine = items.filter((i) => i.plan_id === plan.id).sort((a, b) => a.on_date.localeCompare(b.on_date));
  const next = nextOf(plan.id);
  const sessions = mine.filter((i) => i.kind !== "rest");
  const done = sessions.filter((i) => i.done).length;
  const first = mine[0]!.on_date;
  const last = mine[mine.length - 1]!.on_date;
  const w0 = startOfWeek(first as IsoDate);
  const weeks = new Map<string, ScheduleItem[]>();
  for (const i of mine) {
    const ws = startOfWeek(i.on_date as IsoDate);
    weeks.set(ws, [...(weeks.get(ws) ?? []), i]);
  }
  const nWeeks = Math.round((new Date(`${startOfWeek(last as IsoDate)}T12:00:00Z`).getTime() - new Date(`${w0}T12:00:00Z`).getTime()) / (7 * 86400000)) + 1;
  const thisWeek = startOfWeek(today as IsoDate);
  const state = (i: ScheduleItem): State =>
    i.kind === "rest" ? "rest" : i.done ? "done" : i.skipped ? "skipped" : i.id === next?.id ? "next" : i.on_date < today ? "missed" : "upcoming";
  const LABEL: Record<State, string> = { done: "Done", skipped: "Skipped", missed: "Missed", next: "Next", upcoming: "", rest: "Rest" };
  const slug = mine.find((i) => i.program_slug)?.program_slug ?? null;

  return (
    <section className="pw" aria-labelledby="pw-t" style={{ ["--pc" as string]: programColor(slug) }}>
      {withItems.length > 1 && (
        <nav className="pw-plans" aria-label="Plans">
          {withItems.map((p) => (
            <Link key={p.id} href={hrefFor(p.id) as never} scroll={false} replace className="pw-plan" aria-current={p.id === plan.id ? "true" : undefined}>{p.name}</Link>
          ))}
        </nav>
      )}
      <header className="pw-head">
        <h2 id="pw-t" className="pw-t">{plan.name}</h2>
        <p className="pw-sum lq-num">
          {sessions.length} sessions over {nWeeks} {nWeeks === 1 ? "week" : "weeks"}, {done} done. {fmt(first, { wd: true, mon: true })} to <b>{fmt(last, { wd: true, mon: true, year: last.slice(0, 4) !== today.slice(0, 4) })}</b>.
        </p>
        <Link href={`/plan/${plan.id}`} className="pw-edit">Edit this plan</Link>
      </header>

      <ol className="pw-weeks">
        {[...weeks].map(([ws, list]) => {
          const n = Math.round((new Date(`${ws}T12:00:00Z`).getTime() - new Date(`${w0}T12:00:00Z`).getTime()) / (7 * 86400000)) + 1;
          const real = list.filter((i) => i.kind !== "rest");
          const allDone = real.length > 0 && real.every((i) => i.done || i.skipped);
          const now = ws === thisWeek;
          const tag = now ? "This week" : allDone ? "Done" : ws < thisWeek ? `${real.filter((i) => i.done).length} of ${real.length} done` : `${real.length} ${real.length === 1 ? "session" : "sessions"}`;
          const body = (
            <ul className="pw-items">
              {list.map((i) => {
                const s = state(i);
                return (
                  <li key={i.id} className="pw-item" data-state={s}>
                    <span className="pw-day lq-num">{fmt(i.on_date, { wd: true })}</span>
                    {i.lesson_id ? (
                      <Link href={lessonHref(i.program_slug, i.lesson_id) as never} className="pw-name">{name(i.title)}</Link>
                    ) : (
                      <span className="pw-name">{name(i.title)}</span>
                    )}
                    <span className="pw-state">
                      {s === "done" && <Icon name="check" size="xs" />}
                      {LABEL[s]}
                    </span>
                  </li>
                );
              })}
            </ul>
          );
          const head = (
            <>
              <span className="pw-wn">Week {n}</span>
              <span className="pw-wr lq-num">{range(ws)}</span>
              <span className="pw-wt" data-now={now || undefined}>{tag}</span>
            </>
          );
          return (
            <li key={ws} className="pw-week" data-now={now || undefined} data-done={allDone || undefined}>
              {allDone && !now ? (
                <details>
                  <summary className="pw-wh">{head}</summary>
                  {body}
                </details>
              ) : (
                <>
                  <div className="pw-wh">{head}</div>
                  {body}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
