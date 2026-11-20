"use client";

import { useMemo, useState } from "react";
import type { PassportStats } from "@ms/api";
import { Button, Glass, StatTile } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import type { SessionPlan } from "@/lib/loaders/you";
import { fmtDay, fmtDayYear, fmtMinutes } from "./format";

const DAY_MS = 864e5;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
/** Minutes drive the charts once most active days have a logged session; until then, steps / active days do. */
const minutesLead = (s: PassportStats) => s.heatmap.length > 0 && s.heatmap.filter((h) => h.minutes > 0).length >= s.heatmap.length / 2;
const mondayOf = (d: string) => {
  const t = Date.parse(`${d}T00:00:00Z`);
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return t - dow * DAY_MS;
};

type Cell = { date: string; minutes: number; sessions: number; steps: number; level: 0 | 1 | 2 | 3 | 4; future: boolean };

/** Calendar heat map: weeks as columns, Monday first; intensity by minutes (or steps when no minutes are logged). */
function useHeat(stats: PassportStats, weeks: number) {
  return useMemo(() => {
    const by = new Map(stats.heatmap.map((h) => [h.date, h]));
    const useMinutes = minutesLead(stats);
    const end = mondayOf(stats.today) + 6 * DAY_MS;
    const start = end - (weeks * 7 - 1) * DAY_MS;
    const vals = stats.heatmap.map((h) => (useMinutes ? h.minutes : h.steps)).filter((v) => v > 0).sort((a, b) => a - b);
    const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] ?? 1;
    const cuts = [q(0.25), q(0.5), q(0.8)];
    const cols: Cell[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: Cell[] = [];
      for (let d = 0; d < 7; d++) {
        const t = start + (w * 7 + d) * DAY_MS;
        const date = iso(t);
        const h = by.get(date);
        const v = h ? (useMinutes ? h.minutes || (h.steps ? 1 : 0) : h.steps + Math.round(h.minutes / 5)) : 0;
        const level = (!v ? 0 : v <= cuts[0]! ? 1 : v <= cuts[1]! ? 2 : v <= cuts[2]! ? 3 : 4) as Cell["level"];
        col.push({ date, minutes: h?.minutes ?? 0, sessions: h?.sessions ?? 0, steps: h?.steps ?? 0, level, future: date > stats.today });
      }
      cols.push(col);
    }
    return { cols, useMinutes };
  }, [stats, weeks]);
}

