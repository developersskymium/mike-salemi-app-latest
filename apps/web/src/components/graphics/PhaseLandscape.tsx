import type { CSSProperties } from "react";
import { Climb } from "./Climb";

export interface LandscapePhase {
  /** First program day of the phase (1-based). */
  startDay: number;
  /** Short label, e.g. "Phase 1". */
  label: string;
  /** Optional name, e.g. "Foundation" (shown as the camp's second line). */
  name?: string;
}

export interface PhaseLandscapeProps {
  totalDays: number;
  completedDays: number;
  /** Today's program day (1-based); defaults to the day after the last completed. */
  currentDay?: number;
  phases?: LandscapePhase[];
  /** Draw the route in once when it appears. */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * The program as a climb, compact. Kept for existing callers: it is the Climb
 * (compact) with each phase's name as its camp's second line.
 */
export function PhaseLandscape({ totalDays, completedDays, currentDay, phases, animated = true, className, style }: PhaseLandscapeProps) {
  return (
    <Climb
      totalDays={totalDays}
      completedDays={completedDays}
      currentDay={currentDay ?? Math.min(totalDays, completedDays + 1)}
      phases={phases?.map((p) => ({ startDay: p.startDay, label: p.label, sub: p.name }))}
      variant="compact"
      animated={animated}
      className={className}
      style={style}
    />
  );
}
