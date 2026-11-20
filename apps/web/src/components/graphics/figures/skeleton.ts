/**
 * Pose engine for the movement pictograms.
 *
 * A pose says where the hips sit, how far the trunk leans and where hands and
 * feet want to be; elbows and knees are solved with two-bone IK, so every
 * in-between frame keeps true limb lengths. The solver returns geometry for a
 * filled pictogram: a tapered torso, a head with a neck gap and capsule limbs.
 *
 * Coordinates: viewBox "-4 -8 108 108", y down, figure faces +x, ground y = 94.
 */

export type Vec = readonly [number, number];
export type Bend = 1 | -1;

export interface Pose {
  hip: Vec;
  /** Trunk lean in degrees from vertical; positive leans forward (+x). */
  trunk: number;
  /** Head tilt relative to the trunk, degrees. */
  head?: number;
  /** Torso length multiplier (breath lifts the chest). */
  lift?: number;
  hand: Vec;
  handFar?: Vec;
  elbow?: Bend;
  elbowFar?: Bend;
  foot: Vec;
  footFar?: Vec;
  knee?: Bend;
  kneeFar?: Bend;
  /** Foot direction in degrees; 0 points forward along the ground. */
  toe?: number;
  toeFar?: number;
  /**
   * Kettlebell in the near hand. rot: direction the bell body hangs from the
   * handle (0 = straight down, 180 = straight up); follow blends towards
   * "continuing along the forearm".
   */
  bell?: { rot?: number; follow?: number; opacity?: number };
}

export interface Frame {
  torso: string;
  head: Vec;
  armNear: { upper: string; fore: string; cut: string };
  armFar: { upper: string; fore: string };
  legNear: { thigh: string; shin: string; foot: string };
  legFar: { thigh: string; shin: string; foot: string };
  bell: { x: number; y: number; rot: number; opacity: number; cx: number; cy: number } | null;
  chest: Vec;
}

export const L = {
  torso: 25,
  upper: 12.5,
  fore: 12,
  thigh: 17,
  shin: 16.5,
  foot: 5.2,
  headR: 5.3,
  neckGap: 1.7,
} as const;

/** Capsule widths (user units). */
export const W = {
  upper: 5.4,
  fore: 4.5,
  thigh: 7.4,
  shin: 5.6,
  foot: 3.8,
  cut: 2.6,
} as const;

/** Distance from the handle top to the bell's centre of mass. */
export const BELL_CENTRE = 10.6;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (v: Vec) => `${r1(v[0])} ${r1(v[1])}`;
const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + b[0] * k, a[1] + b[1] * k];
const seg = (a: Vec, b: Vec) => `M${pt(a)}L${pt(b)}`;

/** Unit vector for an angle measured from straight up, positive towards +x. */
function upDir(a: number): Vec {
  return [Math.sin(rad(a)), -Math.cos(rad(a))];
}

/** Two-bone IK: [joint, end]. bend picks the side of root→target for the joint. */
export function ik(root: Vec, target: Vec, a: number, b: number, bend: Bend): [Vec, Vec] {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const raw = Math.hypot(dx, dy) || 0.0001;
  const d = Math.min(Math.max(raw, Math.abs(a - b) + 0.01), a + b - 0.02);
  const base = Math.atan2(dy, dx);
  const A = Math.acos(Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))));
  const j: Vec = [root[0] + a * Math.cos(base + bend * A), root[1] + a * Math.sin(base + bend * A)];
  const ex = target[0] - j[0];
  const ey = target[1] - j[1];
  const el = Math.hypot(ex, ey) || 1;
  return [j, [j[0] + (b * ex) / el, j[1] + (b * ey) / el]];
}

