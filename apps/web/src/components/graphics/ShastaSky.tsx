import type { CSSProperties } from "react";
import "./gfx.css";
import "./ShastaSky.css";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-shasta");

export type SkyTime = "dawn" | "day" | "dusk" | "night";
export const SKY_TIMES: SkyTime[] = ["dawn", "day", "dusk", "night"];

/** The time of day for a clock hour (local time). */
export function skyTimeFor(hour: number): SkyTime {
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "dusk";
  return "night";
}

export interface ShastaSkyProps {
  time: SkyTime;
  /** Rendered width; the art is 390×180 and slices to fill whatever box it is given. */
  width?: number | string;
  height?: number | string;
  /** One-shot: the sun or moon eases into place. */
  animated?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/* Mount Shasta from the west: Shastina's cone on the left shoulder, the main summit, long flanks. */
const SHASTA =
  "M-10 154C40 142 82 128 120 116C140 110 152 101 161 91C167 83 171 77 176.5 74C181 72 185.5 72.6 188.6 75.6C194 70 200 62 208 54C219 43 229 36.4 237.6 36.2C246 36 252 40 258 46.4C271 60 290 80 312 96C336 112 364 121 400 128V190H-10Z";
const SNOW =
  "M214.6 48.6C223 41 230.4 36.4 237.6 36.2C246 36 252 40 258 46.4C263.6 52.4 269 58.4 274.6 64.4L268.4 62 266.4 70.6 260.6 61.6 255.4 72.8 251 60.6 246.2 68.2 242.4 57.4 236 64.6 233.4 55.4 227.2 62 224.6 52.6 218.6 56.6Z" +
  "M181.4 73.4C183.8 72.4 186.4 73 188.6 75.6L186 78.4 184 75.8 181.6 78.6 179.6 76Z";
const RIDGE =
  "M-10 160C30 152 64 150 100 154C140 158 170 150 206 147C250 143 292 151 330 150C356 149 380 146 400 144V190H-10Z";
const PINES = Array.from({ length: 26 }, (_, i) => {
  const x = -4 + i * 16 + ((i * 7) % 5);
  const h = 10 + ((i * 11) % 7);
  const base = 158 - Math.sin(i * 0.7) * 4;
  return `M${x} ${base}L${x + 4.2} ${base - h}L${x + 8.4} ${base}Z`;
}).join("");

/**
 * Mount Shasta under a time-of-day sky for the Today header: dawn, day, dusk
 * or night. Every colour is a custom property (--gfx-sky-<time>-*), so the
 * header can be re-tinted without touching the art.
 */
export function ShastaSky({ time, width = "100%", height, animated = false, title, className, style }: ShastaSkyProps) {
  const id = useGfxId("sky");
  const night = time === "night";
  const sun = { dawn: [118, 112, 15], day: [96, 50, 13], dusk: [330, 104, 15], night: [90, 46, 9] }[time];
  return (
    <svg
      viewBox="0 0 390 180"
      preserveAspectRatio="xMidYMax slice"
      width={width}
      height={height}
      role="img"
      aria-label={title ?? `Mount Shasta at ${time}`}
      className={cx(g.root, s.sky, s[time], animated && s.animated, className)}
      style={style}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={s.top} />
          <stop offset=".62" className={s.mid} />
          <stop offset="1" className={s.low} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
          <stop offset="0" className={s.glowA} />
          <stop offset="1" className={s.glowB} />
        </radialGradient>
        <linearGradient id={`${id}-mtn`} x1="0" y1="36" x2="0" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0" className={s.mtnHi} />
          <stop offset="1" className={s.mtnLo} />
        </linearGradient>
        <linearGradient id={`${id}-lit`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" className={s.litA} />
          <stop offset=".6" className={s.litB} />
        </linearGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="118" x2="0" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0" className={s.hazeA} />
          <stop offset="1" className={s.hazeB} />
        </linearGradient>
        <mask id={`${id}-moon`}>
          <circle cx={sun[0]} cy={sun[1]} r={sun[2]} fill="#fff" />
          <circle cx={sun[0] + 5} cy={sun[1] - 3.4} r={sun[2]} fill="#000" />
        </mask>
      </defs>
      <rect x={-10} y={-10} width={410} height={200} fill={`url(#${id}-sky)`} />
      {night ? (
        <g className={s.stars}>
          {Array.from({ length: 34 }, (_, i) => (
            <circle key={i} cx={(i * 97) % 390} cy={8 + ((i * 53) % 84)} r={0.5 + ((i * 7) % 4) * 0.22} />
          ))}
        </g>
      ) : null}
      <g className={s.orb}>
        <circle cx={sun[0]} cy={sun[1]} r={sun[2] * 4} fill={`url(#${id}-glow)`} />
        <circle cx={sun[0]} cy={sun[1]} r={sun[2]} className={s.disc} mask={night ? `url(#${id}-moon)` : undefined} />
      </g>
      <path d={SHASTA} fill={`url(#${id}-mtn)`} />
      <path d={SHASTA} fill={`url(#${id}-lit)`} className={s.lit} />
      <path d={SNOW} className={s.snow} />
      <path d="M244 62 250 86M232 63 236 92M256 70 266 96M224 60 222 86" className={s.couloir} />
      <rect x={-10} y={110} width={410} height={60} fill={`url(#${id}-haze)`} />
      <path d={RIDGE} className={s.ridge} />
      <path d={PINES} className={s.pines} />
    </svg>
  );
}
