import type { CSSProperties } from "react";
import "./gfx.css";
import "./Climb.css";
import { Line, smooth, type Pt } from "./trace";
import { cls, cx, useGfxId } from "./util";
import { Clouds, FarRange, Grain, Layer, Shasta, Sky, WORLD, forest, ridgeFn, ridgePath, shastaPoint, SHASTA_SUMMIT, w, type WorldTime } from "./world";

const g = cls("gfx");
const s = cls("gfx-climb");

export interface ClimbPhase {
  /** First program day of the phase (1-based). */
  startDay: number;
  /** Camp name, e.g. "On Ramp", "Phase 1". */
  label: string;
  /** Second line; defaults to the phase's day range ("Days 8–20"). */
  sub?: string;
  /** Accepted for PhaseLandscape compatibility; shown when no sub is given and the range is unknown. */
  name?: string;
}

export interface ClimbProps {
  totalDays: number;
  /** Today's program day (1-based): where the "You" marker stands. */
  currentDay: number;
  /** Days finished; the route is drawn solid up to the marker. Defaults to currentDay − 1. */
  completedDays?: number;
  /** Camps along the route, in order. Defaults to Kettlebell Lifestyle Level I. */
  phases?: ClimbPhase[];
  /** "full": sky, sun and clouds, tents at camps. "compact": a shorter crop for cards and phones. */
  variant?: "full" | "compact";
  /** Show camp names and day ranges. */
  labels?: boolean;
  /** The marker's pill (default "You · Day N"). */
  youLabel?: string;
  /** Initial(s) or an image URL for the marker. */
  avatar?: string;
  summitLabel?: string;
  summitSub?: string;
  /** "auto" follows the theme: daylight in light, dusk in dark. */
  time?: WorldTime | "auto";
  /** Draw the route in once and let the clouds drift (off under reduced motion). */
  animated?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export const KBL_LEVEL_1: ClimbPhase[] = [
  { startDay: 1, label: "On Ramp" },
  { startDay: 8, label: "Phase 1" },
  { startDay: 21, label: "Phase 2" },
  { startDay: 41, label: "Phase 3" },
];

const W = 1000;
const H = 420;
/* Mountain placement: summit at 680,150. */
const MX = 139;
const MBASE = 345;
const MW = 900;
const MLIFT = 0.644;
const SUMMIT = shastaPoint(SHASTA_SUMMIT, MX, MBASE, MW, MLIFT);

/* The trail: across the meadow, through the forest, switchbacks up Shastina's flank, the saddle, the summit. */
const ROUTE = new Line(
  smooth(
    [
      [64, 392],
      [150, 388],
      [232, 378],
      [300, 364],
      [366, 352],
      [420, 330],
      [470, 312],
      [528, 296],
      [504, 276],
      [530, 258],
      [588, 240],
      [620, 214],
      [600, 196],
      [628, 182],
      [656, 166],
      [SUMMIT[0], SUMMIT[1] + 2],
    ],
    14,
  ),
);

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

function tent(x: number, y: number, k: number, lit: boolean) {
  const t = (dx: number, dy: number) => `${(x + dx * k).toFixed(1)} ${(y + dy * k).toFixed(1)}`;
  return (
    <g className={lit ? s.tentLit : s.tent}>
      <path d={`M${t(-9, 0)}L${t(-1, -11)}L${t(9, 0)}Z`} className={s.tentBody} />
      <path d={`M${t(-1, -11)}L${t(9, 0)}L${t(2, 0)}Z`} className={s.tentShade} />
      <path d={`M${t(-1, -11)}L${t(-3.5, 0)}L${t(1.5, 0)}Z`} className={s.tentDoor} />
    </g>
  );
}

/**
 * The Climb: a level drawn as a route up Mount Shasta. Daylight in light mode,
 * dusk in dark. Phases are camps along the trail (done, current, ahead), the
 * summit carries the flag, and "You · Day N" stands wherever today falls.
 * Markers and labels are HTML over the art, so they stay crisp and readable
 * at phone and desktop widths.
 */
export function Climb({
  totalDays,
  currentDay,
  completedDays,
  phases = KBL_LEVEL_1,
  variant = "full",
  labels = true,
  youLabel,
  avatar,
  summitLabel = "Summit",
  summitSub,
  time = "auto",
  animated = true,
  title,
  className,
  style,
}: ClimbProps) {
  const id = useGfxId("climb");
  const compact = variant === "compact";
  const vy = compact ? 92 : 0;
  const vh = compact ? 328 : H;
  const total = Math.max(1, totalDays);
  const done = Math.max(0, Math.min(total, completedDays ?? currentDay - 1));
  const finished = done >= total;
  const day = Math.max(1, Math.min(total, currentDay));

  // Camps sit evenly along the trail; days map piecewise between them.
  const ph = phases.length ? phases : [{ startDay: 1, label: "Start" }];
  const n = ph.length;
  const campLen = ph.map((_, i) => (ROUTE.total * i) / n);
  const lenOfDay = (d: number) => {
    if (d > total) return ROUTE.total;
    let i = ph.length - 1;
    while (i > 0 && ph[i].startDay > d) i--;
    const a = ph[i].startDay;
    const b = i + 1 < n ? ph[i + 1].startDay : total + 1;
    const t = Math.max(0, Math.min(1, (d - a) / Math.max(1, b - a)));
    const L0 = campLen[i];
    const L1 = i + 1 < n ? campLen[i + 1] : ROUTE.total;
    return L0 + (L1 - L0) * t;
  };
  const youLen = finished ? ROUTE.total : lenOfDay(day);
  const you = ROUTE.at(youLen);
  const doneD = ROUTE.d(0, youLen);
  const aheadD = ROUTE.d(youLen, ROUTE.total);
  const bedD = ROUTE.d(0, ROUTE.total);

  const camps = ph.map((p, i) => {
    const at = ROUTE.at(campLen[i]);
    const next = i + 1 < n ? ph[i + 1].startDay - 1 : total;
    const sub = p.sub ?? (next > p.startDay ? `Days ${p.startDay}–${next}` : `Day ${p.startDay}`);
    const reached = finished || p.startDay <= day;
    const current = !finished && reached && (i + 1 >= n || ph[i + 1].startDay > day);
    return { ...p, at, sub, reached, current };
  });

  const avatarIsImg = !!avatar && /^(https?:|\/|data:)/.test(avatar);
  // Markers know both crops: compact (sky trimmed) and full; narrow containers switch compact to full height.
  const pos = (p: Pt) => ({ left: pct(p[0], W), ["--tc" as string]: pct(p[1] - vy, vh), ["--tf" as string]: pct(p[1], H) }) as CSSProperties;

  // Forest bands (seeded, so server and client agree).
  const f3 = ridgeFn(31, 380, 9, W);
  const near = forest({ seed: 77, f: f3, x0: -10, x1: W + 10, gap: 13, hMin: 12, hMax: 34, clear: [[40, 110], [250, 330]], clump: 1 });
  const fFore = ridgeFn(43, 404, 4, W);
  const foreL = forest({ seed: 5, f: fFore, x0: -14, x1: 46, gap: 12, hMin: 44, hMax: 78, mix: { pine: 0.6, snag: 0 } });
  const foreR = forest({ seed: 8, f: fFore, x0: 930, x1: W + 14, gap: 12, hMin: 40, hMax: 86, mix: { pine: 1.2, snag: 0.3 } });

  return (
    <div
      className={cx(g.root, WORLD, s.climb, compact && s.compact, animated && s.animated, animated && w.animated, finished && s.finished, className)}
      data-time={time === "auto" ? undefined : time}
      style={{ ...style, ["--climb-ar" as string]: `${W} / ${vh}`, ["--climb-ar-full" as string]: `${W} / ${H}` }}
      role="img"
      aria-label={title ?? (finished ? `Summit reached: all ${total} days complete` : `Day ${day} of ${total}. ${camps.filter((c) => c.reached).length} of ${n} camps reached.`)}
    >
      <div className={s.frame}>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.art} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <clipPath id={`${id}-v`}>
            <rect x={0} y={0} width={W} height={H} />
          </clipPath>
          <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <g clipPath={`url(#${id}-v)`}>
          <Sky id={id} w={W} h={H} horizon={345} sun={[884, 136, 26]} moon={[862, 128, 20]} stars={70} seed={11} />
          <Clouds id={id} items={[[96, 176, 150, 4], [404, 146, 86, 9], [764, 224, 166, 2]]} />
          <FarRange w={W} y={318} seed={14} amp={12} cls={w.far1} />
          <FarRange w={W} y={330} seed={3} amp={8} />
          <Shasta id={id} x={MX} base={MBASE} width={MW} lift={MLIFT} />
          <Layer w={W} y={338} amp={7} seed={21} bottom={H} depth={1} trees={{ gap: 10, hMin: 4, hMax: 9, sink: 1.5, clump: 1, mix: { pine: 0, snag: 0 } }} />
          <Layer w={W} y={358} amp={10} seed={12} bottom={H} depth={2} trees={{ gap: 10, hMin: 7, hMax: 16, clump: 1, clear: [[150, 200], [600, 640]], mix: { pine: 0.3, snag: 0.1 } }} />
          <path d={ridgePath(f3, -10, W + 10, H, 18)} className={w.r3} />
          <path d={near.d} className={w.r3} />
          <path d={near.lit} className={w.r3Lit} />
          <path d={ridgePath(fFore, -10, W + 10, H + 10, 16)} className={w.ground} />
          <path d={ridgePath(ridgeFn(52, 412, 2.5, W), -10, W + 10, H + 10, 20)} className={w.groundLo} />
          <path d={foreL.d + foreR.d} className={w.r4} />
          <path d={foreL.lit + foreR.lit} className={w.r4Lit} />

          {/* The trail: a worn bed the whole way, solid ember behind you, ember dots ahead. */}
          <path d={bedD} className={s.bed} />
          <path d={aheadD} className={s.ahead} />
          {doneD ? (
            <>
              <path d={doneD} className={s.shadow} filter={`url(#${id}-soft)`} />
              <path d={doneD} className={s.casing} />
              <path d={doneD} className={s.done} />
            </>
          ) : null}
          {!compact ? camps.map((c, i) => (i === 0 ? null : <g key={i}>{tent(c.at[0] - 24, c.at[1] - 4, 1, c.reached)}</g>)) : null}
          <Grain id={id} w={W} h={H} />
        </g>
      </svg>

      {camps.map((c, i) => (
        <div
          key={i}
          className={cx(s.camp, c.reached && s.campDone, c.current && s.campNow, (i === 0 || c.at[1] - vy > vh - 52) && s.above, i === 0 && s.first, Math.hypot(c.at[0] - you[0], c.at[1] - you[1]) < 90 && s.nearYou)}
          style={pos(c.at)}
        >
          <span className={s.dot} aria-hidden="true">
            {c.reached ? (
              <svg viewBox="0 0 16 16">
                <path d="M4.2 8.4 6.9 11l5-5.6" />
              </svg>
            ) : null}
          </span>
          {labels ? (
            <span className={s.label}>
              <b>{c.label}</b>
              <small>{c.sub}</small>
            </span>
          ) : null}
        </div>
      ))}

      <div className={cx(s.camp, s.summit, finished && s.campDone)} style={pos(SUMMIT)}>
        <svg className={s.flag} viewBox="0 0 28 34" aria-hidden="true">
          <path d="M5 33V3" className={s.pole} />
          <path d="M6 3.5c5-2.2 9 2.4 15 .4v11c-6 2-10-2.6-15-.4z" className={s.cloth} />
          <path d="M6 9.5c5-2.2 9 2.4 15 .4v5c-6 2-10-2.6-15-.4z" className={s.clothShade} />
        </svg>
        <span className={s.dot} aria-hidden="true" />
        {labels ? (
          <span className={s.label}>
            <b>{summitLabel}</b>
            <small>{summitSub ?? `Day ${total}`}</small>
          </span>
        ) : null}
      </div>

      <div className={cx(s.you, finished && s.youSummit, you[0] < 130 && s.youLeft, you[0] > 870 && s.youRight)} style={pos(you)}>
        <span className={s.pill}>{youLabel ?? (finished ? "You · Summit" : `You · Day ${day}`)}</span>
        <span className={s.avatar} aria-hidden="true">
          {avatarIsImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" />
          ) : avatar ? (
            <span>{avatar.slice(0, 2)}</span>
          ) : (
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8.2" r="3.6" />
              <path d="M5 19.5c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" />
            </svg>
          )}
        </span>
        <span className={s.stem} aria-hidden="true" />
      </div>
      </div>
    </div>
  );
}
