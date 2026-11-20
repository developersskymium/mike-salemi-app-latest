import type { CSSProperties } from "react";

/** Mount Shasta's profile in a 1000-wide box (baseline 1000). Kept for drawings that trace the mountain. */
const SHASTA =
  "M0 1000 L0 862 C100 850 210 832 300 814 C360 800 395 774 420 762 C436 754 450 754 462 758 C482 734 512 690 540 656 C560 632 574 624 588 628 C606 636 640 680 680 724 C732 780 810 814 900 832 C946 840 980 846 1000 850 L1000 1000Z";
const SHASTA_LINE = SHASTA.replace(" L1000 1000Z", "").replace("M0 1000 L0 862", "M0 862");

type Common = {
  mountain?: boolean;
  live?: boolean;
  fixed?: boolean;
  intensity?: number;
  seed?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Retired Trace backdrops. Summit pages sit on the plain warm chalk ground (dark: warm ink), so the
 * star-trail and contour exposures render nothing. The components keep compiling for old call sites.
 */
export function StarTrails(_props: Common & { count?: number }) {
  return null;
}

/** Retired (see StarTrails). */
export function SnowContours(_props: Common & { count?: number }) {
  return null;
}

/** Retired: the app ground is the warm chalk `--bg`. Renders nothing. */
export function LivingBackdrop(_props: Pick<Common, "fixed" | "mountain" | "live" | "intensity">) {
  return null;
}

export { SHASTA, SHASTA_LINE };
