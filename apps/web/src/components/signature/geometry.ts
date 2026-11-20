/**
 * Trace geometry: flattens an SVG path into points so a trace can be cut into a tapered
 * tail, a head and nodes on the server (no DOM, deterministic, cacheable).
 * Supports M L H V C S Q T A Z, absolute and relative.
 */

export type Pt = { x: number; y: number };
export type Sampled = { pts: Pt[]; acc: number[]; length: number };

function tokens(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  const re = /([MLHVCSQTAZmlhvcsqtaz])|(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) out.push(m[1] ? m[1] : Number(m[2]));
  return out;
}

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number, out: Pt[]) {
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
}

function arc(p0: Pt, rx: number, ry: number, phi: number, large: number, sweep: number, p: Pt, out: Pt[]) {
  if (!rx || !ry) return void out.push(p);
  const rad = (phi * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = (p0.x - p.x) / 2, dy = (p0.y - p.y) / 2;
  const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const sgn = large === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const co = sgn * Math.sqrt(Math.max(0, num / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
  const cx1 = (co * rx * y1) / ry, cy1 = (-co * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (p0.x + p.x) / 2, cy = sin * cx1 + cos * cy1 + (p0.y + p.y) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(8, Math.ceil((Math.abs(dt) / (Math.PI * 2)) * 96));
  for (let i = 1; i <= n; i++) {
    const t = t1 + (dt * i) / n;
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    out.push({ x: cos * ex - sin * ey + cx, y: sin * ex + cos * ey + cy });
  }
}

/** Flattens a path into a polyline (first subpath plus any continuation). */
export function flatten(d: string): Pt[] {
  const t = tokens(d);
  const out: Pt[] = [];
  let i = 0, cmd = "M";
  let cur: Pt = { x: 0, y: 0 }, start: Pt = { x: 0, y: 0 }, lastC: Pt | null = null, lastQ: Pt | null = null;
  const n = () => t[i++] as number;
  while (i < t.length) {
    if (typeof t[i] === "string") cmd = t[i++] as string;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? cur.x : 0, oy = rel ? cur.y : 0;
    switch (C) {
      case "M": {
        cur = { x: ox + n(), y: oy + n() };
        start = cur;
        out.push(cur);
        cmd = rel ? "l" : "L";
        lastC = lastQ = null;
        break;
      }
      case "L": cur = { x: ox + n(), y: oy + n() }; out.push(cur); lastC = lastQ = null; break;
      case "H": cur = { x: ox + n(), y: cur.y }; out.push(cur); lastC = lastQ = null; break;
      case "V": cur = { x: cur.x, y: oy + n() }; out.push(cur); lastC = lastQ = null; break;
      case "C": {
        const p1 = { x: ox + n(), y: oy + n() }, p2 = { x: ox + n(), y: oy + n() }, p3 = { x: ox + n(), y: oy + n() };
        cubic(cur, p1, p2, p3, 40, out); lastC = p2; lastQ = null; cur = p3; break;
      }
      case "S": {
        const p1 = lastC ? { x: 2 * cur.x - lastC.x, y: 2 * cur.y - lastC.y } : cur;
        const p2 = { x: ox + n(), y: oy + n() }, p3 = { x: ox + n(), y: oy + n() };
        cubic(cur, p1, p2, p3, 40, out); lastC = p2; lastQ = null; cur = p3; break;
      }
      case "Q": {
        const q = { x: ox + n(), y: oy + n() }, p3 = { x: ox + n(), y: oy + n() };
        cubic(cur, { x: cur.x + (2 / 3) * (q.x - cur.x), y: cur.y + (2 / 3) * (q.y - cur.y) }, { x: p3.x + (2 / 3) * (q.x - p3.x), y: p3.y + (2 / 3) * (q.y - p3.y) }, p3, 32, out);
        lastQ = q; lastC = null; cur = p3; break;
      }
      case "T": {
        const q: Pt = lastQ ? { x: 2 * cur.x - lastQ.x, y: 2 * cur.y - lastQ.y } : cur;
        const p3 = { x: ox + n(), y: oy + n() };
        cubic(cur, { x: cur.x + (2 / 3) * (q.x - cur.x), y: cur.y + (2 / 3) * (q.y - cur.y) }, { x: p3.x + (2 / 3) * (q.x - p3.x), y: p3.y + (2 / 3) * (q.y - p3.y) }, p3, 32, out);
        lastQ = q; lastC = null; cur = p3; break;
      }
      case "A": {
        const rx = n(), ry = n(), phi = n(), la = n(), sw = n();
        const p = { x: ox + n(), y: oy + n() };
        arc(cur, rx, ry, phi, la, sw, p, out); cur = p; lastC = lastQ = null; break;
      }
      case "Z": cur = start; out.push(cur); lastC = lastQ = null; break;
      default: i++;
    }
  }
  return out;
}

const cache = new Map<string, Sampled>();

/** Flattened points with cumulative lengths. Cached per path. */
export function sample(d: string): Sampled {
  const hit = cache.get(d);
  if (hit) return hit;
  const pts = flatten(d);
  const acc = [0];
  for (let k = 1; k < pts.length; k++) acc.push(acc[k - 1]! + Math.hypot(pts[k]!.x - pts[k - 1]!.x, pts[k]!.y - pts[k - 1]!.y));
  const s = { pts, acc, length: acc[acc.length - 1] ?? 0 };
  if (cache.size > 400) cache.clear();
  cache.set(d, s);
  return s;
}

/** The point at a distance along the path. */
export function pointAt(s: Sampled, at: number): Pt {
  const { pts, acc } = s;
  if (pts.length === 0) return { x: 0, y: 0 };
  if (at <= 0) return pts[0]!;
  if (at >= s.length) return pts[pts.length - 1]!;
  let lo = 0, hi = acc.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (acc[mid]! < at) lo = mid; else hi = mid;
  }
  const seg = acc[hi]! - acc[lo]! || 1;
  const f = (at - acc[lo]!) / seg;
  return { x: pts[lo]!.x + (pts[hi]!.x - pts[lo]!.x) * f, y: pts[lo]!.y + (pts[hi]!.y - pts[lo]!.y) * f };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** The sub-path between two distances, as polyline points ("x,y x,y"). */
export function slice(s: Sampled, a: number, b: number, step = 3): string {
  const out: string[] = [];
  if (b <= a) return "";
  for (let at = a; at < b; at += step) {
    const p = pointAt(s, at);
    out.push(`${r1(p.x)},${r1(p.y)}`);
  }
  const p = pointAt(s, b);
  out.push(`${r1(p.x)},${r1(p.y)}`);
  return out.join(" ");
}

/** Tiny stable hash for SVG ids (identical inputs → identical defs, so collisions are harmless). */
export function hashId(...parts: (string | number | undefined | boolean)[]): string {
  let h = 2166136261;
  const str = parts.join("|");
  for (let k = 0; k < str.length; k++) {
    h ^= str.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return "tr" + (h >>> 0).toString(36);
}

/** A seeded pseudo-random generator (same sky on server and client). */
export function rng(seed = 11) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

/** Inverse of ease-out cubic: when (0–1) the eased head reaches fraction f of the way. */
export const whenReached = (f: number) => 1 - Math.cbrt(Math.max(0, 1 - Math.min(1, f)));

