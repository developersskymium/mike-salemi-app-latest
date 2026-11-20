import type { CSSProperties } from "react";
import "./gfx.css";
import "./ReadinessDial.css";
import { arc, clamp, cx, polar, cls } from "./util";

const g = cls("gfx");
const s = cls("gfx-readiness-dial");

export type ReadinessBand = "full" | "modified" | "recovery";
/** The data layer's band colours map onto the dial's zones. */
export type ReadinessBandColour = "green" | "amber" | "red";

const FROM_COLOUR: Record<ReadinessBandColour, ReadinessBand> = { green: "full", amber: "modified", red: "recovery" };

export interface DialZone {
  band: ReadinessBand;
  from: number;
  to: number;
  label?: string;
}

export interface ReadinessDialProps {
  score: number;
  band?: ReadinessBand | ReadinessBandColour;
  max?: number;
  /** Zone ranges along the dial; defaults to thirds, recovery on the left. */
  zones?: DialZone[];
  size?: number;
  /** Swing the needle in on mount. */
  animated?: boolean;
  /** Hide the number and band text under the hub. */
  bare?: boolean;
  className?: string;
  style?: CSSProperties;
}

const ZONE_LABEL: Record<ReadinessBand, string> = {
  full: "Full workout",
  modified: "Modified",
  recovery: "Recovery",
};

/**
 * Readiness gauge: a soft half-dial in three zones with a needle that swings
 * to today's score on a spring.
 */
export function ReadinessDial({
  score,
  band,
  max = 60,
  zones,
  size = 240,
  animated = true,
  bare = false,
  className,
  style,
}: ReadinessDialProps) {
  const z: DialZone[] = zones ?? [
    { band: "recovery", from: 0, to: max / 3 },
    { band: "modified", from: max / 3, to: (2 * max) / 3 },
    { band: "full", from: (2 * max) / 3, to: max },
  ];
  const v = clamp(score, 0, max);
  const resolved: ReadinessBand =
    band && band in FROM_COLOUR
      ? FROM_COLOUR[band as ReadinessBandColour]
      : (band as ReadinessBand | undefined) ?? z.find((zz) => v >= zz.from && v <= zz.to)?.band ?? "full";

  // Dial sweeps from -90° (left) to +90° (right), centre at (120, 124).
  const C = { x: 120, y: 124 };
  const R = 92;
  const ang = (n: number) => -90 + (clamp(n, 0, max) / max) * 180;
  const gap = 2.4;
  const ticks = Array.from({ length: max / 5 + 1 }, (_, i) => i * 5);

  return (
    <svg
      viewBox="0 0 240 150"
      width={size}
      height={(size * 150) / 240}
      role="img"
      aria-label={`Readiness ${Math.round(v)} of ${max}, ${ZONE_LABEL[resolved]}`}
      className={cx(g.root, s.dial, animated && s.animated, className)}
      style={{ ...style, ["--needle" as string]: `${ang(v)}deg` }}
    >
      {z.map((zz, i) => (
        <path
          key={zz.band + i}
          d={arc(C.x, C.y, R, ang(zz.from) + (i === 0 ? 0 : gap), ang(zz.to) - (i === z.length - 1 ? 0 : gap))}
          className={cx(s.zone, s[zz.band], zz.band === resolved && s.active)}
        />
      ))}

      {ticks.map((t) => {
        const a = ang(t);
        const major = t % 20 === 0;
        const [x1, y1] = polar(C.x, C.y, R - 15, a);
        const [x2, y2] = polar(C.x, C.y, R - (major ? 22 : 19), a);
        return <path key={t} d={`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`} className={cx(s.tick, major && s.major)} />;
      })}
      {[0, max].map((t) => (
        <text key={t} x={t === 0 ? C.x - R : C.x + R} y={C.y + 18} className={s.tickLabel} textAnchor="middle">
          {t}
        </text>
      ))}

      <g transform={`translate(${C.x} ${C.y})`}>
        <g className={s.needle}>
          <path d={`M0 ${-(R - 24)}V${-(R - 13)}`} className={s.needleLine} />
          <rect x={-4} y={-(R + 12)} width={8} height={24} rx={4} className={s.marker} />
        </g>
      </g>

      {!bare ? (
        <>
          <text x={C.x} y={C.y - 14} textAnchor="middle" className={s.score}>
            {Math.round(v)}
          </text>
          <text x={C.x} y={C.y + 10} textAnchor="middle" className={cx(s.bandLabel, s[`${resolved}Text`])}>
            {ZONE_LABEL[resolved]}
          </text>
        </>
      ) : null}
    </svg>
  );
}
