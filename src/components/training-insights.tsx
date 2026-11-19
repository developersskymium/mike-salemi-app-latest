import { useMemo } from "react";
import { Activity, Dumbbell, Gauge, Timer } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui-kit";
import type { WorkoutTableRow } from "@/lib/achievements.functions";
import { dayLabel, findDay } from "@/content/program";
import { cn } from "@/lib/utils";

/**
 * Training insights — progressive overload read from saved workout tables.
 *
 * Every saved session carries the bell weight, readiness and time the athlete
 * chose that day. Charted over time this is the clearest signal that the
 * program is working, so it lives on the profile next to the raw history.
 */

const LOAD_SCORE: Record<string, number> = { light: 1, moderate: 2, heavy: 3 };
const LOAD_LABEL: Record<string, string> = { light: "Light", moderate: "Moderate", heavy: "Heavy" };
const READINESS_SCORE: Record<string, number> = { low: 1, ok: 2, high: 3 };
const READINESS_LABEL: Record<string, string> = { low: "Flat", ok: "Steady", high: "Sharp" };

type Point = { label: string; load: number; readiness: number; minutes: number; date: string };

function weekKey(d: Date) {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function TrainingInsights({
  rows,
  loading,
}: {
  rows: WorkoutTableRow[] | undefined;
  loading?: boolean;
}) {
  const data = useMemo(() => {
    const sessions = [...(rows ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const points: Point[] = sessions.map((row) => {
      const answers = (row.answers ?? {}) as Record<string, string>;
      const location = findDay(row.day_id);
      return {
        label: location ? `${dayLabel(location.day)}` : "Session",
        load: LOAD_SCORE[answers.bell] ?? 2,
        readiness: READINESS_SCORE[answers.readiness] ?? 2,
        minutes: Number(answers.time ?? 35) || 35,
        date: row.created_at,
      };
    });

    // Last 8 weeks of volume, oldest first.
    const weeks: { start: Date; sessions: number; minutes: number }[] = [];
    const thisMonday = weekKey(new Date());
    for (let i = 7; i >= 0; i -= 1) {
      const start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() - i * 7);
      weeks.push({ start, sessions: 0, minutes: 0 });
    }
    for (const p of points) {
      const monday = weekKey(new Date(p.date)).getTime();
      const bucket = weeks.find((w) => w.start.getTime() === monday);
      if (bucket) {
        bucket.sessions += 1;
        bucket.minutes += p.minutes;
      }
    }

    const totalMinutes = points.reduce((sum, p) => sum + p.minutes, 0);
    const avgMinutes = points.length ? Math.round(totalMinutes / points.length) : 0;
    const heaviest = points.reduce((max, p) => Math.max(max, p.load), 0);
    const recent = points.slice(-5);
    const earlier = points.slice(0, Math.max(1, points.length - 5));
    const avg = (list: Point[], pick: (p: Point) => number) =>
      list.length ? list.reduce((sum, p) => sum + pick(p), 0) / list.length : 0;
    const loadTrend = avg(recent, (p) => p.load) - avg(earlier, (p) => p.load);

    const mix = (["light", "moderate", "heavy"] as const).map((key) => ({
      key,
      count: (rows ?? []).filter((r) => ((r.answers ?? {}) as Record<string, string>).bell === key)
        .length,
    }));

    return { points, weeks, avgMinutes, totalMinutes, heaviest, loadTrend, mix };
  }, [rows]);

  if (loading) return <Skeleton className="h-56 w-full rounded-2xl" />;

  if (!data.points.length) {
    return (
      <EmptyState
        icon={Activity}
        title="No training data yet"
        description="Save a workout day's session plan and your load, readiness and volume start charting here."
      />
    );
  }

  const maxMinutes = Math.max(...data.weeks.map((w) => w.minutes), 1);
  const trendLabel =
    data.loadTrend > 0.15
      ? "Trending heavier"
      : data.loadTrend < -0.15
        ? "Backing off"
        : "Holding steady";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat icon={Activity} label="Sessions logged" value={String(data.points.length)} />
        <Stat icon={Timer} label="Time trained" value={`${Math.round(data.totalMinutes / 60)} h`} />
        <Stat icon={Gauge} label="Avg session" value={`${data.avgMinutes} min`} />
        <Stat
          icon={Dumbbell}
          label="Heaviest bell"
          value={
            LOAD_LABEL[
              Object.keys(LOAD_SCORE).find((k) => LOAD_SCORE[k] === data.heaviest) ?? "moderate"
            ]
          }
          hint={trendLabel}
        />
      </div>

      {/* Weekly volume ------------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Weekly volume</h3>
          <p className="text-xs text-muted-foreground">Last 8 weeks</p>
        </div>
        <div className="mt-4 flex h-28 items-end gap-2">
          {data.weeks.map((w) => (
            <div
              key={w.start.toISOString()}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <div className="flex h-full w-full items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-[height] duration-500",
                    w.minutes ? "bg-primary" : "bg-border",
                  )}
                  style={{
                    height: `${Math.max(w.minutes ? 8 : 3, (w.minutes / maxMinutes) * 100)}%`,
                  }}
                  title={`${w.sessions} sessions · ${w.minutes} min`}
                />
              </div>
              <span className="numeric truncate text-[0.625rem] text-muted-foreground">
                {w.start.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Load progression --------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Load progression</h3>
          <p className="text-xs text-muted-foreground">{trendLabel}</p>
        </div>
        <div className="mt-4 flex h-24 items-end gap-1.5 overflow-hidden">
          {data.points.slice(-24).map((p, i) => (
            <div
              key={`${p.date}-${i}`}
              className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
            >
              <div
                className="w-full rounded-t-sm bg-foreground/80"
                style={{ height: `${(p.load / 3) * 100}%` }}
                title={`${p.label} · ${
                  LOAD_LABEL[
                    Object.keys(LOAD_SCORE).find((k) => LOAD_SCORE[k] === p.load) ?? "moderate"
                  ]
                } bell · ${
                  READINESS_LABEL[
                    Object.keys(READINESS_SCORE).find((k) => READINESS_SCORE[k] === p.readiness) ??
                      "ok"
                  ]
                }`}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {data.mix.map((m) => (
            <span key={m.key} className="text-xs text-muted-foreground">
              <span className="numeric font-semibold text-foreground">{m.count}</span>{" "}
              {LOAD_LABEL[m.key].toLowerCase()}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <Icon className="h-4 w-4 text-primary" />
      <p className="numeric mt-2 text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-[0.625rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}
