import type { CSSProperties, ReactNode } from "react";
import { dayGlyphArt, type DayType } from "./DayGlyph";
import { BELL_OUTLINE, BELL_SPEC, BELL_WINDOW } from "./figures/bell";
import "./gfx.css";
import "./Medal.css";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-medal");

export type MedalTier = "bronze" | "silver" | "gold" | "platinum";
export const MEDAL_TIERS: MedalTier[] = ["bronze", "silver", "gold", "platinum"];

export interface MedalProps {
  tier: MedalTier;
  /** A day-type glyph struck in raised metal, or custom art on the 24 grid via children (strokes). */
  glyph?: DayType;
  children?: ReactNode;
  size?: number;
  /** One light sweep across the pin when it appears. */
  animated?: boolean;
  /** Not yet earned: unpainted metal, the enamel left empty. */
  locked?: boolean;
  /** Set in the enamel band around the face at larger sizes. */
  legend?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const ring = (c: number, r: number) => `M${c - r} ${c}a${r} ${r} 0 1 1 ${r * 2} 0a${r} ${r} 0 1 1 ${-r * 2} 0`;

/* Shasta in the enamel, in the 120 frame: the mountain and its snow cap, kept low on the face. */
const PIN_MTN = "M8 104L34 86C40 82 44 78 48 76L52 73L56 74C60 70 64 66 68 64L72 66C78 72 86 80 96 88L112 104Z";
const PIN_SNOW = "M48 76L52 73L56 74C60 70 64 66 68 64L72 66C75 69 78 72 81 75L76 76L73 74L70 78L66 74L62 79L58 76L54 80L51 77Z";

/** Shared metal and enamel gradients (classes resolve the tier's custom properties). */
function PinDefs({ id }: { id: string }) {
  return (
    <>
      <linearGradient id={`${id}-metal`} x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" className={s.hi} />
        <stop offset=".3" className={s.mid} />
        <stop offset=".55" className={s.lo} />
        <stop offset=".78" className={s.mid} />
        <stop offset="1" className={s.hi} />
      </linearGradient>
      <linearGradient id={`${id}-metalV`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className={s.hi} />
        <stop offset=".5" className={s.mid} />
        <stop offset="1" className={s.lo} />
      </linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className={s.lo} />
        <stop offset="1" className={s.deep} />
      </linearGradient>
      <radialGradient id={`${id}-enamel`} cx=".38" cy=".3" r=".85">
        <stop offset="0" className={s.enamelHi} />
        <stop offset=".6" className={s.enamelMid} />
        <stop offset="1" className={s.enamelLo} />
      </radialGradient>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className={s.skyHi} />
        <stop offset="1" className={s.skyLo} />
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
 * Award medal as an enamel pin: a polished metal rim (bronze, silver, gold or
 * platinum), a glossy enamel face in the tier's colour with Shasta set in it
 * between raised metal lines, and the award struck in metal relief. Larger
 * pins carry their legend in an enamel band. Materials are custom properties
 * (see Medal.css).
 */
export function Medal({ tier, glyph, children, size = 96, animated = false, locked = false, legend = "KETTLEBELL LIFESTYLE · MIKE SALEMI · ", title, className, style }: MedalProps) {
  const id = useGfxId("medal");
  const C = 60;
  const big = size >= 80;
  const rf = big ? 39 : 47;
  const emblem = children ?? (glyph ? dayGlyphArt(glyph) : null);
  const metal = { ["--m" as string]: `url(#${id}-metalV)` } as CSSProperties;

  return (
    <svg
      viewBox="0 0 120 124"
      width={(size * 120) / 124}
      height={size}
      role="img"
      aria-label={title ?? `${tier[0].toUpperCase()}${tier.slice(1)} medal${locked ? ", locked" : ""}`}
      className={cx(g.root, s.medal, s[tier], locked && s.locked, animated && !locked && s.animated, className)}
      style={{ ...style, ...metal }}
    >
      <defs>
        <PinDefs id={id} />
        <clipPath id={`${id}-face`}>
          <circle cx={C} cy={C} r={rf} />
        </clipPath>
        <clipPath id={`${id}-coin`}>
          <circle cx={C} cy={C} r={55} />
        </clipPath>
        <path id={`${id}-legend`} d={ring(C, 44.2)} />
      </defs>

      <ellipse cx={C} cy={C + 58} rx={36} ry={3.6} className={s.cast} />
      <circle cx={C} cy={C + 3} r={55} fill={`url(#${id}-edge)`} />
      <circle cx={C} cy={C} r={55} fill={`url(#${id}-metal)`} />
      <circle cx={C} cy={C} r={52.6} className={s.groove} />
      {big ? (
        <>
          <circle cx={C} cy={C} r={50} className={s.band} />
          <text className={s.legend} dy={1.9}>
            <textPath href={`#${id}-legend`} textLength={274} lengthAdjust="spacing">
              {legend}
            </textPath>
          </text>
        </>
      ) : null}
      <circle cx={C} cy={C} r={rf + 2.2} fill={`url(#${id}-metal)`} />
      <g clipPath={`url(#${id}-face)`}>
        <circle cx={C} cy={C} r={rf} fill={`url(#${id}-enamel)`} />
        {!locked ? (
          <g transform={big ? `translate(12 14) scale(.8)` : "translate(0 4)"}>
            <path d={PIN_MTN} className={s.mtn} />
            <path d={PIN_SNOW} className={s.snow} />
            <path d={PIN_MTN} className={s.cloison} />
            <path d={PIN_SNOW} className={s.cloison} />
          </g>
        ) : null}
        {emblem ? (
          <g transform={`translate(${C - 19.2} ${C - 28}) scale(1.6)`}>
            <g className={s.reliefShadow} transform="translate(.35 .55)">
              {emblem}
            </g>
            <g className={s.relief}>{emblem}</g>
          </g>
        ) : (
          <g transform={`translate(${C} ${C - 30}) scale(1.15)`}>
            <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" className={s.bellShadow} transform="translate(.5 1.1)" />
            <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" fill={`url(#${id}-metalV)`} />
            <path d={BELL_SPEC} className={s.bellSpec} />
          </g>
        )}
        {/* The enamel's glassy dome. */}
        <path d={`M${C - rf * 0.86} ${C - rf * 0.2}A${rf} ${rf} 0 0 1 ${C - rf * 0.1} ${C - rf * 0.92}C${C - rf * 0.5} ${C - rf * 0.78} ${C - rf * 0.76} ${C - rf * 0.52} ${C - rf * 0.86} ${C - rf * 0.2}Z`} className={s.gloss} />
      </g>
      <path d={`M${C - 50} ${C - 20}A54 54 0 0 1 ${C - 18} ${C - 51}`} className={s.spec} />
      {!locked && big ? <path d="M80 30l1.1 2.9 2.9 1.1-2.9 1.1L80 38l-1.1-2.9-2.9-1.1 2.9-1.1z" className={s.glint} /> : null}
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
  /** Rim metal; without one the crest is silver on glacier enamel. */
  tier?: MedalTier;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const SHIELD = "M50 4L88 14C89.6 14.4 90.6 15.7 90.6 17.4V52C90.6 78 72.6 96.6 51.2 107.4C50.4 107.8 49.6 107.8 48.8 107.4C27.4 96.6 9.4 78 9.4 52V17.4C9.4 15.7 10.4 14.4 12 14Z";
const SHIELD_IN = "M50 11.4L83 20V52C83 73.6 68.4 89.8 50 99.6C31.6 89.8 17 73.6 17 52V20Z";

/**
 * Level emblem as an enamel shield pin: metal rim, a glacier-enamel sky over
 * Shasta in white enamel, the level numeral struck in metal, and an ember
 * ribbon carrying the label across the foot of the shield.
 */
export function LevelEmblem({ level, size = 96, tier, label = "Level", className, style }: LevelEmblemProps) {
  const id = useGfxId("lvl");
  const numeral = ROMAN[level - 1] ?? String(level);
  return (
    <svg
      viewBox="0 0 100 112"
      width={(size * 100) / 112}
      height={size}
      role="img"
      aria-label={`${label} ${level}`}
      className={cx(g.root, s.emblem, tier ? s[tier] : s.silver, s.crest, className)}
      style={style}
    >
      <defs>
        <PinDefs id={id} />
        <clipPath id={`${id}-in`}>
          <path d={SHIELD_IN} />
        </clipPath>
      </defs>
      <path d={SHIELD} transform="translate(0 2.6)" fill={`url(#${id}-edge)`} />
      <path d={SHIELD} fill={`url(#${id}-metal)`} />
      <path d={SHIELD_IN} fill={`url(#${id}-sky)`} />
      <g clipPath={`url(#${id}-in)`}>
        <circle cx={74} cy={27} r={4.6} className={s.sun} />
        <path d="M6 96L30 74C35 70 38 66 42 64L45 62L48 63C52 58 56 54 59 52L63 54C69 60 77 68 86 76L100 90V112H6Z" className={s.crestMtn} />
        <path d="M42 64L45 62L48 63C52 58 56 54 59 52L63 54C66 57 69 60 72 63L67 64L64 62L61 66L57 62L53 67L50 64L46 68L44 65Z" className={s.crestSnow} />
        <path d="M6 96L30 74C35 70 38 66 42 64L45 62L48 63C52 58 56 54 59 52L63 54C69 60 77 68 86 76L100 90" className={s.cloison} />
        <path d="M0 88C20 82 34 86 50 84S80 80 100 84V112H0Z" className={s.crestHill} />
        <path d="M0 88C20 82 34 86 50 84S80 80 100 84" className={s.cloison} />
      </g>
      <path d={SHIELD_IN} className={s.innerLine} />
      <text x={50} y={58} textAnchor="middle" className={s.numShadow} dy={1.4}>
        {numeral}
      </text>
      <text x={50} y={58} textAnchor="middle" className={s.num} fill={`url(#${id}-metalV)`}>
        {numeral}
      </text>
      {/* Ribbon: folded tails behind, the band in front. */}
      <path d="M8 80L16 78V92L8 94L11 87Z" className={s.ribbonTail} />
      <path d="M92 80L84 78V92L92 94L89 87Z" className={s.ribbonTail} />
      <path d="M14 76C34 72 66 72 86 76V90C66 86 34 86 14 90Z" className={s.ribbon} />
      <path d="M14 76C34 72 66 72 86 76" className={s.ribbonEdge} />
      <text x={50} y={85.4} textAnchor="middle" className={s.ribbonText}>
        {label.toUpperCase()}
      </text>
      <path d="M20 22C30 18 40 15.6 50 13.6" className={s.spec} strokeWidth={1.6} />
    </svg>
  );
}
