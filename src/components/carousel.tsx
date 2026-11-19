import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal snap rail used to break up long vertical stacks.
 * Scroll, drag, arrow buttons and keyboard all work; edges fade out so the
 * rail reads as "more to the side" instead of a clipped list.
 */
export function Carousel({
  children,
  className,
  itemClassName,
  ariaLabel,
}: {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync, children.length]);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const step = Math.max(240, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        onScroll={sync}
        role="group"
        aria-label={ariaLabel}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {children.map((child, i) => (
          <div key={i} className={cn("snap-start shrink-0", itemClassName)}>
            {child}
          </div>
        ))}
      </div>

      <RailButton side="left" hidden={atStart} onClick={() => nudge(-1)} />
      <RailButton side="right" hidden={atEnd} onClick={() => nudge(1)} />
    </div>
  );
}

function RailButton({
  side,
  hidden,
  onClick,
}: {
  side: "left" | "right";
  hidden: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Scroll left" : "Scroll right"}
      tabIndex={hidden ? -1 : 0}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-hairline bg-background/85 text-foreground shadow-sm backdrop-blur-xl transition-all duration-300 sm:grid",
        side === "left" ? "-left-4" : "-right-4",
        hidden ? "pointer-events-none opacity-0" : "opacity-100 hover:border-primary/40",
      )}
    >
      {side === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </button>
  );
}
