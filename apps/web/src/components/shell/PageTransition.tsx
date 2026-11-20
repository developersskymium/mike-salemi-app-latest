import { ViewTransition, type ReactNode } from "react";

/**
 * Smooth page changes via the View Transitions API (React <ViewTransition>; Next route changes are
 * transitions): the old page fades out quickly, the new one rises 6px in. The shell stays put.
 * Browsers without it simply swap. Off with reduced motion; aborted transitions (viewport resize,
 * hidden tab) are skipped quietly by the head script in vt-guard.ts.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <ViewTransition default="lq-page">{children}</ViewTransition>;
}
