import type { CSSProperties } from "react";
import "./Ambient.css";
import "./gfx.css";
import { cx, cls } from "./util";

const s = cls("gfx-ambient");
const g = cls("gfx");

export interface GrainProps {
  /** 0–1; the default is barely there. */
  intensity?: number;
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Film grain overlay. Fill a positioned parent; never intercepts input. */
export function Grain({ intensity = 0.06, animated = true, className, style }: GrainProps) {
  return (
    <div
      aria-hidden="true"
      className={cx(s.grain, animated && s.animated, className)}
      style={{ ...style, ["--grain" as string]: intensity }}
    />
  );
}

export interface AuroraProps {
  animated?: boolean;
  /** Overall strength, 0–1. */
  intensity?: number;
  className?: string;
  style?: CSSProperties;
}

/** Slow glacier light behind empty screens. Fill a positioned parent. */
export function Aurora({ animated = true, intensity = 1, className, style }: AuroraProps) {
  return (
    <div
      aria-hidden="true"
      className={cx(g.root, s.aurora, animated && s.animated, className)}
      style={{ ...style, ["--aurora" as string]: intensity }}
    >
      <span className={cx(s.blob, s.b1)} />
      <span className={cx(s.blob, s.b2)} />
      <span className={cx(s.blob, s.b3)} />
    </div>
  );
}
