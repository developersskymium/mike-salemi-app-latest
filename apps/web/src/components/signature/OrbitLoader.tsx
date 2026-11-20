import type { CSSProperties } from "react";
import { TraceLine } from "./TraceLine";

/** Orbit: the loader is a halo, a short trace circling (the same shape as the halo move). */
export function OrbitLoader({ size = 40, label = "Loading", className, style }: { size?: number; label?: string; className?: string; style?: CSSProperties }) {
  const w = Math.max(2.6, (2.4 * 120) / size);
  return (
    <span role="status" aria-label={label} className={className ? `tr-orbit ${className}` : "tr-orbit"} style={{ width: size, height: size, ...style }}>
      <TraceLine d="M60 14 A46 46 0 1 1 59.9 14" viewBox="0 0 120 120" width={w} progress={0.35} ahead={false} segments={20} floor={0} />
    </span>
  );
}
