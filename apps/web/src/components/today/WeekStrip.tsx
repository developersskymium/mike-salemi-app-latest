import Link from "next/link";
import { Icon } from "@/components/ui";
import { dayLetter, dayNum, longDay } from "./dates";
import type { WeekDay } from "./buildToday";
import { plural } from "./model";
import { PROGRAM_MEDAL } from "@/components/badges/catalog";

/** Program colour dots for a day (one schedule, Home #4): planned program sessions + coaching (gold). */
function dotsOf(d: WeekDay): { key: string; color: string; label: string }[] {
  const out = new Map<string, { key: string; color: string; label: string }>();
  for (const e of d.entries) {
    if (e.kind === "coaching") out.set("coaching", { key: "coaching", color: "var(--gold)", label: "Coaching" });
    else if (e.kind === "run_session") out.set("run", { key: "run", color: "var(--accent)", label: "Live session" });
    else if (e.item_kind !== "rest" && !e.locked && e.program_slug) out.set(e.program_slug, { key: e.program_slug, color: PROGRAM_MEDAL[e.program_slug]?.color ?? "var(--text-3)", label: e.program_name ?? e.program_slug });
  }
  return [...out.values()].slice(0, 3);
}

function MiniRing({ p, tone }: { p: number; tone: "accent" | "label" }) {
  const r = 17;
  const len = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden className="lq-rings">
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--ring-1)" strokeOpacity=".16" strokeWidth="3.5" />
      {p > 0 && (
        <circle
          className="lq-arc"
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={tone === "accent" ? "var(--accent)" : "var(--label)"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - p)}
          transform="rotate(-90 20 20)"
          style={{ ["--len" as string]: len }}
        />
      )}
    </svg>
  );
}

function describe(d: WeekDay) {
  const n = d.entries.filter((e) => e.kind === "plan" && e.item_kind !== "rest" && !e.locked).length;
  const s = { rest: "rest day", done: "all done", partial: "partly done", missed: "missed", planned: plural(n, "session") }[d.state];
  return `${longDay(d.date)}${d.isToday ? ", today" : ""}: ${s}`;
}

/** Monday-to-Sunday strip: rings fill with the day's done sessions; today is Glacier; rest days show a moon. */
export function WeekStrip({ days, hrefFor, colors }: { days: WeekDay[]; hrefFor: (date: string) => string; /** Show program colour dots under each day. */ colors?: boolean }) {
  return (
    <div className="tpy-week" role="list">
      {days.map((d) => (
        <Link key={d.date} href={hrefFor(d.date)} role="listitem" aria-label={describe(d)} data-today={d.isToday ? "" : undefined} className="lq-press">
          <span className="tpy-wd" aria-hidden>{dayLetter(d.date)}</span>
          <span className="tpy-day" data-state={d.state} aria-hidden>
            {d.state !== "rest" && <MiniRing p={d.state === "done" ? 1 : d.progress} tone={d.isToday ? "accent" : "label"} />}
            {d.state === "rest" ? <Icon name="moon" size="xs" /> : <span>{dayNum(d.date)}</span>}
            {d.state === "missed" && <i className="tpy-missdot" />}
          </span>
          {colors && (
            <span className="tpy-pdots" aria-hidden>
              {dotsOf(d).map((x) => (
                <i key={x.key} style={{ background: x.color }} title={x.label} />
              ))}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
