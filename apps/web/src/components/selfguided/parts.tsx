/**
 * Presentational Self-Guided parts with no client hooks, so server components
 * (TrainingHeatmap, TrainingStats, ContinueRail) and the client board share them.
 */
import Image from "next/image";
import { SafeImage } from "@/components/discover/library/SafeImage";
import Link from "next/link";
import { heatmapGrid, INTENT_LABEL, type HeatEntry, type LessonIntent } from "@ms/core";
import type { ContinuePoint, TrainingStatsDTO } from "@ms/api";
import { Glass, Icon, type IconName } from "@/components/ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso: string) => {
  const d = iso.slice(0, 10);
  return `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
};
export const dayOf = (iso: string) => ({ d: Number(iso.slice(8, 10)), m: MONTHS[Number(iso.slice(5, 7)) - 1]! });
export const hm = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim() : `${minutes} min`);
export const clockOf = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;

export function IntentTag({ intent }: { intent: LessonIntent | null | undefined }) {
  if (!intent) return null;
  return (
    <span className="sg-intent" data-i={intent}>
      {INTENT_LABEL[intent]}
    </span>
  );
}

/** Calendar heatmap: Monday-first weeks, today outlined, future days hollow. */
export function HeatmapGrid({ entries, today, weeks = 26, cell = 12, title = "Training days" }: { entries: HeatEntry[]; today: string; weeks?: number; cell?: number; title?: string }) {
  const g = heatmapGrid(entries, today, weeks);
  const active = entries.filter((e) => e.minutes > 0 || e.sessions > 0 || e.steps > 0).length;
  return (
    <Glass radius="card" className="sg-heat" aria-label={title}>
      <div className="sg-row" style={{ justifyContent: "space-between" }}>
        <p className="lq-t15" style={{ margin: 0, fontWeight: 650 }}>
          {title}
        </p>
        <span className="lq-t12 lq-c2 sg-num">
          {active} active day{active === 1 ? "" : "s"} · {weeks} weeks
        </span>
      </div>
      <div className="sg-heat-scroll">
        <div className="sg-heat-grid" style={{ ["--cell" as string]: `${cell}px` }} role="img" aria-label={`${active} active days in the last ${weeks} weeks`}>
          {g.columns.map((col, w) => {
            const m = g.months.find((x) => x.col === w);
            return [
              <span key={`m${w}`} className="sg-heat-m" style={{ gridColumn: w + 1 }}>
                {m?.label ?? ""}
              </span>,
              ...col.map((c, d) => (
                <span
                  key={c.date}
                  className="sg-cell"
                  style={{ gridColumn: w + 1, gridRow: d + 2 }}
                  data-l={c.level || undefined}
                  data-f={c.future ? "" : undefined}
                  data-t={c.today ? "" : undefined}
                  title={c.future ? undefined : `${shortDate(c.date)}: ${c.minutes ? `${c.minutes} min` : c.steps ? `${c.steps} steps` : "rest"}${c.sessions ? ` · ${c.sessions} session${c.sessions > 1 ? "s" : ""}` : ""}`}
                />
              )),
            ];
          })}
        </div>
      </div>
      <div className="sg-heat-foot">
        <span>Mon to Sun, newest on the right</span>
        <span className="sg-heat-legend" aria-hidden>
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="sg-cell" data-l={l || undefined} />
          ))}
          More
        </span>
      </div>
    </Glass>
  );
}

function Stat({ icon, value, unit, label, hot }: { icon: IconName; value: string | number; unit?: string; label: string; hot?: boolean }) {
  return (
    <Glass radius="card" className="sg-stat" data-hot={hot ? "" : undefined}>
      <span className="sg-stat-ic">
        <span className="lq-t12">{label}</span>
        <Icon name={icon} />
      </span>
      <b>
        {value}
        {unit && <small>{unit}</small>}
      </b>
    </Glass>
  );
}

/** Minutes, sessions, streak and this week, as four tiles. */
export function StatTiles({ stats }: { stats: TrainingStatsDTO }) {
  const h = Math.floor(stats.minutes / 60);
  return (
    <div className="sg-stats">
      <Stat icon="timer" value={h >= 10 ? h : hm(stats.minutes).replace(/ ?min$/, "")} unit={h >= 10 ? "hours" : stats.minutes >= 60 ? "" : "min"} label="Time trained" />
      <Stat icon="steps" value={stats.sessions} unit="sessions" label="Sessions" />
      <Stat icon="flame" value={stats.streak.current} unit={stats.streak.current === 1 ? "day" : "days"} label={`Streak · best ${stats.streak.best}`} hot={stats.streak.current > 0} />
      <Stat icon="calendar" value={stats.week.minutes} unit="min" label={`This week · ${stats.week.sessions} session${stats.week.sessions === 1 ? "" : "s"}`} />
    </div>
  );
}

/** Readiness trend sparkline (higher score = more fatigue; the line is inverted so up = fresher). */
export function ReadinessSpark({ points, max = 60 }: { points: { at: string; score: number; band: string }[]; max?: number }) {
  if (points.length < 2) return null;
  const w = 280;
  const h = 44;
  const xs = points.map((_, i) => 4 + (i * (w - 8)) / (points.length - 1));
  const ys = points.map((p) => 4 + (Math.min(max, p.score) / max) * (h - 8));
  const d = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i]!.toFixed(1)}`).join(" ");
  return (
    <svg className="sg-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Readiness trend, last ${points.length} check-ins, latest ${points[points.length - 1]!.score}`}>
      <path d={d} vectorEffect="non-scaling-stroke" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function continueHref(c: ContinuePoint) {
  if (c.kind === "session" && c.sessionId) return `/programs/${c.programSlug}/session/${c.sessionId}`;
  if (c.mode === "self_guided" || c.programType === "course") return `/programs/${c.programSlug}/session/open?lesson=${c.lessonId}&key=${encodeURIComponent(c.lessonKey ?? c.lessonId ?? "")}`;
  return `/programs/${c.programSlug}/learn/${encodeURIComponent(c.lessonKey ?? c.lessonId ?? "")}`;
}

export function continueLabel(c: ContinuePoint) {
  if (c.kind === "session") return c.sessionTitle ?? "Your session";
  if (c.dayNumber != null) return `Day ${c.dayNumber}${c.dayType ? ` · ${c.dayType.replace(/\s+day$/i, "")}` : ""}`;
  return c.lessonTitle ?? "";
}

/** One continue card: poster with play, exact step and video position, step segments. */
export function ContinueCard({ c, eyebrow = "Continue where you left off" }: { c: ContinuePoint; eyebrow?: string }) {
  const pct = c.videoDuration ? Math.min(1, c.videoSeconds / c.videoDuration) : 0;
  return (
    <Glass as={Link} href={continueHref(c)} radius="card" interactive className="sg-card sg-cont" aria-label={`Continue ${continueLabel(c)}, ${c.stepTitle ?? ""}`}>
      <div className="sg-cont-poster">
        {c.poster && (
          <SafeImage
            src={c.poster}
            alt=""
            fill
            sizes="(min-width: 900px) 40vw, 100vw"
            unoptimized={c.poster.startsWith("http")}
            fallback={<Image src="/media/summit/mike-standing.jpg" alt="" fill sizes="(min-width: 900px) 40vw, 100vw" style={{ objectFit: "cover", objectPosition: "52% 26%" }} />}
          />
        )}
        <span className="sg-cont-play">
          <i>
            <Icon name="play" size="sm" />
          </i>
          <span>
            <b className="lq-t15" style={{ display: "block" }}>
              {c.videoSeconds > 8 ? `Resume at ${clockOf(c.videoSeconds)}` : "Pick up here"}
            </b>
            <span className="lq-t12" style={{ opacity: 0.8 }}>
              {c.stepTitle} · step {c.stepIndex + 1} of {c.stepCount}
            </span>
          </span>
        </span>
        {pct > 0 && (
          <span className="sg-cont-bar" aria-hidden>
            <i style={{ width: `${pct * 100}%` }} />
          </span>
        )}
      </div>
      <div className="sg-cont-b">
        <p className="sg-eyebrow" data-tone="now">
          {eyebrow}
        </p>
        <p className="lq-t17" style={{ fontWeight: 650 }}>
          {continueLabel(c)}
        </p>
        <p className="lq-t13 lq-c2 sg-ellipsis">{[c.programName, c.pathName?.split("·")[0]?.trim(), c.sectionTitle].filter(Boolean).join(" · ")}</p>
        {c.stepCount > 0 && (
          <span className="sg-segs" aria-hidden>
            {Array.from({ length: c.stepCount }, (_, i) => (
              <i key={i} data-done={i < c.stepsDone && i !== c.stepIndex ? "" : undefined} data-now={i === c.stepIndex ? "" : undefined} />
            ))}
          </span>
        )}
      </div>
    </Glass>
  );
}
