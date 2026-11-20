"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** One-shot confetti (Web Animations; nothing re-renders while it flies). Accent family + neutrals only. */
export function useConfetti() {
  const ref = useRef<HTMLDivElement>(null);
  const burst = useCallback((opts?: { count?: number; origin?: { x: number; y: number } }) => {
    const host = ref.current;
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = host.getBoundingClientRect();
    const ox = opts?.origin?.x ?? rect.width / 2;
    const oy = opts?.origin?.y ?? rect.height / 2;
    const count = opts?.count ?? 24;
    const colours = ["var(--accent)", "var(--accent-hi)", "var(--label)", "var(--ring-3)"];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      const s = 5 + Math.random() * 6;
      p.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${s}px;height:${s * (Math.random() > 0.5 ? 1 : 2.2)}px;border-radius:${Math.random() > 0.5 ? "50%" : "2px"};background:${colours[i % colours.length]};will-change:transform,opacity;`;
      host.appendChild(p);
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const d = 80 + Math.random() * 190;
      const dx = Math.cos(a) * d;
      const dy = Math.sin(a) * d * 0.8 - 40;
      const anim = p.animate(
        [
          { transform: "translate3d(0,0,0) scale(.4) rotate(0deg)", opacity: 1 },
          { transform: `translate3d(${dx}px, ${dy + 120}px, 0) scale(1) rotate(${Math.random() * 540 - 270}deg)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.16,.86,.3,1)", fill: "forwards" },
      );
      anim.onfinish = () => p.remove();
    }
  }, []);
  return { burst, layer: <div ref={ref} className="kd-confetti" aria-hidden /> };
}

/** A short cheer ("Nice work.") that floats in at the top and leaves on its own. */
export function useCheer() {
  const [message, setMessage] = useState<{ text: string; n: number } | null>(null);
  const timer = useRef(0);
  const cheer = useCallback((text: string) => {
    setMessage((m) => ({ text, n: (m?.n ?? 0) + 1 }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2200);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { cheer, message };
}

export function Cheer({ message }: { message: { text: string; n: number } | null }) {
  if (!message) return null;
  return (
    <div className="kd-cheer" role="status" aria-live="polite">
      <span key={message.n} className="kd-cheer-pill lq-glass" data-level="thick" data-float="">
        {message.text}
      </span>
    </div>
  );
}
