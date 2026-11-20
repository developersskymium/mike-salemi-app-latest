import { useId } from "react";

/** A document-unique id that is safe inside url(#…) references. */
export function useGfxId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Point on a circle; angle in degrees, 0 = 12 o'clock, clockwise. */
export function polar(cx0: number, cy0: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx0 + r * Math.cos(a), cy0 + r * Math.sin(a)];
}

/** SVG arc path between two clock angles (degrees, clockwise). */
export function arc(cx0: number, cy0: number, r: number, from: number, to: number): string {
  const [x1, y1] = polar(cx0, cy0, r, from);
  const [x2, y2] = polar(cx0, cy0, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * Class-name map for a prefixed stylesheet: cls("gfx-rings").fill → "gfx-rings-fill".
 * (This app's Turbopack CSS rule treats every .css as global, so graphics use
 * prefixed global classes instead of CSS modules.)
 */
export function cls(prefix: string): Record<string, string> {
  return new Proxy({} as Record<string, string>, {
    get: (_, key) => (typeof key === "string" ? `${prefix}-${key}` : undefined),
  });
}
