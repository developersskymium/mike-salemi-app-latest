import type { CSSProperties, ReactNode } from "react";
import "./gfx.css";
import "./DayGlyph.css";
import { cls, cx } from "./util";

const g = cls("gfx");
const s = cls("gfx-day-glyph");

export type DayType =
  | "workout-1"
  | "workout-2"
  | "workout-3"
  | "recovery"
  | "skill"
  | "challenge"
  | "on-ramp"
  | "overview";

export const DAY_TYPES: DayType[] = ["workout-1", "workout-2", "workout-3", "recovery", "skill", "challenge", "on-ramp", "overview"];

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  "workout-1": "Workout I",
  "workout-2": "Workout II",
  "workout-3": "Workout III",
  recovery: "Recovery",
  skill: "Skill Development",
  challenge: "Challenge",
  "on-ramp": "On Ramp",
  overview: "Overview",
};

/** The shared kettlebell on the 24 grid (filled, with its window), for other marks. */
export const BELL_24 = "M7.9 22.38A8.06 6.91 0 0 1 5.86 11.95C5.22 8.43 5.34 4.97 7.14 3.44C8.42 2.28 10.08 1.9 12 1.9S15.58 2.28 16.86 3.44C18.66 4.97 18.78 8.43 18.14 11.95A8.06 6.91 0 0 1 16.1 22.38ZM7.78 10.54C7.39 7.79 7.65 5.87 8.93 4.97C9.95 4.4 10.98 4.27 12 4.27S14.05 4.4 15.07 4.97C16.35 5.87 16.61 7.79 16.22 10.54A8.06 6.91 0 0 0 7.78 10.54Z";

/**
 * Summit icon art on the 24 grid: open ink strokes (base), one accent shape
 * filled with a soft tint and outlined in the accent (lit), and an accent
 * point (dot).
 */
interface Art {
  base: string;
  /** The accent shape: tinted fill, accent stroke. */
  lit: string;
  dot?: readonly [number, number];
  /** Small solid marks in ink (e.g. the workout numerals). */
  marks?: string;
}

/* The kettlebell on the 24 grid: a round body wider than tall on a flat base, a wide round handle. */
const BELL = "M7.3 11.6C5.6 8.4 5.8 4.4 8.6 3.2 9.8 2.7 10.9 2.6 12 2.6S14.2 2.7 15.4 3.2C18.2 4.4 18.4 8.4 16.7 11.6A7.2 6.2 0 1 1 7.3 11.6Z";
const BELL_WIN = "M9.3 10.6C8.5 8.4 8.6 6.1 9.9 5.3 10.6 4.9 11.3 4.8 12 4.8S13.4 4.9 14.1 5.3C15.4 6.1 15.5 8.4 14.7 10.6";
const pips = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const x = 12 - ((n - 1) * 2.5) / 2 + i * 2.5;
    return `M${(x - 0.65).toFixed(2)} 14h1.3v4.4h-1.3z`;
  }).join("");

const ART: Record<DayType, Art> = {
  "workout-1": { base: BELL_WIN, lit: BELL, marks: pips(1) },
  "workout-2": { base: BELL_WIN, lit: BELL, marks: pips(2) },
  "workout-3": { base: BELL_WIN, lit: BELL, marks: pips(3) },
  /* A low sun over still water: slow down, breathe. */
  recovery: { base: "M3 15.5h18M5.5 18.8h13M8.5 21.6h7", lit: "M6.2 15.5a5.8 5.8 0 0 1 11.6 0z", dot: [12, 5.2] },
  /* A target: practise the pattern. */
  skill: { base: "M12 3.2a8.8 8.8 0 1 0 8.8 8.8M12 7.4a4.6 4.6 0 1 0 4.6 4.6", lit: "M12 9.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z", dot: [19.4, 4.6] },
  /* The peak and its flag. */
  challenge: { base: "M2.4 20.6 9.6 9l3.4 5.2 2.6-3.6 6 10z", lit: "M9.6 9V2.8l5.2 1.7-5.2 1.9", dot: undefined },
  /* The trailhead: a post and its sign. */
  "on-ramp": { base: "M8 21.4V3M3.4 21.4h9.4", lit: "M8 5h9.2l2.6 2.7-2.6 2.7H8z" },
  /* The trail map, folded, with its pin. */
  overview: { base: "M3 6.6 8.6 4.6l6.8 2.4 5.6-2v13.8l-5.6 2-6.8-2.4-5.6 2zM8.6 4.6v13.8M15.4 7v13.8", lit: "M15.4 7l5.6-2v13.8l-5.6 2z", dot: undefined },
};

/** The glyph art on the 24 grid (classes base / lit / dot), for engraving into other marks. */
export function dayGlyphArt(type: DayType): ReactNode {
  const a = ART[type];
  return (
    <>
      <path d={a.base} className={s.base} />
      <path d={a.lit} className={s.base} />
      {a.marks ? <path d={a.marks} className={s.dot} /> : null}
      {a.dot ? <circle cx={a.dot[0]} cy={a.dot[1]} r={1.6} className={s.dot} /> : null}
    </>
  );
}

export interface DayGlyphProps {
  type: DayType;
  size?: number;
  /** "accent": the lit stretch and point in glacier light; "mono": all ink. */
  tone?: "accent" | "mono";
  /** Stroke width at 24 px (Trace icons are 1.6). */
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/**
 * Day-type marks in the Summit icon style: 1.6 ink strokes, one shape filled
 * with a soft accent tint and outlined in the accent, and an accent point.
 * Re-skin with --gfx-glyph (ink), --gfx-glyph-accent (accent) and
 * --gfx-glyph-tint (fill strength).
 */
export function DayGlyph({ type, size = 24, tone = "accent", strokeWidth = 1.6, className, style, title }: DayGlyphProps) {
  const a = ART[type];
  // Hold the stroke at about 1.6 px at icon sizes, a touch lighter when drawn large.
  const sw = size > 32 ? Math.max(1.1, ((strokeWidth * 24) / size) * 1.35) : strokeWidth;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? DAY_TYPE_LABEL[type]}
      className={cx(g.root, s.glyph, tone === "mono" && s.mono, className)}
      style={style}
      strokeWidth={sw}
    >
      <path d={a.lit} className={s.tint} />
      <path d={a.base} className={s.base} />
      <path d={a.lit} className={s.lit} />
      {a.marks ? <path d={a.marks} className={s.marks} /> : null}
      {a.dot ? <circle cx={a.dot[0]} cy={a.dot[1]} r={1.7} className={s.dot} /> : null}
    </svg>
  );
}
