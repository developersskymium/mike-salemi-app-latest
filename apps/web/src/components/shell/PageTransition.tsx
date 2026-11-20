import { ViewTransition, type ReactNode } from "react";

/**
 * Crossfade-and-rise between pages via the View Transitions API (React <ViewTransition>).
 * Browsers without it get the CSS fallback in shell.css (.lq-page). Off with reduced motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <ViewTransition default="lq-page">{children}</ViewTransition>;
}
