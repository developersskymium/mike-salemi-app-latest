import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Lightweight, dependency-free confetti burst.
 * Uses the Web Animations API so nothing re-renders while particles fly.
 */
export function useConfetti() {
  const layerRef = useRef<HTMLDivElement | null>(null);

  const burst = useCallback((opts?: { count?: number; origin?: { x: number; y: number } }) => {
    const layer = layerRef.current;
    if (!layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = layer.getBoundingClientRect();
    const originX = opts?.origin?.x ?? rect.width / 2;
    const originY = opts?.origin?.y ?? rect.height / 2;
    const count = opts?.count ?? 26;
    const colors = ["var(--primary)", "var(--success)", "var(--foreground)", "var(--primary-glow)"];

    for (let i = 0; i < count; i += 1) {
      const p = document.createElement("span");
      const size = 5 + Math.random() * 6;
      p.style.cssText = `position:absolute;left:${originX}px;top:${originY}px;width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 2.2)}px;border-radius:${Math.random() > 0.5 ? "50%" : "2px"};background:${colors[i % colors.length]};will-change:transform,opacity;`;
      layer.appendChild(p);

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = 80 + Math.random() * 190;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance * 0.8 - 40;

      const anim = p.animate(
        [
          { transform: "translate3d(0,0,0) scale(0.4) rotate(0deg)", opacity: 1 },
          {
            transform: `translate3d(${dx}px, ${dy + 120}px, 0) scale(1) rotate(${Math.random() * 540 - 270}deg)`,
            opacity: 0,
          },
        ],
        { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.16,.86,.3,1)", fill: "forwards" },
      );
      anim.onfinish = () => p.remove();
    }
  }, []);

  const ConfettiLayer = useCallback(
    ({ className }: { className?: string }) => (
      <div
        ref={layerRef}
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 z-40 overflow-visible", className)}
      />
    ),
    [],
  );

  return { burst, ConfettiLayer };
}

/** Small transient toast used for progress gratification. */
export function useCheer() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const cheer = useCallback((text: string) => {
    setMessage(text);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2200);
  }, []);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const Cheer = useCallback(
    () =>
      message ? (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4 pt-[env(safe-area-inset-top)]">
          <div className="animate-pop glass-card flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-foreground shadow-[var(--shadow-float)]">
            {message}
          </div>
        </div>
      ) : null,
    [message],
  );

  return { cheer, Cheer };
}

export const CHEERS = [
  "Nice work.",
  "Logged. Keep moving.",
  "That's one down.",
  "Strong. Next up.",
  "Locked in.",
];

/* ------------------------------------------------------------------ */
/* Global celebration popup                                            */
/* ------------------------------------------------------------------ */

export type Celebration = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  action?: { label: string; to: string; params?: Record<string, string> };
};

type Listener = (c: Celebration) => void;
const listeners = new Set<Listener>();
const seen = new Set<string>();

/** Escalate a milestone into a full-screen celebration. Deduped by id. */
export function celebrate(c: Celebration) {
  if (seen.has(c.id)) return;
  seen.add(c.id);
  listeners.forEach((l) => l(c));
}

/** Mounted once inside the authenticated shell. */
export function CelebrationHost() {
  const [current, setCurrent] = useState<Celebration | null>(null);
  const { burst, ConfettiLayer } = useConfetti();

  useEffect(() => {
    const listener: Listener = (c) => setCurrent(c);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => burst({ count: 70 }), 120);
    if ("vibrate" in navigator) navigator.vibrate?.([14, 60, 22]);
    return () => window.clearTimeout(t);
  }, [current, burst]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center px-5">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setCurrent(null)}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div className="animate-pop glass-card relative w-full max-w-sm overflow-hidden rounded-3xl border border-hairline p-7 text-center shadow-[var(--shadow-float)]">
        <ConfettiLayer />
        <p className="eyebrow text-primary">{current.eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">{current.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{current.body}</p>
        <div className="mt-6 flex flex-col gap-2">
          {current.action ? (
            <CelebrationAction action={current.action} onDone={() => setCurrent(null)} />
          ) : null}
          <button
            type="button"
            onClick={() => setCurrent(null)}
            className="tap rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Keep training
          </button>
        </div>
      </div>
    </div>
  );
}

function CelebrationAction({
  action,
  onDone,
}: {
  action: NonNullable<Celebration["action"]>;
  onDone: () => void;
}) {
  return (
    <Link
      to={action.to}
      params={action.params as never}
      onClick={onDone}
      className="tap inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
    >
      {action.label}
    </Link>
  );
}
