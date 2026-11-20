/**
 * A 2D figure rig for the movement illustrations.
 *
 * Side view, figure faces +x, y grows downwards, ground at GROUND. Adult male
 * proportions (~7.5 heads, 180 units ≈ 180 cm). The spine is two segments
 * (pelvis, chest) so the back can stay flat in a hinge or curl in a get-up;
 * arms and legs are two-bone IK chains with true segment lengths, so feet stay
 * planted and hands stay on the bell between keyframes. Every body part is a
 * smooth filled outline (tapered, muscled limbs; a sculpted torso; a head with
 * a jaw), built from Catmull-Rom curves.
 */

import { BELL_BODY_CENTRE } from "./bell";

export type V = readonly [number, number];

export const GROUND = 232;

/** Segment lengths (units ≈ cm). */
export const SEG = {
  pelvis: 18,
  chest: 37,
  upper: 33.5,
  fore: 26,
  /** Wrist to the centre of a gripping fist (where the handle sits). */
  grip: 6.5,
  thigh: 44.5,
  shin: 43.5,
  /** Ankle joint height above the sole. */
  ankle: 7,
} as const;

export const ARM = SEG.upper + SEG.fore + SEG.grip;
export const LEG = SEG.thigh + SEG.shin;

export type HandKind = "fist" | "relaxed" | "flat";
/** Painter's order for the near arm, the bell and the near leg. */
export type Order = "out" | "over" | "between" | "behind";
/** How an arm's [a, b] pair is read: polar from the shoulder in world or torso frame, or a world point. */
export type ArmMode = "world" | "torso" | "point";

/** Every continuous pose parameter (interpolated between keys). Angles in degrees. */
export interface Pose {
  /** Hip joint position. With `shin` set, only its x is used. */
  hip: V;
  /**
   * Hinge helper: lean of the near shin from vertical (+ = knee forward). When
   * set, the hip height follows from it, so a hip hinge keeps the shins where
   * a coach wants them instead of drifting into a squat.
   */
  shin?: number;
  /** Lean of the pelvis (hip → waist) from vertical; + leans forward (+x). */
  pelvis: number;
  /** Lean of the chest (waist → shoulders). */
  chest: number;
  /** Lean of the head's long axis (world). */
  head: number;
  /** 0..1: turn the head to look at the near hand (the bell). */
  look?: number;
  /** 0..1: breath fills the chest and belly. */
  breath?: number;
  ankleN: V;
  ankleF: V;
  /** Foot rotation; 0 = flat with toes towards +x, + turns the toes down. */
  footN?: number;
  footF?: number;
  /** Leg length scale (foreshortening when a leg points into the picture). */
  legNs?: number;
  legFs?: number;
  /** Arms: polar [angle from straight down (+ towards +x), reach 0..1] or a world point, per the move's ArmMode. */
  armN: V;
  armF: V;
  armNs?: number;
  armFs?: number;
  /** 0..1: stretch the arm's projected length so it reaches its point straight (arm out of plane). */
  straightF?: number;
  straightN?: number;
  /** Hand angle: relative to the forearm (fist, relaxed) or in world for a flat hand. */
  wristN?: number;
  wristF?: number;
  /** Offset of the far shoulder and far hip, to open the figure slightly towards three-quarter view. */
  farOff?: V;
  /** Bell hang direction (0 = body straight down from the handle, world). */
  bellRot?: number;
  /** 0..1: blend the bell's direction towards the line of the forearm (a swinging bell floats in line). */
  bellFollow?: number;
  /** Extra bell rotation on top of the blend (the bell overtakes the arm line at the end of a backswing). */
  bellTwist?: number;
  /** 0..1 bell visibility (scale). */
  bell?: number;
}

/** Discrete per-key state (switches mid-segment). */
export interface Discrete {
  order?: Order;
  handN?: HandKind;
  handF?: HandKind;
}

export interface RigConfig {
  armN: ArmMode;
  armF: ArmMode;
  /**
   * How the bell is held: one hand on the handle ("bar"), two hands side by
   * side on the handle ("bar2"), both hands on the horns ("horns"), or no bell.
   * With two hands the far hand is placed on the bell, not by its own arm pose.
   */
  grip: "bar" | "bar2" | "horns" | "none";
  /** Body weight multiplier for limb girth. */
  weight?: number;
}

