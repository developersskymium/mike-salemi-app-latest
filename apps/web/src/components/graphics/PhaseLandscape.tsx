import type { CSSProperties } from "react";
import { Exposure, shastaPath } from "./exposure";
import "./gfx.css";
import "./PhaseLandscape.css";
import { Line, smooth, traceGeo } from "./trace";
import { TraceMarks } from "./Trace";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-phase-landscape");

export interface LandscapePhase {
  /** First program day of the phase (1-based). */
  startDay: number;
  /** Short label, e.g. "Phase 1". */
  label: string;
  /** Optional name, e.g. "Foundation". */
  name?: string;
}

export interface PhaseLandscapeProps {
  totalDays: number;
  completedDays: number;
  /** Today's program day (1-based); defaults to the day after the last completed. */
  currentDay?: number;
  phases?: LandscapePhase[];
  /** Expose the route once when it appears. */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
}

const W = 640;
const H = 300;
/* The program route climbs Mount Shasta's west flank to the summit. */
const ROUTE = new Line(
  smooth(
    [
      [24, 284],
      [92, 288],
      [140, 290],
      [182, 286],
      [240, 258],
      [298, 220],
      [343, 182],
      [377, 154],
      [401, 149],
      [413, 142],
      [431, 102],
      [452, 68],
      [472, 55],
    ],
    12,
  ),
);

/**
 * The program as a climb: Mount Shasta under a night exposure (dark) or as
 * glacier contours on snow (light). The route is a Trace exposed up to today,
 * the rest dotted ahead; each phase is a node, lit once reached; today is the
 * hot head with its day marked.
 */
export function PhaseLandscape({ totalDays, completedDays, currentDay, phases = [], animated = true, className, style }: PhaseLandscapeProps) {
  const id = useGfxId("ridge");
  const today = currentDay ?? Math.min(totalDays, completedDays + 1);
  const at = (day: number) => Math.min(1, Math.max(0, (day - 0.5) / totalDays));
  const p = at(today);
  const geo = traceGeo(ROUTE, p, { width: 3.4, segments: 26, floor: 0.06 });
  const head = ROUTE.at(ROUTE.total * p);
  // The phase today is in rides on today's tag; the other labels sit above their nodes and stack upwards when they would overlap.
  const current = phases.reduce<LandscapePhase | undefined>((c, ph) => (ph.startDay <= today ? ph : c), undefined);
  type Box = { x: number; y: number; w: number };
  const tag = current ? `Day ${today} · ${current.name ?? current.label}` : `Day ${today}`;
  const tagW = 20 + tag.length * 7.6;
  const tagX = Math.min(W - tagW - 8, head[0] - tagW / 2);
  const boxes: Box[] = [{ x: tagX - 6, y: head[1] - 26, w: tagW + 12 }];
  const nodes = phases.map((ph) => {
    const f = at(ph.startDay);
    const [x, y] = ROUTE.at(ROUTE.total * f);
    const hidden = ph === current && Math.hypot(x - head[0], y - head[1]) < 110;
    const w = Math.max(ph.label.length, ph.name?.length ?? 0) * 8 + 10;
    const near = Math.hypot(x - head[0], y - head[1]) < 110;
    let ly = near && y + 40 < H ? y + 24 : y - 26;
    for (let k = 0; k < 4; k++) for (const bx of boxes) if (x + 9 < bx.x + bx.w && bx.x < x + 9 + w && Math.abs(ly - bx.y) < 34) ly = bx.y - 36;
    if (!hidden) boxes.push({ x: x + 9, y: ly, w });
    return { x, y, ly, lit: f <= p + 1e-6, ph, hidden };
  });
  const summit = ROUTE.at(ROUTE.total);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`Day ${today} of ${totalDays}`}
      className={cx(g.root, s.ridge, animated && s.animated, className)}
      style={style}
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <clipPath id={`${id}-c`}>
          <rect width={W} height={H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        <Exposure w={W} h={H} pole={[560, -40]} seed={totalDays} />
        <path d={shastaPath(-60, 302, 300, 64)} className={s.hills} />
        <path d={shastaPath(170, 296, 540, 236)} className={s.mtn} />
        <rect x={0} y={295} width={W} height={10} className={s.hills} />
        <path d={shastaPath(170, 296, 540, 236)} className={s.mtnLine} />
        <g className={s.expose}>
          <TraceMarks geo={geo} />
        </g>
        {nodes.map(({ x, y, ly, lit, ph, hidden }, i) => (
          <g key={i} className={lit ? s.phaseLit : s.phase}>
            <circle cx={x} cy={y} r={5.2} className={lit ? s.nodeLit : s.node} />
            {hidden ? null : (
              <>
                {ly < y - 30 ? <path d={`M${x} ${y - 7}V${ly + 18}`} className={s.leader} /> : null}
                <text x={x + 9} y={ly} className={s.label}>
                  {ph.label}
                </text>
                {ph.name ? (
                  <text x={x + 9} y={ly + 14} className={s.name}>
                    {ph.name}
                  </text>
                ) : null}
              </>
            )}
          </g>
        ))}
        <circle cx={summit[0]} cy={summit[1]} r={5} className={p >= 1 ? s.nodeLit : s.node} />
        <g transform={`translate(${tagX.toFixed(1)} ${(head[1] - 44).toFixed(1)})`} className={s.tag}>
          <rect width={tagW} height={26} rx={13} className={s.tagBg} />
          <text x={tagW / 2} y={17.5} textAnchor="middle" className={s.tagText}>
            {tag}
          </text>
        </g>
      </g>
    </svg>
  );
}
