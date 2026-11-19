import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * Routes worth warming as soon as the browser is idle. These are the tabs the
 * user reaches for constantly, so paying for their chunk + loader data up front
 * makes the first tap feel instant instead of "thinking".
 */
const WARM_ROUTES = [
  "/immersion",
  "/self-guided",
  "/library",
  "/tools",
  "/account",
] as const;

type IdleHandle = number;

function onIdle(fn: () => void): IdleHandle {
  const w = window as typeof window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") {
    return w.requestIdleCallback(fn, { timeout: 2500 });
  }
  return window.setTimeout(fn, 1200);
}

function cancelIdle(handle: IdleHandle) {
  const w = window as typeof window & { cancelIdleCallback?: (h: number) => void };
  if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(handle);
  else window.clearTimeout(handle);
}

/**
 * Prefetches the main routes (code chunk + loader data) once the app is idle,
 * on top of the router's hover/touch "intent" preloading. Skipped on slow or
 * metered connections so we never spend someone's data plan for them.
 */
export function useRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (conn?.saveData) return undefined;
    if (conn?.effectiveType && /2g/.test(conn.effectiveType)) return undefined;

    const handle = onIdle(() => {
      for (const to of WARM_ROUTES) {
        void router.preloadRoute({ to }).catch(() => undefined);
      }
    });

    return () => cancelIdle(handle);
  }, [router]);
}
