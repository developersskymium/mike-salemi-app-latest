import type { CSSProperties } from "react";
import "./gfx.css";
import "./PhaseLandscape.css";
import { clamp, cx, useGfxId, cls } from "./util";

const g = cls("gfx");
const s = cls("gfx-phase-landscape");

export interface LandscapePhase {
  /** First day of the phase (1-based). */
  startDay: number;
  /** Short label, e.g. "Phase 2". */
  label: string;
  /** Optional name under the label, e.g. "Build". */
  name?: string;
}

export interface PhaseLandscapeProps {
  totalDays: number;
  completedDays: number;
  /** 1-based; defaults to the day after the last completed one. */
  currentDay?: number;
  phases?: LandscapePhase[];
  /** Draw the walked path in on mount. */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
}

type P = [number, number];
const W = 1000;
const H = 440;

/* The trail, base camp to summit. */
const TRAIL: P[] = [
  [52, 404],
  [170, 388],
  [262, 362],
  [338, 336],
  [402, 324],
  [470, 300],
  [528, 270],
  [586, 250],
  [640, 222],
  [690, 196],
  [734, 168],
  [772, 146],
  [806, 120],
  [838, 98],
];

/* Catmull-Rom → cubic Bézier, so the path and the day positions agree. */
function bezierSegments(pts: P[]): [P, P, P, P][] {
  const segs: [P, P, P, P][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.5 / 3;
    segs.push([
      p1,
      [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t],
      [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t],
      p2,
    ]);
  }
  return segs;
}
const SEGS = bezierSegments(TRAIL);
const f1 = (n: number) => n.toFixed(1);
const TRAIL_D =
  `M${f1(SEGS[0][0][0])} ${f1(SEGS[0][0][1])}` +
  SEGS.map(([, a, b, c]) => `C${f1(a[0])} ${f1(a[1])} ${f1(b[0])} ${f1(b[1])} ${f1(c[0])} ${f1(c[1])}`).join("");

function bez([a, b, c, d]: [P, P, P, P], t: number): P {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
}

/* Dense polyline with cumulative lengths for arc-length lookup. */
const SAMPLES: { p: P; len: number }[] = (() => {
  const out: { p: P; len: number }[] = [];
  let len = 0;
  let prev: P | null = null;
  for (const seg of SEGS) {
    for (let i = 0; i <= 40; i++) {
      const p = bez(seg, i / 40);
      if (prev) len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      out.push({ p, len });
      prev = p;
    }
  }
  return out;
})();
const TOTAL_LEN = SAMPLES[SAMPLES.length - 1].len;

function pointAt(frac: number): P {
  const target = clamp(frac) * TOTAL_LEN;
  let lo = 0;
  let hi = SAMPLES.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (SAMPLES[mid].len < target) lo = mid;
    else hi = mid;
  }
  const a = SAMPLES[lo];
  const b = SAMPLES[hi];
  const t = (target - a.len) / (b.len - a.len || 1);
  return [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t];
}

/* Terrain, back to front. Granite ridges with a glacier range behind. */
const FAR =
  "M0 262 58 236 104 248 168 196 214 214 262 170 318 206 372 188 430 214 492 160 548 190 612 150 664 176 724 128 776 156 840 120 900 150 956 132 1000 146V440H0Z";
const FAR_SNOW = [
  "M152 208 168 196 182 205 174 204 166 211 160 206Z",
  "M248 180 262 170 276 180 268 178 262 184 256 179Z",
  "M478 170 492 160 506 170 498 168 492 175 486 169Z",
  "M598 160 612 150 626 159 618 158 611 164 605 159Z",
  "M710 138 724 128 740 138 731 137 724 144 717 138Z",
];
const MID =
  "M0 330 70 300 128 316 196 268 250 288 316 252 360 270 420 244 470 262 540 230 600 252 660 236 720 262 790 240 860 268 930 236 1000 254V440H0Z";
const MAIN =
  "M0 404 96 390 186 372 246 352 300 336 352 312 398 304 446 282 494 266 530 240 566 232 604 210 640 196 672 170 706 160 738 134 770 122 800 98 822 86 842 70 858 80 880 98 902 106 930 128 962 140 1000 152V440H0Z";
const MAIN_RIDGE =
  "M0 404 96 390 186 372 246 352 300 336 352 312 398 304 446 282 494 266 530 240 566 232 604 210 640 196 672 170 706 160 738 134 770 122 800 98 822 86 842 70 858 80 880 98 902 106 930 128 962 140 1000 152";
/* The shaded east face, for volume. */
const SHADE = "M842 70 858 80 880 98 902 106 930 128 962 140 1000 152V440H690C756 330 812 200 842 70Z";
const MAIN_SNOW = "M800 98 822 86 842 70 858 80 880 98 866 96 856 104 846 96 834 106 822 98 812 104Z";
const STRATA = [
  "M560 300c40-14 86-30 132-58",
  "M640 320c50-22 100-52 148-96",
  "M720 340c56-34 108-78 150-134",
  "M300 390c60-16 120-34 176-58",
  "M860 330c22-40 46-90 70-150",
];

