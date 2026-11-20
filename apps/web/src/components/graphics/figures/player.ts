/**
 * Canvas playback for the animated movement figures.
 *
 * The SVG figure is drawn with a dozen luminance masks (hairline cuts between
 * limbs, a core shadow, a rim light) and <use> clones. Re-writing its paths
 * every frame made the browser rebuild every clone and re-rasterise every mask
 * 60 times a second, which pinned the CPU and could freeze a page. Here the
 * same layers are painted on a canvas instead: per-frame geometry is cached
 * once per move as Path2D objects, the cuts are alpha erases, and the colours
 * are read from the live SVG so themes, dark mode and re-skins carry over.
 * The SVG still stays in the DOM (server render, reduced motion, fallback).
 */

import { BELL_OUTLINE, BELL_SHEEN, BELL_SPEC, BELL_WINDOW } from "./bell";
import { duration, geoAt, GROUND, type Geo, type MoveDef, type Order } from "./rig";

export type LayerName = "far" | "torso" | "legN" | "bell" | "armN" | "hand";

export const ORDERS: Record<Order, LayerName[]> = {
  out: ["far", "torso", "legN", "bell", "armN", "hand"],
  over: ["far", "torso", "legN", "armN", "bell", "hand"],
  between: ["far", "torso", "bell", "armN", "hand", "legN"],
  behind: ["far", "bell", "torso", "legN", "armN", "hand"],
};

/** Which shapes cut a hairline gap into a layer when they sit above it. */
export function cutters(layer: LayerName, order: Order): LayerName[] {
  if (layer === "far") return ["torso", "legN", "bell", "armN", "hand"];
  const list = ORDERS[order];
  const above = list.slice(list.indexOf(layer) + 1);
  // The hand grows out of the forearm and wraps the handle: never part them.
  return above.filter((l) => !(layer === "armN" && l === "hand") && !(layer === "bell" && l === "hand"));
}

const INK: LayerName[] = ["torso", "legN", "armN", "hand"];

/* ------------------------------------------------------------ geometry */

/** The bell's bounding box [x, y, w, h] (see bell.ts). */
const BOX = [-12.6, -2.2, 25.2, 32] as const;

interface Frame {
  far: { thigh: Path2D; shin: Path2D; foot: Path2D; sole: Path2D; upper: Path2D; fore: Path2D; hand: Path2D };
  torso: Path2D;
  neck: Path2D;
  head: Path2D;
  legN: { thigh: Path2D; shin: Path2D; foot: Path2D; sole: Path2D; thighCut: Path2D };
  armN: { upper: Path2D; fore: Path2D; upperCut: Path2D };
  hand: Path2D;
  bell: DOMMatrix | null;
  order: Order;
  shadow: { cx: number; rx: number };
  feet: Geo["feet"];
  breath: DOMMatrix;
  /** Bounds of everything this frame paints, in view-box units [x0, y0, x1, y1]. */
  box: [number, number, number, number];
}

/** Bounds of a rig path (M / L / C points; A caps grow by twice their radius). */
function grow(box: [number, number, number, number], x: number, y: number, r = 0) {
  if (x - r < box[0]) box[0] = x - r;
  if (y - r < box[1]) box[1] = y - r;
  if (x + r > box[2]) box[2] = x + r;
  if (y + r > box[3]) box[3] = y + r;
}
function boundsOf(box: [number, number, number, number], d: string) {
  const tok = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  let cmd = "M";
  for (let i = 0; i < tok.length; ) {
    const t = tok[i]!;
    if (/[A-Za-z]/.test(t)) {
      cmd = t.toUpperCase();
      i++;
      continue;
    }
    if (cmd === "A") {
      const r = Math.max(Math.abs(+t), Math.abs(+(tok[i + 1] ?? 0)));
      grow(box, +(tok[i + 5] ?? 0), +(tok[i + 6] ?? 0), r * 2);
      i += 7;
    } else if (cmd === "H" || cmd === "V") i++;
    else {
      grow(box, +t, +(tok[i + 1] ?? 0));
      i += 2;
    }
  }
}

