import type { CSSProperties } from "react";

export type RibbonPhase = { label: string; from: number; to: number };

type Props = {
  /** Days in the program. */
  total: number;
  /** Days complete. */
  done: number;
  /** Phases, 1-based inclusive day ranges. */
  phases?: RibbonPhase[];
  /** Index of the current phase (highlighted label); defaults to the phase holding today. */
  currentPhase?: number;
  /** wide / compact / responsive: compact names only the current phase under 720px. */
  size?: "wide" | "compact" | "responsive";
  /** Phase labels under the bar. */
  labels?: boolean;
  animate?: boolean;
  delay?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** White on a photo or ink panel. */
  onPhoto?: boolean;
};

/**
 * Day progress through a program (the Trace swing ribbon, redrawn for Summit): one segment per
 * phase sized by its days. Done days fill ember, today is a marked notch, the rest stay neutral.
 */
export function SwingRibbon({ total, done, phases, currentPhase, size = "responsive", labels = true, animate = true, delay = 150, label, className, style, onPhoto }: Props) {
  const T = Math.max(1, total);
  const d = Math.max(0, Math.min(done, T));
  const today = Math.min(T, d + 1);
  const list = phases && phases.length ? phases : [{ label: "", from: 1, to: T }];
  const cur = currentPhase ?? Math.max(0, list.findIndex((p) => today >= p.from && today <= p.to));
  return (
    <div
      className={className ? `tr-ribbon ${className}` : "tr-ribbon"}
      data-size={size}
      data-on-photo={onPhoto ? "" : undefined}
      data-anim={animate ? "" : undefined}
      role="img"
      aria-label={label ?? `${d} of ${T} days complete`}
      style={{ "--tr-delay": `${delay}ms`, ...style } as CSSProperties}
    >
      <div className="tr-ribbon-bar">
        {list.map((ph, i) => {
          const len = ph.to - ph.from + 1;
          const fill = Math.max(0, Math.min(1, (d - ph.from + 1) / len));
          return (
            <span key={i} className="tr-ribbon-seg" data-current={i === cur ? "" : undefined} data-done={fill >= 1 ? "" : undefined} style={{ flexGrow: len, "--f": `${fill * 100}%` } as CSSProperties}>
              <i />
            </span>
          );
        })}
      </div>
      {labels && phases && phases.length > 0 && (
        <div className="tr-ribbon-labels" aria-hidden>
          {list.map((ph, i) => (
            <span key={ph.label + i} data-current={i === cur ? "" : undefined} data-done={d >= ph.to ? "" : undefined} style={{ flexGrow: ph.to - ph.from + 1 }}>
              <b>{ph.label}</b>
              <span className="tr-ribbon-range">
                {ph.from === ph.to ? `Day ${ph.from}` : `Days ${ph.from}–${ph.to}`}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
