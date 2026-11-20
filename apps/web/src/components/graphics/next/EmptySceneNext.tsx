import type { CSSProperties, ReactNode } from "react";
import "../gfx.css";
import "./EmptySceneNext.css";
import { BELL_OUTLINE, BELL_WINDOW } from "../figures/bell";
import { cls, cx, useGfxId } from "../util";

const g = cls("gfx");
const s = cls("gfx-es");

export interface EmptySceneNextProps {
  /** Width in px; height follows 3:2. */
  size?: number;
  /** One-shot entrance: the glass settles into place (off under reduced motion). */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/** A glass panel: the world behind it, blurred, under a frosted fill and a specular rim. */
function GlassCard({
  base,
  id,
  x,
  y,
  w,
  h,
  r,
  rotate,
  world,
  children,
  className,
}: {
  base: string;
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  rotate: number;
  world: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const cxp = x + w / 2;
  const cyp = y + h / 2;
  return (
    <g className={className}>
      <g transform={`rotate(${rotate} ${cxp} ${cyp})`}>
        <clipPath id={`${id}-clip`}>
          <rect x={x} y={y} width={w} height={h} rx={r} />
        </clipPath>
        <g clipPath={`url(#${id}-clip)`}>
          {/* Refraction: what sits behind the glass, blurred, drawn in the card's own frame. */}
          <g transform={`rotate(${-rotate} ${cxp} ${cyp})`} filter={`url(#${base}-blur)`}>
            {world}
          </g>
          <rect x={x} y={y} width={w} height={h} className={s.glassFill} />
          <rect x={x} y={y} width={w} height={h * 0.5} className={s.glassSheen} fill={`url(#${base}-sheen)`} />
          {children}
        </g>
        <rect x={x} y={y} width={w} height={h} rx={r} className={s.glassEdge} />
        <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx={r - 0.5} className={s.glassRim} stroke={`url(#${base}-rim)`} />
      </g>
    </g>
  );
}

/**
 * "No programs yet": a small layered world. A mountain range, two glass
 * program cards standing empty in front of it (frosted, refracting the peaks),
 * and the kettlebell waiting on the ground: the one accent.
 */
export function EmptySceneNext({ size = 240, animated = true, className, style, title }: EmptySceneNextProps) {
  const id = useGfxId("es");

  // The little world: a round field of sky with two mountain ranges and a snow line.
  const world = (
    <g clipPath={`url(#${id}-porthole)`}>
      <rect x={40} y={14} width={152} height={124} fill={`url(#${id}-sky)`} />
      <path d="M36 112 58 95Q62 91.6 66 95L84 106 110 81Q114 77.4 118 81L140 99 196 110V140H36Z" className={s.mtnBack} />
      <path d="M36 126 66 96Q71 90.6 76 96L96 116 144 64Q152 54.6 160 64L176 84Q181 78.6 186 84L196 96V140H36Z" fill={`url(#${id}-mtn)`} />
      <path d="M137 72.4 144 64Q152 54.6 160 64L167.4 73.2 161.6 70.4 156.4 75.2 151 70.6 145 75.4Z" className={s.snow} />
      <path d="M61 101.2 66 96Q71 90.6 76 96L80.6 100.8 76.6 99.2 72.6 102 68.2 98.8Z" className={s.snow} />
      <rect x={36} y={112} width={160} height={28} fill={`url(#${id}-haze)`} />
    </g>
  );

  return (
    <svg
      viewBox="0 0 240 160"
      width={size}
      height={(size * 160) / 240}
      role="img"
      aria-label={title ?? "Two empty glass program cards in front of a mountain range, a kettlebell waiting on the ground"}
      className={cx(g.root, s.scene, animated && s.animated, className)}
      style={style}
    >
      <defs>
        <clipPath id={`${id}-porthole`}>
          <circle cx={116} cy={78} r={62} />
        </clipPath>
        <linearGradient id={`${id}-sky`} x1="0" y1="16" x2="0" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" className={s.skyA} />
          <stop offset="1" className={s.skyB} />
        </linearGradient>
        <linearGradient id={`${id}-mtn`} x1="0" y1="58" x2="0" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0" className={s.mtnTop} />
          <stop offset="1" className={s.mtnBottom} />
        </linearGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="112" x2="0" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0" className={s.hazeA} />
          <stop offset="1" className={s.hazeB} />
        </linearGradient>
        <radialGradient id={`${id}-floor`} cx=".5" cy=".5" r=".5">
          <stop offset="0" className={s.floorA} />
          <stop offset="1" className={s.floorB} />
        </radialGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={s.sheenA} />
          <stop offset="1" className={s.spec0} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className={s.spec} style={{ stopOpacity: 0.95 }} />
          <stop offset=".3" className={s.spec} style={{ stopOpacity: 0.25 }} />
          <stop offset=".6" className={s.spec} style={{ stopOpacity: 0.05 }} />
          <stop offset="1" className={s.spec} style={{ stopOpacity: 0.6 }} />
        </linearGradient>
        <radialGradient id={`${id}-bell`} cx=".34" cy=".58" r=".7">
          <stop offset="0" className={s.bellHi} />
          <stop offset=".55" className={s.bellMid} />
          <stop offset="1" className={s.bellLo} />
        </radialGradient>
        <radialGradient id={`${id}-shadow`} cx=".5" cy=".5" r=".5">
          <stop offset="0" className={s.shadowA} />
          <stop offset="1" className={s.shadowB} />
        </radialGradient>
        <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      <ellipse cx={120} cy={141} rx={96} ry={9} fill={`url(#${id}-floor)`} />
      {world}
      <circle cx={116} cy={78} r={61.6} className={s.portRim} />

      <GlassCard base={id} id={`${id}-c1`} x={56} y={46} w={80} h={56} r={14} rotate={-7} world={world} className={s.back}>
        <rect x={68} y={58} width={28} height={5} rx={2.5} className={s.lineSoft} />
        <rect x={68} y={68} width={18} height={5} rx={2.5} className={s.lineSoft} />
      </GlassCard>
      <GlassCard base={id} id={`${id}-c2`} x={100} y={74} w={100} h={62} r={16} rotate={4} world={world} className={s.front}>
        <rect x={112} y={85} width={26} height={26} rx={8} className={s.thumb} />
        <rect x={146} y={89} width={38} height={5.5} rx={2.75} className={s.line} />
        <rect x={146} y={100} width={24} height={5.5} rx={2.75} className={s.lineSoft} />
        <rect x={112} y={120} width={74} height={4} rx={2} className={s.track} />
      </GlassCard>

      <g className={s.bell}>
        <ellipse cx={62} cy={141.2} rx={17} ry={3.4} fill={`url(#${id}-shadow)`} />
        <g transform="translate(62 111.2) scale(.96)">
          <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" fill={`url(#${id}-bell)`} />
          <path d="M-7 17A9.4 9.4 0 0 1 1 11" className={s.bellSpec} />
          <path d="M-3.4-.4H3.4" className={s.bellSheen} />
        </g>
      </g>
    </svg>
  );
}
