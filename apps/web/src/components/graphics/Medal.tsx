import type { CSSProperties, ReactNode } from "react";
import { BELL_24, dayGlyphArt, type DayType } from "./DayGlyph";
import "./gfx.css";
import "./Medal.css";
import { cx, polar, useGfxId, cls } from "./util";

const g = cls("gfx");
const s = cls("gfx-medal");

export type MedalTier = "bronze" | "silver" | "gold" | "platinum";
export const MEDAL_TIERS: MedalTier[] = ["bronze", "silver", "gold", "platinum"];

/* Metal recipes: light, mid, shade, and the engraving ink. */
const METAL: Record<MedalTier, { hi: string; mid: string; lo: string; face: string; ink: string; tint: string }> = {
  bronze: { hi: "#F6D0AE", mid: "#C3814F", lo: "#6E3D1F", face: "#DCA57A", ink: "#5A2F15", tint: "#F3B98A" },
  silver: { hi: "#FFFFFF", mid: "#C3C8CF", lo: "#6E7680", face: "#E3E6EA", ink: "#4E555E", tint: "#F4F6F8" },
  gold: { hi: "#FFF3C4", mid: "#E1AE3C", lo: "#7F5410", face: "#F2CF6E", ink: "#6A4508", tint: "#FFE48A" },
  platinum: { hi: "#FFFFFF", mid: "#CBD6E2", lo: "#6F7F93", face: "#E6EDF5", ink: "#3F4E62", tint: "#CFE4FF" },
};