export interface Geo {
  far: { upper: string; fore: string; hand: string; thigh: string; shin: string; foot: string; sole: string };
  torso: string;
  neck: string;
  head: string;
  legN: { thigh: string; shin: string; foot: string; sole: string; thighCut: string };
  armN: { upper: string; fore: string; upperCut: string };
  handN: string;
  /** Bell transform (translate/rotate), or null when there is no bell. */
  bell: string | null;
  bellScale: number;
  bellCentre: V | null;
  order: Order;
  shadow: { cx: number; rx: number };
  /** Contact patches under each foot: [x centre, strength 0..1]. */
  feet: [V, V];
  breath: number;
  joints: Record<string, V>;
}

/* ------------------------------------------------------------- vectors */

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const len = (a: V) => Math.hypot(a[0], a[1]);
const norm = (a: V): V => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
/** Unit vector for a lean angle: 0 = straight up, + towards +x. */
const upOf = (a: number): V => [Math.sin(rad(a)), -Math.cos(rad(a))];
/** Unit vector "front" of a segment that leans by a. */
const frontOf = (a: number): V => [Math.cos(rad(a)), Math.sin(rad(a))];
/** Unit vector for a hanging angle: 0 = straight down, + towards +x. */
const downOf = (a: number): V => [Math.sin(rad(a)), Math.cos(rad(a))];
/** Hanging angle of a direction vector. */
const angOf = (v: V) => deg(Math.atan2(v[0], v[1]));
/** The side of a limb its knee points to (and opposite its elbow): d turned a quarter. */
const sideOf = (d: V): V => [d[1], -d[0]];

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();
const P = (v: V) => `${f1(v[0])} ${f1(v[1])}`;

/* ---------------------------------------------------- curve builders */

/** Closed Catmull-Rom outline through the points. */
function closed(pts: V[]): string {
  const n = pts.length;
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = add(p1, sub(p2, p0), 1 / 6);
    const c2 = add(p2, sub(p3, p1), -1 / 6);
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  return `${d}Z`;
}

/** Open Catmull-Rom run (no moveto), tangent to t0 at the start and t1 at the end. */
function run(pts: V[], t0: V, t1: V): string {
  let d = "";
  const n = pts.length;
  const at = (i: number): V => {
    if (i < 0) return add(pts[0], t0, -len(sub(pts[1], pts[0])));
    if (i >= n) return add(pts[n - 1], t1, len(sub(pts[n - 1], pts[n - 2])));
    return pts[i];
  };
  for (let i = 0; i < n - 1; i++) {
    const c1 = add(at(i), sub(at(i + 1), at(i - 1)), 1 / 6);
    const c2 = add(at(i + 1), sub(at(i + 2), at(i)), -1 / 6);
    d += `C${P(c1)} ${P(c2)} ${P(at(i + 1))}`;
  }
  return d;
}

/** Muscle profile: [t along the bone, radius, offset towards the limb's front side]. */
type Profile = ReadonlyArray<readonly [number, number, number]>;

/**
 * A tapered limb from joint A to joint B: both sides follow the profile and
 * round caps close each end, so neighbouring segments overlap into one shape.
 */
function limb(A: V, B: V, prof: Profile, k: number, from = 0): string {
  const L = len(sub(B, A));
  const d = norm(sub(B, A));
  const s = sideOf(d);
  const rows = prof.filter(([t]) => t >= from);
  if (rows[0][0] > from) {
    // Interpolate the profile at the cut start.
    const i = prof.findIndex(([t]) => t >= from);
    const [ta, ra, oa] = prof[i - 1];
    const [tb, rb, ob] = prof[i];
    const u = (from - ta) / (tb - ta);
    rows.unshift([from, ra + (rb - ra) * u, (oa + (ob - oa) * u) * 0]);
  }
  const front: V[] = [];
  const back: V[] = [];
  for (const [t, r, o] of rows) {
    const c = add(add(A, d, L * t), s, o * k);
    front.push(add(c, s, r * k));
    back.push(add(c, s, -r * k));
  }
  const r0 = rows[0][1] * k;
  const r1 = rows[rows.length - 1][1] * k;
  return (
    `M${P(front[0])}` +
    run(front, d, d) +
    `A${f1(r1)} ${f1(r1)} 0 0 1 ${P(back[back.length - 1])}` +
    run(back.slice().reverse(), [-d[0], -d[1]], [-d[0], -d[1]]) +
    `A${f1(r0)} ${f1(r0)} 0 0 1 ${P(front[0])}Z`
  );
}

