// ../../mike-salemi-app-latest/apps/web/src/components/graphics/figures/bell.ts
var BELL_OUTLINE = "M-6.8 30.6A12.6 11.4 0 0 1-11.2 15.8C-12.4 10-12.2 3.4-10 1C-8.8-.6-7.6-1.6-5.6-1.8H5.6C7.6-1.6 8.8-.6 10 1C12.2 3.4 12.4 10 11.2 15.8A12.6 11.4 0 0 1 6.8 30.6Z";
var BELL_WINDOW = "M-8.4 12.5C-9 8-8.8 4.8-7.2 3.2C-6.2 2.2-5 1.6-3.8 1.6H3.8C5 1.6 6.2 2.2 7.2 3.2C8.8 4.8 9 8 8.4 12.5A12.6 11.4 0 0 0-8.4 12.5Z";
var BELL_BODY_CENTRE = 21;

// ../../mike-salemi-app-latest/apps/web/src/components/graphics/figures/rig.ts
var GROUND = 232;
var SEG = {
  pelvis: 18,
  chest: 37,
  upper: 33.5,
  fore: 26,
  /** Wrist to the centre of a gripping fist (where the handle sits). */
  grip: 6.5,
  thigh: 44.5,
  shin: 43.5,
  /** Ankle joint height above the sole. */
  ankle: 7
};
var ARM = SEG.upper + SEG.fore + SEG.grip;
var LEG = SEG.thigh + SEG.shin;
var rad = (d) => d * Math.PI / 180;
var deg = (r) => r * 180 / Math.PI;
var add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
var sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
var len = (a) => Math.hypot(a[0], a[1]);
var norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
var upOf = (a) => [Math.sin(rad(a)), -Math.cos(rad(a))];
var frontOf = (a) => [Math.cos(rad(a)), Math.sin(rad(a))];
var downOf = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
var angOf = (v) => deg(Math.atan2(v[0], v[1]));
var sideOf = (d) => [d[1], -d[0]];
var f1 = (n) => (Math.round(n * 10) / 10).toString();
var P = (v) => `${f1(v[0])} ${f1(v[1])}`;
function closed(pts) {
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
function run(pts, t0, t1) {
  let d = "";
  const n = pts.length;
  const at = (i) => {
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
function limb(A, B, prof, k, from = 0) {
  const L = len(sub(B, A));
  const d = norm(sub(B, A));
  const s = sideOf(d);
  const rows = prof.filter(([t]) => t >= from);
  if (rows[0][0] > from) {
    const i = prof.findIndex(([t]) => t >= from);
    const [ta, ra, oa] = prof[i - 1];
    const [tb, rb, ob] = prof[i];
    const u = (from - ta) / (tb - ta);
    rows.unshift([from, ra + (rb - ra) * u, (oa + (ob - oa) * u) * 0]);
  }
  const front = [];
  const back = [];
  for (const [t, r, o] of rows) {
    const c = add(add(A, d, L * t), s, o * k);
    front.push(add(c, s, r * k));
    back.push(add(c, s, -r * k));
  }
  const r0 = rows[0][1] * k;
  const r1 = rows[rows.length - 1][1] * k;
  return `M${P(front[0])}` + run(front, d, d) + `A${f1(r1)} ${f1(r1)} 0 0 1 ${P(back[back.length - 1])}` + run(back.slice().reverse(), [-d[0], -d[1]], [-d[0], -d[1]]) + `A${f1(r0)} ${f1(r0)} 0 0 1 ${P(front[0])}Z`;
}
var UPPER = [
  [0, 7.3, 0],
  [0.14, 7.2, 0.9],
  [0.42, 5.9, 0.9],
  [0.72, 5, 0.4],
  [1, 4.3, 0]
];
var FORE = [
  [0, 4.4, 0],
  [0.2, 5, -0.5],
  [0.5, 4.1, -0.2],
  [1, 3, 0]
];
var THIGH = [
  [0, 9.8, 0],
  [0.24, 9.3, 0.7],
  [0.58, 8, 0.8],
  [0.86, 6.4, 0.3],
  [1, 5.9, 0]
];
var SHIN = [
  [0, 5.5, 0],
  [0.2, 6.1, -1.3],
  [0.45, 5.1, -0.9],
  [0.78, 3.6, -0.2],
  [1, 3.3, 0]
];
var NECK = [
  [0, 6.2, 0],
  [0.5, 5.2, 0.3],
  [1, 5, 0]
];
var RELAXED = [
  [0, 3, 0],
  [0.35, 3.7, 0.4],
  [0.7, 3.2, 0.6],
  [1, 2.3, 0.3]
];
var FLAT = [
  [0, 2.7, 0],
  [0.4, 3, 0],
  [1, 2, 0]
];
var TORSO_FRONT = [
  [57.5, 3.4],
  [52, 9.8],
  [44, 12.4],
  [36, 12],
  [27, 10.6],
  [17, 9.6],
  [7, 9.4],
  [-1, 5.8],
  [-8.5, 0.6]
];
var TORSO_BACK = [
  [-9.5, -3.4],
  [-8, -9.6],
  [-2.5, -12.2],
  [5, -10.6],
  [15, -8.4],
  [26, -9.8],
  [38, -12.2],
  [47, -12.6],
  [54, -9.6],
  [58.5, -4]
];
var HEAD = [
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
  [-7.6, -9.6]
];
var FOOT = [
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
  [-5.4, 0.2]
];
var SOLE = [
  [-6.8, 5.3],
  [4, 5.3],
  [15, 5.3],
  [21.2, 5.1],
  [21.7, 6.1],
  [19.6, 7.1],
  [15, 7.2],
  [4, 7.2],
  [-4.8, 7.2],
  [-6.9, 6.4]
];
function fist(W, dir, k) {
  const s = sideOf(dir);
  const at = (u, v) => add(add(W, dir, u), s, v * k);
  const pts = [
    at(-1, 3.3),
    at(3.6, 5),
    at(8.6, 5.1),
    at(11.4, 3),
    at(11.8, -1.4),
    at(10, -4.6),
    at(5.4, -5.3),
    at(1.4, -4.4),
    at(-1, -3)
  ];
  return closed(pts);
}
function ik(root, target, a, b, bend) {
  const d0 = sub(target, root);
  const raw = len(d0) || 1e-4;
  const dist = Math.min(Math.max(raw, Math.abs(a - b) + 0.01), a + b - 1e-3);
  const base = Math.atan2(d0[1], d0[0]);
  const A = Math.acos(Math.min(1, Math.max(-1, (a * a + dist * dist - b * b) / (2 * a * dist))));
  const j = [root[0] + a * Math.cos(base + bend * A), root[1] + a * Math.sin(base + bend * A)];
  const e = norm(sub(target, j));
  return [j, add(j, e, b)];
}
function lerpAngle(a, b, t) {
  let d = (b - a + 540) % 360 - 180;
  if (d < -180) d += 360;
  return a + d * t;
}
function spineFrame(H, W, S, pel, ch) {
  return (s, n) => {
    let base;
    if (s <= SEG.pelvis) base = add(H, upOf(pel), s);
    else base = add(W, upOf(ch), s - SEG.pelvis);
    const blend = Math.min(1, Math.max(0, (s - (SEG.pelvis - 7)) / 14));
    const a = pel + (ch - pel) * blend;
    return add(base, frontOf(a), n);
  };
}
var BELL_SCALE = 1.04;
var GRIPS = {
  bar: { near: [0, 0], far: null },
  bar2: { near: [-3.4, -0.4], far: [3.4, -0.4] },
  horns: { near: [-10.5, 6.6], far: [10.5, 6.6] }
};
function solve(p, disc, cfg) {
  const k = cfg.weight ?? 1;
  const breath = p.breath ?? 0;
  let H = p.hip;
  if (p.shin !== void 0) {
    const s0 = SEG.shin * (p.legNs ?? 1);
    const t0 = SEG.thigh * (p.legNs ?? 1);
    const K = [p.ankleN[0] + Math.sin(rad(p.shin)) * s0, p.ankleN[1] - Math.cos(rad(p.shin)) * s0];
    const dx = Math.min(t0 - 0.01, Math.abs(K[0] - H[0]));
    H = [H[0], K[1] - Math.sqrt(t0 * t0 - dx * dx)];
  }
  const W = add(H, upOf(p.pelvis), SEG.pelvis);
  const S = add(W, upOf(p.chest), SEG.chest * (1 + breath * 0.02));
  const at = spineFrame(H, W, S, p.pelvis, p.chest);
  const swell = (s) => 1 + breath * (s < 26 ? 0.1 : 0.07);
  const torsoPts = [
    ...TORSO_FRONT.map(([s, n]) => at(s, n * swell(s) * (0.92 + 0.08 * k))),
    ...TORSO_BACK.map(([s, n]) => at(s, n * (0.94 + 0.06 * k)))
  ];
  const torso = closed(torsoPts);
  const shoulder = add(add(S, frontOf(p.chest), 0.8), upOf(p.chest), -4);
  const farOff = p.farOff ?? [0, 0];
  const shoulderF = add(shoulder, farOff);
  const hipF = add(H, farOff);
  const armTarget = (mode, v, sh, scale) => {
    if (mode === "point") return v;
    const a = mode === "torso" ? v[0] - p.chest : v[0];
    return add(sh, downOf(a), v[1] * ARM * scale);
  };
  const solveArm = (mode, v, sh, scale0, straight, kind, wrist) => {
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
  const handPath = (kind, Wr, dir, scale) => {
    if (kind === "fist") return fist(Wr, dir, k);
    if (kind === "flat") return limb(Wr, add(Wr, dir, 17 * Math.max(0.8, scale)), FLAT, k);
    return limb(Wr, add(Wr, dir, 16.5 * Math.max(0.8, scale)), RELAXED, k);
  };
  const kindN = disc.handN ?? "fist";
  const kindF = disc.handF ?? "fist";
  const aN = solveArm(cfg.armN, p.armN, shoulder, p.armNs ?? 1, p.straightN ?? 0, kindN, p.wristN ?? 0);
  let bell = null;
  let bellCentre = null;
  let farOnBell = null;
  const bellScale = BELL_SCALE * (p.bell ?? 1);
  if (cfg.grip !== "none" && (p.bell ?? 1) > 0.01) {
    const rot = lerpAngle(p.bellRot ?? 0, angOf(aN.fdir), p.bellFollow ?? 0) + (p.bellTwist ?? 0);
    const gr = GRIPS[cfg.grip];
    const th = rad(-rot);
    const toWorld = (l) => {
      const x = (l[0] - gr.near[0]) * bellScale;
      const y = (l[1] - gr.near[1]) * bellScale;
      return [aN.grip[0] + x * Math.cos(th) - y * Math.sin(th), aN.grip[1] + x * Math.sin(th) + y * Math.cos(th)];
    };
    bell = `translate(${P(aN.grip)}) rotate(${f1(-rot)}) scale(${bellScale.toFixed(3)}) translate(${f1(-gr.near[0])} ${f1(-gr.near[1])})`;
    bellCentre = toWorld([0, BELL_BODY_CENTRE]);
    if (gr.far) farOnBell = toWorld(gr.far);
  }
  const aF = farOnBell ? solveArm("point", farOnBell, shoulderF, 1, 0, kindF, p.wristF ?? 0) : solveArm(cfg.armF, p.armF, shoulderF, p.armFs ?? 1, p.straightF ?? 0, kindF, p.wristF ?? 0);
  const solveLeg = (hip, ankle, scale, foot) => {
    const [K, A] = ik(hip, ankle, SEG.thigh * scale, SEG.shin * scale, -1);
    const toe = [Math.cos(rad(foot)), Math.sin(rad(foot))];
    const sole = [-toe[1], toe[0]];
    const map = ([x, y]) => add(add(A, toe, x), sole, y * (0.94 + 0.06 * k));
    const low = Math.max(0, 1 - Math.max(0, GROUND - SEG.ankle - A[1]) / 10);
    const flat = Math.max(0, Math.cos(rad(foot)));
    return { K, A, foot: closed(FOOT.map(map)), sole: closed(SOLE.map(map)), contact: [A[0] + 7 * toe[0], low * (0.35 + 0.65 * flat)] };
  };
  const lN = solveLeg(H, p.ankleN, p.legNs ?? 1, p.footN ?? 0);
  const lF = solveLeg(hipF, p.ankleF, p.legFs ?? 1, p.footF ?? 0);
  const neckBase = add(add(S, upOf(p.chest), 2.5), frontOf(p.chest), -1.2);
  let headLean = p.head;
  const look = p.look ?? 0;
  if (look > 0) {
    const provisional = add(neckBase, upOf(p.head), 14);
    const to = sub(aN.grip, provisional);
    const lookLean = deg(Math.atan2(to[1], to[0]));
    headLean = lerpAngle(p.head, lookLean, look);
  }
  const neckLean = lerpAngle(p.chest, headLean, 0.55);
  const neckTop = add(neckBase, upOf(neckLean), 6.5);
  const headC = add(add(neckTop, upOf(headLean), 8.2), frontOf(headLean), 1.4);
  const hf = frontOf(headLean);
  const hd = [-upOf(headLean)[0], -upOf(headLean)[1]];
  const head = closed(HEAD.map(([x, y]) => add(add(headC, hf, x), hd, y)));
  const neck = limb(neckBase, add(neckTop, upOf(headLean), 2), NECK, k);
  const contacts = [p.ankleN[0] - 6, p.ankleN[0] + 20, p.ankleF[0] - 6, p.ankleF[0] + 20];
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
      sole: lF.sole
    },
    torso,
    neck,
    head,
    legN: {
      thigh: limb(H, lN.K, THIGH, k),
      shin: limb(lN.K, lN.A, SHIN, k),
      foot: lN.foot,
      sole: lN.sole,
      thighCut: limb(H, lN.K, THIGH, k, 0.42)
    },
    armN: {
      upper: limb(shoulder, aN.E, UPPER, k),
      fore: limb(aN.E, aN.Wr, FORE, k),
      upperCut: limb(shoulder, aN.E, UPPER, k, 0.45)
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
      belly: at(15, 15)
    }
  };
}
function loopLength(m) {
  return m.keys.reduce((s, k) => s + (k.hold ?? 0) + k.dur, 0);
}
function interp(m, i, u) {
  const n = m.keys.length;
  const K = (j) => m.keys[(j % n + n) % n];
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
  const one = (a, b, c, d) => {
    const m1 = k1.stop ? 0 : (c - a) / (D0 + D1) * D1;
    const m2 = k2.stop ? 0 : (d - b) / (D1 + D2) * D1;
    return h00 * b + h10 * m1 + h01 * c + h11 * m2;
  };
  const out2 = {};
  const keys = /* @__PURE__ */ new Set([...Object.keys(k1.pose), ...Object.keys(k2.pose)]);
  for (const key of keys) {
    const g = (kk) => kk.pose[key] ?? k1.pose[key] ?? k2.pose[key];
    const a = g(k0);
    const b = g(k1);
    const c = g(k2);
    const d = g(k3);
    if (Array.isArray(b)) {
      const A = a;
      const B = b;
      const C = c;
      const Dd = d;
      out2[key] = [one(A[0], B[0], C[0], Dd[0]), one(A[1], B[1], C[1], Dd[1])];
    } else {
      out2[key] = one(a, b, c, d);
    }
  }
  return out2;
}
function sampleMove(m, t) {
  const T = loopLength(m);
  let time = (t % 1 + 1) % 1 * T;
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
function pick(k) {
  return { order: k.order ?? "out", handN: k.handN ?? "fist", handF: k.handF ?? "fist" };
}
function geoAt(m, t, weight = 1) {
  const { pose, disc } = sampleMove(m, t);
  return solve(pose, disc, { ...m.cfg, weight });
}

// ../../mike-salemi-app-latest/apps/web/src/components/graphics/figures/library.ts
var AY = GROUND - SEG.ankle;
var HIP_Y = AY - (SEG.thigh + SEG.shin) + 0.6;
var SW_X = 112;
var swingBase = {
  bellTwist: 0,
  ankleN: [SW_X, AY],
  ankleF: [SW_X - 3, AY],
  farOff: [-3, -0.6],
  bellFollow: 1
};
var sw = (p) => ({
  ...swingBase,
  armF: [p.armN[0] + 1.5, p.armN[1]],
  ...p
});
var SWING = {
  traceTail: 0.55,
  label: "Swing",
  cfg: { armN: "world", armF: "world", grip: "bar2" },
  trace: true,
  still: 0,
  keys: [
    // Float: tall plank, glutes locked, bell at chest height in line with the arms.
    { pose: sw({ hip: [SW_X + 1.5, 0], shin: 0.6, pelvis: -3, chest: -5, head: -3, armN: [86, 1] }), dur: 0.36, hold: 0.06, stop: true },
    // Wait for the bell: stay tall until the forearms reach the hips.
    { pose: sw({ hip: [SW_X + 0.5, 0], shin: 1, pelvis: -2, chest: -3, head: 0, armN: [24, 1] }), dur: 0.16 },
    // Hinge as the bell passes the hips: hips back, shins stay put.
    { pose: sw({ hip: [SW_X - 12, 0], shin: 3, pelvis: 36, chest: 34, head: 20, armN: [-14, 1] }), dur: 0.2, order: "between" },
    // Hike: hips back, flat back, shins near vertical, bell high behind between the thighs.
    { pose: sw({ hip: [SW_X - 30, 0], shin: 6, pelvis: 62, chest: 58, head: 44, armN: [-50, 1], bellTwist: -24 }), dur: 0.22, stop: true, order: "between" },
    // Hip snap: the hips finish before the arms rise.
    { pose: sw({ hip: [SW_X + 1.5, 0], shin: 1.5, pelvis: 2, chest: 0, head: 2, armN: [30, 1] }), dur: 0.3 }
  ]
};
var GS_X = 110;
var gobletArms = { armN: [74, 0.3], armF: [74, 0.3] };
var gobletBase = {
  ankleN: [GS_X, AY],
  ankleF: [GS_X - 3, AY],
  farOff: [-3, -0.6],
  ...gobletArms,
  bellRot: 0
};
var GOBLET_SQUAT = {
  traceTail: 0.45,
  label: "Goblet squat",
  cfg: { armN: "torso", armF: "torso", grip: "horns" },
  still: 0.5,
  keys: [
    { pose: { ...gobletBase, hip: [GS_X + 2, HIP_Y], pelvis: 0, chest: -1, head: 0 }, dur: 1.25, hold: 0.45, stop: true, order: "over" },
    { pose: { ...gobletBase, hip: [GS_X - 6, HIP_Y + 26], pelvis: 16, chest: 12, head: 2 }, dur: 0.6, order: "over" },
    { pose: { ...gobletBase, hip: [GS_X - 20, AY - 34], pelvis: 30, chest: 18, head: -2 }, dur: 1, hold: 0.35, stop: true, order: "over" }
  ]
};
var TG_FOOT = 140;
var TG_HAND = [74, GROUND - 3];
var tg = {
  armN: [180, 1],
  // The bell rests on the back of the forearm, not balanced on the fist.
  bellRot: -17,
  look: 1,
  footN: 0
};
var TGU_UP = [
  // Lying, bell pressed.
  {
    pose: {
      ...tg,
      hip: [92, GROUND - 12],
      pelvis: -90,
      chest: -91,
      head: -96,
      ankleN: [TG_FOOT, AY],
      ankleF: [156, GROUND - 6],
      footF: -88,
      legFs: 0.74,
      armF: TG_HAND,
      armFs: 0.6,
      straightF: 1,
      wristF: -90
    },
    handF: "flat",
    order: "out",
    dur: 1,
    hold: 0.7,
    stop: true
  },
  // Roll to the elbow.
  {
    pose: {
      ...tg,
      hip: [93, GROUND - 12],
      pelvis: -76,
      chest: -60,
      head: -70,
      ankleN: [TG_FOOT, AY],
      ankleF: [156, GROUND - 6],
      footF: -86,
      legFs: 0.74,
      armF: TG_HAND,
      armFs: 0.88,
      straightF: 0,
      wristF: -90
    },
    handF: "flat",
    order: "out",
    dur: 0.9,
    hold: 0.25,
    stop: true
  },
  // Post to the hand.
  {
    pose: {
      ...tg,
      hip: [94, GROUND - 12],
      pelvis: -58,
      chest: -42,
      head: -50,
      ankleN: [TG_FOOT, AY],
      ankleF: [156, GROUND - 6],
      footF: -80,
      legFs: 0.74,
      armF: TG_HAND,
      armFs: 0.9,
      straightF: 1,
      wristF: -90
    },
    handF: "flat",
    order: "out",
    dur: 1,
    hold: 0.25,
    stop: true
  },
  // High bridge.
  {
    pose: {
      ...tg,
      hip: [100, GROUND - 52],
      pelvis: -74,
      chest: -64,
      head: -58,
      ankleN: [TG_FOOT, AY],
      ankleF: [156, GROUND - 6],
      footF: -80,
      legFs: 0.86,
      armF: TG_HAND,
      armFs: 1,
      straightF: 1,
      wristF: -90
    },
    handF: "flat",
    order: "out",
    dur: 0.55,
    hold: 0.25,
    stop: true
  },
  // Leg sweep: the far leg threads back under the hips.
  {
    pose: {
      ...tg,
      hip: [94, GROUND - 48],
      pelvis: -60,
      chest: -58,
      head: -54,
      ankleN: [TG_FOOT, AY],
      ankleF: [86, GROUND - 16],
      footF: 30,
      legFs: 1,
      armF: TG_HAND,
      armFs: 1,
      straightF: 1,
      wristF: -90
    },
    handF: "flat",
    order: "out",
    dur: 0.55
  },
  // Kneel, hand still posted.
  {
    pose: {
      ...tg,
      hip: [88, GROUND - 46],
      pelvis: -20,
      chest: -46,
      head: -40,
      ankleN: [TG_FOOT, AY],
      ankleF: [46, GROUND - 6],
      footF: 172,
      legFs: 1,
      armF: TG_HAND,
      armFs: 1,
      straightF: 1,
      wristF: -90
    },
    handF: "flat",
    order: "out",
    dur: 1,
    hold: 0.25,
    stop: true
  },
  // Half-kneel: torso tall, hand off the floor, eyes still on the bell.
  {
    pose: {
      ...tg,
      hip: [93, GROUND - 46],
      pelvis: 0,
      chest: -2,
      head: 0,
      look: 0.75,
      ankleN: [TG_FOOT, AY],
      ankleF: [50, GROUND - 6],
      footF: 172,
      legFs: 1,
      armF: [97, 199],
      armFs: 1,
      straightF: 0,
      wristF: 0
    },
    handF: "relaxed",
    order: "out",
    dur: 1,
    hold: 0.25,
    stop: true
  },
  // Lunge up.
  {
    pose: {
      ...tg,
      hip: [112, HIP_Y + 18],
      pelvis: 2,
      chest: -1,
      head: 0,
      look: 0.4,
      ankleN: [TG_FOOT, AY],
      ankleF: [74, AY - 2],
      footF: 38,
      legFs: 1,
      armF: [115, 170],
      armFs: 1,
      straightF: 0,
      wristF: 0
    },
    handF: "relaxed",
    order: "out",
    dur: 0.8
  },
  // Stand tall, bell locked out overhead.
  {
    pose: {
      ...tg,
      hip: [TG_FOOT - 1, HIP_Y],
      pelvis: 0,
      chest: -2,
      head: 0,
      look: 0.25,
      ankleN: [TG_FOOT, AY],
      ankleF: [TG_FOOT - 3, AY],
      footF: 0,
      legFs: 1,
      armF: [141, 152],
      armFs: 1,
      straightF: 0,
      wristF: 0
    },
    handF: "relaxed",
    order: "out",
    dur: 0.8,
    hold: 0.8,
    stop: true
  }
];
function pingPong(up) {
  const n = up.length;
  const res = up.map((k) => ({ ...k }));
  res[n - 1] = { ...up[n - 1], dur: up[n - 2].dur };
  for (let j = n - 2; j >= 1; j--) res.push({ ...up[j], dur: up[j - 1].dur });
  return res;
}
var GETUP = {
  traceTail: 0.14,
  label: "Turkish get-up",
  cfg: { armN: "world", armF: "point", grip: "bar" },
  still: 0.24,
  view: [-24, 0, 240],
  keys: pingPong(TGU_UP)
};
var X = 112;
var FEET = { ankleN: [X, AY], ankleF: [X - 3, AY], farOff: [-3, -0.6] };
var TALL = { ...FEET, hip: [X + 1.5, 0], shin: 0.6, pelvis: -1, chest: -3, head: 0 };
var RACK = { armN: [98, 0.16], bellRot: -24, bellFollow: 0, bellTwist: 0 };
var LOCK = { armN: [182, 1], bellRot: -17, bellFollow: 0, bellTwist: 0 };
var HANG_FAR = { armF: [5, 0.96] };
var HINGE = { ...FEET, hip: [X - 12, 0], shin: 3.5, pelvis: 36, chest: 34, head: 20 };
var HIKE = { ...FEET, hip: [X - 29, 0], shin: 6.5, pelvis: 60, chest: 56, head: 42 };
var SNAP = { ...FEET, hip: [X + 1.5, 0], shin: 1.5, pelvis: 2, chest: 0, head: 2 };
var CLEAN = {
  traceTail: 0.5,
  label: "Clean",
  cfg: { armN: "world", armF: "world", grip: "bar" },
  still: 0,
  keys: [
    { pose: { ...TALL, ...RACK, ...HANG_FAR }, dur: 0.34, hold: 0.45, stop: true, order: "over", handF: "relaxed" },
    { pose: { ...TALL, hip: [X + 0.5, 0], armN: [18, 1], bellRot: 0, bellFollow: 1, bellTwist: 0, armF: [8, 0.96] }, dur: 0.2, handF: "relaxed" },
    { pose: { ...HINGE, armN: [-14, 1], bellRot: 0, bellFollow: 1, bellTwist: 0, armF: [-6, 0.96] }, dur: 0.2, order: "between", handF: "relaxed" },
    { pose: { ...HIKE, armN: [-48, 1], bellRot: 0, bellFollow: 1, bellTwist: -20, armF: [-26, 0.96] }, dur: 0.24, stop: true, order: "between", handF: "relaxed" },
    { pose: { ...SNAP, armN: [22, 0.92], bellRot: 0, bellFollow: 0.9, bellTwist: 0, armF: [10, 0.96] }, dur: 0.17, handF: "relaxed" },
    // Zipper: elbow bends, the bell stays close and turns over around the hand.
    { pose: { ...TALL, armN: [36, 0.5], bellRot: -6, bellFollow: 0.15, bellTwist: 0, ...HANG_FAR }, dur: 0.2, handF: "relaxed" }
  ]
};
var PRESS = {
  traceTail: 0.45,
  label: "Press",
  cfg: { armN: "world", armF: "world", grip: "bar" },
  still: 0.5,
  keys: [
    { pose: { ...TALL, ...RACK, ...HANG_FAR }, dur: 0.55, hold: 0.5, stop: true, order: "over", handF: "relaxed" },
    { pose: { ...TALL, armN: [158, 0.5], bellRot: -20, bellFollow: 0, bellTwist: 0, ...HANG_FAR }, dur: 0.4, order: "over", handF: "relaxed" },
    { pose: { ...TALL, ...LOCK, ...HANG_FAR }, dur: 1, hold: 0.55, stop: true, order: "over", handF: "relaxed" }
  ]
};
var SNATCH = {
  traceTail: 0.5,
  label: "Snatch",
  cfg: { armN: "world", armF: "world", grip: "bar" },
  still: 0,
  trace: true,
  keys: [
    { pose: { ...TALL, ...LOCK, ...HANG_FAR }, dur: 0.3, hold: 0.4, stop: true, order: "over", handF: "relaxed" },
    { pose: { ...TALL, armN: [96, 1], bellRot: 0, bellFollow: 1, bellTwist: 0, armF: [10, 0.96] }, dur: 0.2, handF: "relaxed" },
    { pose: { ...TALL, hip: [X + 0.5, 0], armN: [22, 1], bellRot: 0, bellFollow: 1, bellTwist: 0, armF: [6, 0.96] }, dur: 0.18, handF: "relaxed" },
    { pose: { ...HINGE, armN: [-14, 1], bellRot: 0, bellFollow: 1, bellTwist: 0, armF: [-6, 0.96] }, dur: 0.2, order: "between", handF: "relaxed" },
    { pose: { ...HIKE, armN: [-48, 1], bellRot: 0, bellFollow: 1, bellTwist: -20, armF: [-26, 0.96] }, dur: 0.24, stop: true, order: "between", handF: "relaxed" },
    { pose: { ...SNAP, armN: [40, 1], bellRot: 0, bellFollow: 1, bellTwist: 0, armF: [12, 0.96] }, dur: 0.16, handF: "relaxed" },
    { pose: { ...TALL, armN: [128, 0.7], bellRot: -8, bellFollow: 0.6, bellTwist: 0, ...HANG_FAR }, dur: 0.18, handF: "relaxed" }
  ]
};
var DL_GRIP_X = X + 3;
var DEADLIFT = {
  traceTail: 0.45,
  label: "Deadlift",
  cfg: { armN: "point", armF: "world", grip: "bar2" },
  still: 0.5,
  keys: [
    { pose: { ...FEET, hip: [X + 1.5, HIP_Y], pelvis: -1, chest: -2, head: 0, armN: [DL_GRIP_X, 150], armF: [0, 1], bellRot: 0 }, dur: 1, hold: 0.45, stop: true },
    // Hips higher than the knees, shins near vertical, flat back, neck neutral; arms hang to the handle.
    { pose: { ...FEET, hip: [X - 36, 164], pelvis: 56, chest: 52, head: 47, armN: [DL_GRIP_X, GROUND - 32.6], armF: [0, 1], bellRot: 0 }, dur: 0.85, hold: 0.35, stop: true }
  ]
};
var ROW_BASE = {
  ankleN: [X - 34, AY],
  ankleF: [X + 16, AY],
  farOff: [-3, -0.6],
  hip: [X - 8, 147],
  pelvis: 50,
  chest: 48,
  head: 42,
  bellRot: 0,
  armF: [X + 15, 174],
  wristF: 40
};
var ROW = {
  label: "Bent-over row",
  cfg: { armN: "world", armF: "point", grip: "bar" },
  still: 0.5,
  traceTail: 0.45,
  keys: [
    { pose: { ...ROW_BASE, armN: [-2, 1] }, dur: 0.7, hold: 0.35, stop: true, handF: "flat" },
    // Elbow drives back past the torso, the bell rows to the hip.
    { pose: { ...ROW_BASE, armN: [-40, 0.46] }, dur: 0.95, hold: 0.4, stop: true, handF: "flat" }
  ]
};
var LG = { armN: [74, 0.3], armF: [74, 0.3], bellRot: 0 };
var LUNGE = {
  traceTail: 0.45,
  label: "Reverse lunge",
  cfg: { armN: "torso", armF: "torso", grip: "horns" },
  still: 0.55,
  keys: [
    { pose: { ...LG, ankleN: [X, AY], ankleF: [X - 3, AY], hip: [X + 2, HIP_Y], pelvis: 0, chest: -1, head: 0, footF: 0 }, dur: 0.5, hold: 0.45, stop: true, order: "over" },
    { pose: { ...LG, ankleN: [X, AY], ankleF: [X - 42, AY - 14], hip: [X - 10, HIP_Y + 10], pelvis: 4, chest: 1, head: 0, footF: 22 }, dur: 0.5, order: "over" },
    { pose: { ...LG, ankleN: [X, AY], ankleF: [X - 80, AY - 5], hip: [X - 36, GROUND - 50], pelvis: 6, chest: 2, head: 0, footF: 52 }, dur: 1.05, hold: 0.35, stop: true, order: "over" }
  ]
};
var HALO_BASE = { ...TALL, chest: -2, armF: [0, 1], bellRot: 180 };
var HALO = {
  traceTail: 0.7,
  label: "Halo",
  cfg: { armN: "point", armF: "world", grip: "horns" },
  still: 0,
  extra: "orbit",
  keys: [
    { pose: { ...HALO_BASE, armN: [X + 25, 80], bell: 1, head: 2 }, dur: 0.55, order: "over" },
    { pose: { ...HALO_BASE, armN: [X + 6, 74], bell: 1.03, head: 0 }, dur: 0.55, order: "over" },
    { pose: { ...HALO_BASE, armN: [X - 16, 78], bell: 0.97, head: 6 }, dur: 0.55, order: "behind" },
    { pose: { ...HALO_BASE, armN: [X + 4, 74], bell: 0.93, head: 2 }, dur: 0.55, order: "behind" }
  ]
};
var BR = {
  hip: [X - 14, GROUND - 21],
  pelvis: -4,
  ankleN: [X - 15, GROUND - 6],
  ankleF: [X - 18, GROUND - 6],
  footN: 172,
  footF: 172,
  farOff: [-3, -0.6],
  armN: [X + 16, 199],
  armF: [X + 13, 199],
  wristN: -6,
  wristF: -6
};
var BREATHING = {
  label: "Breathing",
  cfg: { armN: "point", armF: "point", grip: "none" },
  still: 0.5,
  extra: "breath",
  view: [26, 70, 172],
  keys: [
    { pose: { ...BR, chest: -2, head: 2, breath: 0 }, dur: 4, hold: 0.6, stop: true, handN: "relaxed", handF: "relaxed" },
    { pose: { ...BR, chest: -4.5, head: 0, breath: 1 }, dur: 4.6, hold: 0.8, stop: true, handN: "relaxed", handF: "relaxed" }
  ]
};
var WK = { pelvis: 1, chest: 0, head: 0, farOff: [-3, -0.6], bellRot: 0, armN: [3, 0.98] };
var WALKING = {
  traceTail: 0.6,
  label: "Walking",
  cfg: { armN: "world", armF: "world", grip: "bar" },
  still: 0,
  keys: [
    { pose: { ...WK, hip: [X, HIP_Y + 4.5], ankleN: [X + 26, AY - 1.6], footN: -14, ankleF: [X - 26, AY - 6.5], footF: 26, armF: [22, 0.95] }, dur: 0.28, handF: "relaxed" },
    { pose: { ...WK, hip: [X, HIP_Y - 0.4], ankleN: [X + 1, AY], footN: 0, ankleF: [X + 2, AY - 12], footF: 16, armF: [2, 0.96], armN: [1, 0.98] }, dur: 0.28, handF: "relaxed" },
    { pose: { ...WK, hip: [X, HIP_Y + 4.5], ankleF: [X + 26, AY - 1.6], footF: -14, ankleN: [X - 26, AY - 6.5], footN: 26, armF: [-20, 0.95], armN: [5, 0.98] }, dur: 0.28, handF: "relaxed" },
    { pose: { ...WK, hip: [X, HIP_Y - 0.4], ankleF: [X + 1, AY], footF: 0, ankleN: [X + 2, AY - 12], footN: 16, armF: [2, 0.96], armN: [1, 0.98] }, dur: 0.28, handF: "relaxed" }
  ]
};
var MOVES = {
  swing: SWING,
  clean: CLEAN,
  press: PRESS,
  snatch: SNATCH,
  getup: GETUP,
  squat: GOBLET_SQUAT,
  lunge: LUNGE,
  row: ROW,
  deadlift: DEADLIFT,
  halo: HALO,
  breathing: BREATHING,
  walking: WALKING
};

// tools/rig-entry.ts
var out = { GROUND, BELL: BELL_OUTLINE + BELL_WINDOW, moves: {} };
for (const [k, m] of Object.entries(MOVES)) {
  out.moves[k] = { view: m.view ?? [0, 0, 240], still: m.still, grip: m.cfg.grip, frames: {} };
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    out.moves[k].frames[t.toFixed(3)] = geoAt(m, t, 1);
  }
}
console.log(JSON.stringify(out));