/** Parse an SVG transform list (translate / rotate / scale) into a matrix. */
function matrixOf(t: string): DOMMatrix {
  let m = new DOMMatrix();
  for (const [, fn, args] of t.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const a = args.split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === "translate") m = m.translate(a[0] ?? 0, a[1] ?? 0);
    else if (fn === "rotate") m = m.rotate(a[0] ?? 0);
    else if (fn === "scale") m = m.scale(a[0] ?? 1, a[1] ?? a[0] ?? 1);
  }
  return m;
}

function frameOf(g: Geo): Frame {
  const box: Frame["box"] = [Infinity, Infinity, -Infinity, -Infinity];
  const P = (d: string) => {
    boundsOf(box, d);
    return new Path2D(d);
  };
  const c = g.joints.belly ?? g.joints.waist;
  const bell = g.bell ? matrixOf(g.bell) : null;
  if (bell) for (const [x, y] of [[BOX[0], BOX[1]], [BOX[0] + BOX[2], BOX[1]], [BOX[0], BOX[1] + BOX[3]], [BOX[0] + BOX[2], BOX[1] + BOX[3]]]) {
    const q = bell.transformPoint(new DOMPoint(x, y));
    grow(box, q.x, q.y);
  }
  grow(box, g.shadow.cx, GROUND + 0.6, Math.max(g.shadow.rx, 5));
  for (const f of g.feet) grow(box, f[0], GROUND, 12.5);
  grow(box, c[0], c[1], 14 * 1.25);
  return {
    box,
    far: { thigh: P(g.far.thigh), shin: P(g.far.shin), foot: P(g.far.foot), sole: P(g.far.sole), upper: P(g.far.upper), fore: P(g.far.fore), hand: P(g.far.hand) },
    torso: P(g.torso),
    neck: P(g.neck),
    head: P(g.head),
    legN: { thigh: P(g.legN.thigh), shin: P(g.legN.shin), foot: P(g.legN.foot), sole: P(g.legN.sole), thighCut: P(g.legN.thighCut) },
    armN: { upper: P(g.armN.upper), fore: P(g.armN.fore), upperCut: P(g.armN.upperCut) },
    hand: P(g.handN),
    bell,
    order: g.order,
    shadow: g.shadow,
    feet: g.feet,
    breath: new DOMMatrix().translate(+c[0].toFixed(1), +c[1].toFixed(1)).scale(+(0.7 + g.breath * 0.5).toFixed(3)),
  };
}

/** Frames per loop are sampled at 60 per second of movement, once per move and build, shared by every figure. */
const frameCache = new WeakMap<MoveDef, Map<number, Array<Frame | undefined>>>();
export function framesPerLoop(m: MoveDef): number {
  return Math.max(24, Math.min(720, Math.round(duration(m) * 60)));
}
export function frameAt(m: MoveDef, weight: number, i: number): Frame {
  let byWeight = frameCache.get(m);
  if (!byWeight) frameCache.set(m, (byWeight = new Map()));
  let list = byWeight.get(weight);
  if (!list) byWeight.set(weight, (list = new Array(framesPerLoop(m))));
  return (list[i] ??= frameOf(geoAt(m, i / list.length, weight)));
}

let bellBody: Path2D | null = null;
let bellInBox: Path2D | null = null;
let bellOutline: Path2D | null = null;
let bellSpec: Path2D | null = null;
let bellSheen: Path2D | null = null;
function bellPaths() {
  bellBody ??= new Path2D(BELL_OUTLINE + BELL_WINDOW);
  if (!bellInBox) {
    bellInBox = new Path2D();
    bellInBox.addPath(bellBody, new DOMMatrix().scale(1 / BOX[2], 1 / BOX[3]).translate(-BOX[0], -BOX[1]));
  }
  bellOutline ??= new Path2D(BELL_OUTLINE);
  bellSpec ??= new Path2D(BELL_SPEC);
  bellSheen ??= new Path2D(BELL_SHEEN);
  return { body: bellBody, bodyInBox: bellInBox, outline: bellOutline, spec: bellSpec, sheen: bellSheen };
}

