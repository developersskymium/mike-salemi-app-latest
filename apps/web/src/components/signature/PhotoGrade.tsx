import type { CSSProperties, ElementType, ReactNode } from "react";
import { TraceLine } from "./TraceLine";

export type Grade = "night" | "day" | "warm" | "auto" | "none";

export type GradeTrace = {
  /** The bell's real path over the photo, in the photo's own pixel space. */
  d: string;
  /** The photo's pixel box, e.g. "0 0 1600 1213" (the overlay is sliced like object-fit: cover). */
  viewBox: string;
  width?: number;
  progress?: number;
  animate?: boolean;
  delay?: number;
};

type Props = {
  /** night: monochrome under night blue, highlights lifted. day: high-key and cool. warm: real fire stays warm. auto: night in dark, day in light. */
  grade?: Grade;
  /** Draw a trace along the bell path. */
  trace?: GradeTrace;
  /** Bottom vignette for white captions. */
  vignette?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** The photo (next/image with fill, or an <img>) and any captions. */
  children?: ReactNode;
};

/**
 * Exposure grade for Mike's photography: a CSS grade (no image processing) and an optional
 * trace drawn along the real path of the bell.
 */
export function PhotoGrade({ grade = "night", trace, vignette = true, as: Tag = "div", className, style, children }: Props) {
  return (
    <Tag className={className ? `tr-grade ${className}` : "tr-grade"} data-grade={grade} data-vignette={vignette ? "" : undefined} style={style}>
      {children}
      {trace && (
        <TraceLine
          className="tr-grade-trace"
          d={trace.d}
          viewBox={trace.viewBox}
          width={trace.width ?? 8}
          progress={trace.progress ?? 1}
          ahead={false}
          floor={0}
          animate={trace.animate ?? true}
          delay={trace.delay ?? 400}
          duration={1600}
          preserveAspectRatio="xMidYMid slice"
          tone={grade === "day" ? "trace" : "white"}
        />
      )}
    </Tag>
  );
}
