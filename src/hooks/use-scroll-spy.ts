import { useCallback, useEffect, useRef, useState } from "react";

/** True when the user asked the OS for reduced motion. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Scroll-spy that never fights the user.
 *
 * - Reads positions from scroll (not IntersectionObserver) so the active id is
 *   stable and monotonic while scrolling.
 * - Locks itself while a programmatic smooth-scroll is in flight, so tapping a
 *   chip never causes the highlight to flicker through intermediate sections.
 * - Offsets by the sticky header stack, passed in as `offset`.
 */
export function useScrollSpy(ids: string[], offset = 96) {
  const [activeId, setActiveId] = useState(ids[0] ?? "");
  const lockedTo = useRef<string | null>(null);
  const lockTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setActiveId(ids[0] ?? "");
  }, [ids.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      if (lockedTo.current) return;

      const line = offset + 24;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - line <= 0) current = id;
      }

      // Pin the last section once the page bottoms out, so the final chip
      // can always become active even on short sections.
      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
      if (atBottom && ids.length) current = ids[ids.length - 1];

      setActiveId((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids.join("|"), offset]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Scroll to a section and hold the highlight there until we settle. */
  const scrollToId = useCallback(
    (id: string, behavior: ScrollBehavior = "smooth") => {
      const el = document.getElementById(id);
      if (!el) return;

      setActiveId(id);
      lockedTo.current = id;
      window.clearTimeout(lockTimer.current);

      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior });

      // Release the lock once scrolling has actually stopped.
      let settleTimer = 0;
      const release = () => {
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          window.removeEventListener("scroll", release);
          lockedTo.current = null;
        }, 120);
      };
      window.addEventListener("scroll", release, { passive: true });
      release();
      lockTimer.current = window.setTimeout(() => {
        window.removeEventListener("scroll", release);
        lockedTo.current = null;
      }, 1200);
    },
    [offset],
  );

  useEffect(() => () => window.clearTimeout(lockTimer.current), []);

  return { activeId, scrollToId };
}