/* -------------------------------------------------------------- paints */

interface Stroke {
  color: string;
  width: number;
}
export interface Paints {
  ink: [string, string, string];
  far: string;
  farShoe: string;
  farSole: string;
  shoe: string;
  sole: string;
  bell: [string, string, string];
  spec: Stroke | null;
  sheen: Stroke | null;
  floor: [string, string];
  contact: string;
  contactFar: string;
  motion: { color: string; alpha: number } | null;
  breathOuter: Stroke | null;
  breathInner: Stroke | null;
  rim: string;
  rimShift: [number, number];
  core: string;
  coreAlpha: number;
}

/** Any CSS colour (color-mix, color(), named…) → rgba() the canvas can parse, with an extra alpha factor. */
function colourReader() {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  const read = (css: string | null | undefined, alpha = 1, fallback = "rgba(0,0,0,0)") => {
    const v = (css ?? "").trim();
    if (!v || v === "none" || v.startsWith("url(")) return fallback;
    probe.style.color = "";
    probe.style.color = v;
    const resolved = probe.style.color ? getComputedStyle(probe).color : v;
    x.clearRect(0, 0, 1, 1);
    x.fillStyle = "#000";
    x.fillStyle = resolved;
    x.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = x.getImageData(0, 0, 1, 1).data;
    return `rgba(${r},${g},${b},${((a / 255) * alpha).toFixed(3)})`;
  };
  return { read, done: () => probe.remove() };
}

/** Read every colour the figure uses from the rendered SVG (theme-aware). */
export function readPaints(svg: SVGSVGElement, id: string): Paints {
  const { read, done } = colourReader();
  const q = (sel: string) => svg.querySelector(sel) as SVGElement | null;
  const cs = (el: Element | null) => (el ? getComputedStyle(el) : null);
  const root = getComputedStyle(svg);
  const v = (name: string) => root.getPropertyValue(name);
  const num = (s: string | undefined | null, d: number) => {
    const n = parseFloat(s ?? "");
    return Number.isFinite(n) ? n : d;
  };
  const stops = (gid: string, n: number) => {
    const list = Array.from(svg.querySelectorAll(`#${gid} stop`)).map((s) => {
      const st = getComputedStyle(s);
      return read(st.stopColor, num(st.stopOpacity, 1));
    });
    while (list.length < n) list.push(list[list.length - 1] ?? "rgba(0,0,0,1)");
    return list;
  };
  const stroke = (sel: string): Stroke | null => {
    const st = cs(q(sel));
    if (!st) return null;
    return { color: read(st.stroke, num(st.strokeOpacity, 1) * num(st.opacity, 1)), width: num(st.strokeWidth, 1) };
  };
  const ink = stops(`${id}-ink`, 3) as [string, string, string];
  const farUse = cs(q(".gfx-rig-far"));
  const inkUse = cs(q(".gfx-rig-ink"));
  const soleUse = cs(q(".gfx-rig-sole"));
  const farSole = cs(q(".gfx-rig-farSole"));
  const contact = cs(q(".gfx-rig-contact"));
  const contactFar = cs(q(".gfx-rig-contactFar"));
  const motion = cs(q(".gfx-rig-motion"));
  const rim = cs(q(".gfx-rig-rim"));
  const core = cs(q(".gfx-rig-core"));
  const shift = cs(q(".gfx-rig-rimShift"));
  const m = shift && shift.transform && shift.transform !== "none" ? new DOMMatrix(shift.transform) : null;
  const out: Paints = {
    ink,
    far: read(farUse?.fill ?? v("--g-figure-far-ink"), 1, ink[1]),
    farShoe: read(farUse?.getPropertyValue("--rig-shoe") || v("--g-shoe"), 1, ink[1]),
    farSole: read(farSole?.fill ?? v("--g-sole"), 1, ink[1]),
    shoe: read(inkUse?.getPropertyValue("--rig-shoe") || v("--g-shoe"), 1, ink[1]),
    sole: read(soleUse?.fill ?? v("--g-sole"), 1, ink[1]),
    bell: stops(`${id}-bell`, 3) as [string, string, string],
    spec: stroke(".gfx-rig-bellSpec"),
    sheen: stroke(".gfx-rig-bellSheen"),
    floor: stops(`${id}-floor`, 2) as [string, string],
    contact: contact ? read(contact.fill, num(contact.fillOpacity, 1)) : "rgba(0,0,0,0)",
    contactFar: contactFar ? read(contactFar.fill, num(contactFar.fillOpacity, 1)) : "rgba(0,0,0,0)",
    motion: motion ? { color: read(motion.stroke), alpha: num(motion.opacity, 1) } : null,
    breathOuter: stroke(".gfx-rig-breathOuter"),
    breathInner: stroke(".gfx-rig-breathInner"),
    rim: read(rim?.fill ?? v("--g-figure-rim")),
    rimShift: m ? [m.e, m.f] : [num(v("--g-rim-dx"), -1.1), num(v("--g-rim-dy"), 0.9)],
    core: read(core?.fill ?? v("--g-figure-core")),
    coreAlpha: num(core?.opacity, 0.5),
  };
  done();
  return out;
}