/* ---------------------------------------------------------- profiles */

const UPPER: Profile = [
  [0, 7.3, 0],
  [0.14, 7.2, 0.9],
  [0.42, 5.9, 0.9],
  [0.72, 5.0, 0.4],
  [1, 4.3, 0],
];
const FORE: Profile = [
  [0, 4.4, 0],
  [0.2, 5.0, -0.5],
  [0.5, 4.1, -0.2],
  [1, 3.0, 0],
];
const THIGH: Profile = [
  [0, 9.8, 0],
  [0.24, 9.3, 0.7],
  [0.58, 8.0, 0.8],
  [0.86, 6.4, 0.3],
  [1, 5.9, 0],
];
const SHIN: Profile = [
  [0, 5.5, 0],
  [0.2, 6.1, -1.3],
  [0.45, 5.1, -0.9],
  [0.78, 3.6, -0.2],
  [1, 3.3, 0],
];
const NECK: Profile = [
  [0, 6.2, 0],
  [0.5, 5.2, 0.3],
  [1, 5.0, 0],
];
const RELAXED: Profile = [
  [0, 3.0, 0],
  [0.35, 3.7, 0.4],
  [0.7, 3.2, 0.6],
  [1, 2.3, 0.3],
];
const FLAT: Profile = [
  [0, 2.7, 0],
  [0.4, 3.0, 0],
  [1, 2.0, 0],
];

/* Torso outline in spine coordinates [s along the spine from the hip joint, n towards the front]. */
const TORSO_FRONT: V[] = [
  [57.5, 3.4],
  [52, 9.8],
  [44, 12.4],
  [36, 12.0],
  [27, 10.6],
  [17, 9.6],
  [7, 9.4],
  [-1, 5.8],
  [-8.5, 0.6],
];
const TORSO_BACK: V[] = [
  [-9.5, -3.4],
  [-8, -9.6],
  [-2.5, -12.2],
  [5, -10.6],
  [15, -8.4],
  [26, -9.8],
  [38, -12.2],
  [47, -12.6],
  [54, -9.6],
  [58.5, -4],
];

/* Head outline, local: x towards the face, y down; centre of the skull at 0,0. */
const HEAD: V[] = [
  [-1.2, -12.3],
  [5.3, -10.4],
  [8.5, -5.4],
  [9.3, -1.2],
  [9.5, 2.4],
  [8.5, 6.6],
  [5.8, 9.7],
  [1.6, 8.8],
  [-2.4, 6.6],
  [-8, 3.8],
  [-10.2, -2.6],
  [-7.6, -9.6],
];

/* Shoe upper, local: x towards the toes, y towards the sole; ankle joint at 0,0. */
const FOOT: V[] = [
  [-3.6, -3.6],
  [2.6, -3.4],
  [8.4, 0.4],
  [16, 2.6],
  [20.2, 4],
  [21, 5.3],
  [15, 5.5],
  [4, 5.5],
  [-5, 5.5],
  [-6.7, 3.8],
  [-5.4, 0.2],
];
/* Sole under the upper, with a little toe spring. */
const SOLE: V[] = [
  [-6.8, 5.3],
  [4, 5.3],
  [15, 5.3],
  [21.2, 5.1],
  [21.7, 6.1],
  [19.6, 7.1],
  [15, 7.2],
  [4, 7.2],
  [-4.8, 7.2],
  [-6.9, 6.4],
];

/* Fist, local: x along the hand from the wrist, y across. A rounded block the handle runs through. */
function fist(W: V, dir: V, k: number): string {
  const s = sideOf(dir);
  const at = (u: number, v: number): V => add(add(W, dir, u), s, v * k);
  const pts: V[] = [
    at(-1, 3.3),
    at(3.6, 5),
    at(8.6, 5.1),
    at(11.4, 3),
    at(11.8, -1.4),
    at(10, -4.6),
    at(5.4, -5.3),
    at(1.4, -4.4),
    at(-1, -3),
  ];
  return closed(pts);
}

