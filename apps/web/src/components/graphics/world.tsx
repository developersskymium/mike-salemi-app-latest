/**
 * The Summit world kit: Mount Shasta from the south-west (Shastina on the left
 * shoulder), layered ridges with atmospheric perspective, mixed conifer forest,
 * a warm sun or a dusk moon, a few clouds and a fine print grain. Every scene
 * (the Climb, moments, empty states, spots, the Today sky) is built from these
 * pieces so they read as one place. Geometry is seeded and deterministic, so
 * server and client render the same marks.
 */
import type { ReactNode } from "react";
import "./world.css";
import { cls } from "./util";

export const w = cls("gfx-w");
/** The class that carries the world palette (light/dark/time-of-day custom properties). */
export const WORLD = "gfx-w";

export type WorldTime = "day" | "dawn" | "dusk" | "night";

/* ---------- numbers ---------- */

export function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => (Math.round(n * 10) / 10).toString();
type P = readonly [number, number];

/** Smooth closed-at-the-bottom path through points (Catmull-Rom as cubic Béziers). */
export function curve(pts: P[]): string {
  if (pts.length < 2) return "";
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

/** A ridge line y = f(x): a few seeded waves, big and slow to small and quick. */
export function ridgeFn(seed: number, y0: number, amp: number, span = 1000): (x: number) => number {
  const r = rng(seed);
  const waves = [0.7, 1.7, 3.9, 8.3].map((f, i) => ({
    f: ((f * 2 * Math.PI) / span) * (0.8 + 0.4 * r()),
    p: r() * Math.PI * 2,
    a: amp / (1 + i * 1.3),
  }));
  return (x) => y0 + waves.reduce((s, v) => s + v.a * Math.sin(x * v.f + v.p), 0);
}

export function ridgePath(f: (x: number) => number, x0: number, x1: number, bottom: number, step = 24): string {
  const pts: P[] = [];
  for (let x = x0; x < x1; x += step) pts.push([x, f(x)]);
  pts.push([x1, f(x1)]);
  return `${curve(pts)}L${r1(x1)} ${r1(bottom)}L${r1(x0)} ${r1(bottom)}Z`;
}

/* ---------- trees ---------- */

export type TreeKind = "fir" | "spire" | "pine" | "snag";

/**
 * One conifer as two paths: its silhouette and its sunlit right half. Firs
 * are tiered with drooping boughs; spires are tall and narrow; pines carry a
 * rounded crown on a bare trunk; snags are a few bare limbs.
 */
export function tree(kind: TreeKind, x: number, y: number, h: number, r: () => number): { d: string; lit: string } {
  if (kind === "pine") {
    const tw = h * 0.035 + 0.4;
    const crownY = y - h * 0.62;
    const cr = h * 0.2;
    const lobes: Array<[number, number, number]> = [
      [x - cr * 0.7, crownY + cr * 0.2, cr * 0.75],
      [x + cr * 0.7, crownY + cr * 0.25, cr * 0.7],
      [x, crownY - cr * 0.35, cr * 0.85],
      [x - cr * 0.15 + (r() - 0.5) * cr * 0.4, crownY - cr * 0.95, cr * 0.55],
    ];
    const circ = ([cx, cy, rr]: [number, number, number]) =>
      `M${r1(cx - rr)} ${r1(cy)}a${r1(rr)} ${r1(rr * 0.82)} 0 1 1 ${r1(rr * 2)} 0a${r1(rr)} ${r1(rr * 0.82)} 0 1 1 ${r1(-rr * 2)} 0Z`;
    const trunk = `M${r1(x - tw)} ${r1(y)}L${r1(x - tw * 0.6)} ${r1(crownY)}L${r1(x + tw * 0.6)} ${r1(crownY)}L${r1(x + tw)} ${r1(y)}Z`;
    const d = trunk + lobes.map(circ).join("");
    const lit = circ([x + cr * 0.95, crownY + cr * 0.05, cr * 0.42]) + circ([x + cr * 0.4, crownY - cr * 0.6, cr * 0.45]);
    return { d, lit };
  }
  if (kind === "snag") {
    const tw = h * 0.025 + 0.3;
    const d =
      `M${r1(x - tw)} ${r1(y)}L${r1(x - tw * 0.3)} ${r1(y - h)}L${r1(x + tw * 0.3)} ${r1(y - h)}L${r1(x + tw)} ${r1(y)}Z` +
      [0.35, 0.55, 0.72].map((k, i) => {
        const yy = y - h * k;
        const s = i % 2 ? 1 : -1;
        const L = h * (0.16 - k * 0.08);
        return `M${r1(x)} ${r1(yy)}L${r1(x + s * L)} ${r1(yy - L * 0.55)}L${r1(x + s * L * 0.92)} ${r1(yy - L * 0.4)}L${r1(x)} ${r1(yy + tw * 2)}Z`;
      }).join("");
    return { d, lit: "" };
  }
  const tiers = kind === "spire" ? 6 + Math.floor(r() * 3) : 4 + Math.floor(r() * 2);
  const wMax = h * (kind === "spire" ? 0.17 : 0.27) * (0.85 + r() * 0.3);
  const trunkH = h * 0.08;
  const tw = Math.max(0.5, h * 0.03);
  const top = y - h;
  const right: P[] = [];
  const left: P[] = [];
  for (let i = 1; i <= tiers; i++) {
    const k = i / tiers;
    const ty = top + (h - trunkH) * Math.pow(k, 0.92);
    const ww = wMax * (0.18 + 0.82 * k) * (0.92 + r() * 0.16);
    const droop = h * 0.02 * (0.5 + r());
    const inner = ww * (0.42 + r() * 0.12);
    const lift = (h - trunkH) / tiers * 0.34;
    right.push([x + ww, ty + droop], [x + inner, ty - lift * (i === tiers ? 0 : 1)]);
    const wl = ww * (0.92 + r() * 0.16);
    left.push([x - wl, ty + droop * (0.6 + r() * 0.8)], [x - inner, ty - lift * (i === tiers ? 0 : 1)]);
  }
  right.pop();
  left.pop();
  const by = y - trunkH;
  const pt = (p: P) => `${r1(p[0])} ${r1(p[1])}`;
  const d =
    `M${r1(x)} ${r1(top)}L` +
    right.map(pt).join("L") +
    `L${r1(x + tw)} ${r1(by)}L${r1(x + tw)} ${r1(y)}L${r1(x - tw)} ${r1(y)}L${r1(x - tw)} ${r1(by)}L` +
    left.slice().reverse().map(pt).join("L") +
    "Z";
  const lit = `M${r1(x)} ${r1(top)}L` + right.map(pt).join("L") + `L${r1(x + tw)} ${r1(by)}L${r1(x + wMax * 0.06)} ${r1(top + h * 0.12)}Z`;
  return { d, lit };
}

export interface ForestOpts {
  seed: number;
  f: (x: number) => number;
  x0: number;
  x1: number;
  /** Mean gap between trees. */
  gap: number;
  hMin: number;
  hMax: number;
  /** How far below the ridge line trunks stand. */
  sink?: number;
  /** Clearings: x ranges kept free of trees. */
  clear?: Array<[number, number]>;
  mix?: Partial<Record<TreeKind, number>>;
  /** 0 = even spacing, 1 = strong clumps and glades. */
  clump?: number;
}

/** A band of mixed conifers along a ridge line, as one silhouette path and one sunlit path. */
export function forest(o: ForestOpts): { d: string; lit: string } {
  const r = rng(o.seed);
  const mix = { fir: 5, spire: 3, pine: 1.4, snag: 0.25, ...o.mix };
  const kinds = Object.entries(mix) as Array<[TreeKind, number]>;
  const total = kinds.reduce((s, [, n]) => s + n, 0);
  const pick = (): TreeKind => {
    let v = r() * total;
    for (const [k, n] of kinds) if ((v -= n) <= 0) return k;
    return "fir";
  };
  let d = "";
  let lit = "";
  const ph = r() * 6.28;
  const fq = (2 * Math.PI) / (o.gap * (14 + r() * 10));
  for (let x = o.x0 + r() * o.gap; x < o.x1; x += o.gap * (0.45 + r() * 1.1)) {
    if (o.clear?.some(([a, b]) => x > a && x < b)) continue;
    // Clumps and glades: density rides a slow wave.
    const dens = 0.55 + 0.45 * Math.sin(x * fq + ph) * (o.clump ?? 0.8);
    if (r() > dens + 0.15) continue;
    const kind = pick();
    const h = o.hMin + (o.hMax - o.hMin) * Math.pow(r(), 0.8) * (kind === "spire" ? 1.15 : kind === "pine" ? 0.9 : 1);
    const t = tree(kind, x, o.f(x) + (o.sink ?? 2) + r() * 2, h, r);
    d += t.d;
    lit += t.lit;
  }
  return { d, lit };
}

/* ---------- clouds ---------- */

/** A soft cumulus: a rounded base capsule with seeded billows on top, width wd, base at y. */
export function cloud(x: number, y: number, wd: number, seed: number): { d: string; rim: string } {
  const r = rng(seed);
  const hb = wd * 0.13;
  const circ = (cx: number, cy: number, rr: number) => `M${r1(cx - rr)} ${r1(cy)}a${r1(rr)} ${r1(rr)} 0 1 1 ${r1(rr * 2)} 0a${r1(rr)} ${r1(rr)} 0 1 1 ${r1(-rr * 2)} 0Z`;
  let d = `M${r1(x + hb / 2)} ${r1(y)}a${r1(hb / 2)} ${r1(hb / 2)} 0 0 1 0 ${r1(-hb)}H${r1(x + wd - hb / 2)}a${r1(hb / 2)} ${r1(hb / 2)} 0 0 1 0 ${r1(hb)}Z`;
  const n = 3 + Math.floor(r() * 2);
  const peakAt = 0.35 + r() * 0.25;
  let rim = "";
  for (let i = 0; i < n; i++) {
    const k = 0.14 + (0.72 * i) / (n - 1);
    const rr = wd * (0.09 + 0.16 * Math.exp(-Math.pow((k - peakAt) / 0.28, 2))) * (0.85 + r() * 0.3);
    const cx = x + wd * k;
    const cy = y - hb * 0.6 - rr * 0.55;
    d += circ(cx, cy, rr);
    if (Math.abs(k - peakAt) < 0.5 / n) rim = `M${r1(cx - rr * 0.55)} ${r1(cy - rr * 0.84)}A${r1(rr)} ${r1(rr)} 0 0 1 ${r1(cx + rr * 0.72)} ${r1(cy - rr * 0.7)}`;
  }
  return { d, rim };
}

/* ---------- Mount Shasta ---------- */

/** The snowfield: a ragged snowline with long tapering streaks down the gullies. */
function snowPath(): string {
  const base: P[] = [[745, 136], [712, 126], [672, 134], [636, 130], [600, 134], [566, 120], [536, 98], [516, 102], [492, 112], [466, 110], [444, 100], [420, 112]];
  const bAt = (x: number) => {
    for (let i = 0; i < base.length - 1; i++) {
      const [x0, y0] = base[i];
      const [x1, y1] = base[i + 1];
      if (x <= x0 && x >= x1) {
        const t = (x0 - x) / (x0 - x1);
        const e = t * t * (3 - 2 * t);
        return y0 + (y1 - y0) * e;
      }
    }
    return base[base.length - 1][1];
  };
  const streaks: Array<[number, number, number]> = [
    [728, 30, 14], [700, 64, 20], [672, 30, 14], [640, 96, 22], [612, 44, 16], [588, 70, 18],
    [560, 32, 16], [526, 30, 12], [500, 66, 18], [472, 34, 14], [452, 22, 10],
  ];
  const r = rng(41);
  const pts: P[] = [];
  for (let x = 760; x >= 410; x -= 2.5) {
    let y = bAt(x) + (r() - 0.5) * 3;
    for (const [cx, len, hw] of streaks) {
      const u = Math.abs(x - cx) / hw;
      if (u < 1) y = Math.max(y, bAt(x) + len * Math.pow(1 - u, 1.35));
    }
    pts.push([x, y]);
  }
  const pt = (p: P) => `${r1(p[0])} ${r1(p[1])}`;
  return `M400 -20H770V${r1(pts[0][1])}L${pts.map(pt).join("L")}L400 ${r1(pts[pts.length - 1][1])}Z`;
}

/* Local frame 1000 × 340, base at y = 340. Main summit at 604,4; Shastina at 478,50. */
const SH = {
  body:
    "M0 340C110 324 206 284 290 226C348 186 404 128 440 88C452 74 460 60 466 53L474 49L488 50C496 57 505 69 516 75C523 79 530 77 537 71C557 50 580 21 594 8L601 3.5L612 5L621 11C652 42 692 92 744 152C802 218 882 292 1000 340Z",
  /* Shadowed west faces: Shastina's and the main cone's left flank, split on the ridgelines. */
  shade:
    "M0 340C110 324 206 284 290 226C348 186 404 128 440 88C452 74 460 60 466 53L474 49L476 70C470 120 448 190 420 340Z" +
    "M537 71C557 50 580 21 594 8L601 3.5L598 40C590 100 582 170 596 260C602 300 600 330 596 340L470 340C500 270 520 200 524 140C527 110 530 88 537 71Z",
  /* A secondary ridge on the sunlit east face. */
  rib: "M612 5C640 60 668 120 690 190C705 240 716 290 722 340L760 340C744 280 720 200 690 130C668 82 640 36 621 11Z",
  snow: snowPath(),
  /* Dark rock bands breaking the snow near the summit (Red Banks, Misery Hill). */
  rocks:
    "M622 40C630 44 640 46 650 52C646 56 636 56 628 52C624 50 620 46 622 40Z" +
    "M586 60C590 70 590 82 586 92C582 86 580 74 586 60Z" +
    "M660 96C668 100 676 108 680 118C672 116 664 108 660 96Z" +
    "M482 70C486 76 486 86 482 92C479 86 479 78 482 70Z",
  /* Snow streaks down the gullies below the snowline. */
  streaks:
    "M655 175C657 190 660 205 664 222L668 222C665 205 662 190 659 176Z" +
    "M613 165C613 182 614 200 617 214L621 214C619 199 618 182 617 166Z" +
    "M703 138C710 152 716 166 723 184L727 182C721 166 714 152 707 138Z" +
    "M500 136C498 152 494 168 490 182L494 183C498 168 502 152 504 137Z" +
    "M573 134C571 150 570 166 571 178L575 178C574 166 575 150 577 135Z" +
    "M738 160C746 172 754 186 760 198L763 196C757 184 750 171 742 159Z",
  ribs: "M601 6C596 60 588 130 592 210M612 6C630 70 652 140 664 230M474 52C470 100 458 160 440 230M560 46C548 90 538 150 530 230M700 110C716 150 730 200 740 260",
};

export const SHASTA_SUMMIT: P = [601, 3.5];

/**
 * Mount Shasta, lit from the right: sunlit east face, shadowed west faces,
 * snowfields with fingers down the gullies (shadowed snow on the west), and
 * its base dissolving into valley haze. `x`, `base` place the local frame;
 * `width` scales it (height follows, times `lift`).
 */
export function Shasta({ id, x, base, width, lift = 1, haze = true }: { id: string; x: number; base: number; width: number; lift?: number; haze?: boolean }) {
  const k = width / 1000;
  return (
    <g transform={`translate(${r1(x)} ${r1(base - 340 * k * lift)}) scale(${k.toFixed(4)} ${(k * lift).toFixed(4)})`}>
      <defs>
        <clipPath id={`${id}-sh`}>
          <path d={SH.body} />
        </clipPath>
        <clipPath id={`${id}-sn`}>
          <path d={SH.snow} />
        </clipPath>
        <linearGradient id={`${id}-shz`} x1="0" y1="120" x2="0" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0" className={w.haze0} />
          <stop offset=".6" className={w.hazeMid} />
          <stop offset="1" className={w.haze1} />
        </linearGradient>
      </defs>
      <path d={SH.body} className={w.mtn} />
      <g clipPath={`url(#${id}-sh)`}>
        <path d={SH.rib} className={w.mtnShade} opacity={0.45} />
        <path d={SH.shade} className={w.mtnShade} />
        <path d={SH.ribs} className={w.mtnLine} strokeWidth={2.2 / k} opacity={0.18} />
        <path d={SH.streaks} className={w.snowShade} opacity={0.9} />
      </g>
      <g clipPath={`url(#${id}-sh)`}>
        <path d={SH.snow} className={w.snow} />
        <path d={SH.rocks} className={w.mtnShade} opacity={0.55} />
      </g>
      <g clipPath={`url(#${id}-sn)`}>
        <g clipPath={`url(#${id}-sh)`}>
        <path d={SH.shade} className={w.snowShade} />
        <path d={SH.rib} className={w.snowShade} opacity={0.55} />
        <path d="M598 40C590 100 582 170 596 260" className={w.mtnLine} strokeWidth={3} opacity={0.15} />
        </g>
      </g>
      {haze ? <rect x={-20} y={110} width={1040} height={240} fill={`url(#${id}-shz)`} clipPath={`url(#${id}-sh)`} /> : null}
    </g>
  );
}

/** Map a point in Shasta's local frame to the scene (same args as <Shasta>). */
export function shastaPoint(pt: P, x: number, base: number, width: number, lift = 1): P {
  const k = width / 1000;
  return [x + pt[0] * k, base - 340 * k * lift + pt[1] * k * lift];
}

/* ---------- sky ---------- */

export interface SkyProps {
  id: string;
  w: number;
  h: number;
  /** Sun (day) or moon (dusk/night) position and radius. */
  sun?: [number, number, number];
  moon?: [number, number, number];
  stars?: number;
  /** Horizon line for the sky gradient (defaults to h). */
  horizon?: number;
  seed?: number;
}

/** Sky gradient, the warm glow around the light, the sun (day) or moon and stars (dusk). */
export function Sky({ id, w: W, h: H, sun, moon, stars = 0, horizon, seed = 3 }: SkyProps) {
  const hz = horizon ?? H;
  const r = rng(seed);
  const starD = stars
    ? Array.from({ length: stars }, () => {
        const x = r() * W;
        const y = Math.pow(r(), 1.6) * hz * 0.7;
        const s = 0.5 + r() * r() * 1.4;
        return `M${r1(x - s)} ${r1(y)}a${r1(s)} ${r1(s)} 0 1 0 ${r1(s * 2)} 0a${r1(s)} ${r1(s)} 0 1 0 ${r1(-s * 2)} 0Z`;
      }).join("")
    : "";
  const m = moon ?? (sun ? [sun[0], sun[1], sun[2] * 0.6] : undefined);
  const glowAt = sun ?? m;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2={hz} gradientUnits="userSpaceOnUse">
          <stop offset="0" className={w.sky0} />
          <stop offset=".55" className={w.sky1} />
          <stop offset="1" className={w.sky2} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
          <stop offset="0" className={w.glow0} />
          <stop offset="1" className={w.glow1} />
        </radialGradient>
        <radialGradient id={`${id}-sun`} cx=".38" cy=".34" r=".7">
          <stop offset="0" className={w.sun0} />
          <stop offset="1" className={w.sun1} />
        </radialGradient>
      </defs>
      <rect x={-2} y={-2} width={W + 4} height={H + 4} fill={`url(#${id}-sky)`} />
      {glowAt ? <circle cx={glowAt[0]} cy={glowAt[1]} r={Math.max(W, H) * 0.42} fill={`url(#${id}-glow)`} className={sun ? undefined : w.glowMoon} /> : null}
      {starD ? <path d={starD} className={`${w.stars} ${w.twinkle}`} /> : null}
      {sun ? (
        <g className={w.sun}>
          <circle cx={sun[0]} cy={sun[1]} r={sun[2] * 1.7} className={w.sunHalo} opacity={0.08} />
          <circle cx={sun[0]} cy={sun[1]} r={sun[2] * 1.3} className={w.sunHalo} opacity={0.12} />
          <circle cx={sun[0]} cy={sun[1]} r={sun[2]} fill={`url(#${id}-sun)`} />
        </g>
      ) : null}
      {m ? (
        <g className={w.moon}>
          <circle cx={m[0]} cy={m[1]} r={m[2] * 2.2} className={w.moonHalo} opacity={0.08} />
          <path
            d={`M${r1(m[0] + m[2] * 0.3)} ${r1(m[1] - m[2])}a${m[2]} ${m[2]} 0 1 0 ${r1(m[2] * 0.62)} ${r1(m[2] * 1.86)}a${r1(m[2] * 0.8)} ${r1(m[2] * 0.8)} 0 1 1 ${r1(-m[2] * 0.62)} ${r1(-m[2] * 1.86)}Z`}
          />
        </g>
      ) : null}
    </>
  );
}

