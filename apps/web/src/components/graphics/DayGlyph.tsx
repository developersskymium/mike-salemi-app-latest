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
 * Trace icon art: open strokes in ink (base), the stretch already exposed in
 * glacier light (lit), and the light point where it ends (dot).
 */
interface Art {
  base: string;
  lit: string;
  dot: readonly [number, number];
  /** Quiet marks along the path (unlit nodes). */
  nodes?: ReadonlyArray<readonly [number, number]>;
}

/* The swing's pendulum arc, lit a third, two thirds or all the way: Workout I, II, III. */
const ARC = "M3.39 10.01A9.5 9.5 0 0 0 20.61 10.01";
const ARC_NODES = [
  [8.49, 14.83],
  [15.51, 14.83],
] as const;

const ART: Record<DayType, Art> = {
  "workout-1": { base: ARC, lit: "M3.39 10.01A9.5 9.5 0 0 0 8.49 14.83", dot: [8.49, 14.83], nodes: [ARC_NODES[1]] },
  "workout-2": { base: ARC, lit: "M3.39 10.01A9.5 9.5 0 0 0 15.51 14.83", dot: [15.51, 14.83], nodes: [ARC_NODES[0]] },
  "workout-3": { base: ARC, lit: ARC, dot: [20.61, 10.01], nodes: ARC_NODES },
  recovery: { base: "M3 9c3-3 6-3 9 0s6 3 9 0M3 15c3-3 6-3 9 0s6 3 9 0", lit: "M12 15c3 3 6 3 9 0", dot: [21, 15] },
  skill: { base: "M3 20h4.5v-4.5H12V11h4.5V6.5H21", lit: "M16.5 6.5H21", dot: [21, 6.5] },
  challenge: { base: "M2 20 9 8l4 6 3-4 6 10z", lit: "M4.9 15 9 8", dot: [9, 8] },
  "on-ramp": { base: "M3 20.5h18M4 18c5 0 8-2 11-6s4.5-5 6-5.5", lit: "M15 12c2.2-3.1 4.5-5 6-5.5", dot: [21, 6.5] },
  overview: { base: "M3 20h18M5 17l5-5 4 3 6-7", lit: "M14 15l6-7", dot: [20, 8] },
};

/** The glyph art on the 24 grid (classes base / lit / dot), for engraving into other marks. */
export function dayGlyphArt(type: DayType): ReactNode {
  const a = ART[type];
  return (
    <>
      <path d={a.base} className={s.base} />
      <path d={a.lit} className={s.lit} />
      <circle cx={a.dot[0]} cy={a.dot[1]} r={1.7} className={s.dot} />
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
 * Day-type marks in the Trace icon style: 1.6 strokes, open shapes, the
 * exposed stretch in glacier light ending in a light point. Re-skin with
 * --gfx-glyph (ink), --gfx-glyph-accent (lit) and --gfx-glyph-point (dot).
 */
export function DayGlyph({ type, size = 24, tone = "accent", strokeWidth = 1.6, className, style, title }: DayGlyphProps) {
  const a = ART[type];
  // Hold the stroke at about 1.6 px at icon sizes, a touch lighter when drawn large.
  const sw = size > 32 ? Math.max(1.1, (strokeWidth * 24) / size * 1.35) : strokeWidth;
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
      <path d={a.base} className={s.base} />
      {a.nodes?.map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r={0.9} className={s.node} />)}
      <path d={a.lit} className={s.lit} />
      <circle cx={a.dot[0]} cy={a.dot[1]} r={1.7} className={s.dot} />
    </svg>
  );
}
