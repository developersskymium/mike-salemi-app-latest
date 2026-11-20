"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui";

export type PaceSession = { id: string; title: string; href: string; done: boolean };

/** Weekday patterns (0 = Monday) for k sessions a week: spread out, rest days in between. */
const PATTERN: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };

function schedule(count: number, perWeek: number, from: Date): Date[] {
  const days = PATTERN[perWeek] ?? PATTERN[3]!;
  const out: Date[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let guard = 0; out.length < count && guard < 800; guard++) {
    const wd = (d.getDay() + 6) % 7;
    if (days.includes(wd)) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const noop = () => () => {};
function readPace(key: string): number | null {
  try {
    const v = Number(window.localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short" });
const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * The planned self-guided path: pick how many sessions a week and the remaining lessons land on
 * real dates (no account write; the choice is remembered on this device). Shows the next sessions,
 * the finish date and a seven-day strip for this week.
 */
export function PacePlanner({ slug, sessions, perWeek: initial, options, minutes, unit, note }: {
  slug: string;
  sessions: PaceSession[];
  perWeek: number;
  options: number[];
  minutes?: number;
  unit: { one: string; many: string };
  note?: string;
}) {
  const key = `jy-pace:${slug}`;
  // Client-only values (today's date, the saved pace) without a hydration mismatch.
  const todayKey = useSyncExternalStore(noop, () => new Date().toDateString(), () => null);
  const stored = useSyncExternalStore(noop, () => readPace(key), () => null);
  const [picked, setPicked] = useState<number | null>(null);
  const today = useMemo(() => (todayKey ? new Date(todayKey) : null), [todayKey]);
  const perWeek = picked ?? (stored && options.includes(stored) ? stored : initial);
  const pick = (v: number) => {
    setPicked(v);
    try {
      window.localStorage.setItem(key, String(v));
    } catch {}
  };

  const left = sessions.filter((s) => !s.done);
  const dates = useMemo(() => (today ? schedule(left.length, perWeek, today) : []), [today, left.length, perWeek]);
  const finish = dates[dates.length - 1];
  const weeks = Math.max(1, Math.ceil(left.length / perWeek));
  const week = useMemo(() => {
    if (!today) return [];
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const on = (PATTERN[perWeek] ?? []).includes(i);
      return { d, on, isToday: d.toDateString() === today.toDateString(), past: d < new Date(today.getFullYear(), today.getMonth(), today.getDate()) };
    });
  }, [today, perWeek]);

  return (
    <section className="jy-pace" aria-labelledby={`jy-pace-${slug}`}>
      <div className="jy-pace-head">
        <p className="jy-eyebrow">Self-guided path</p>
        <h3 id={`jy-pace-${slug}`} className="jy-h3">Your pace</h3>
      </div>
      <div className="jy-pace-opts" role="radiogroup" aria-label={`${unit.many} per week`}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={perWeek === o} className="jy-pace-opt" onClick={() => pick(o)}>
            <b className="lq-num">{o}</b>
            <small>/ week</small>
          </button>
        ))}
      </div>
      <ol className="jy-pace-week" aria-label="This week">
        {week.map(({ d, on, isToday, past }) => (
          <li key={d.toISOString()} data-on={on ? "" : undefined} data-today={isToday ? "" : undefined} data-past={past ? "" : undefined}>
            <small>{fmtDay(d).slice(0, 1)}</small>
            <span className="lq-num">{d.getDate()}</span>
          </li>
        ))}
        {!today && Array.from({ length: 7 }, (_, i) => <li key={i} aria-hidden><small>&nbsp;</small><span>&nbsp;</span></li>)}
      </ol>
      {left.length ? (
        <>
          <p className="jy-pace-sum">
            <b className="lq-num">{left.length}</b> {left.length === 1 ? unit.one : unit.many} left · about <b className="lq-num">{weeks}</b> {weeks === 1 ? "week" : "weeks"}
            {finish && <> · finish around <b>{fmtDate(finish)}</b></>}
            {minutes ? <> · ~{minutes} min each</> : null}
          </p>
          <ol className="jy-pace-list">
            {left.slice(0, 4).map((s, i) => (
              <li key={s.id}>
                <Link href={s.href} className="jy-pace-row lq-press" prefetch={false}>
                  <span className="jy-pace-date">
                    {dates[i] ? <><small>{fmtDay(dates[i]!)}</small><b className="lq-num">{dates[i]!.getDate()}</b></> : <><small>&nbsp;</small><b>·</b></>}
                  </span>
                  <span className="jy-pace-t">{s.title}</span>
                  <Icon name="chevron" size="xs" className="jy-row-go" />
                </Link>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="jy-pace-sum"><Icon name="check" size="xs" /> Every {unit.one} is done. Revisit any of them below.</p>
      )}
      {note && <p className="jy-pace-note">{note}</p>}
    </section>
  );
}
