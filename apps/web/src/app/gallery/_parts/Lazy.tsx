"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders its (server-rendered) children only once they come near the viewport, so the long
 * reference page hydrates fast and each section's traces expose as you reach them.
 */
export function Lazy({ children, minHeight = 720 }: { children: ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={on ? undefined : { minHeight }}>
      {on ? children : null}
    </div>
  );
}
