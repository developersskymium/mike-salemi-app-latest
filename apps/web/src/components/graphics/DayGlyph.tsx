import type { CSSProperties, ReactNode } from "react";
import "./gfx.css";
import "./DayGlyph.css";
import { cx, cls } from "./util";

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

export const DAY_TYPES: DayType[] = [
  "workout-1",
  "workout-2",
  "workout-3",
  "recovery",
  "skill",
  "challenge",
  "on-ramp",
  "overview",
];

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

/** Kettlebell outline on the 24 grid, shared with the medal and kettlebell marks. */
export const BELL_24 = {
  handle: "M7.75 9.7 7.4 6.3C7.25 4.45 8.55 3.2 10.4 3.2h3.2c1.85 0 3.15 1.25 3 3.1l-.35 3.4",
  body: "M8.85 20.6a6.6 6.6 0 1 1 6.3 0Z",
};

/* Each glyph: neutral line work plus exactly one accent detail (class s.a). */
const ART: Record<DayType, ReactNode> = {
  "workout-1": (
    <>
      <path d={BELL_24.handle} />
      <path d={BELL_24.body} />
      <path className={s.a} d="M12 12.6v4.4" />
    </>
  ),
  "workout-2": (
    <>
      <path d={BELL_24.handle} />
      <path d={BELL_24.body} />
      <path className={s.a} d="M10.75 12.6v4.4M13.25 12.6v4.4" />
    </>
  ),
  "workout-3": (
    <>
      <path d={BELL_24.handle} />
      <path d={BELL_24.body} />
      <path className={s.a} d="M9.6 12.6v4.4M12 12.6v4.4M14.4 12.6v4.4" />
    </>
  ),
  recovery: (
    <>
      <path d="M3 16.6c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0" />
      <path d="M6 20.4c1.5-1.1 3-1.1 4.5 0s3 1.1 4.5 0" />
      <path className={cx(s.a, s.fill)} d="M14.6 3.4a4.6 4.6 0 1 0 5.1 6.6 3.7 3.7 0 0 1-5.1-6.6Z" />
    </>
  ),
  skill: (
    <>
      <path d="M3.2 20.6h5v-4.6h5v-4.6h5V6.8" />
      <path d="M3.2 20.6h17.6" className={s.soft} />
      <circle className={cx(s.a, s.fill)} cx="18.2" cy="3.7" r="1.55" />
    </>
  ),
  challenge: (
    <>
      <path d="M2.6 20.6 9.6 9.2l3.1 4.7 2.4-3.3 6.3 10Z" />
      <path d="m7.5 12.6 2.1 1.4 1.4-1.1" className={s.soft} />
      <path d="M9.6 9.2V3.2" />
      <path className={cx(s.a, s.fill)} d="M9.6 3.2 14.2 4.8 9.6 6.5Z" />
    </>
  ),
  "on-ramp": (
    <>
      <path d="M2.8 19.6h5c4.6 0 6.2-9.8 11.6-11.4" />
      <path d="M2.8 19.6h18.4" className={s.soft} />
      <circle className={cx(s.a, s.fill)} cx="19.7" cy="7.9" r="1.75" />
    </>
  ),
  overview: (
    <>
      <path d="m2.6 19.2 4.6-5.6 3 2.6 4.6-7.1 2.9 3 3.7-5.4" />
      <path d="M2.6 21h18.8" className={s.soft} />
      <circle cx="7.2" cy="13.6" r="1.3" className={s.dot} />
      <circle cx="14.8" cy="9.1" r="1.3" className={s.dot} />
      <circle className={cx(s.a, s.fill)} cx="21.4" cy="6.7" r="1.5" />
    </>
  ),
};

/** The raw glyph art on the 24 grid, for embedding in other marks (medals). */
export function dayGlyphArt(type: DayType): ReactNode {
  return ART[type];
}

export interface DayGlyphProps {
  type: DayType;
  size?: number;
  /** "accent" draws the one accent detail in --accent; "mono" keeps it in the text colour. */
  tone?: "accent" | "mono";
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/** 24px day-type marks: one family, one stroke, one accent detail each. */
export function DayGlyph({ type, size = 24, tone = "accent", strokeWidth = 1.6, className, style, title }: DayGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? DAY_TYPE_LABEL[type]}
      className={cx(g.root, g.line, s.glyph, tone === "mono" && s.mono, className)}
      style={style}
      strokeWidth={strokeWidth}
    >
      {ART[type]}
    </svg>
  );
}
