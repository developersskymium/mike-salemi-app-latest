"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui";
import "./rail.css";

/**
 * Horizontal snap rail (legacy Carousel): swipe, scroll, arrow buttons and keyboard all work;
 * the edges fade so the rail reads as "more to the side". Item width comes from `--w1-item`.
 */
export function Rail({ children, label, item = "17rem" }: { children: ReactNode; label: string; item?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const count = Children.count(children);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync, count]);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * Math.max(260, el.clientWidth * 0.8), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="w1-rail" data-start={edge.start ? "" : undefined} data-end={edge.end ? "" : undefined} style={{ ["--w1-item" as string]: item }}>
      <div ref={ref} className="w1-rail-track" role="group" aria-label={label} tabIndex={0} onScroll={sync}>
        {Children.map(children, (c) => (
          <div className="w1-rail-item">{c}</div>
        ))}
      </div>
      <span className="w1-rail-btn" data-side="left" hidden={edge.start}>
        <IconButton icon="back" label="Scroll left" size="sm" iconSize="sm" onClick={() => nudge(-1)} tabIndex={-1} />
      </span>
      <span className="w1-rail-btn" data-side="right" hidden={edge.end}>
        <IconButton icon="chevron" label="Scroll right" size="sm" iconSize="sm" onClick={() => nudge(1)} tabIndex={-1} />
      </span>
    </div>
  );
}
