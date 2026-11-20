"use client";

import { ViewTransition, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** The "place" a path belongs to: moving inside one place (day → next day, lesson → lesson,
 *  skeleton → page) swaps content in place; only moving between places animates. */
export function placeOf(pathname: string): string {
  const p = pathname.split("/").filter(Boolean);
  if (p[0] === "programs" && p[1]) {
    const kind = p[2];
    // Every day / lesson / session of one program shares the player frame.
    if (kind === "learn" || kind === "guide" || kind === "session") return `/programs/${p[1]}/day`;
    if (kind === "course" && p[3]) return `/programs/${p[1]}/lesson`;
    return `/programs/${p[1]}`;
  }
  return `/${p[0] ?? ""}`;
}

/**
 * Smooth page changes via the View Transitions API (React <ViewTransition>; Next route changes are
 * transitions): between places the old page fades out quickly and the new one rises 6px in. Inside one
 * place (the next day or lesson of the same program) there is NO page animation: the player frame
 * stays and only its content changes, so nothing blinks. The shell never animates. Off with reduced motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const prev = useRef(pathname);
  const same = placeOf(prev.current) === placeOf(pathname);
  useEffect(() => {
    prev.current = pathname;
  }, [pathname]);
  return (
    <ViewTransition default={same ? "none" : "lq-page"} update={same ? "none" : "lq-page"}>
      {children}
    </ViewTransition>
  );
}