/* ------------------------------------------------------------- solver */

function ik(root: V, target: V, a: number, b: number, bend: 1 | -1): [V, V] {
  const d0 = sub(target, root);
  const raw = len(d0) || 0.0001;
  const dist = Math.min(Math.max(raw, Math.abs(a - b) + 0.01), a + b - 0.001);
  const base = Math.atan2(d0[1], d0[0]);
  const A = Math.acos(Math.min(1, Math.max(-1, (a * a + dist * dist - b * b) / (2 * a * dist))));
  const j: V = [root[0] + a * Math.cos(base + bend * A), root[1] + a * Math.sin(base + bend * A)];
  const e = norm(sub(target, j));
  return [j, add(j, e, b)];
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a + 540) % 360) - 180;
  if (d < -180) d += 360;
  return a + d * t;
}

/** Position along the spine polyline (extended past both ends), with a blended front normal. */
function spineFrame(H: V, W: V, S: V, pel: number, ch: number) {
  return (s: number, n: number): V => {
    let base: V;
    if (s <= SEG.pelvis) base = add(H, upOf(pel), s);
    else base = add(W, upOf(ch), s - SEG.pelvis);
    const blend = Math.min(1, Math.max(0, (s - (SEG.pelvis - 7)) / 14));
    const a = pel + (ch - pel) * blend;
    return add(base, frontOf(a), n);
  };
}

const BELL_SCALE = 1.04;
/** Where each hand holds the bell, in bell units (origin: centre of the handle's top bar). */
const GRIPS: Record<"bar" | "bar2" | "horns", { near: V; far: V | null }> = {
  bar: { near: [0, 0], far: null },
  bar2: { near: [-3.4, -0.4], far: [3.4, -0.4] },
  horns: { near: [-10.5, 6.6], far: [10.5, 6.6] },
};

