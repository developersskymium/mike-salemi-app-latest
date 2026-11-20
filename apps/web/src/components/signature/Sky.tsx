import type { CSSProperties } from "react";
import { rng } from "./geometry";

/** Mount Shasta's profile in a 1000-wide box (baseline 1000). */
const SHASTA =
  "M0 1000 L0 862 C100 850 210 832 300 814 C360 800 395 774 420 762 C436 754 450 754 462 758 C482 734 512 690 540 656 C560 632 574 624 588 628 C606 636 640 680 680 724 C732 780 810 814 900 832 C946 840 980 846 1000 850 L1000 1000Z";
const SHASTA_LINE = SHASTA.replace(" L1000 1000Z", "").replace("M0 1000 L0 862", "M0 862");

const r1 = (v: number) => Math.round(v * 10) / 10;

type Common = {
  /** Draw Mount Shasta along the bottom. */
  mountain?: boolean;
  /** Small periodic light events (a meteor at night, a glint on snow). Off under reduced motion. */
  live?: boolean;
  /** Fix to the viewport (shell backdrop) instead of filling the parent. */
  fixed?: boolean;
  /** 0–1 overall strength. */
  intensity?: number;
  seed?: number;
  className?: string;
  style?: CSSProperties;
};

function trailPaths(n: number, cx: number, cy: number, rmin: number, rmax: number, seed: number) {
  const rnd = rng(seed);
  const out: { d: string; c: 0 | 1 | 2; w: number; o: number }[] = [];
  for (let i = 0; i < n; i++) {
    const r = rmin + Math.pow(rnd(), 0.8) * (rmax - rmin);
    const a0 = rnd() * Math.PI * 2;
    const sweep = (0.08 + rnd() * 0.22) * Math.PI;
    const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0), x2 = cx + r * Math.cos(a0 + sweep), y2 = cy + r * Math.sin(a0 + sweep);
    const big = rnd() > 0.93;
    const tint = rnd() > 0.5;
    out.push({
      d: `M${r1(x1)} ${r1(y1)}A${r1(r)} ${r1(r)} 0 0 1 ${r1(x2)} ${r1(y2)}`,
      c: big ? 0 : tint ? 1 : 2,
      w: big ? 1.3 : r1(0.6 + rnd() * 0.5),
      o: big ? 0.85 : Math.round((0.18 + rnd() * 0.45) * 100) / 100,
    });
  }
  return out;
}

const STAR = ["#DDF4FF", "#9FD7F5", "#C9D6E6"];

/**
 * Night exposure: star trails circling the pole over Mount Shasta. A static SVG (painted once),
 * exposed on first paint with a short settle; `live` adds an occasional meteor (one small
 * composited element). Cheap enough to sit behind the whole app.
 */
export function StarTrails({ mountain, live = true, fixed, intensity = 1, seed = 11, count = 190, className, style }: Common & { count?: number }) {
  const paths = trailPaths(count, 800, -60, 60, 1250, seed);
  return (
    <div className={className ? `tr-sky tr-stars ${className}` : "tr-sky tr-stars"} data-fixed={fixed ? "" : undefined} aria-hidden style={{ "--tr-int": intensity, ...style } as CSSProperties}>
      <svg className="tr-sky-svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <g className="tr-sky-trails">
          {[0, 1, 2].map((c) => (
            <g key={c} stroke={STAR[c]} fill="none" strokeLinecap="round">
              {paths.filter((p) => p.c === c).map((p, i) => (
                <path key={i} d={p.d} strokeWidth={p.w} strokeOpacity={p.o} />
              ))}
            </g>
          ))}
        </g>
        {mountain && (
          <g>
            <path d={SHASTA} className="tr-sky-mtn" />
            <path d={SHASTA_LINE} className="tr-sky-ridge" fill="none" />
          </g>
        )}
      </svg>
      {live && <i className="tr-meteor" />}
    </div>
  );
}

/** A closed Catmull-Rom curve through points, as cubic Béziers (smooth with few points). */
function smoothClosed(pts: [number, number][]) {
  const n = pts.length;
  const q = (i: number) => pts[(i + n) % n]!;
  let d = `M${Math.round(pts[0]![0])} ${Math.round(pts[0]![1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = q(i - 1), p1 = q(i), p2 = q(i + 1), p3 = q(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${Math.round(c1[0]!)} ${Math.round(c1[1]!)} ${Math.round(c2[0]!)} ${Math.round(c2[1]!)} ${Math.round(p2[0])} ${Math.round(p2[1])}`;
  }
  return d + "Z";
}

function contourPaths(n: number, cx: number, cy: number, r0: number, step: number, seed: number) {
  const rnd = rng(seed);
  const out: { d: string; major: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const r = r0 + i * step, ph = rnd() * 6, ph2 = rnd() * 6;
    const pts: [number, number][] = [];
    const K = 28;
    for (let k = 0; k < K; k++) {
      const th = (k / K) * Math.PI * 2;
      const rr = r * (1 + 0.08 * Math.sin(3 * th + ph) + 0.05 * Math.sin(5 * th + ph2) + (0.02 * i) / n * Math.sin(9 * th));
      pts.push([cx + rr * Math.cos(th) * 1.5, cy + rr * Math.sin(th) * 0.8]);
    }
    out.push({ d: smoothClosed(pts), major: i % 5 === 0 });
  }
  return out;
}

/**
 * Daylight: the same mountain as glacier contour lines on snow. Static SVG; `live` lets a soft
 * band of light pass over the snow now and then (one composited element).
 */
export function SnowContours({ mountain, live = true, fixed, intensity = 1, seed = 7, count = 26, className, style }: Common & { count?: number }) {
  const paths = contourPaths(count, 600, 880, 14, 30, seed);
  return (
    <div className={className ? `tr-sky tr-snow ${className}` : "tr-sky tr-snow"} data-fixed={fixed ? "" : undefined} aria-hidden style={{ "--tr-int": intensity, ...style } as CSSProperties}>
      <svg className="tr-sky-svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <g className="tr-sky-contours" fill="none">
          {paths.map((p, i) => (
            <path key={i} d={p.d} strokeWidth={p.major ? 1 : 0.55} strokeOpacity={p.major ? 0.55 : 0.3} />
          ))}
        </g>
        {mountain && <path d={SHASTA_LINE} className="tr-sky-ridge" fill="none" />}
      </svg>
      {live && <i className="tr-glint" />}
    </div>
  );
}

/** The living backdrop for both themes: star trails at night, contours on snow (CSS picks one). */
export function LivingBackdrop({ fixed = true, mountain, live = true, intensity }: Pick<Common, "fixed" | "mountain" | "live" | "intensity">) {
  return (
    <div className="tr-living" data-fixed={fixed ? "" : undefined} aria-hidden>
      <StarTrails className="tr-living-dark" mountain={mountain} live={live} intensity={intensity} />
      <SnowContours className="tr-living-light" mountain={mountain} live={live} intensity={intensity} />
    </div>
  );
}

export { SHASTA, SHASTA_LINE };