function Heatmap({ stats }: { stats: PassportStats }) {
  const [weeks] = useState(26);
  const { cols, useMinutes } = useHeat(stats, weeks);
  const [hover, setHover] = useState<Cell | null>(null);
  const months: { i: number; label: string }[] = [];
  cols.forEach((c, i) => {
    const m = c[0]!.date.slice(5, 7);
    if (i === 0 || cols[i - 1]![0]!.date.slice(5, 7) !== m) months.push({ i, label: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(c[0]!.date)) });
  });
  const tip = (c: Cell) =>
    c.future
      ? fmtDay(c.date)
      : `${fmtDayYear(c.date)} · ${c.minutes ? fmtMinutes(c.minutes) : c.steps ? `${c.steps} ${c.steps === 1 ? "step" : "steps"}` : "Rest"}${c.sessions > 1 ? ` · ${c.sessions} sessions` : ""}`;
  return (
    <div className="yu-heat-wrap">
      <div className="yu-heat-scroll">
        <div className="yu-heat" style={{ ["--weeks" as string]: weeks }} role="grid" aria-label={`Training days, last ${weeks} weeks`}>
          <div className="yu-heat-months" aria-hidden>
            {months.map((m) => (
              <span key={m.i} style={{ gridColumn: m.i + 2 }}>{m.label}</span>
            ))}
          </div>
          <div className="yu-heat-days" aria-hidden>
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
            <span />
          </div>
          {cols.map((col, w) => (
            <div key={w} className="yu-heat-col" role="row">
              {col.map((c) => (
                <span
                  key={c.date}
                  role="gridcell"
                  tabIndex={c.level ? 0 : -1}
                  className="yu-heat-cell"
                  data-l={c.level}
                  data-future={c.future ? "" : undefined}
                  data-today={c.date === stats.today ? "" : undefined}
                  aria-label={tip(c)}
                  onPointerEnter={() => setHover(c)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(c)}
                  onBlur={() => setHover(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="yu-heat-foot">
        <span className="lq-t13 lq-c2" aria-live="polite">{hover ? tip(hover) : `${stats.heatmap.length} active ${stats.heatmap.length === 1 ? "day" : "days"} · intensity by ${useMinutes ? "minutes trained" : "steps and minutes"}`}</span>
        <span className="yu-heat-legend" aria-hidden>
          Less {[0, 1, 2, 3, 4].map((l) => <i key={l} className="yu-heat-cell" data-l={l} />)} More
        </span>
      </div>
    </div>
  );
}

/** Last 8 weeks of minutes (or active days when no minutes are logged), one bar per week. */
function WeeklyBars({ stats }: { stats: PassportStats }) {
  const weeks = useMemo(() => {
    const thisMon = mondayOf(stats.today);
    const useMinutes = minutesLead(stats);
    return Array.from({ length: 8 }, (_, i) => {
      const s = thisMon - (7 - i) * 7 * DAY_MS;
      const e = s + 7 * DAY_MS;
      const days = stats.heatmap.filter((h) => {
        const t = Date.parse(`${h.date}T00:00:00Z`);
        return t >= s && t < e;
      });
      return { start: iso(s), value: useMinutes ? days.reduce((n, d) => n + d.minutes, 0) : days.length, unit: useMinutes ? "min" : "days", current: i === 7 };
    });
  }, [stats]);
  const max = Math.max(1, ...weeks.map((w) => w.value));
  const [hover, setHover] = useState<number | null>(null);
  const h = hover !== null ? weeks[hover]! : null;
  return (
    <div className="yu-bars-wrap">
      <div className="yu-bars-head">
        <span className="lq-t15" style={{ fontWeight: 600 }}>Weekly volume</span>
        <span className="lq-t13 lq-c2 lq-num">{h ? `Week of ${fmtDay(h.start)} · ${h.value} ${h.unit}` : `Last 8 weeks · ${weeks[0]!.unit === "min" ? "minutes" : "active days"}`}</span>
      </div>
      <div className="yu-bars" role="list">
        {weeks.map((w, i) => (
          <button
            type="button"
            key={w.start}
            role="listitem"
            className="yu-bar"
            data-current={w.current ? "" : undefined}
            aria-label={`Week of ${fmtDay(w.start)}: ${w.value} ${w.unit}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <i style={{ height: `${Math.max(w.value ? 6 : 2, (w.value / max) * 100)}%` }} />
            <small className="lq-num">{fmtDay(w.start).split(" ")[0]}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Readiness over the last checks: a 2px line with dots (lower score = more ready), latest labelled. */
function ReadinessTrend({ points }: { points: PassportStats["readiness"] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return (
    <div className="yu-trend-empty lq-t13 lq-c2">Your readiness check before each workout day builds a trend here.</div>
  );
  const W = 300, H = 84, P = 10;
  const max = Math.max(60, ...points.map((p) => p.score));
  const x = (i: number) => (points.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (points.length - 1));
  const y = (s: number) => P + (s / max) * (H - 2 * P); // lower score = higher on the chart (more ready)
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(" ");
  const last = points[points.length - 1]!;
  const h = hover !== null ? points[hover]! : null;
  return (
    <div className="yu-trend">
      <div className="yu-bars-head">
        <span className="lq-t15" style={{ fontWeight: 600 }}>Readiness trend</span>
        <span className="lq-t13 lq-c2 lq-num">{h ? `${fmtDay(h.at)} · ${h.band_name} · ${h.score}` : `Latest: ${last.band_name}`}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="yu-trend-svg" role="img" aria-label={`Readiness, last ${points.length} checks. Latest ${last.band_name}, score ${last.score}.`}>
        <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} className="yu-trend-base" />
        <text x={W - P} y={y(0) + 14} textAnchor="end" className="yu-trend-axis">Ready</text>
        <path d={d} className="yu-trend-line" />
        {points.map((p, i) => (
          <g key={p.at} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <circle cx={x(i)} cy={y(p.score)} r={14} className="yu-trend-hit" />
            <circle cx={x(i)} cy={y(p.score)} r={i === points.length - 1 ? 5 : 4} className="yu-trend-dot" data-band={p.band} data-on={hover === i ? "" : undefined} />
          </g>
        ))}
      </svg>
    </div>
  );
}

function exportCsv(stats: PassportStats, plans: SessionPlan[]) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const byDay = new Map(plans.map((p) => [p.created_at.slice(0, 10), p]));
  const lines = [["Date", "Minutes", "Sessions", "Steps", "Readiness", "Band", "Session"].map(q).join(",")];
  for (const h of stats.heatmap) {
    const p = byDay.get(h.date);
    lines.push([h.date, h.minutes, h.sessions, h.steps, p?.score ?? "", p?.band_name ?? "", p?.lesson_title ?? ""].map(q).join(","));
  }
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `training-history-${stats.today}.csv`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** History › Training insights: totals, calendar heat map, weekly volume, readiness trend, CSV export. */
export function TrainingInsights({ stats, plans, source }: { stats: PassportStats; plans: SessionPlan[]; source: "sessions" | "steps" }) {
  const avg = stats.sessions ? Math.round(stats.minutes / stats.sessions) : 0;
  const empty = !stats.heatmap.length;
  return (
    <Glass radius="card" className="yu-card yu-insights">
      <div className="yu-stats4">
        <StatTile value={stats.sessions} label="Sessions logged" />
        <StatTile value={stats.minutes >= 120 ? Math.round((stats.minutes / 60) * 10) / 10 : stats.minutes} unit={stats.minutes >= 120 ? " h" : " min"} label="Time trained" />
        <StatTile value={avg} unit=" min" label="Avg session" />
        <StatTile value={stats.heatmap.length} label="Active days" />
      </div>
      {empty ? (
        <p className="lq-t15 lq-c2 yu-insights-empty">No training data yet. Finish a day or a quick session and your passport starts filling in.</p>
      ) : (
        <>
          <Heatmap stats={stats} />
          <div className="yu-insights-row">
            <WeeklyBars stats={stats} />
            <ReadinessTrend points={stats.readiness} />
          </div>
        </>
      )}
      <div className="yu-insights-foot">
        <span className="lq-t13 lq-c2">
          {source === "steps" ? "Minutes appear as sessions are logged." : `This week: ${fmtMinutes(stats.week.minutes)} across ${stats.week.sessions} ${stats.week.sessions === 1 ? "session" : "sessions"}.`}
        </span>
        <Button
          size="sm"
          variant="glass"
          icon="down"
          disabled={empty}
          onClick={() => {
            haptic(8);
            exportCsv(stats, plans);
          }}
        >
          Export history CSV
        </Button>
      </div>
    </Glass>
  );
}