/** A few drifting clouds; each is [x, y (base), width, seed]. */
export function Clouds({ id, items, drift = true }: { id: string; items: Array<[number, number, number, number]>; drift?: boolean }) {
  return (
    <g className={w.clouds}>
      <defs>
        <linearGradient id={`${id}-cl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".35" className={w.cloud0} />
          <stop offset="1" className={w.cloud1} />
        </linearGradient>
      </defs>
      {items.map(([x, y, wd, seed], i) => {
        const c = cloud(x, y, wd, seed);
        return (
          <g key={i} className={drift ? (i % 2 ? w.drift2 : w.drift) : undefined}>
            <path d={c.d} className={w.cloudLit} />
            <path d={c.d} fill={`url(#${id}-cl)`} transform="translate(-2.5 2)" />
          </g>
        );
      })}
    </g>
  );
}

/** Fine print grain over the whole scene (multiply in daylight, screen at dusk). */
export function Grain({ id, w: W, h: H, freq = 0.9 }: { id: string; w: number; h: number; freq?: number }) {
  return (
    <>
      <defs>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={4} stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .4  0 0 0 -2.2 1.6" />
        </filter>
      </defs>
      <rect x={0} y={0} width={W} height={H} filter={`url(#${id}-grain)`} className={w.grain} />
    </>
  );
}

