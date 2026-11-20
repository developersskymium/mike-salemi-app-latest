import type { CSSProperties, ElementType, ReactNode } from "react";

/** Retired Trace grades. Every value now renders the photo as shot (Summit: full colour, never tinted). */
export type Grade = "night" | "day" | "warm" | "auto" | "none";

export type GradeTrace = {
  d: string;
  viewBox: string;
  width?: number;
  progress?: number;
  animate?: boolean;
  delay?: number;
};

type Props = {
  /** Accepted for compatibility; photos are never graded. */
  grade?: Grade;
  /** Retired (Trace bell path over the photo). Ignored. */
  trace?: GradeTrace;
  /** A bottom ink scrim for white captions (default on). */
  vignette?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/** A full-colour photo frame with an optional bottom scrim for legible white captions. */
export function PhotoGrade({ grade = "none", vignette = true, as: Tag = "div", className, style, children }: Props) {
  return (
    <Tag className={className ? `tr-grade ${className}` : "tr-grade"} data-grade={grade} data-vignette={vignette ? "" : undefined} style={style}>
      {children}
    </Tag>
  );
}