export function solve(p: Pose, disc: Discrete, cfg: RigConfig): Geo {
  const k = cfg.weight ?? 1;
  const breath = p.breath ?? 0;
  let H = p.hip;
  if (p.shin !== undefined) {
    const s0 = SEG.shin * (p.legNs ?? 1);
    const t0 = SEG.thigh * (p.legNs ?? 1);
    const K: V = [p.ankleN[0] + Math.sin(rad(p.shin)) * s0, p.ankleN[1] - Math.cos(rad(p.shin)) * s0];
    const dx = Math.min(t0 - 0.01, Math.abs(K[0] - H[0]));
    H = [H[0], K[1] - Math.sqrt(t0 * t0 - dx * dx)];
  }
  const W = add(H, upOf(p.pelvis), SEG.pelvis);
  const S = add(W, upOf(p.chest), SEG.chest * (1 + breath * 0.02));
  const at = spineFrame(H, W, S, p.pelvis, p.chest);

  // Torso: the front swells with the breath (belly first, then chest).
  const swell = (s: number) => 1 + breath * (s < 26 ? 0.1 : 0.07);
  const torsoPts: V[] = [
    ...TORSO_FRONT.map(([s, n]) => at(s, n * swell(s) * (0.92 + 0.08 * k))),
    ...TORSO_BACK.map(([s, n]) => at(s, n * (0.94 + 0.06 * k))),
  ];
  const torso = closed(torsoPts);

  // Shoulder joint sits just under the top of the chest, a touch forward.
  const shoulder = add(add(S, frontOf(p.chest), 0.8), upOf(p.chest), -4);
  const farOff = p.farOff ?? [0, 0];
  const shoulderF = add(shoulder, farOff);
  const hipF = add(H, farOff);

  /* Arms */
  const armTarget = (mode: ArmMode, v: V, sh: V, scale: number): V => {
    if (mode === "point") return v;
    const a = mode === "torso" ? v[0] - p.chest : v[0];
    return add(sh, downOf(a), v[1] * ARM * scale);
  };
  const solveArm = (mode: ArmMode, v: V, sh: V, scale0: number, straight: number, kind: HandKind, wrist: number) => {
    let scale = scale0;
    const T = armTarget(mode, v, sh, scale);
    if (mode === "point" && straight > 0) {
      const want = len(sub(T, sh)) / ARM;
      scale = scale0 + (want - scale0) * straight;
    }
    const a = SEG.upper * scale;
    const b = (SEG.fore + SEG.grip) * scale;
    const [E, end] = ik(sh, T, a, b, 1);
    const fdir = norm(sub(end, E));
    const Wr = add(E, fdir, SEG.fore * scale);
    const hdir = kind === "flat" ? downOf(wrist) : downOf(angOf(fdir) + wrist);
    const grip = kind === "fist" ? add(Wr, hdir, SEG.grip) : end;
    return { E, Wr, end, grip, fdir, hdir, scale };
  };
  const handPath = (kind: HandKind, Wr: V, dir: V, scale: number) => {
    if (kind === "fist") return fist(Wr, dir, k);
    if (kind === "flat") return limb(Wr, add(Wr, dir, 17 * Math.max(0.8, scale)), FLAT, k);
    return limb(Wr, add(Wr, dir, 16.5 * Math.max(0.8, scale)), RELAXED, k);
  };

  const kindN = disc.handN ?? "fist";
  const kindF = disc.handF ?? "fist";
  const aN = solveArm(cfg.armN, p.armN, shoulder, p.armNs ?? 1, p.straightN ?? 0, kindN, p.wristN ?? 0);
  /* Bell: hangs from the near hand; a two-hand grip puts the far hand on it too. */
  let bell: string | null = null;
  let bellCentre: V | null = null;
  let farOnBell: V | null = null;
  const bellScale = BELL_SCALE * (p.bell ?? 1);
  if (cfg.grip !== "none" && (p.bell ?? 1) > 0.01) {
    const rot = lerpAngle(p.bellRot ?? 0, angOf(aN.fdir), p.bellFollow ?? 0) + (p.bellTwist ?? 0);
    const gr = GRIPS[cfg.grip];
    const th = rad(-rot);
    const toWorld = (l: V): V => {
      const x = (l[0] - gr.near[0]) * bellScale;
      const y = (l[1] - gr.near[1]) * bellScale;
      return [aN.grip[0] + x * Math.cos(th) - y * Math.sin(th), aN.grip[1] + x * Math.sin(th) + y * Math.cos(th)];
    };
    bell = `translate(${P(aN.grip)}) rotate(${f1(-rot)}) scale(${bellScale.toFixed(3)}) translate(${f1(-gr.near[0])} ${f1(-gr.near[1])})`;
    bellCentre = toWorld([0, BELL_BODY_CENTRE]);
    if (gr.far) farOnBell = toWorld(gr.far);
  }
  const aF = farOnBell
    ? solveArm("point", farOnBell, shoulderF, 1, 0, kindF, p.wristF ?? 0)
    : solveArm(cfg.armF, p.armF, shoulderF, p.armFs ?? 1, p.straightF ?? 0, kindF, p.wristF ?? 0);

  /* Legs */
  const solveLeg = (hip: V, ankle: V, scale: number, foot: number) => {
    const [K, A] = ik(hip, ankle, SEG.thigh * scale, SEG.shin * scale, -1);
    const toe: V = [Math.cos(rad(foot)), Math.sin(rad(foot))];
    const sole: V = [-toe[1], toe[0]];
    const map = ([x, y]: V) => add(add(A, toe, x), sole, y * (0.94 + 0.06 * k));
    // Contact strength: how flat and how close to the floor the sole is.
    const low = Math.max(0, 1 - Math.max(0, GROUND - SEG.ankle - A[1]) / 10);
    const flat = Math.max(0, Math.cos(rad(foot)));
    return { K, A, foot: closed(FOOT.map(map)), sole: closed(SOLE.map(map)), contact: [A[0] + 7 * toe[0], low * (0.35 + 0.65 * flat)] as V };
  };
  const lN = solveLeg(H, p.ankleN, p.legNs ?? 1, p.footN ?? 0);
  const lF = solveLeg(hipF, p.ankleF, p.legFs ?? 1, p.footF ?? 0);

  /* Neck and head */
  const neckBase = add(add(S, upOf(p.chest), 2.5), frontOf(p.chest), -1.2);
  let headLean = p.head;
  const look = p.look ?? 0;
  if (look > 0) {
    // Lean that turns the face towards the bell.
    const provisional = add(neckBase, upOf(p.head), 14);
    const to = sub(aN.grip, provisional);
    const lookLean = deg(Math.atan2(to[1], to[0]));
    headLean = lerpAngle(p.head, lookLean, look);
  }
  const neckLean = lerpAngle(p.chest, headLean, 0.55);
  const neckTop = add(neckBase, upOf(neckLean), 6.5);
  const headC = add(add(neckTop, upOf(headLean), 8.2), frontOf(headLean), 1.4);
  const hf = frontOf(headLean);
  const hd: V = [-upOf(headLean)[0], -upOf(headLean)[1]];
  const head = closed(HEAD.map(([x, y]) => add(add(headC, hf, x), hd, y)));
  const neck = limb(neckBase, add(neckTop, upOf(headLean), 2), NECK, k);

  /* Contact shadow under whatever touches the floor */
  const contacts: number[] = [p.ankleN[0] - 6, p.ankleN[0] + 20, p.ankleF[0] - 6, p.ankleF[0] + 20];
  for (const pt of [H, shoulder, lN.K, lF.K, aF.grip, aF.end, headC]) if (pt[1] > GROUND - 22) contacts.push(pt[0]);
  const lo = Math.min(...contacts);
  const hi = Math.max(...contacts);

  return {
    far: {
      upper: limb(shoulderF, aF.E, UPPER, k),
      fore: limb(aF.E, aF.Wr, FORE, k),
      hand: handPath(kindF, aF.Wr, aF.hdir, aF.scale),
      thigh: limb(hipF, lF.K, THIGH, k),
      shin: limb(lF.K, lF.A, SHIN, k),
      foot: lF.foot,
      sole: lF.sole,
    },
    torso,
    neck,
    head,
    legN: {
      thigh: limb(H, lN.K, THIGH, k),
      shin: limb(lN.K, lN.A, SHIN, k),
      foot: lN.foot,
      sole: lN.sole,
      thighCut: limb(H, lN.K, THIGH, k, 0.42),
    },
    armN: {
      upper: limb(shoulder, aN.E, UPPER, k),
      fore: limb(aN.E, aN.Wr, FORE, k),
      upperCut: limb(shoulder, aN.E, UPPER, k, 0.45),
    },
    handN: handPath(kindN, aN.Wr, aN.hdir, aN.scale),
    bell,
    bellScale,
    bellCentre,
    order: disc.order ?? "out",
    shadow: { cx: (lo + hi) / 2, rx: (hi - lo) / 2 + 6 },
    feet: [lN.contact, lF.contact],
    breath,
    joints: {
      hip: H,
      waist: W,
      shoulder,
      elbow: aN.E,
      wrist: aN.Wr,
      grip: aN.grip,
      knee: lN.K,
      ankle: lN.A,
      kneeF: lF.K,
      elbowF: aF.E,
      head: headC,
      belly: at(15, 15),
    },
  };
}