/** A low distant range (Klamath / Trinity hills) behind the mountain. */
export function FarRange({ w: W, y, seed = 9, amp = 14, cls: c = w.far0 }: { w: number; y: number; seed?: number; amp?: number; cls?: string }) {
  return <path d={ridgePath(ridgeFn(seed, y, amp, W), -10, W + 10, y + 400, 20)} className={c} />;
}

export interface LayerProps {
  w: number;
  y: number;
  amp: number;
  seed: number;
  bottom: number;
  /** r1 (far) … r4 (near). */
  depth: 1 | 2 | 3 | 4;
  trees?: Omit<ForestOpts, "seed" | "f" | "x0" | "x1"> & { x0?: number; x1?: number };
  children?: ReactNode;
}

const DEPTH = {
  1: [w.r1, w.r1Lit],
  2: [w.r2, w.r2Lit],
  3: [w.r3, w.r3Lit],
  4: [w.r4, w.r4Lit],
} as const;

/** A ridge layer with its own forest, in the colour of its distance. */
export function Layer({ w: W, y, amp, seed, bottom, depth, trees, children }: LayerProps) {
  const f = ridgeFn(seed, y, amp, W);
  const [base, lit] = DEPTH[depth];
  const fo = trees ? forest({ seed: seed + 7, f, x0: trees.x0 ?? -10, x1: trees.x1 ?? W + 10, ...trees }) : null;
  return (
    <g>
      <path d={ridgePath(f, -10, W + 10, bottom, 18)} className={base} />
      {fo ? (
        <>
          <path d={fo.d} className={base} />
          <path d={fo.lit} className={lit} />
        </>
      ) : null}
      {children}
    </g>
  );
}

