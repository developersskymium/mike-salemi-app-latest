import type { CSSProperties, ReactNode } from "react";
import { dayGlyphArt, type DayType } from "./DayGlyph";
import { BELL_OUTLINE, BELL_SPEC, BELL_WINDOW } from "./figures/bell";
import "./gfx.css";
import "./Medal.css";
import { cls, cx, polar, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-medal");

export type MedalTier = "bronze" | "silver" | "gold" | "platinum";
export const MEDAL_TIERS: MedalTier[] = ["bronze", "silver", "gold", "platinum"];

export interface MedalProps {
  tier: MedalTier;
  /** A day-type glyph to strike in raised metal, or custom art on the 24 grid via children. */
  glyph?: DayType;
  children?: ReactNode;
  size?: number;
  /** One light sweep across the metal when it appears. */
  animated?: boolean;
  /** Not yet earned: a quiet, unpainted strike. */
  locked?: boolean;
  /** Engraved around the rim at larger sizes. */
  legend?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const ring = (c: number, r: number) => `M${c - r} ${c}a${r} ${r} 0 1 1 ${r * 2} 0a${r} ${r} 0 1 1 ${-r * 2} 0`;

/** Shared metal gradients for medals and emblems (classes resolve the tier's --g-metal-*). */
function MetalDefs({ id }: { id: string }) {
  return (
    <>
      <linearGradient id={`${id}-rimA`} x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0" className={s.hi} />
        <stop offset=".28" className={s.mid} />
        <stop offset=".52" className={s.lo} />
        <stop offset=".74" className={s.mid} />
        <stop offset="1" className={s.hi} />
      </linearGradient>
      <linearGradient id={`${id}-rimB`} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" className={s.spec0} />
        <stop offset=".42" className={s.spec55} />
        <stop offset=".5" className={s.spec0} />
        <stop offset="1" className={s.spec0} />
      </linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className={s.lo} />
        <stop offset="1" className={s.deep} />
      </linearGradient>
      <linearGradient id={`${id}-bevel`} x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" className={s.deep} />
        <stop offset=".5" className={s.lo} />
        <stop offset="1" className={s.hi} />
      </linearGradient>
      <radialGradient id={`${id}-enamel`} cx=".36" cy=".26" r=".9">
        <stop offset="0" className={s.enamelHi} />
        <stop offset=".5" className={s.enamelMid} />
        <stop offset="1" className={s.enamelLo} />
      </radialGradient>
      <linearGradient id={`${id}-relief`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" className={s.hi} />
        <stop offset=".45" className={s.mid} />
        <stop offset="1" className={s.lo} />
      </linearGradient>
      <linearGradient id={`${id}-dome`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className={s.spec42} />
        <stop offset="1" className={s.spec0} />
      </linearGradient>
      <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" className={s.spec0} />
        <stop offset=".5" className={s.spec55} />
        <stop offset="1" className={s.spec0} />
      </linearGradient>
    </>
  );
}

/**
 * Award medal: a struck coin with a brushed rim and an engraved legend, a
 * guilloché glacier-enamel field under a glass dome, and the emblem in raised
 * metal. Every material is a custom property (see Medal.css).
 */
export function Medal({
  tier,
  glyph,
  children,
  size = 96,
  animated = false,
  locked = false,
  legend = "KETTLEBELL LIFESTYLE · MASTERING THE KETTLEBELL · ",
  title,
  className,
  style,
}: MedalProps) {
  const id = useGfxId("medal");
  const C = 60;
  const big = size >= 72;
  const ticks = big ? Array.from({ length: 72 }, (_, i) => i * 5) : Array.from({ length: 90 }, (_, i) => i * 4);
  const emblem = children ?? (glyph ? dayGlyphArt(glyph) : null);

  return (
    <svg
      viewBox="0 0 120 124"
      width={(size * 120) / 124}
      height={size}
      role="img"
      aria-label={title ?? `${tier[0].toUpperCase()}${tier.slice(1)} medal${locked ? ", locked" : ""}`}
      className={cx(g.root, s.medal, s[tier], locked && s.locked, animated && !locked && s.animated, className)}
      style={style}
    >
      <defs>
        <MetalDefs id={id} />
        <clipPath id={`${id}-face`}>
          <circle cx={C} cy={C} r={43.2} />
        </clipPath>
        <clipPath id={`${id}-coin`}>
          <circle cx={C} cy={C} r={55} />
        </clipPath>
        <path id={`${id}-legend`} d={ring(C, 48.6)} />
      </defs>

      <circle cx={C} cy={C + 2.6} r={55} fill={`url(#${id}-edge)`} />
      <circle cx={C} cy={C} r={55} fill={`url(#${id}-rimA)`} />
      <circle cx={C} cy={C} r={55} fill={`url(#${id}-rimB)`} />
      <circle cx={C} cy={C} r={54.4} className={s.rimLine} />

      <g className={s.reeds}>
        {ticks.map((a) => {
          const [x1, y1] = polar(C, C, big ? 52.4 : 47, a);
          const [x2, y2] = polar(C, C, big ? 54.2 : 54, a);
          return <path key={a} d={`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`} />;
        })}
      </g>
      {big ? (
        <>
          <text className={s.legendLight} dy={0.45}>
            <textPath href={`#${id}-legend`} textLength={300} lengthAdjust="spacing">
              {legend}
            </textPath>
          </text>
          <text className={s.legend}>
            <textPath href={`#${id}-legend`} textLength={300} lengthAdjust="spacing">
              {legend}
            </textPath>
          </text>
        </>
      ) : null}

      <circle cx={C} cy={C} r={45.6} fill={`url(#${id}-bevel)`} />
      <circle cx={C} cy={C} r={43.2} fill={`url(#${id}-enamel)`} />

      <g clipPath={`url(#${id}-face)`}>
        <g className={s.guilloche}>
          {Array.from({ length: 19 }, (_, i) => (
            <circle key={i} cx={C + 3} cy={C + 4} r={4 + i * 2.35} />
          ))}
        </g>
        <circle cx={C} cy={C + 2.2} r={43.2} className={s.innerEdge} />

        {emblem ? (
          <g transform={`translate(${C - 26.4} ${C - 26.4}) scale(2.2)`}>
            <g className={s.reliefShadow} transform="translate(.25 .6)">
              {emblem}
            </g>
            <g fill={`url(#${id}-relief)`}>{emblem}</g>
          </g>
        ) : (
          <g transform={`translate(${C} ${C - 19.6}) scale(1.36)`}>
            <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" className={s.reliefShadow} transform="translate(.5 1.3)" />
            <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" fill={`url(#${id}-relief)`} />
            <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" className={s.reliefRim} />
            <path d={BELL_SPEC} className={s.reliefSpec} />
          </g>
        )}

        <path
          d={`M${C - 43} ${C - 2}C${C - 40} ${C - 32} ${C - 20} ${C - 43} ${C} ${C - 43}S${C + 40} ${C - 32} ${C + 43} ${C - 2}C${C + 20} ${C - 12} ${C - 20} ${C - 12} ${C - 43} ${C - 2}Z`}
          fill={`url(#${id}-dome)`}
        />
      </g>
      <path d={`M${C - 38.6} ${C - 16}A41.6 41.6 0 0 1 ${C - 8} ${C - 40.8}`} className={s.spec} />
      {animated && !locked ? (
        <g clipPath={`url(#${id}-coin)`}>
          <rect x={-60} y={-20} width={40} height={170} fill={`url(#${id}-sweep)`} className={s.sweep} transform={`rotate(20 ${C} ${C})`} />
        </g>
      ) : null}
    </svg>
  );
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export interface LevelEmblemProps {
  level: number;
  size?: number;
  /** Rim metal; without one the crest is glacier glass. */
  tier?: MedalTier;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/* Hexagonal crest, point up: outer and inner rings of vertices. */
const hex = (r: number, cx0 = 50, cy0 = 56) => Array.from({ length: 6 }, (_, i) => polar(cx0, cy0, r, i * 60));
const poly = (pts: Array<[number, number]>) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`;

/**
 * Level emblem: a faceted hexagonal crest (six bevel facets catching the
 * light), an enamel plate with the Shasta ridge, and the level numeral struck
 * in metal.
 */
export function LevelEmblem({ level, size = 96, tier, label = "Level", className, style }: LevelEmblemProps) {
  const id = useGfxId("lvl");
  const numeral = ROMAN[level - 1] ?? String(level);
  const O = hex(50);
  const I = hex(38);
  const facets = O.map((p, i) => poly([p, O[(i + 1) % 6], I[(i + 1) % 6], I[i]]));
  return (
    <svg
      viewBox="0 0 100 112"
      width={(size * 100) / 112}
      height={size}
      role="img"
      aria-label={`${label} ${level}`}
      className={cx(g.root, s.emblem, tier ? s[tier] : s.glacier, className)}
      style={style}
    >
      <defs>
        <MetalDefs id={id} />
        <clipPath id={`${id}-plate`}>
          <path d={poly(I)} />
        </clipPath>
      </defs>
      <path d={poly(hex(50, 50, 58.4))} className={s.eEdge} />
      {facets.map((d, i) => (
        <path key={i} d={d} fill={`url(#${id}-rimA)`} />
      ))}
      {facets.map((d, i) => (
        <path key={`f${i}`} d={d} className={s[`facet${i}`]} />
      ))}
      <path d={poly(O)} className={s.eOutline} />
      <path d={poly(I)} fill={`url(#${id}-enamel)`} />
      <g clipPath={`url(#${id}-plate)`}>
        <g className={s.guilloche}>
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={52} cy={60} r={4 + i * 2.6} />
          ))}
        </g>
        <path d="M0 92 20 79Q23 77 26 79L32 83 47 66Q50 62.6 53 66L62 75 70 70Q72.6 68.4 75 70L100 86V112H0Z" className={s.eRidge} />
        <path d="M43.2 70.6 47 66Q50 62.6 53 66L57.2 70.8 53.6 69.4 50.4 72 47.2 69.2Z" className={s.eSnow} />
        <path d="M14 30C26 20 74 20 86 30V48C70 40 30 40 14 48Z" fill={`url(#${id}-dome)`} />
      </g>
      <text x={50} y={34} textAnchor="middle" className={s.eLabel}>
        {label}
      </text>
      <text x={50.5} y={65.2} textAnchor="middle" className={s.eNumShadow}>
        {numeral}
      </text>
      <text x={50} y={64.2} textAnchor="middle" className={s.eNum} fill={`url(#${id}-relief)`}>
        {numeral}
      </text>
    </svg>
  );
}
