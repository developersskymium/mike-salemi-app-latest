import type { CSSProperties, ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

/** Workout table primitives (Exercise · Reps · Sets · Tempo). */
export function WorkoutTable({ children, className, label = "Workout" }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={cx("lq-wt", className)} role="table" aria-label={label}>
      <div className="lq-wt-row lq-wt-head" role="row">
        <span role="columnheader">Exercise</span>
        <span role="columnheader">Reps</span>
        <span role="columnheader">Sets</span>
        <span role="columnheader">Tempo</span>
      </div>
      {children}
    </div>
  );
}

type Load = "heavy" | "moderate" | "light" | "bodyweight";
/** Intensity drawn as a short trace: heavier bells travel further. */
const LOAD_LEVEL: Record<Load, number> = { heavy: 0.9, moderate: 0.6, light: 0.4, bodyweight: 0.2 };

export function ExerciseRow({ name, load, loadLabel, reps, repsNote, sets, tempo }: { name: string; load?: Load; loadLabel?: string; reps: ReactNode; repsNote?: string; sets: ReactNode; tempo?: ReactNode }) {
  return (
    <div className="lq-wt-row lq-wt-ex" role="row">
      <div role="cell">
        <div className="lq-wt-nm">{name}</div>
        {loadLabel && (
          <div className="lq-wt-ld" style={{ "--lv": load ? LOAD_LEVEL[load] : 0.5 } as CSSProperties}>
            <i aria-hidden />
            <span>{loadLabel}</span>
          </div>
        )}
      </div>
      <div role="cell" className="lq-wt-n">
        {reps}
        {repsNote && <small>{repsNote}</small>}
      </div>
      <div role="cell" className="lq-wt-n">
        {sets}
      </div>
      <div role="cell" className="lq-wt-tp">
        {tempo}
      </div>
    </div>
  );
}

/** Rest between exercises; `end` marks the round's last rest (then repeat). */
export function RestRow({ children, end }: { children: ReactNode; end?: boolean }) {
  return (
    <div className="lq-rest" data-end={end ? "" : undefined} role="row">
      <span className="lq-rest-ar" aria-hidden>
        <Icon name={end ? "repeat" : "down"} size="xs" />
      </span>
      <span role="cell">{children}</span>
      {!end && <hr aria-hidden />}
    </div>
  );
}
