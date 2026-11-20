import type { CSSProperties } from "react";

type Props = {
  /** px */
  size?: number;
  /** ms before the flare pops (sync it with the end of an Expose). */
  delay?: number;
  /** Diagonal rays as well as the cross. */
  rays?: boolean;
  /** Close the shutter: a ring that closes in on the star. */
  shutter?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Flare: completing a day ends the swing in a starburst, the shutter closing on it.
 * Position it at the end of the trace (absolute, centred on its own middle).
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
      <i className="tr-flare-core" />
    </span>
  );
}
