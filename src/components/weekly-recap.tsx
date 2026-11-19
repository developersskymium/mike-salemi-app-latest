import { useMemo } from "react";
import { Flame } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useProgress, summarise } from "@/hooks/use-progress";
import { computeStreakFromRows } from "@/lib/achievements";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const weekday = d.getDay() === 0 ? 7 : d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (weekday - 1));
  return d;
}

/**
 * Weekly recap: a calm, glanceable summary of the last seven days.
 * Replaces the "weekly summary email" for users who keep the app open.
 */
export function WeeklyRecap() {
  const { user } = useSession();
  const { data: rows } = useProgress(Boolean(user));

  const recap = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    const perDay = Array.from({ length: 7 }, () => 0);
    let lessons = 0;

    for (const row of rows ?? []) {
      const completed = new Date(row.completed_at);
      const offset = Math.floor((completed.getTime() - weekStart.getTime()) / 86_400_000);
      if (offset < 0 || offset > 6) continue;
      perDay[offset] += 1;
      lessons += 1;
    }

    const summary = summarise(rows);
    return {
      perDay,
      lessons,
      activeDays: perDay.filter((n) => n > 0).length,
      streak: computeStreakFromRows(rows),
      percent: summary.percent,
    };
  }, [rows]);

  if (!user) return null;

  const todayIndex = (new Date().getDay() === 0 ? 7 : new Date().getDay()) - 1;

  return (
    <section className="grid gap-4 rounded-2xl border border-hairline bg-elevated p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:p-5">
      {/* Headline figure */}
      <div className="flex items-center gap-4 sm:block">
        <div className="min-w-0">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            This week
          </p>
          <p className="numeric mt-1 flex items-baseline gap-1.5 text-2xl font-semibold leading-none tracking-tight text-foreground">
            {recap.activeDays}
            <span className="text-xs font-medium tracking-normal text-muted-foreground">
              {recap.activeDays === 1 ? "training day" : "training days"}
            </span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground sm:hidden">
          <Flame className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="numeric">{recap.streak}</span>
        </div>
      </div>

      {/* Seven-day rhythm — short bars, today ringed. */}
      <div
        className="flex items-end gap-1.5 sm:gap-2"
        role="img"
        aria-label="Lessons completed each day this week"
      >
        {recap.perDay.map((count, i) => {
          const isToday = i === todayIndex;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-9 w-full items-end overflow-hidden rounded-md bg-secondary transition-colors",
                  isToday && "ring-1 ring-inset ring-foreground/25",
                )}
              >
                <div
                  className={cn(
                    "w-full rounded-md transition-[height] duration-700 [transition-timing-function:var(--ease-spring)]",
                    count ? "bg-primary" : "bg-transparent",
                  )}
                  style={{ height: `${count ? Math.max(22, Math.min(100, count * 20)) : 0}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-[0.6rem] font-semibold uppercase",
                  isToday ? "text-foreground" : "text-muted-foreground/70",
                )}
              >
                {DAY_LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Context rail — progress numbers live in the panel above, so only the streak here */}
      <div className="hidden items-center gap-5 sm:flex">
        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground">
          <Flame className="h-4 w-4 text-primary" aria-hidden />
          <span className="numeric">{recap.streak}</span>
        </div>
      </div>

    </section>
  );
}

