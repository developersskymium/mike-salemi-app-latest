"use client";

import type { CSSProperties } from "react";
import { RigFigure } from "./figures/RigFigure";
import type { MoveName } from "./figures/moves";

export type { MoveName };

export interface MovementFigureProps {
  move: MoveName;
  /** Rendered width and height in px. */
  size?: number;
  /** Loop the movement (falls back to the still under reduced motion). */
  animated?: boolean;
  /** Body build: 1.75 is the default; larger is sturdier, smaller leaner. */
  stroke?: number;
  /** Hide the floor shadow and accent extras (trace, orbit, breath ring). */
  bare?: boolean;
  /** Playback speed multiplier. */
  speed?: number;
  /** Show the bell's path as a faint dotted trace where the move has one. */
  trace?: boolean;
  /** Freeze at a phase of the movement, 0..1 (default: the move's best still). */
  at?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/**
 * An athlete performing a kettlebell or movement pattern, drawn on a real rig
 * (coach-checked poses, planted feet, hands on the handle) with the bell as
 * the one accent. Animates on the client; reduced motion shows the still.
 */
export function MovementFigure({ move, size = 96, animated = false, stroke = 1.75, bare, speed, trace, at, className, style, title }: MovementFigureProps) {
  // Small figures get a touch more girth so they hold up at icon sizes.
  const build = Math.min(1.25, Math.max(0.8, stroke / 1.75)) * (size < 48 ? 1.1 : 1);
  return (
    <RigFigure
      move={move}
      size={size}
      animated={animated}
      weight={build}
      bare={bare}
      speed={speed}
      trace={trace}
      at={at}
      className={className}
      style={style}
      title={title}
    />
  );
}