export interface MedalProps {
  tier: MedalTier;
  /** A day-type glyph to engrave, or custom art on the 24 grid via children. */
  glyph?: DayType;
  children?: ReactNode;
  size?: number;
  /** A slow light sweep across the metal. */
  animated?: boolean;
  /** Not yet earned: a quiet debossed outline. */
  locked?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/** Badge medal: reeded rim, bevel, satin face and an engraved glyph. */
export function Medal({ tier, glyph, children, size = 96, animated = false, locked = false, title, className, style }: MedalProps) {
  const id = useGfxId("medal");
  const m = METAL[tier];
  const C = { x: 60, y: 70 };
  const reeds = Array.from({ length: 90 }, (_, i) => i * 4);
  const art = children ?? (glyph ? dayGlyphArt(glyph) : (
    <>
      <path d={BELL_24.handle} />
      <path d={BELL_24.body} />
    </>
  ));
  const vars = {
    ["--m-hi" as string]: m.hi,
    ["--m-mid" as string]: m.mid,
    ["--m-lo" as string]: m.lo,
    ["--m-face" as string]: m.face,
    ["--m-ink" as string]: m.ink,
    ["--m-tint" as string]: m.tint,
  };

  return (
    <svg
      viewBox="0 0 120 128"
      width={(size * 120) / 128}
      height={size}
      role="img"
      aria-label={title ?? `${tier[0].toUpperCase()}${tier.slice(1)} medal${locked ? ", locked" : ""}`}
      className={cx(g.root, s.medal, locked && s.locked, animated && !locked && s.animated, className)}
      style={{ ...style, ...vars }}
    >
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className={s.hi} />
          <stop offset=".45" className={s.mid} />
          <stop offset=".7" className={s.lo} />
          <stop offset="1" className={s.mid} />
        </linearGradient>
        <linearGradient id={`${id}-bevel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className={s.lo} />
          <stop offset=".5" className={s.mid} />
          <stop offset="1" className={s.hi} />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx=".38" cy=".3" r=".85">
          <stop offset="0" className={s.tint} />
          <stop offset=".55" className={s.face} />
          <stop offset="1" className={s.mid} />
        </radialGradient>
        <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx={C.x} cy={C.y} r={52} />
        </clipPath>
      </defs>

      {/* Bail */}
      <rect x={50} y={4} width={20} height={16} rx={8} className={s.bail} />
      <rect x={55} y={9} width={10} height={6} rx={3} className={s.bailHole} />

      <circle cx={C.x} cy={C.y + 3} r={52} className={s.drop} />
      <circle cx={C.x} cy={C.y} r={52} fill={locked ? undefined : `url(#${id}-rim)`} className={s.rim} />
      {!locked ? (
        <g className={s.reeds}>
          {reeds.map((a) => {
            const [x1, y1] = polar(C.x, C.y, 48.2, a);
            const [x2, y2] = polar(C.x, C.y, 51, a);
            return <path key={a} d={`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`} />;
          })}
        </g>
      ) : null}
      <circle cx={C.x} cy={C.y} r={46.5} fill={locked ? undefined : `url(#${id}-bevel)`} className={s.bevel} />
      <circle cx={C.x} cy={C.y} r={43} fill={locked ? undefined : `url(#${id}-face)`} className={s.face2} />
      <circle cx={C.x} cy={C.y} r={38.5} className={s.fineRing} />

      <g transform={`translate(${C.x - 26.4} ${C.y - 26.4}) scale(2.2)`} className={s.engrave}>
        <g className={s.engraveLight} transform="translate(0 .35)">
          {art}
        </g>
        <g className={s.engraveInk}>{art}</g>
      </g>

      {!locked ? (
        <g clipPath={`url(#${id}-clip)`}>
          <g transform="rotate(20 60 70)">
            <rect x={-40} y={-20} width={44} height={180} fill={`url(#${id}-sweep)`} className={s.sweep} />
          </g>
        </g>
      ) : null}
    </svg>
  );
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export interface LevelEmblemProps {
  level: number;
  size?: number;
  /** Rim metal; defaults to the accent. */
  tier?: MedalTier;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** Level emblem: a faceted crest with the ridge and the level numeral. */
export function LevelEmblem({ level, size = 96, tier, label = "Level", className, style }: LevelEmblemProps) {
  const id = useGfxId("lvl");
  const m = tier ? METAL[tier] : null;
  const numeral = ROMAN[level - 1] ?? String(level);
  const vars = m ? { ["--m-hi" as string]: m.hi, ["--m-mid" as string]: m.mid, ["--m-lo" as string]: m.lo } : {};
  // Rounded hexagon, point up.
  const hex = "M50 4.5 88.3 26.6Q91 28.2 91 31.3V80.7Q91 83.8 88.3 85.4L52.7 105.9Q50 107.5 47.3 105.9L11.7 85.4Q9 83.8 9 80.7V31.3Q9 28.2 11.7 26.6L47.3 6.1Q50 4.5 52.7 6.1Z";
  return (
    <svg
      viewBox="0 0 100 112"
      width={(size * 100) / 112}
      height={size}
      role="img"
      aria-label={`${label} ${level}`}
      className={cx(g.root, s.emblem, m && s.emblemMetal, className)}
      style={{ ...style, ...vars }}
    >
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className={s.eRim0} />
          <stop offset=".5" className={s.eRim1} />
          <stop offset="1" className={s.eRim2} />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={s.eFill0} />
          <stop offset="1" className={s.eFill1} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={hex} />
        </clipPath>
      </defs>
      <path d={hex} fill={`url(#${id}-fill)`} stroke={`url(#${id}-rim)`} className={s.hex} />
      <g clipPath={`url(#${id}-clip)`}>
        <path d="M0 92 18 80 30 86 50 66 64 78 76 72 100 88V112H0Z" className={s.eRidge} />
        <path d="M0 92 18 80 30 86 50 66 64 78 76 72 100 88" className={s.eRidgeLine} />
        <path d="M45 70.8 50 66 56 71.2 52.6 70.4 50 73 47.6 70.6Z" className={s.eSnow} />
      </g>
      <text x={50} y={34} textAnchor="middle" className={s.eLabel}>
        {label}
      </text>
      <text x={50} y={62} textAnchor="middle" className={s.eNum}>
        {numeral}
      </text>
    </svg>
  );
}