/* ----------------------------------------------------------- timeline */

export interface Key extends Discrete {
  pose: Pose;
  /** Seconds to the next key. */
  dur: number;
  /** Seconds to hold this pose before moving on. */
  hold?: number;
  /** The movement comes to rest here (zero velocity). */
  stop?: boolean;
}

export interface MoveDef {
  label: string;
  cfg: RigConfig;
  keys: Key[];
  /** Phase 0..1 of the loop that reads best as a still. */
  still: number;
  /** Show the bell's path (legacy flag; every bell move now draws its Trace). */
  trace?: boolean;
  /** How much of the loop the Trace's tail covers (fraction of the loop's time). */
  traceTail?: number;
  /** A quiet accent extra: the breath ring, or the halo's orbit. */
  extra?: "breath" | "orbit";
  /** Square view box [x, y, size]. */
  view?: readonly [number, number, number];
}

type Num = number | V | undefined;

function loopLength(m: MoveDef) {
  return m.keys.reduce((s, k) => s + (k.hold ?? 0) + k.dur, 0);
}

export function duration(m: MoveDef): number {
  return loopLength(m);
}

/** Cubic Hermite through keys; tangent zero at stop keys, Catmull-Rom (time-aware) elsewhere. */
function interp(m: MoveDef, i: number, u: number): Pose {
  const n = m.keys.length;
  const K = (j: number) => m.keys[((j % n) + n) % n];
  const k0 = K(i - 1);
  const k1 = K(i);
  const k2 = K(i + 1);
  const k3 = K(i + 2);
  const D0 = k0.dur;
  const D1 = k1.dur;
  const D2 = k2.dur;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
  const h10 = u ** 3 - 2 * u ** 2 + u;
  const h01 = -2 * u ** 3 + 3 * u ** 2;
  const h11 = u ** 3 - u ** 2;
  const one = (a: number, b: number, c: number, d: number) => {
    const m1 = k1.stop ? 0 : ((c - a) / (D0 + D1)) * D1;
    const m2 = k2.stop ? 0 : ((d - b) / (D1 + D2)) * D1;
    return h00 * b + h10 * m1 + h01 * c + h11 * m2;
  };
  const out: Record<string, Num> = {};
  const keys = new Set<string>([...Object.keys(k1.pose), ...Object.keys(k2.pose)]);
  for (const key of keys) {
    const g = (kk: Key) => (kk.pose as unknown as Record<string, Num>)[key] ?? (k1.pose as unknown as Record<string, Num>)[key] ?? (k2.pose as unknown as Record<string, Num>)[key];
    const a = g(k0);
    const b = g(k1);
    const c = g(k2);
    const d = g(k3);
    if (Array.isArray(b)) {
      const A = a as V;
      const B = b as V;
      const C = c as V;
      const Dd = d as V;
      out[key] = [one(A[0], B[0], C[0], Dd[0]), one(A[1], B[1], C[1], Dd[1])];
    } else {
      out[key] = one(a as number, b as number, c as number, d as number);
    }
  }
  return out as unknown as Pose;
}