/* -------------------------------------------------------------- player */

type Ctx = CanvasRenderingContext2D;

export interface PlayerOptions {
  move: MoveDef;
  weight: number;
  bare: boolean;
  /** Draw the core shadow, rim light and bell highlights (figures ≥ 64 px). */
  fine: boolean;
  /** Hairline gap, in view-box units. */
  gap: number;
  motion: { d: string; width: number; dash: [number, number] } | null;
  breath: boolean;
}

function surface(): HTMLCanvasElement {
  return document.createElement("canvas");
}

/** Paints one figure frame onto a canvas, reusing three scratch surfaces. */
export class FigurePainter {
  private s = surface();
  private rim = surface();
  private core = surface();
  private k = 1;
  private grad: { ink: CanvasGradient; floor: CanvasGradient } | null = null;
  private motion: Path2D | null;
  private bellGrad: CanvasGradient | null = null;
  constructor(
    private canvas: HTMLCanvasElement,
    private o: PlayerOptions,
    private paints: Paints,
  ) {
    this.motion = o.motion?.d ? new Path2D(o.motion.d) : null;
  }

  setPaints(p: Paints) {
    this.paints = p;
    this.grad = null;
    this.bellGrad = null;
  }

  /** Backing size in device pixels (square). */
  resize(px: number) {
    const n = Math.max(1, Math.round(px));
    for (const c of [this.canvas, this.s, this.rim, this.core]) {
      if (c.width !== n) {
        c.width = n;
        c.height = n;
      }
    }
    this.grad = null;
    this.bellGrad = null;
  }

  private base(c: Ctx) {
    const [vx, vy, vs] = this.o.move.view ?? [0, 0, 240];
    this.k = c.canvas.width / vs;
    c.setTransform(this.k, 0, 0, this.k, -vx * this.k, -vy * this.k);
  }

  private gradients(c: Ctx) {
    if (this.grad) return this.grad;
    const [vx, vy, vs] = this.o.move.view ?? [0, 0, 240];
    const p = this.paints;
    const ink = c.createLinearGradient(vx + vs * 0.7, vy, vx + vs * 0.35, vy + vs);
    ink.addColorStop(0, p.ink[0]);
    ink.addColorStop(0.5, p.ink[1]);
    ink.addColorStop(1, p.ink[2]);
    const floor = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    floor.addColorStop(0, p.floor[0]);
    floor.addColorStop(1, p.floor[1]);
    return (this.grad = { ink, floor });
  }

