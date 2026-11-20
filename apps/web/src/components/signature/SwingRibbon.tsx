import type { CSSProperties } from "react";
import { sample } from "./geometry";
import { TraceLine } from "./TraceLine";

export type RibbonPhase = { label: string; from: number; to: number };

type Props = {
  /** Days in the program. */
  total: number;
  /** Days complete. The head sits at the start of the next swing (today). */
  done: number;
  /** Phases, 1-based inclusive day ranges. Each phase swings deeper. */
  phases?: RibbonPhase[];
  /** Index of the current phase (highlighted label); defaults to the phase holding today. */
  currentPhase?: number;
  /** wide: program hero (desktop). compact: phone, cards. responsive: compact under 720px, wide above. */
  size?: "wide" | "compact" | "responsive";
  /** Show phase labels under the ribbon. */
  labels?: boolean;
  animate?: boolean;
  delay?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
};

const GEOM = {
  wide: { W: 1344, H: 70, x0: 8, y: 12, scale: 1.5, stroke: 2.8, segments: 24 },
  compact: { W: 360, H: 34, x0: 4, y: 7, scale: 0.72, stroke: 1.8, segments: 16 },
} as const;

function ribbonPath(total: number, depth: (d: number) => number, g: (typeof GEOM)[keyof typeof GEOM], upto?: number) {
  const x1 = g.W - g.x0;
  const w = (x1 - g.x0) / total;
  let path = `M${g.x0} ${g.y}`;
  for (let d = 1; d <= (upto ?? total); d++) {
    const xa = g.x0 + (d - 1) * w, xb = xa + w, dy = g.y + depth(d) * g.scale;
    path += ` C${(xa + w * 0.04).toFixed(1)} ${dy.toFixed(1)} ${(xb - w * 0.04).toFixed(1)} ${dy.toFixed(1)} ${xb.toFixed(1)} ${g.y}`;
  }
  return path;
}

function Ribbon({ total, done, phases, size, animate, delay }: { total: number; done: number; phases?: RibbonPhase[]; size: "wide" | "compact"; animate?: boolean; delay?: number }) {
  const g = GEOM[size];
  const DEPTHS = [6, 10, 14, 19, 22, 25];
  const depth = (d: number) => {
    if (!phases?.length) return 12;
    const i = phases.findIndex((p) => d >= p.from && d <= p.to);
    return DEPTHS[Math.max(0, i)] ?? 19;
  };
  const d = ribbonPath(total, depth, g);
  const full = sample(d).length;
  const part = done > 0 ? sample(ribbonPath(total, depth, g, Math.min(done, total))).length : 0;
  const p = done >= total ? 1 : (part + (done > 0 ? g.stroke * 4 : 0)) / full;
  return (
    <TraceLine
      d={d}
      viewBox={`0 0 ${g.W} ${g.H}`}
      width={g.stroke}
      progress={p}
      segments={g.segments}
      floor={0.05}
      animate={animate}
      duration={2400}
      delay={delay ?? 300}
      className="tr-ribbon-svg"
      style={{ width: "100%", height: "auto" }}
    />
  );
}

/**
 * The program as a ribbon of swings: one swing per day, deepening each phase. Done days are
 * lit trace, today is the head, the days ahead are a dotted path. For program pages, Today and cards.
 */
export function SwingRibbon({ total, done, phases, currentPhase, size = "responsive", labels = true, animate = true, delay, label, className, style }: Props) {
  const safeTotal = Math.max(1, total);
  const today = Math.min(safeTotal, done + 1);
  const cur = currentPhase ?? Math.max(0, phases?.findIndex((p) => today >= p.from && today <= p.to) ?? 0);
  const g = GEOM.wide;
  const pct = (day: number) => ((g.x0 + ((day - 1) * (g.W - 2 * g.x0)) / safeTotal) / g.W) * 100;
  return (
    <div
      className={className ? `tr-ribbon ${className}` : "tr-ribbon"}
      data-size={size}
      role="img"
      aria-label={label ?? `${Math.min(done, safeTotal)} of ${safeTotal} days complete`}
      style={style}
    >
      {(size === "wide" || size === "responsive") && (
        <div className="tr-ribbon-wide">
          <Ribbon total={safeTotal} done={done} phases={phases} size="wide" animate={animate} delay={delay} />
        </div>
      )}
      {(size === "compact" || size === "responsive") && (
        <div className="tr-ribbon-compact">
          <Ribbon total={safeTotal} done={done} phases={phases} size="compact" animate={animate} delay={delay} />
        </div>
      )}
      {labels && phases && phases.length > 0 && (
        <div className="tr-ribbon-labels" aria-hidden>
          {phases.map((ph, i) => (
            <span key={ph.label} data-current={i === cur ? "" : undefined} style={{ left: `${pct(ph.from)}%` }}>
              <b>{ph.label}</b>
              {(ph.to - ph.from + 1) / safeTotal >= 0.15 && <span className="tr-ribbon-range"> {ph.from}–{ph.to}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