/** Pose and discrete state at loop phase t (0..1). */
export function sampleMove(m: MoveDef, t: number): { pose: Pose; disc: Discrete } {
  const T = loopLength(m);
  let time = (((t % 1) + 1) % 1) * T;
  const n = m.keys.length;
  for (let i = 0; i < n; i++) {
    const k = m.keys[i];
    const hold = k.hold ?? 0;
    if (time <= hold) return { pose: k.pose, disc: k };
    time -= hold;
    if (time <= k.dur || i === n - 1) {
      const u = Math.min(1, time / k.dur);
      const next = m.keys[(i + 1) % n];
      return { pose: interp(m, i, u), disc: pick(u < 0.5 ? k : next) };
    }
    time -= k.dur;
  }
  return { pose: m.keys[0].pose, disc: m.keys[0] };
}

function pick(k: Key): Discrete {
  return { order: k.order ?? "out", handN: k.handN ?? "fist", handF: k.handF ?? "fist" };
}

/** Phase (0..1) at which key i starts moving. */
export function keyPhase(m: MoveDef, i: number): number {
  const T = loopLength(m);
  let s = 0;
  for (let j = 0; j < i; j++) s += (m.keys[j].hold ?? 0) + m.keys[j].dur;
  return s / T;
}

export function geoAt(m: MoveDef, t: number, weight = 1): Geo {
  const { pose, disc } = sampleMove(m, t);
  return solve(pose, disc, { ...m.cfg, weight });
}

/**
 * The bell's path through one loop as a smooth open curve (for the dotted
 * trace). Only the arc in front of the body is drawn; the stretch where the
 * bell passes between the legs would read as noise.
 */
export function bellTrace(m: MoveDef, steps = 72): string {
  let best: V[] = [];
  let cur: V[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const { pose } = sampleMove(m, t);
    const g = solve(pose, {}, m.cfg);
    const c = g.bellCentre;
    const prev = cur[cur.length - 1];
    if (c && c[0] > pose.ankleN[0] + 14) {
      if (!prev || len(sub(c, prev)) > 0.8) cur.push(c);
    }
    else {
      if (cur.length > best.length) best = cur;
      cur = [];
    }
  }
  if (cur.length > best.length) best = cur;
  // Keep one sweep of the arc (it is travelled both ways).
  let top = 0;
  for (let i = 1; i < best.length; i++) if (best[i][1] < best[top][1]) top = i;
  const pts = top === 0 ? best : best.slice(0, top + 1);
  if (pts.length < 3) return "";
  return `M${P(pts[0])}` + run(pts, norm(sub(pts[1], pts[0])), norm(sub(pts[pts.length - 1], pts[pts.length - 2])));
}