  /** Paths of a layer, each with its paint ("ink" = the body gradient). */
  private parts(f: Frame, l: LayerName): Array<[Path2D, "ink" | string]> {
    const p = this.paints;
    switch (l) {
      case "far":
        return [
          [f.far.thigh, p.far],
          [f.far.shin, p.far],
          [f.far.foot, p.farShoe],
          [f.far.sole, p.farSole],
          [f.far.upper, p.far],
          [f.far.fore, p.far],
          [f.far.hand, p.far],
        ];
      case "torso":
        return [
          [f.torso, "ink"],
          [f.neck, "ink"],
          [f.head, "ink"],
        ];
      case "legN": {
        const list: Array<[Path2D, string]> = [
          [f.legN.thigh, "ink"],
          [f.legN.shin, "ink"],
          [f.legN.foot, p.shoe],
          [f.legN.sole, p.shoe],
        ];
        if (this.o.fine) list.push([f.legN.sole, p.sole]);
        return list;
      }
      case "armN":
        return [
          [f.armN.upper, "ink"],
          [f.armN.fore, "ink"],
        ];
      case "hand":
        return [[f.hand, "ink"]];
      default:
        return [];
    }
  }

  /** Shapes a cutter layer erases (the torso is only cut by the distal near limbs). */
  private cutShapes(f: Frame, cutter: LayerName, layer: LayerName): Path2D[] {
    switch (cutter) {
      case "torso":
        return [f.torso, f.neck, f.head];
      case "legN":
        return layer === "torso" ? [f.legN.thighCut, f.legN.shin, f.legN.foot, f.legN.sole] : [f.legN.thigh, f.legN.shin, f.legN.foot, f.legN.sole];
      case "armN":
        return layer === "torso" ? [f.armN.upperCut, f.armN.fore] : [f.armN.upper, f.armN.fore];
      case "hand":
        return [f.hand];
      default:
        return [];
    }
  }

  private inkShapes(f: Frame): Path2D[] {
    return [f.torso, f.neck, f.head, f.legN.thigh, f.legN.shin, f.legN.foot, f.legN.sole, f.armN.upper, f.armN.fore, f.hand];
  }

  private drawBell(c: Ctx, f: Frame) {
    if (!f.bell) return;
    const b = bellPaths();
    c.save();
    c.transform(f.bell.a, f.bell.b, f.bell.c, f.bell.d, f.bell.e, f.bell.f);
    // objectBoundingBox radial gradient (cx .34, cy .56, r .75): paint in box units, so the gradient follows the bell.
    c.save();
    c.transform(BOX[2], 0, 0, BOX[3], BOX[0], BOX[1]);
    if (!this.bellGrad) {
      const g = c.createRadialGradient(0.34, 0.56, 0, 0.34, 0.56, 0.75);
      g.addColorStop(0, this.paints.bell[0]);
      g.addColorStop(0.55, this.paints.bell[1]);
      g.addColorStop(1, this.paints.bell[2]);
      this.bellGrad = g;
    }
    c.fillStyle = this.bellGrad;
    c.fill(b.bodyInBox, "evenodd");
    c.restore();
    if (this.o.fine) {
      c.lineCap = "round";
      for (const [path, st] of [
        [b.spec, this.paints.spec],
        [b.sheen, this.paints.sheen],
      ] as const) {
        if (!st) continue;
        c.strokeStyle = st.color;
        c.lineWidth = st.width;
        c.stroke(path);
      }
    }
    c.restore();
  }

