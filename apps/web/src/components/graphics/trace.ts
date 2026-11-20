/**
 * The Trace drawing rule, platform-neutral (no DOM): a path exposed up to a
 * point, drawn as a tapered tail that cools to a faint floor, a soft glow, a
 * hot head, and the dim dotted path still ahead. Used by the movement figures
 * (the bell's path), progress, the phase ridge, completion and the glyph art.
 */

export type Pt = readonly [number, number];

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** Smooth open Catmull-Rom curve through control points, sampled to a dense polyline. */
export function smooth(ctrl: Pt[], perSeg = 16): Pt[] {
  if (ctrl.length < 3) return ctrl.slice();
  const out: Pt[] = [];
  const P = (i: number) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, c0: number, d: number) =>
        0.5 * (2 * b + (-a + c0) * t + (2 * a - 5 * b + 4 * c0 - d) * t2 + (-a + 3 * b - 3 * c0 + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

/** Arc samples: centre, radius, from/to angle in degrees (0 = +x, clockwise on screen). */
export function arcPts(cx: number, cy: number, r: number, from: number, to: number, n = 48): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

/** A polyline with arc-length lookup. */
export class Line {
  readonly pts: Pt[];
  readonly cum: number[];
  readonly total: number;
  constructor(pts: Pt[]) {
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.total = this.cum[this.cum.length - 1] || 0;
  }
  at(len: number): Pt {
    const L = Math.max(0, Math.min(this.total, len));
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < L) i++;
    const a = this.cum[i - 1];
    const b = this.cum[i];
    const t = b > a ? (L - a) / (b - a) : 0;
    const p = this.pts[i - 1];
    const q = this.pts[i];
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  }
  /** Path data for the stretch between two lengths. */
  d(a: number, b: number): string {
    if (b - a < 0.05) return "";
    const out: Pt[] = [this.at(a)];
    for (let i = 0; i < this.pts.length; i++) if (this.cum[i] > a && this.cum[i] < b) out.push(this.pts[i]);
    out.push(this.at(b));
    return `M${out.map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L")}`;
  }
}

export interface TraceOpts {
  /** Stroke width at the head (user units). */
  width?: number;
  /** Tail segments (more = smoother taper). */
  segments?: number;
  /** Tail length as a fraction of the whole path (1 = from the start). */
  tail?: number;
  /** Opacity the tail cools to at its far end. */
  floor?: number;
  /** Draw the dotted path ahead of the head. */
  ahead?: boolean;
  /** Draw the head. */
  head?: boolean;
}

export interface TraceGeo {
  glow: string;
  glowWidth: number;
  tail: Array<{ d: string; w: number; o: number }>;
  ahead: string;
  aheadWidth: number;
  head: Pt | null;
  width: number;
}

/** The trace exposed to `progress` (0..1) of the line. */
export function traceGeo(line: Line, progress: number, o: TraceOpts = {}): TraceGeo {
  const w = o.width ?? 3;
  const N = o.segments ?? 22;
  const floor = o.floor ?? 0.08;
  const done = line.total * Math.max(0, Math.min(1, progress));
  const start = Math.max(0, done - line.total * (o.tail ?? 1));
  const tail: TraceGeo["tail"] = [];
  if (done > 0.3) {
    for (let i = 0; i < N; i++) {
      const a = start + ((done - start) * i) / N;
      const b = Math.min(done, start + ((done - start) * (i + 1)) / N + 0.4);
      const t = (i + 1) / N;
      tail.push({ d: line.d(a, b), w: w * (0.25 + 0.75 * t), o: floor + (1 - floor) * Math.pow(t, 1.5) });
    }
  }
  return {
    glow: done > 0.3 ? line.d(Math.max(start, done * 0.45), done) : "",
    glowWidth: w * 3.2,
    tail,
    ahead: o.ahead === false ? "" : line.d(done, line.total),
    aheadWidth: Math.max(1.2, w * 0.55),
    head: o.head === false || done <= 0.3 ? null : line.at(done),
    width: w,
  };
}