export function solve(p: Pose): Frame {
  const len = L.torso * (p.lift ?? 1);
  const u = upDir(p.trunk); // hip → shoulder
  const n: Vec = [Math.cos(rad(p.trunk)), Math.sin(rad(p.trunk))]; // front
  const H = p.hip;
  const S = add(H, u, len);

  // Tapered torso: glutes, waist, chest, shoulders; rounded by a stroke join.
  const at = (k: number, front: number): Vec => add(add(H, u, len * k), n, front);
  const torsoPts: Vec[] = [
    at(-0.05, 0.6),
    at(0.06, 4.2),
    at(0.36, 3.8),
    at(0.68, 5.3),
    at(0.93, 4.4),
    at(1.03, 1.2),
    at(1.0, -2.7),
    at(0.72, -3.7),
    at(0.38, -3.3),
    at(0.08, -4.9),
  ];
  // Smooth closed outline: quadratic curves through edge midpoints.
  const mid = (a: Vec, b: Vec): Vec => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const nPts = torsoPts.length;
  let torso = `M${pt(mid(torsoPts[nPts - 1], torsoPts[0]))}`;
  for (let i = 0; i < nPts; i++) {
    torso += `Q${pt(torsoPts[i])} ${pt(mid(torsoPts[i], torsoPts[(i + 1) % nPts]))}`;
  }
  torso += "Z";

  const hd = upDir(p.trunk + (p.head ?? 0));
  const neckBase = at(1.02, 0.9);
  const head = add(neckBase, hd, L.neckGap + L.headR + 0.6);

  // Shoulder joint sits just below the top of the torso, a touch behind the midline.
  const shoulder = add(add(S, u, -2.2), n, -0.4);
  const [elN, hN] = ik(shoulder, p.hand, L.upper, L.fore, p.elbow ?? 1);
  const [elF, hF] = ik(shoulder, p.handFar ?? p.hand, L.upper, L.fore, p.elbowFar ?? p.elbow ?? 1);
  const hipJ = add(H, n, 0.2);
  const [knN, anN] = ik(hipJ, p.foot, L.thigh, L.shin, p.knee ?? -1);
  const [knF, anF] = ik(hipJ, p.footFar ?? p.foot, L.thigh, L.shin, p.kneeFar ?? p.knee ?? -1);
  const toeN = add(anN, [Math.cos(rad(p.toe ?? 4)), Math.sin(rad(p.toe ?? 4))], L.foot);
  const toeF = add(anF, [Math.cos(rad(p.toeFar ?? p.toe ?? 4)), Math.sin(rad(p.toeFar ?? p.toe ?? 4))], L.foot);

  // The forearm's knockout starts past the elbow so the arm never looks detached.
  const fd: Vec = [(hN[0] - elN[0]) / L.fore, (hN[1] - elN[1]) / L.fore];
  const cutStart = add(elN, fd, 4.2);

  let bell: Frame["bell"] = null;
  if (p.bell) {
    const armRot = -deg(Math.atan2(fd[0], fd[1]));
    const follow = p.bell.follow ?? 0;
    const rot = (p.bell.rot ?? 0) * (1 - follow) + armRot * follow;
    const r = rad(rot);
    bell = {
      x: hN[0],
      y: hN[1],
      rot,
      opacity: p.bell.opacity ?? 1,
      cx: hN[0] - Math.sin(r) * BELL_CENTRE,
      cy: hN[1] + Math.cos(r) * BELL_CENTRE,
    };
  }

  return {
    torso,
    head,
    armNear: { upper: seg(shoulder, elN), fore: seg(elN, hN), cut: seg(cutStart, hN) },
    armFar: { upper: seg(shoulder, elF), fore: seg(elF, hF) },
    legNear: { thigh: seg(hipJ, knN), shin: seg(knN, anN), foot: seg(anN, toeN) },
    legFar: { thigh: seg(hipJ, knF), shin: seg(knF, anF), foot: seg(anF, toeF) },
    bell,
    chest: at(0.5, 12),
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lv = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);

/** Blend two poses. Bend directions switch at the midpoint. */
export function mix(a: Pose, b: Pose, t: number): Pose {
  const pick = <T,>(x: T, y: T) => (t < 0.5 ? x : y);
  const ab = a.bell;
  const bb = b.bell;
  return {
    hip: lv(a.hip, b.hip, t),
    trunk: lerp(a.trunk, b.trunk, t),
    head: lerp(a.head ?? 0, b.head ?? 0, t),
    lift: lerp(a.lift ?? 1, b.lift ?? 1, t),
    hand: lv(a.hand, b.hand, t),
    handFar: lv(a.handFar ?? a.hand, b.handFar ?? b.hand, t),
    elbow: pick(a.elbow, b.elbow),
    elbowFar: pick(a.elbowFar ?? a.elbow, b.elbowFar ?? b.elbow),
    foot: lv(a.foot, b.foot, t),
    footFar: lv(a.footFar ?? a.foot, b.footFar ?? b.foot, t),
    knee: pick(a.knee, b.knee),
    kneeFar: pick(a.kneeFar ?? a.knee, b.kneeFar ?? b.knee),
    toe: lerp(a.toe ?? 4, b.toe ?? 4, t),
    toeFar: lerp(a.toeFar ?? a.toe ?? 4, b.toeFar ?? b.toe ?? 4, t),
    bell:
      ab && bb
        ? {
            rot: lerp(ab.rot ?? 0, bb.rot ?? 0, t),
            follow: lerp(ab.follow ?? 0, bb.follow ?? 0, t),
            opacity: lerp(ab.opacity ?? 1, bb.opacity ?? 1, t),
          }
        : ab ?? bb,
  };
}

export interface Key {
  at: number;
  pose: Pose;
}

/** Sample a looping key list into evenly spaced frames, easing each segment. */
export function sample(keys: readonly Key[], frames: number): Frame[] {
  const out: Frame[] = [];
  const loop = [...keys, { at: 1, pose: keys[0].pose }];
  for (let i = 0; i <= frames; i++) {
    const t = i / frames;
    let k = 0;
    while (k < loop.length - 2 && t > loop[k + 1].at) k++;
    const a = loop[k];
    const b = loop[k + 1];
    const span = b.at - a.at || 1;
    const u = ease(Math.min(1, Math.max(0, (t - a.at) / span)));
    out.push(solve(mix(a.pose, b.pose, u)));
  }
  return out;
}
