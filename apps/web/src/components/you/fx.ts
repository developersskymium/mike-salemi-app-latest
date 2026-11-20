"use client";

/**
 * Celebration particles (Web Animations, nothing re-renders while they fly).
 * Chalk: soft powder puffs and fine dust, like a hand slapped into a chalk bowl.
 * Confetti: the accent family and neutrals only.
 */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Origin = { x: number; y: number };

function originOf(host: HTMLElement, o?: Origin): Origin {
  const r = host.getBoundingClientRect();
  return o ?? { x: r.width / 2, y: r.height / 2 };
}

export function chalkBurst(host: HTMLElement | null, opts: { origin?: Origin; puffs?: number; dust?: number; spread?: number } = {}) {
  if (!host || reduced()) return;
  const { x, y } = originOf(host, opts.origin);
  const spread = opts.spread ?? 1;
  const puffs = opts.puffs ?? 16;
  const dust = opts.dust ?? 36;
  for (let i = 0; i < puffs; i++) {
    const p = document.createElement("span");
    const s = 18 + Math.random() * 30;
    p.className = "yu-chalk-puff";
    p.style.cssText = `left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;`;
    host.appendChild(p);
    const a = (Math.PI * 2 * i) / puffs + Math.random() * 0.6;
    const d = (50 + Math.random() * 110) * spread;
    const anim = p.animate(
      [
        { transform: "translate3d(0,0,0) scale(.25)", opacity: 0.95 },
        { transform: `translate3d(${Math.cos(a) * d * 0.55}px, ${Math.sin(a) * d * 0.55}px, 0) scale(1.1)`, opacity: 0.7, offset: 0.35 },
        { transform: `translate3d(${Math.cos(a) * d}px, ${Math.sin(a) * d - 30}px, 0) scale(1.9)`, opacity: 0 },
      ],
      { duration: 1300 + Math.random() * 700, easing: "cubic-bezier(.12,.8,.3,1)", fill: "forwards" },
    );
    anim.onfinish = () => p.remove();
  }
  for (let i = 0; i < dust; i++) {
    const p = document.createElement("span");
    const s = 1.5 + Math.random() * 2.5;
    p.className = "yu-chalk-dust";
    p.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;`;
    host.appendChild(p);
    const a = Math.random() * Math.PI * 2;
    const d = (60 + Math.random() * 180) * spread;
    const anim = p.animate(
      [
        { transform: "translate3d(0,0,0)", opacity: 1 },
        { transform: `translate3d(${Math.cos(a) * d}px, ${Math.sin(a) * d + 40 + Math.random() * 60}px, 0)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 900, easing: "cubic-bezier(.16,.86,.3,1)", fill: "forwards", delay: Math.random() * 120 },
    );
    anim.onfinish = () => p.remove();
  }
}

export function confetti(host: HTMLElement | null, opts: { origin?: Origin; count?: number } = {}) {
  if (!host || reduced()) return;
  const { x, y } = originOf(host, opts.origin);
  const count = opts.count ?? 40;
  const colours = ["var(--accent)", "var(--accent-hi)", "var(--label)", "var(--ring-3)", "var(--accent-deep)"];
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    const s = 5 + Math.random() * 6;
    const strip = Math.random() > 0.5;
    p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${strip ? s * 2.2 : s}px;border-radius:${strip ? "2px" : "50%"};background:${colours[i % colours.length]};will-change:transform,opacity;pointer-events:none;`;
    host.appendChild(p);
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const d = 90 + Math.random() * 220;
    const anim = p.animate(
      [
        { transform: "translate3d(0,0,0) scale(.4) rotate(0deg)", opacity: 1 },
        { transform: `translate3d(${Math.cos(a) * d}px, ${Math.sin(a) * d * 0.8 + 80}px, 0) scale(1) rotate(${Math.random() * 600 - 300}deg)`, opacity: 0 },
      ],
      { duration: 1000 + Math.random() * 600, easing: "cubic-bezier(.16,.86,.3,1)", fill: "forwards", delay: 80 + Math.random() * 80 },
    );
    anim.onfinish = () => p.remove();
  }
}
