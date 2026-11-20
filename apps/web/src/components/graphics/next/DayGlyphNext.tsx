import type { CSSProperties, ReactNode } from "react";
import "../gfx.css";
import "./DayGlyphNext.css";
import { cls, cx, useGfxId } from "../util";

const g = cls("gfx");
const s = cls("gfx-dg");

export type StudyDayType = "workout-1" | "recovery" | "skill" | "challenge";

/**
 * Filled glyphs on the 24 grid, drawn like SF Symbols in palette mode: a
 * primary shape in ink and one secondary part in the accent, separated by a
 * knock-out gap. Every glyph fills the same 20×20 live area for an even
 * optical weight.
 */

/* The kettlebell (same drawing as the large bell, scaled to the grid). */
const BELL =
  // A stout ball wider than its handle, a short wide window: a kettlebell, never a padlock.
  "M9 21.6A8 8 0 0 1 5.6 9.4C5.3 7.9 5.4 6.2 5.8 5C6.4 3.2 7.6 2.4 9.4 2.4H14.6C16.4 2.4 17.6 3.2 18.2 5C18.6 6.2 18.7 7.9 18.4 9.4A8 8 0 0 1 15 21.6Z" +
  "M7.7 7.45V6.2C7.7 5.1 8.3 4.5 9.4 4.5H14.6C15.7 4.5 16.3 5.1 16.3 6.2V7.45A8 8 0 0 0 7.7 7.45Z";

interface Art {
  /** Primary shapes (ink). */
  ink: ReactNode;
  /** The accent part. */
  accent: ReactNode;
  /** The accent sits inside the ink (a numeral on the bell): no gap in palette mode, a plain slot in mono. */
  inset?: boolean;
}

const pill = (x: number, y: number, h: number, w = 1.9) => (
  <rect key={x} x={x - w / 2} y={y} width={w} height={h} rx={w / 2} />
);

const ART: Record<StudyDayType, Art> = {
  "workout-1": {
    ink: <path d={BELL} fillRule="evenodd" />,
    accent: <circle cx={12} cy={15.2} r={1.9} />,
    inset: true,
  },
  recovery: {
    ink: <path d="M9.78 5.1A8 8 0 1 0 18.84 14.58A6.8 6.8 0 0 1 9.78 5.1Z" />,
    accent: (
      <>
        <path d="M18.4 1.6Q18.75 4.65 21.8 5Q18.75 5.35 18.4 8.4Q18.05 5.35 15 5Q18.05 4.65 18.4 1.6Z" />
        <circle cx={21.3} cy={10.4} r={1.05} />
      </>
    ),
  },
  skill: {
    ink: (
      <path d="M3 21.2V16.9Q3 15.7 4.2 15.7H8.2V11.4Q8.2 10.2 9.4 10.2H13.4V8Q13.4 6.8 14.6 6.8H19.8Q21 6.8 21 8V21.2Q21 22 20.2 22H3.8Q3 22 3 21.2Z" />
    ),
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
  },
};

/* Snow line knocked out of the mountain. */
const SNOW = "M7.6 13.2 9.5 14.5 11 13.1 12.6 14.4";

export const STUDY_DAY_TYPES: StudyDayType[] = ["workout-1", "recovery", "skill", "challenge"];
export const STUDY_DAY_LABEL: Record<StudyDayType, string> = {
  "workout-1": "Workout I",
  recovery: "Recovery",
  skill: "Skill Development",
  challenge: "Challenge",
};

export interface DayGlyphNextProps {
  type: StudyDayType;
  size?: number;
  /** "accent": palette rendering (one part in the accent); "mono": all ink, accent parts knocked out of the ink. */
  tone?: "accent" | "mono";
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function DayGlyphNext({ type, size = 24, tone = "accent", className, style, title }: DayGlyphNextProps) {
  const id = useGfxId("dg");
  const a = ART[type];
  // Knock-out gap: about 1.1 px at 24 and larger, never thinner than 0.9 units.
  const gap = Math.max(0.9, Math.min(1.35, (24 / size) * 1.1));
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? STUDY_DAY_LABEL[type]}
      className={cx(g.root, s.glyph, tone === "mono" && s.mono, className)}
      style={style}
    >
      <defs>
        <mask id={`${id}-k`} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">
          <rect x="-2" y="-2" width="28" height="28" fill="#fff" />
          {a.inset ? (
            tone === "mono" ? <g fill="#000">{a.accent}</g> : null
          ) : (
            <g fill="#000" stroke="#000" strokeWidth={gap * 2} strokeLinejoin="round">
              {a.accent}
            </g>
          )}
          {type === "challenge" ? (
            <path d={SNOW} fill="none" stroke="#000" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </mask>
      </defs>
      <g mask={`url(#${id}-k)`} className={s.ink}>
        {a.ink}
      </g>
      {a.inset && tone === "mono" ? null : <g className={s.accent}>{a.accent}</g>}
    </svg>
  );
}