function Tent({ x, y, reached }: { x: number; y: number; reached: boolean }) {
  return (
    <g transform={`translate(${f1(x)} ${f1(y)})`} className={cx(s.tent, reached && s.tentReached)}>
      <path d="M-11 0 0-17 11 0Z" />
      <path d="M0-17 0 0M-3.6 0 0-5.5 3.6 0" className={s.tentDoor} />
      <path d="M-15 0h30" className={s.tentGround} />
    </g>
  );
}

/**
 * Program hero: a granite ridge at first light, the program a trail climbing
 * it. The walked part glows in the accent, phase camps sit on the trail and
 * today pulses gently.
 */
export function PhaseLandscape({
  totalDays,
  completedDays,
  currentDay,
  phases = [],
  animated = true,
  className,
  style,
}: PhaseLandscapeProps) {
  const id = useGfxId("ridge");
  const total = Math.max(2, totalDays);
  const done = clamp(completedDays, 0, total);
  const today = clamp(currentDay ?? done + 1, 1, total);
  const frac = (day: number) => (day - 1) / (total - 1);
  const walked = frac(Math.max(1, Math.min(today, done + 1)));
  const here = pointAt(frac(today));
  const summit = pointAt(1);

  const days = Array.from({ length: total }, (_, i) => i + 1);
  const camps = phases.filter((p) => p.startDay >= 1 && p.startDay <= total);

  return (
    <div
      className={cx(g.root, s.wrap, animated && s.animated, className)}
      style={{ ...style, ["--walked" as string]: walked.toFixed(4) }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className={s.skyTop} />
            <stop offset=".62" className={s.skyLow} />
            <stop offset="1" className={s.skyTop} />
          </linearGradient>
          <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" className={s.sunCore} />
            <stop offset=".3" className={s.sunMid} />
            <stop offset="1" className={s.sunEdge} />
          </radialGradient>
          <linearGradient id={`${id}-far`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className={s.farTop} />
            <stop offset=".7" className={s.farLow} />
          </linearGradient>
          <linearGradient id={`${id}-main`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className={s.mainA} />
            <stop offset="1" className={s.mainB} />
          </linearGradient>
          <linearGradient id={`${id}-walk`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" className={s.walkA} />
            <stop offset="1" className={s.walkB} />
          </linearGradient>
          <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" className={s.shadeA} />
            <stop offset=".45" className={s.shadeB} />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <path d={MAIN} />
          </clipPath>
        </defs>

        <rect width={W} height={H} fill={`url(#${id}-sky)`} />
        <circle cx={668} cy={150} r={150} fill={`url(#${id}-sun)`} className={s.sun} />

        <path d={FAR} fill={`url(#${id}-far)`} />
        {FAR_SNOW.map((d) => (
          <path key={d} d={d} className={s.snowFar} />
        ))}
        <path d={MID} className={s.mid} />
        <path d={MAIN} fill={`url(#${id}-main)`} />
        <path d={SHADE} fill={`url(#${id}-shade)`} />
        <g clipPath={`url(#${id}-clip)`} className={s.strata}>
          {STRATA.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <path d={MAIN_SNOW} className={s.snow} />
        <path d={MAIN_RIDGE} className={s.rim} />

        {/* Trail ahead, then the walked part on top. */}
        <path d={TRAIL_D} className={s.ahead} />
        <path d={TRAIL_D} className={s.walkGlow} pathLength={1} />
        <path d={TRAIL_D} className={s.walked} pathLength={1} stroke={`url(#${id}-walk)`} />

        {days.map((d) => {
          const [x, y] = pointAt(frac(d));
          const isDone = d <= done;
          return <circle key={d} cx={f1(x)} cy={f1(y)} r={isDone ? 2.1 : 1.7} className={isDone ? s.dayDone : s.day} />;
        })}

        {camps.map((p) => {
          const [x, y] = pointAt(frac(p.startDay));
          return <Tent key={p.label} x={x - 2} y={y - 12} reached={p.startDay <= today} />;
        })}

        <g transform={`translate(${f1(summit[0])} ${f1(summit[1])})`} className={s.flag}>
          <path d="M0 0V-30" />
          <path d="M0-30 15-24.5 0-19Z" className={s.flagCloth} />
        </g>

        <g transform={`translate(${f1(here[0])} ${f1(here[1])})`}>
          <circle r={18} className={s.pulse} />
          <circle r={18} className={cx(s.pulse, s.pulseLate)} />
          <circle r={7.5} className={s.here} />
          <circle r={2.6} className={s.hereCore} />
        </g>
      </svg>

      {camps.map((p, i) => {
        const [x, y] = pointAt(frac(p.startDay));
        const next = camps[i + 1];
        // Camps close to the next one drop their label when the hero is narrow.
        const tight = next ? pointAt(frac(next.startDay))[0] - x < 150 : false;
        return (
          <div
            key={p.label}
            className={cx(s.label, tight && s.tight)}
            style={{ left: `${(x / W) * 100}%`, top: `${((y + 10) / H) * 100}%` }}
          >
            <span className={s.labelTitle}>{p.label}</span>
            {p.name ? <span className={s.labelName}>{p.name}</span> : null}
          </div>
        );
      })}
      <div
        className={cx(s.label, s.labelHere)}
        style={{ left: `${(here[0] / W) * 100}%`, top: `${((here[1] - 36) / H) * 100}%` }}
      >
        <span className={s.chip}>Day {today}</span>
      </div>
    </div>
  );
}