  /** Paint one layer into the scratch surface and cut its hairline gaps. */
  private layer(f: Frame, l: LayerName, hasBell: boolean): HTMLCanvasElement | null {
    if (l === "bell" && !hasBell) return null;
    const c = this.s.getContext("2d")!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, this.s.width, this.s.height);
    this.base(c);
    if (l === "bell") this.drawBell(c, f);
    else {
      const ink = this.gradients(c).ink;
      for (const [path, paint] of this.parts(f, l)) {
        c.fillStyle = paint === "ink" ? ink : paint;
        c.fill(path);
      }
    }
    // Cuts: every shape above, filled and stroked to a hairline gap, erased.
    c.globalCompositeOperation = "destination-out";
    c.fillStyle = "#000";
    c.strokeStyle = "#000";
    c.lineJoin = "round";
    c.lineWidth = this.o.gap * 2;
    for (const cut of cutters(l, f.order)) {
      if (cut === "bell") {
        if (!hasBell || !f.bell) continue;
        c.save();
        c.transform(f.bell.a, f.bell.b, f.bell.c, f.bell.d, f.bell.e, f.bell.f);
        const o = bellPaths().outline;
        c.fill(o);
        c.stroke(o);
        c.restore();
        continue;
      }
      for (const sh of this.cutShapes(f, cut, l)) {
        c.fill(sh);
        c.stroke(sh);
      }
    }
    c.globalCompositeOperation = "source-over";
    return this.s;
  }

  /** Finish a light band: recolour the gathered ink, then erase the ink shifted by (dx, dy). */
  private band(t: HTMLCanvasElement, f: Frame, colour: string, dx: number, dy: number) {
    const c = t.getContext("2d")!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = colour;
    c.fillRect(0, 0, t.width, t.height);
    c.globalCompositeOperation = "destination-out";
    this.base(c);
    c.translate(dx, dy);
    c.fillStyle = "#000";
    for (const sh of this.inkShapes(f)) c.fill(sh);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over";
  }

  draw(i: number) {
    const o = this.o;
    const f = frameAt(o.move, o.weight, i);
    const p = this.paints;
    const c = this.canvas.getContext("2d")!;
    const [, , vs] = o.move.view ?? [0, 0, 240];
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.base(c);
    const hasBell = !!f.bell;

    if (!o.bare) {
      c.save();
      c.translate(f.shadow.cx, GROUND + 0.6);
      c.scale(f.shadow.rx, 5);
      c.fillStyle = this.gradients(c).floor;
      c.beginPath();
      c.arc(0, 0, 1, 0, Math.PI * 2);
      c.fill();
      c.restore();
      f.feet.forEach((ft, n) => {
        c.save();
        c.globalAlpha = Math.max(0, Math.min(1, ft[1]));
        c.fillStyle = n ? p.contactFar : p.contact;
        c.beginPath();
        c.ellipse(ft[0], GROUND + 0.3, 12.5, 1.6, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      });
    }
    if (this.motion && o.motion && p.motion) {
      c.save();
      c.globalAlpha = p.motion.alpha;
      c.strokeStyle = p.motion.color;
      c.lineCap = "round";
      c.lineWidth = o.motion.width;
      c.setLineDash(o.motion.dash);
      c.stroke(this.motion);
      c.restore();
    }
    if (!o.bare && o.breath) {
      c.save();
      c.transform(f.breath.a, f.breath.b, f.breath.c, f.breath.d, f.breath.e, f.breath.f);
      for (const [r, st] of [
        [14, p.breathOuter],
        [8.5, p.breathInner],
      ] as const) {
        if (!st) continue;
        c.strokeStyle = st.color;
        c.lineWidth = st.width;
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    }

    const fine = o.fine;
    const rc = fine ? this.rim.getContext("2d")! : null;
    const kc = fine ? this.core.getContext("2d")! : null;
    for (const x of [rc, kc]) {
      if (!x) continue;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, x.canvas.width, x.canvas.height);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    for (const l of ORDERS[f.order]) {
      const img = this.layer(f, l, hasBell);
      if (!img) continue;
      c.drawImage(img, 0, 0);
      if (fine && INK.includes(l)) {
        rc!.drawImage(img, 0, 0);
        kc!.drawImage(img, 0, 0);
      }
    }
    if (fine) {
      this.band(this.core, f, p.core, vs / 110, -vs / 150);
      this.band(this.rim, f, p.rim, p.rimShift[0], p.rimShift[1]);
      c.globalAlpha = p.coreAlpha;
      c.drawImage(this.core, 0, 0);
      c.globalAlpha = 1;
      c.drawImage(this.rim, 0, 0);
    }
  }

  /** Release the scratch surfaces' memory. */
  dispose() {
    for (const s of [this.s, this.rim, this.core]) {
      s.width = 0;
      s.height = 0;
    }
  }
}

/* ------------------------------------------------------------ flipbook */

/** Played frames per second of movement: smooth for a figure, and half the work of 60. */
const FPS = 30;
/** Memory all cached frames may use together (bytes); past it frames are painted live. */
const BUDGET = 64 * 1024 * 1024;
let used = 0;

interface Book {
  painter: FigurePainter;
  work: HTMLCanvasElement;
  frames: Array<HTMLCanvasElement | undefined>;
  /** Crop of every frame in device px [x, y, w, h]. */
  crop: [number, number, number, number];
  bytes: number;
  refs: number;
}
const books = new Map<string, Book>();

/**
 * One figure's loop, painted once per frame and then replayed as bitmaps: after
 * the first loop a frame costs one drawImage. Books are shared by figures with
 * the same move, build, size and colours, and freed with the last of them.
 */
export class FlipBook {
  readonly length: number;
  private book: Book;
  private key: string;
  private n60: number;
  constructor(
    private o: PlayerOptions,
    paints: Paints,
    px: number,
  ) {
    const m = o.move;
    this.n60 = framesPerLoop(m);
    this.length = Math.max(12, Math.round(duration(m) * FPS));
    const size = Math.max(1, Math.round(px));
    this.key = JSON.stringify([m.label, m.still, o.weight, o.bare, o.fine, o.gap.toFixed(3), o.motion?.d.length ?? 0, o.breath, size, paints]);
    let b = books.get(this.key);
    if (!b) {
      const work = surface();
      const painter = new FigurePainter(work, o, paints);
      painter.resize(size);
      // Union of every played frame's bounds (plus a little room), so frames are stored cropped.
      const [vx, vy, vs] = m.view ?? [0, 0, 240];
      const box = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = 0; i < this.length; i++) {
        const f = frameAt(m, o.weight, this.index60(i)).box;
        box[0] = Math.min(box[0], f[0]);
        box[1] = Math.min(box[1], f[1]);
        box[2] = Math.max(box[2], f[2]);
        box[3] = Math.max(box[3], f[3]);
      }
      const k = size / vs;
      const pad = 4;
      const x0 = Math.max(0, Math.floor((box[0] - vx - pad) * k));
      const y0 = Math.max(0, Math.floor((box[1] - vy - pad) * k));
      const x1 = Math.min(size, Math.ceil((box[2] - vx + pad) * k));
      const y1 = Math.min(size, Math.ceil((box[3] - vy + pad) * k));
      const crop: Book["crop"] = Number.isFinite(x0 + y0 + x1 + y1) && x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : [0, 0, size, size];
      b = { painter, work, frames: new Array(this.length), crop, bytes: 0, refs: 0 };
      books.set(this.key, b);
    }
    b.refs++;
    this.book = b;
  }

  private index60(i: number) {
    return Math.round((i * this.n60) / this.length) % this.n60;
  }

  /** Paint frame i (0..length-1) onto the visible canvas. */
  show(target: HTMLCanvasElement, i: number) {
    const b = this.book;
    const [x, y, w, h] = b.crop;
    const c = target.getContext("2d")!;
    if (target.width !== b.work.width) {
      target.width = b.work.width;
      target.height = b.work.height;
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, target.width, target.height);
    let img = b.frames[i];
    if (!img) {
      b.painter.draw(this.index60(i));
      const bytes = w * h * 4;
      if (used + bytes <= BUDGET) {
        img = surface();
        img.width = w;
        img.height = h;
        img.getContext("2d")!.drawImage(b.work, x, y, w, h, 0, 0, w, h);
        b.frames[i] = img;
        b.bytes += bytes;
        used += bytes;
      } else {
        c.drawImage(b.work, 0, 0);
        return;
      }
    }
    c.drawImage(img, x, y);
  }

  release() {
    const b = this.book;
    if (--b.refs > 0) return;
    books.delete(this.key);
    used -= b.bytes;
    for (const f of b.frames) if (f) f.width = f.height = 0;
    b.painter.dispose();
    b.work.width = b.work.height = 0;
  }
}
