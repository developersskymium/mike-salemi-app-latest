import type { CSSProperties, ReactNode } from "react";
import "./gfx.css";
import "./DayGlyph.css";
import { cls, cx, useGfxId } from "./util";

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
export const BELL_24 = "M7.65 22.34A8.06 7.3 0 0 1 4.83 12.86C4.06 9.15 4.19 4.93 5.6 3.39C6.37 2.37 7.14 1.73 8.42 1.6H15.58C16.86 1.73 17.63 2.37 18.4 3.39C19.81 4.93 19.94 9.15 19.17 12.86A8.06 7.3 0 0 1 16.35 22.34ZM6.62 10.75C6.24 7.87 6.37 5.82 7.39 4.8C8.03 4.16 8.8 3.78 9.57 3.78H14.43C15.2 3.78 15.97 4.16 16.61 4.8C17.63 5.82 17.76 7.87 17.38 10.75A8.06 7.3 0 0 0 6.62 10.75Z";

interface Art {
  /** Primary shapes, in ink. */
  ink: ReactNode;
  /** The accent part. */
  accent: ReactNode;
  /** The accent sits inside the ink (dots on the bell): no gap in colour, a plain slot in mono. */
  inset?: boolean;
  /** Extra lines knocked out of the ink (folds, snow line). */
  cut?: string;
}

/* Workout I, II, III: one, two, three bells; the front bell carries the accent. */
const B2_BACK = "M5.07 17.1A5.8 5.24 0 0 1 3.05 10.3C2.5 7.63 2.59 4.59 3.6 3.49C4.15 2.75 4.7 2.29 5.62 2.2H10.78C11.7 2.29 12.25 2.75 12.8 3.49C13.81 4.59 13.9 7.63 13.35 10.3A5.8 5.24 0 0 1 11.33 17.1ZM4.34 8.78C4.06 6.71 4.15 5.24 4.89 4.5C5.35 4.04 5.9 3.76 6.45 3.76H9.95C10.5 3.76 11.05 4.04 11.51 4.5C12.25 5.24 12.34 6.71 12.06 8.78A5.8 5.24 0 0 0 4.34 8.78Z";
const B2_FRONT = "M10.93 22.1A6.8 6.16 0 0 1 8.55 14.1C7.9 10.97 8.01 7.41 9.2 6.11C9.85 5.25 10.5 4.71 11.58 4.6H17.62C18.7 4.71 19.35 5.25 20 6.11C21.19 7.41 21.3 10.97 20.65 14.1A6.8 6.16 0 0 1 18.27 22.1ZM10.06 12.32C9.74 9.89 9.85 8.16 10.71 7.3C11.25 6.76 11.9 6.44 12.55 6.44H16.65C17.3 6.44 17.95 6.76 18.49 7.3C19.35 8.16 19.46 9.89 19.14 12.32A6.8 6.16 0 0 0 10.06 12.32Z";
const B3_BACK = "M3.68 15.36A5.04 4.56 0 0 1 1.92 9.44C1.44 7.12 1.52 4.48 2.4 3.52C2.88 2.88 3.36 2.48 4.16 2.4H8.64C9.44 2.48 9.92 2.88 10.4 3.52C11.28 4.48 11.36 7.12 10.88 9.44A5.04 4.56 0 0 1 9.12 15.36ZM3.04 8.12C2.8 6.32 2.88 5.04 3.52 4.4C3.92 4 4.4 3.76 4.88 3.76H7.92C8.4 3.76 8.88 4 9.28 4.4C9.92 5.04 10 6.32 9.76 8.12A5.04 4.56 0 0 0 3.04 8.12ZM14.88 15.36A5.04 4.56 0 0 1 13.12 9.44C12.64 7.12 12.72 4.48 13.6 3.52C14.08 2.88 14.56 2.48 15.36 2.4H19.84C20.64 2.48 21.12 2.88 21.6 3.52C22.48 4.48 22.56 7.12 22.08 9.44A5.04 4.56 0 0 1 20.32 15.36ZM14.24 8.12C14 6.32 14.08 5.04 14.72 4.4C15.12 4 15.6 3.76 16.08 3.76H19.12C19.6 3.76 20.08 4 20.48 4.4C21.12 5.04 21.2 6.32 20.96 8.12A5.04 4.56 0 0 0 14.24 8.12Z";
const B3_FRONT = "M8.46 22.25A6.55 5.93 0 0 1 6.18 14.55C5.55 11.54 5.66 8.1 6.8 6.86C7.42 6.02 8.05 5.5 9.09 5.4H14.91C15.95 5.5 16.58 6.02 17.2 6.86C18.34 8.1 18.45 11.54 17.82 14.55A6.55 5.93 0 0 1 15.54 22.25ZM7.63 12.84C7.32 10.5 7.42 8.83 8.26 8C8.78 7.48 9.4 7.17 10.02 7.17H13.98C14.6 7.17 15.22 7.48 15.74 8C16.58 8.83 16.68 10.5 16.37 12.84A6.55 5.93 0 0 0 7.63 12.84Z";

