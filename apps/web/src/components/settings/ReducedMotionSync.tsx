"use client";

import { useEffect } from "react";

/** Applies the "Reduce motion" setting on load (mount once in the shell). Reads this device's copy. */
export function ReducedMotionSync({ on }: { on?: boolean }) {
  useEffect(() => {
    const local = window.localStorage.getItem("ms-reduced-motion");
    const v = local != null ? local === "1" : Boolean(on);
    if (v) document.documentElement.setAttribute("data-reduced-motion", "");
  }, [on]);
  return null;
}
