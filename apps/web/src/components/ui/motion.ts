"use client";

import { motion } from "@ms/tokens";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

const noopSubscribe = () => () => {};

export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A light, haptic-like tick where the platform supports it. */
export function haptic(ms = 8) {
  if (prefersReducedMotion()) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The lens morph. The lens sits at its final place via CSS (so it renders correctly on
 * the server); when the active index changes this FLIPs it from the previous item with a
 * liquid stretch: the leading edge races ahead, the trailing edge follows, and the pill
 * thins slightly mid-flight.
 */
export function useLens(
  container: RefObject<HTMLElement | null>,
  lens: RefObject<HTMLElement | null>,
  index: number,
  axis: "x" | "y" = "x",
) {
  const prev = useRef(index);
  useIsoLayoutEffect(() => {
    const from = prev.current;
    prev.current = index;
    const c = container.current;
    const l = lens.current;
    if (from === index || !c || !l || prefersReducedMotion()) return;
    const items = c.querySelectorAll<HTMLElement>("[data-lens-item]");
    const a = items[from];
    const b = items[index];
    if (!a || !b) return;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const lr = l.getBoundingClientRect();
    const X = axis === "x";
    const d = X ? ra.left - rb.left : ra.top - rb.top;
    const size = X ? lr.width : lr.height;
    const startSize = size + (X ? ra.width - rb.width : ra.height - rb.height);
    const fwd = d < 0;
    const sL = d, sR = d + startSize, eL = 0, eR = size;
    const mL = lerp(sL, eL, fwd ? 0.3 : 0.85);
    const mR = lerp(sR, eR, fwd ? 0.85 : 0.3);
    const cross = X ? lr.height : lr.width;
    const frame = (start: number, end: number, squash = 1) => {
      const len = end - start;
      const scaleCross = squash;
      return X
        ? { transform: `translate(${start}px, 0) scaleY(${scaleCross})`, width: `${len}px`, height: `${cross}px` }
        : { transform: `translate(0, ${start}px) scaleX(${scaleCross})`, height: `${len}px`, width: `${cross}px` };
    };
    l.animate([frame(sL, sR), { ...frame(mL, mR, 0.92), offset: 0.42 }, frame(eL, eR)], {
      duration: motion.duration.lens,
      easing: motion.ease.springSoft,
    });
  }, [index]);
}

/** Counts a number up from its previous value (or 0) with an ease-out. */
export function useTicker(value: number, decimals = 0, duration: number = motion.duration.ticker) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    const total = prefersReducedMotion() ? 0 : duration;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = total ? Math.min(1, (t - start) / total) : 1;
      const e = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const f = Math.pow(10, decimals);
  return Math.round(shown * f) / f;
}

/**
 * Stretch: counts from `from` to `value` (ease-out cubic) and reports whether it is moving, so
 * the number can squeeze narrow while counting and spring back wide when it lands.
 */
export function useStretchCount(
  value: number,
  { from = 0, duration = motion.duration.ticker, delay = 300, decimals = 0 }: { from?: number; duration?: number; delay?: number; decimals?: number } = {},
): [number, boolean] {
  // Starts at `from` (as the concept does) so the count never flashes the final value first.
  const [shown, setShown] = useState(from);
  const [moving, setMoving] = useState(false);
  const last = useRef<number | null>(null);
  // Reduced motion shows the value at once (read after hydration, like the old mount check).
  const reduced = useSyncExternalStore(noopSubscribe, prefersReducedMotion, () => false);
  useEffect(() => {
    if (reduced) {
      last.current = value;
      return;
    }
    const a = last.current ?? from;
    if (a === value) return;
    let raf = 0;
    const t0 = window.setTimeout(() => {
      setShown(a);
      setMoving(true);
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const e = 1 - Math.pow(1 - p, 3);
        setShown(a + (value - a) * e);
        if (p < 1) raf = requestAnimationFrame(step);
        else {
          last.current = value;
          setMoving(false);
        }
      };
      raf = requestAnimationFrame(step);
    }, last.current === null ? delay : 0);
    return () => {
      window.clearTimeout(t0);
      cancelAnimationFrame(raf);
    };
  }, [value, from, duration, delay, reduced]);
  if (reduced) {
    const f = Math.pow(10, decimals);
    return [Math.round(value * f) / f, false];
  }
  const f = Math.pow(10, decimals);
  return [Math.round(shown * f) / f, moving];
}