const ART: Record<DayType, Art> = {
  "workout-1": { ink: null, accent: <path d={BELL_24} fillRule="evenodd" /> },
  "workout-2": { ink: <path d={B2_BACK} fillRule="evenodd" />, accent: <path d={B2_FRONT} fillRule="evenodd" /> },
  "workout-3": { ink: <path d={B3_BACK} fillRule="evenodd" />, accent: <path d={B3_FRONT} fillRule="evenodd" /> },
  recovery: {
    ink: <path d="M9.4 4.4A8.6 8.6 0 1 0 19.7 15.4A7.3 7.3 0 0 1 9.4 4.4Z" />,
    accent: (
      <>
        <path d="M17.8 1.6Q18.15 4.65 21.2 5Q18.15 5.35 17.8 8.4Q17.45 5.35 14.4 5Q17.45 4.65 17.8 1.6Z" />
        <circle cx={21.2} cy={10.4} r={1.05} />
      </>
    ),
  },
  skill: {
    ink: <path d="M3 21.2V16.9Q3 15.7 4.2 15.7H8.2V11.4Q8.2 10.2 9.4 10.2H13.4V8Q13.4 6.8 14.6 6.8H19.8Q21 6.8 21 8V21.2Q21 22 20.2 22H3.8Q3 22 3 21.2Z" />,
    accent: <circle cx={17.2} cy={3.3} r={2.3} />,
  },
  challenge: {
    ink: (
      <>
        <path d="M2.4 20.9 9.55 8.9Q10.5 7.4 11.45 8.9L14.7 14.15 15.75 12.5Q16.6 11.2 17.45 12.5L21.6 20.9Q22 22 20.8 22H3.2Q2 22 2.4 20.9Z" />
        <rect x={9.8} y={1.6} width={1.4} height={8} rx={0.7} />
      </>
    ),
    accent: <path d="M11.2 1.9Q11.2 1.4 11.7 1.55L17.3 3.6Q17.9 3.85 17.3 4.1L11.7 6.15Q11.2 6.3 11.2 5.8Z" />,
    cut: "M7.6 13.2 9.5 14.5 11 13.1 12.6 14.4",
  },
  "on-ramp": {
    ink: <path d="M2.6 20.5 19.4 10.1Q21.4 8.9 21.4 11.2V20.4Q21.4 22 19.8 22H3.4Q1.4 22 2.6 20.5Z" />,
    accent: <path d="M4.6 12.6 11.4 8.2 10 6.6Q9.6 5.9 10.4 5.8L15.6 5.6Q16.4 5.6 16.2 6.4L14.7 11.2Q14.4 11.9 13.8 11.3L12.6 9.9 5.9 14.3Q5.2 14.8 4.7 14.1L4.4 13.6Q4 13 4.6 12.6Z" />,
  },
  overview: {
    ink: <path d="M2.4 7.1Q2.4 6.4 3.1 6.1L8.4 3.8 15.6 6.6 20.6 4.4Q21.6 4 21.6 5.1V17.6Q21.6 18.3 20.9 18.6L15.6 20.9 8.4 18.1 3.4 20.3Q2.4 20.7 2.4 19.6Z" />,
    accent: <path d="M12 4.2A4.3 4.3 0 0 1 16.3 8.5C16.3 11.6 12 15.4 12 15.4S7.7 11.6 7.7 8.5A4.3 4.3 0 0 1 12 4.2ZM12 6.9A1.55 1.55 0 1 0 12 10A1.55 1.55 0 1 0 12 6.9Z" />,
    cut: "M8.4 3.8V18.1M15.6 6.6V20.9",
  },
};

/** The glyph art on the 24 grid in one colour, for engraving into other marks (medals). */
export function dayGlyphArt(type: DayType): ReactNode {
  const a = ART[type];
  return (
    <>
      {a.ink}
      {a.inset ? null : a.accent}
    </>
  );
}

export interface DayGlyphProps {
  type: DayType;
  size?: number;
  /** "accent": palette rendering, one part in the accent; "mono": all ink. */
  tone?: "accent" | "mono";
  /** Kept for compatibility with the line set; the filled glyphs ignore it. */
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/**
 * Day-type marks, drawn like SF Symbols in palette mode: a filled primary shape
 * in ink and one accent part set off by a knock-out gap. Every glyph fills the
 * same live area for an even optical weight. Re-skin with --gfx-glyph and
 * --gfx-glyph-accent.
 */
export function DayGlyph({ type, size = 24, tone = "accent", className, style, title }: DayGlyphProps) {
  const id = useGfxId("dg");
  const a = ART[type];
  const gap = Math.max(0.9, Math.min(1.35, (24 / size) * 1.1));
  const mono = tone === "mono";
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? DAY_TYPE_LABEL[type]}
      className={cx(g.root, s.glyph, mono && s.mono, className)}
      style={style}
    >
      <defs>
        <mask id={`${id}-k`} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">
          <rect x="-2" y="-2" width="28" height="28" fill="#fff" />
          {a.inset ? (
            mono ? <g fill="#000">{a.accent}</g> : null
          ) : (
            <g fill="#000" stroke="#000" strokeWidth={gap * 2} strokeLinejoin="round">
              {a.accent}
            </g>
          )}
          {a.cut ? <path d={a.cut} fill="none" stroke="#000" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" /> : null}
        </mask>
      </defs>
      <g mask={`url(#${id}-k)`} className={s.ink}>
        {a.ink}
      </g>
      {a.inset && mono ? null : <g className={s.accent}>{a.accent}</g>}
    </svg>
  );
}
