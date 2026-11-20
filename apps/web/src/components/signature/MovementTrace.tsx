import type { CSSProperties } from "react";
import { TraceLine } from "./TraceLine";

/** Each movement has its own shape: the path the bell (or the body) draws, as light. 64×64. */
export const MOVEMENT_PATHS = {
  swing: "M8 14 A26 26 0 0 0 56 14",
  press: "M32 58 C32 40 30 24 32 6",
  halo: "M32 14 C46 14 52 24 48 33 C42 44 20 43 16 31 C13 21 21 14 32 14",
  getup: "M8 56 C8 34 38 40 44 26 C49 15 40 8 56 8",
  clean: "M24 58 C24 40 30 32 36 26 C40 22 38 16 34 14",
  squat: "M32 6 L32 40 L32 22",
  deadlift: "M32 56 L32 18",
  rest: "M6 32 C14 18 22 18 32 32 C42 46 50 46 58 32",
} as const;

export type Movement = keyof typeof MOVEMENT_PATHS;
export const MOVEMENTS = Object.keys(MOVEMENT_PATHS) as Movement[];

export const MOVEMENT_LABEL: Record<Movement, string> = {
  swing: "Swing",
  press: "Press",
  halo: "Halo",
  getup: "Get-up",
  clean: "Clean",
  squat: "Squat",
  deadlift: "Deadlift",
  rest: "Rest",
};

/** Map a free-text day or exercise name to its movement shape (falls back to the swing). */
export function movementFor(name: string | null | undefined): Movement {
  const n = (name ?? "").toLowerCase();
  if (/get.?up|tgu/.test(n)) return "getup";
  if (/halo/.test(n)) return "halo";
  if (/press|jerk|push/.test(n)) return "press";
  if (/clean|rack/.test(n)) return "clean";
  if (/squat|lunge/.test(n)) return "squat";
  if (/deadlift|rdl|hinge/.test(n)) return "deadlift";
  if (/rest|recover|breath|mobility|stretch|off/.test(n)) return "rest";
  return "swing";
}

type Props = {
  move: Movement;
  /** px */
  size?: number;
  /** 0–1: how much of the movement is done (1 = drawn, 0 = only the dotted path). */
  progress?: number;
  /** Stroke at the head in the 64-unit box. */
  weight?: number;
  animate?: boolean;
  delay?: number;
  duration?: number;
  /** Accessible name; defaults to the movement name. Pass "" for decorative use. */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

/** A movement drawn as light: swing arc, press line, halo loop, get-up S, clean hook, squat, deadlift, rest wave. */
export function MovementTrace({ move, size = 64, progress = 1, weight = 2.6, animate, delay, duration = 900, label, className, style }: Props) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <TraceLine
      d={MOVEMENT_PATHS[move]}
      viewBox="0 0 64 64"
      width={weight}
      progress={p || 0.0001}
      head={p > 0}
      ahead={p < 1}
      segments={18}
      floor={0.12}
      animate={animate}
      delay={delay}
      duration={duration}
      label={label === "" ? undefined : label ?? MOVEMENT_LABEL[move]}
      className={className}
      style={{ width: size, height: size, ...style }}
    />
  );
}