export { ridgeFn as ridge };

/* ---------- a whole view ---------- */

export interface VistaProps {
  id: string;
  w: number;
  h: number;
  /** Shasta placement: left x, base y, width, vertical lift. */
  mountain?: { x: number; base: number; width: number; lift?: number } | null;
  sun?: [number, number, number] | null;
  moon?: [number, number, number] | null;
  stars?: number;
  clouds?: Array<[number, number, number, number]>;
  far?: number | null;
  /** Ridge layers, far to near. */
  layers?: Array<Omit<LayerProps, "w" | "bottom">>;
  horizon?: number;
  seed?: number;
}

/** Sky, light, clouds, the far range, Shasta and ridge layers: the backdrop every scene shares. */
export function Vista({ id, w: W, h: H, mountain, sun, moon, stars = 40, clouds = [], far, layers = [], horizon, seed = 3 }: VistaProps) {
  return (
    <>
      <Sky id={id} w={W} h={H} sun={sun ?? undefined} moon={moon ?? undefined} stars={stars} horizon={horizon ?? H * 0.8} seed={seed} />
      {clouds.length ? <Clouds id={id} items={clouds} /> : null}
      {far != null ? (
        <>
          <FarRange w={W} y={far - 8} seed={seed + 11} amp={W * 0.012} cls={w.far1} />
          <FarRange w={W} y={far} seed={seed + 2} amp={W * 0.008} />
        </>
      ) : null}
      {mountain ? <Shasta id={id} x={mountain.x} base={mountain.base} width={mountain.width} lift={mountain.lift} /> : null}
      {layers.map((l, i) => (
        <Layer key={i} w={W} bottom={H + 10} {...l} />
      ))}
    </>
  );
}
