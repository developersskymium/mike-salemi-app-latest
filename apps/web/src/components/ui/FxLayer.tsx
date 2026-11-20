"use client";

import { useEffect } from "react";

/**
 * One delegated listener for the whole app's micro-interactions on [data-fx] surfaces:
 * - cursor-reactive specular highlight (fine pointers only)
 * - highlight sweep on press
 * Mount once (the shell does). Respects reduced motion.
 */
export function FxLayer() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let lit: HTMLElement | null = null;
    let raf = 0;
    const find = (t: EventTarget | null) => (t instanceof Element ? (t.closest("[data-fx]") as HTMLElement | null) : null);

    const onMove = (e: PointerEvent) => {
      if (!fine.matches || reduced.matches || e.pointerType !== "mouse") return;
      const el = find(e.target);
      if (lit && lit !== el) lit.removeAttribute("data-lit");
      lit = el;
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
        el.setAttribute("data-lit", "");
      });
    };
    const onLeave = () => {
      lit?.removeAttribute("data-lit");
      lit = null;
    };
    const onDown = (e: PointerEvent) => {
      if (reduced.matches) return;
      const el = find(e.target);
      if (!el) return;
      el.classList.remove("is-swept");
      void el.offsetWidth; // restart the animation
      el.classList.add("is-swept");
      window.setTimeout(() => el.classList.remove("is-swept"), 700);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
