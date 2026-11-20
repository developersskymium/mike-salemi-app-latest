import type { CSSProperties } from "react";
import "../gfx.css";
import "./MedalNext.css";
import { cls, cx, polar, useGfxId } from "../util";
import { BELL_OUTLINE, BELL_WINDOW } from "../figures/bell";

const g = cls("gfx");
const s = cls("gfx-mdl");

export type MedalTierNext = "bronze" | "silver" | "gold" | "platinum";

/* Metal recipes live in MedalNext.css as custom properties (one class per tier). */
const TIERS: MedalTierNext[] = ["bronze", "silver", "gold", "platinum"];
export { TIERS as MEDAL_TIERS_NEXT };

export interface MedalNextProps {
  tier?: MedalTierNext;
  size?: number;
  /** Engraved around the rim. */
  legend?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Award medal: a struck coin with a brushed metal rim and engraved legend, a
 * guilloché glacier-enamel field under a glass dome, and the kettlebell in
 * raised metal.
 */
export function MedalNext({
  tier = "platinum",
  size = 120,
  legend = "KETTLEBELL LIFESTYLE · MASTERING THE KETTLEBELL · ",
  title,
  className,
  style,
}: MedalNextProps) {
  const id = useGfxId("mdl");
  const C = 60;
  const ring = (r: number) => `M${C - r} ${C}a${r} ${r} 0 1 1 ${r * 2} 0a${r} ${r} 0 1 1 ${-r * 2} 0`;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);

  return (
    <svg
      viewBox="0 0 120 124"
      width={(size * 120) / 124}
      height={size}
      role="img"
      aria-label={title ?? `${tier[0].toUpperCase()}${tier.slice(1)} award`}
      className={cx(g.root, s.medal, s[tier], className)}
      style={style}
    >
      <defs>
        {/* Brushed metal: a diagonal sweep plus a cross sweep fakes the conic sheen of a turned rim. */}
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
        <linearGradient id={`${id}-bell`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" className={s.hi} />
          <stop offset=".45" className={s.mid} />
          <stop offset="1" className={s.lo} />
        </linearGradient>
        <linearGradient id={`${id}-dome`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={s.spec42} />
          <stop offset="1" className={s.spec0} />
        </linearGradient>
        <clipPath id={`${id}-face`}>
          <circle cx={C} cy={C} r={43.2} />
        </clipPath>
        <path id={`${id}-legend`} d={ring(48.6)} />
      </defs>

      {/* Coin thickness, then the rim face. */}
      <circle cx={C} cy={C + 2.6} r={55} fill={`url(#${id}-edge)`} />
      <circle cx={C} cy={C} r={55} fill={`url(#${id}-rimA)`} />
      <circle cx={C} cy={C} r={55} fill={`url(#${id}-rimB)`} />
      <circle cx={C} cy={C} r={54.4} className={s.rimLine} />

      {/* Reeded outer band and the engraved legend. */}
      <g className={s.reeds}>
        {(size >= 72 ? ticks : Array.from({ length: 120 }, (_, i) => i * 3)).map((a) => {
          const [x1, y1] = polar(C, C, size >= 72 ? 52.4 : 46.8, a);
          const [x2, y2] = polar(C, C, 54.2, a);
          return <path key={a} d={`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`} />;
        })}
      </g>
      {size >= 72 ? (
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

      {/* Bevel stepping down to the enamel. */}
      <circle cx={C} cy={C} r={45.6} fill={`url(#${id}-bevel)`} />
      <circle cx={C} cy={C} r={43.2} fill={`url(#${id}-enamel)`} />

      <g clipPath={`url(#${id}-face)`}>
        {/* Guilloché: fine engraved rings in the enamel. */}
        <g className={s.guilloche}>
          {Array.from({ length: 19 }, (_, i) => (
            <circle key={i} cx={C + 3} cy={C + 4} r={4 + i * 2.35} />
          ))}
        </g>
        {/* Inner shadow at the top edge where the field meets the bevel. */}
        <circle cx={C} cy={C + 2.2} r={43.2} className={s.innerEdge} />

        {/* The kettlebell in raised metal: cast shadow, body, top light. */}
        <g transform={`translate(${C} ${C - 19.6}) scale(1.42)`}>
          <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" className={s.bellShadow} transform="translate(.5 1.3)" />
          <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" fill={`url(#${id}-bell)`} />
          <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" className={s.bellRim} />
          <path d="M-7.1 16.4A9.4 9.4 0 0 1 .4 10.6" className={s.bellSpec} />
        </g>

        {/* Glass dome over the field. */}
        <path d={`M${C - 43} ${C - 2}C${C - 40} ${C - 32} ${C - 20} ${C - 43} ${C} ${C - 43}S${C + 40} ${C - 32} ${C + 43} ${C - 2}C${C + 20} ${C - 12} ${C - 20} ${C - 12} ${C - 43} ${C - 2}Z`} fill={`url(#${id}-dome)`} />
      </g>
      <path d={`M${C - 38.6} ${C - 16}A41.6 41.6 0 0 1 ${C - 8} ${C - 40.8}`} className={s.spec} />
    </svg>
  );
}
