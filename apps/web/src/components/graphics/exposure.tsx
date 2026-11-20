import "./gfx.css";
import "./exposure.css";
import { cls } from "./util";

const s = cls("gfx-exp");

/** Seeded random so server and client draw the same sky. */
function rng(seed: number) {
  let v = seed;
  return () => (v = (v * 9301 + 49297) % 233280) / 233280;
}
const f1 = (n: number) => n.toFixed(1);

/** Star trails: short concentric arcs around the pole, as in a long exposure. */
export function StarTrails({ cx, cy, n = 60, rmin = 10, rmax = 200, seed = 11, scale = 1 }: { cx: number; cy: number; n?: number; rmin?: number; rmax?: number; seed?: number; scale?: number }) {
  const r0 = rng(seed);
  const arcs = Array.from({ length: n }, () => {
    const r = rmin + Math.pow(r0(), 0.8) * (rmax - rmin);
    const a0 = r0() * Math.PI * 2;
    const sw = (0.08 + r0() * 0.22) * Math.PI;
    const big = r0() > 0.93;
    const tone = r0() > 0.5 ? s.starA : s.starB;
    const w = (big ? 1.3 : 0.6 + r0() * 0.5) * scale;
    const o = big ? 0.85 : 0.18 + r0() * 0.45;
    const d = `M${f1(cx + r * Math.cos(a0))} ${f1(cy + r * Math.sin(a0))}A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx + r * Math.cos(a0 + sw))} ${f1(cy + r * Math.sin(a0 + sw))}`;
    return { d, w, o, cls: big ? s.starBig : tone };
  });
  return (
    <g className={s.trails}>
      {arcs.map((a, i) => (
        <path key={i} d={a.d} className={a.cls} strokeWidth={a.w.toFixed(2)} strokeOpacity={a.o.toFixed(2)} />
      ))}
    </g>
  );
}

/** Glacier contour lines: the mountain as a topo map on snow (every fifth an index contour). */
export function Contours({ cx, cy, n = 14, r0 = 8, step = 7, seed = 5, sx = 1.5, sy = 0.8 }: { cx: number; cy: number; n?: number; r0?: number; step?: number; seed?: number; sx?: number; sy?: number }) {
  const r = rng(seed);
  const rings = Array.from({ length: n }, (_, i) => {
    const rad = r0 + i * step;
    const ph = r() * 6;
    const ph2 = r() * 6;
    let d = "";
    for (let k = 0; k <= 72; k++) {
      const th = (k / 72) * Math.PI * 2;
      const rr = rad * (1 + 0.08 * Math.sin(3 * th + ph) + 0.05 * Math.sin(5 * th + ph2) + (0.02 * i) / n * Math.sin(9 * th));
      d += `${k ? "L" : "M"}${f1(cx + rr * Math.cos(th) * sx)} ${f1(cy + rr * Math.sin(th) * sy)}`;
    }
    return { d: `${d}Z`, index: i % 5 === 0 };
  });
  return (
    <g className={s.contours}>
      {rings.map((c, i) => (
        <path key={i} d={c.d} className={c.index ? s.indexLine : s.line} />
      ))}
    </g>
  );
}

/** Mount Shasta as a silhouette: Shastina's cone on the left shoulder. Spans x0..x0+w, base at y. */
export function shastaPath(x0: number, base: number, w: number, h: number): string {
  const P = (u: number, v: number) => `${f1(x0 + u * w)} ${f1(base - v * h)}`;
  return `M${P(0, 0)}C${P(0.14, 0.12)} ${P(0.24, 0.3)} ${P(0.32, 0.46)}C${P(0.36, 0.56)} ${P(0.38, 0.6)} ${P(0.41, 0.6)}C${P(0.43, 0.6)} ${P(0.44, 0.58)} ${P(0.45, 0.62)}C${P(0.48, 0.8)} ${P(0.52, 1)} ${P(0.56, 1)}C${P(0.6, 1)} ${P(0.63, 0.86)} ${P(0.68, 0.7)}C${P(0.76, 0.46)} ${P(0.88, 0.16)} ${P(1, 0)}Z`;
}

/** The two grounds every Trace world sits on: a night exposure (dark) or snow with contours (light). */
export function Exposure({ w, h, pole, seed = 11, scale = 1, night }: { w: number; h: number; pole: [number, number]; seed?: number; scale?: number; night?: boolean }) {
  return (
    <>
      <g className={night ? s.alwaysNight : s.night}>
        <rect x={0} y={0} width={w} height={h} className={s.nightBg} />
        <StarTrails cx={pole[0]} cy={pole[1]} n={Math.round((w * h) / 520)} rmin={6} rmax={Math.hypot(w, h)} seed={seed} scale={scale} />
      </g>
      {night ? null : (
        <g className={s.snow}>
          <rect x={0} y={0} width={w} height={h} className={s.snowBg} />
          <Contours cx={pole[0]} cy={h * 0.62} n={16} r0={6} step={Math.max(w, h) / 22} seed={seed} />
        </g>
      )}
    </>
  );
}
