import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True once the element has been scrolled into view at least once. */
export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25, ...options },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, options]);

  return { ref, inView };
}

/**
 * Number that counts up to its value the first time it scrolls into view.
 * Falls back to the final value instantly when motion is reduced.
 */
export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  suffix,
  prefix,
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    if (prefersReducedMotion()) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={cn("numeric tabular-nums", className)}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Progress bar that animates its fill in when it enters the viewport. */
export function AnimatedProgress({
  value,
  className,
  barClassName,
  label,
}: {
  /** 0–100 */
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-[900ms] [transition-timing-function:var(--ease-out-soft)]",
          barClassName,
        )}
        style={{ width: `${inView ? pct : 0}%` }}
      />
    </div>
  );
}

/** Fades/rises its children in the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.12 });
  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-[600ms] [transition-timing-function:var(--ease-out-soft)]",
        inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Completion tick with an expanding ring — the standard "that worked"
 * feedback for finishing a lesson, day, or tool.
 */
export function CompletionMark({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="animate-ring absolute inset-0 rounded-full border-2 border-success" />
      <span className="animate-check grid h-full w-full place-items-center rounded-full bg-success text-white">
        <Check className="h-1/2 w-1/2" strokeWidth={3} />
      </span>
    </span>
  );
}
