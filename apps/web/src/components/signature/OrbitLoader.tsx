import type { CSSProperties } from "react";

/** A small glacier spinner: a round-capped arc turning on a warm hairline track. */
export function OrbitLoader({ size = 40, label = "Loading", className, style }: { size?: number; label?: string; className?: string; style?: CSSProperties }) {
  const w = Math.max(2.5, size / 11);
  const r = (size - w) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span role="status" aria-label={label} className={className ? `tr-orbit ${className}` : "tr-orbit"} style={{ width: size, height: size, ...style }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={w} className="tr-orbit-track" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={w} strokeLinecap="round" strokeDasharray={`${(c * 0.28).toFixed(1)} ${c.toFixed(1)}`} className="tr-orbit-arc" />
      </svg>
    </span>
  );
}
