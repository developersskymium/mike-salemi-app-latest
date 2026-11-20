import type { CSSProperties } from "react";

type Props = {
  /** px */
  size?: number;
  /** ms before it pops (sync with the end of a fill). */
  delay?: number;
  /** Ember sparks around the burst. */
  rays?: boolean;
  /** A ring that expands and fades. */
  shutter?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Celebrate: an ember burst that pops with a spring when a day or step completes.
 * Position it absolutely (centred on its own middle).
 */
export function Flare({ size = 120, delay = 0, rays = true, shutter = true, className, style }: Props) {
  return (
    <span
      aria-hidden
      className={className ? `tr-flare ${className}` : "tr-flare"}
      data-rays={rays ? "" : undefined}
      style={{ width: size, height: size, "--flare-delay": `${delay}ms`, ...style } as CSSProperties}
    >
      {shutter && <b className="tr-flare-shutter" />}
      {rays && Array.from({ length: 8 }, (_, i) => <i key={i} className="tr-flare-spark" style={{ "--a": `${i * 45}deg` } as CSSProperties} />)}
      <i className="tr-flare-core" />
    </span>
  );
}
