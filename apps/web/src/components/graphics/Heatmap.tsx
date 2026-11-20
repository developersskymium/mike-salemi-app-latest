import type { CSSProperties } from "react";
import "./gfx.css";
import "./Heatmap.css";
import { cls, cx } from "./util";

const s = cls("gfx-heat");

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapCellProps {
  /** 0 rest/none … 4 a big day. */
  level: HeatLevel;
  /** Today: ringed in the accent. */
  today?: boolean;
  /** A planned day still ahead: a quiet outline. */
  future?: boolean;
  size?: number;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Training heatmap cell: a small glass tile, empty on rest days, filling with
 * glacier from level 1 to 4 (with a specular top on the fuller tiles). Pure
 * CSS, so hundreds render cheaply. Re-skin with --gfx-heat-0…4 and --gfx-heat-ring.
 */
export function HeatmapCell({ level, today, future, size = 14, title, className, style }: HeatmapCellProps) {
  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      title={title}
      data-level={level}
      className={cx(s.cell, today && s.today, future && s.future, className)}
      style={{ ...style, ["--heat-size" as string]: `${size}px` }}
    />
  );
}

export interface TrainingHeatmapProps {
  /** One level per day, oldest first. */
  days: HeatLevel[];
  /** Index of today in days. */
  todayIndex?: number;
  /** Rows per column (7 = weeks run down, GitHub style). */
  rows?: number;
  size?: number;
  gap?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** A grid of heatmap cells, weeks as columns. */
export function TrainingHeatmap({ days, todayIndex, rows = 7, size = 14, gap = 4, label = "Training days", className, style }: TrainingHeatmapProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cx(s.grid, className)}
      style={{ ...style, gridTemplateRows: `repeat(${rows}, ${size}px)`, gap }}
    >
      {days.map((l, i) => (
        <HeatmapCell key={i} level={l} size={size} today={i === todayIndex} future={todayIndex !== undefined && i > todayIndex} />
      ))}
    </div>
  );
}
