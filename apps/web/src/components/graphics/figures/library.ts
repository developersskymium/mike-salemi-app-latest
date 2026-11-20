import { GROUND, SEG, type Key, type MoveDef, type Pose, type V } from "./rig";

/** Ankle height above the floor when the foot is flat. */
const AY = GROUND - SEG.ankle;
/** Standing hip height: straight legs a hair short of locked. */
const HIP_Y = AY - (SEG.thigh + SEG.shin) + 0.6;

/* ---------------------------------------------------------------- swing
   Two-hand (Russian/hardstyle) swing. A hip hinge, not a squat: the hips go
   back, the shins stay near vertical, the back stays flat and the bell is
   hiked high between the thighs; then the hips snap through and the bell
   floats to chest height on straight arms, in line with the arms. */
const SW_X = 112;
const swingBase = {
  bellTwist: 0,
  ankleN: [SW_X, AY] as V,
  ankleF: [SW_X - 3, AY] as V,
  farOff: [-3, -0.6] as V,
  bellFollow: 1,
};
const sw = (p: Partial<Pose> & Pick<Pose, "hip" | "pelvis" | "chest" | "head" | "armN">): Pose => ({
  ...swingBase,
  armF: [p.armN[0] + 1.5, p.armN[1]] as V,
  ...p,
});

export const SWING: MoveDef = {
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
    { pose: sw({ hip: [SW_X + 1.5, 0], shin: 1.5, pelvis: 2, chest: 0, head: 2, armN: [30, 1] }), dur: 0.3 },
  ],
};

/* ---------------------------------------------------------- goblet squat
   The bell held by the horns at the chest, elbows down. Sit between the
   heels to below parallel with the torso tall, knees forward over the toes,
   heels down; stand tall. */
const GS_X = 110;
// Hands on the horns just under the chin, elbows down under them.
const gobletArms = { armN: [74, 0.3] as V, armF: [74, 0.3] as V };
const gobletBase = {
  ankleN: [GS_X, AY] as V,
  ankleF: [GS_X - 3, AY] as V,
  farOff: [-3, -0.6] as V,
  ...gobletArms,
  bellRot: 0,
};
export const GOBLET_SQUAT: MoveDef = {
  label: "Goblet squat",
  cfg: { armN: "torso", armF: "torso", grip: "horns" },
  still: 0.5,
  keys: [
    { pose: { ...gobletBase, hip: [GS_X + 2, HIP_Y], pelvis: 0, chest: -1, head: 0 }, dur: 1.25, hold: 0.45, stop: true, order: "over" },
    { pose: { ...gobletBase, hip: [GS_X - 6, HIP_Y + 26], pelvis: 16, chest: 12, head: 2 }, dur: 0.6, order: "over" },
    { pose: { ...gobletBase, hip: [GS_X - 20, AY - 34], pelvis: 30, chest: 18, head: -2 }, dur: 1.0, hold: 0.35, stop: true, order: "over" },
  ],
};

/* ------------------------------------------------------ Turkish get-up
   Bell in the right hand, seen from that side. Lying: arm vertical, same-side
   knee bent with the foot planted, far leg long and the far arm out on the
   floor. Roll to the elbow, post to the hand, high bridge, sweep the leg
   through to a kneel, lift the torso to a half-kneel, stand from the lunge.
   The bell arm stays vertical and the eyes stay on the bell. Then reverse. */
const TG_FOOT = 140;
const TG_HAND: V = [74, GROUND - 3];
const tg = {
  armN: [180, 1] as V,
  // The bell rests on the back of the forearm, not balanced on the fist.
  bellRot: -17,
  look: 1,
  footN: 0,
};
const TGU_UP: Key[] = [
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
      wristF: -90,
    },
    handF: "flat",
    order: "out",
    dur: 1.0,
    hold: 0.7,
    stop: true,
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
      wristF: -90,
    },
    handF: "flat",
    order: "out",
    dur: 0.9,
    hold: 0.25,
    stop: true,
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
      wristF: -90,
    },
    handF: "flat",
    order: "out",
    dur: 1.0,
    hold: 0.25,
    stop: true,
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
      wristF: -90,
    },
    handF: "flat",
    order: "out",
    dur: 0.55,
    hold: 0.25,
    stop: true,
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
      wristF: -90,
    },
    handF: "flat",
    order: "out",
    dur: 0.55,
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
      wristF: -90,
    },
    handF: "flat",
    order: "out",
    dur: 1.0,
    hold: 0.25,
    stop: true,
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
      wristF: 0,
    },
    handF: "relaxed",
    order: "out",
    dur: 1.0,
    hold: 0.25,
    stop: true,
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
      wristF: 0,
    },
    handF: "relaxed",
    order: "out",
    dur: 0.8,
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
      wristF: 0,
    },
    handF: "relaxed",
    order: "out",
    dur: 0.8,
    hold: 0.8,
    stop: true,
  },
];

/** Up, then back down the same path. */
function pingPong(up: Key[]): Key[] {
  const n = up.length;
  const res: Key[] = up.map((k) => ({ ...k }));
  // Going back down, the segment from key j to key j-1 takes key j-1's forward time.
  res[n - 1] = { ...up[n - 1], dur: up[n - 2].dur };
  for (let j = n - 2; j >= 1; j--) res.push({ ...up[j], dur: up[j - 1].dur });
  return res;
}

export const GETUP: MoveDef = {
  label: "Turkish get-up",
  cfg: { armN: "world", armF: "point", grip: "bar" },
  still: 0.24,
  view: [-24, 0, 240],
  keys: pingPong(TGU_UP),
};

/* -------------------------------------------------------------- shared */

const X = 112;
const FEET = { ankleN: [X, AY] as V, ankleF: [X - 3, AY] as V, farOff: [-3, -0.6] as V };
const TALL = { ...FEET, hip: [X + 1.5, 0] as V, shin: 0.6, pelvis: -1, chest: -3, head: 0 };
/** Rack: fist under the chin, forearm vertical, elbow tucked to the ribs, the bell resting outside the forearm. */
const RACK = { armN: [98, 0.16] as V, bellRot: -24, bellFollow: 0, bellTwist: 0 };
/** Overhead lockout: biceps by the ear, wrist straight, the bell on the back of the forearm. */
const LOCK = { armN: [182, 1] as V, bellRot: -17, bellFollow: 0, bellTwist: 0 };
const HANG_FAR = { armF: [5, 0.96] as V };
const HINGE = { ...FEET, hip: [X - 12, 0] as V, shin: 3.5, pelvis: 36, chest: 34, head: 20 };
const HIKE = { ...FEET, hip: [X - 29, 0] as V, shin: 6.5, pelvis: 60, chest: 56, head: 42 };
const SNAP = { ...FEET, hip: [X + 1.5, 0] as V, shin: 1.5, pelvis: 2, chest: 0, head: 2 };

/* ---------------------------------------------------------------- clean
   From the hike the hips snap, the bell travels close to the body (a zipper
   path, elbow bending) and turns over softly into the rack. */
export const CLEAN: MoveDef = {
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
    { pose: { ...TALL, armN: [36, 0.5], bellRot: -6, bellFollow: 0.15, bellTwist: 0, ...HANG_FAR }, dur: 0.2, handF: "relaxed" },
  ],
};

/* ---------------------------------------------------------------- press
   Rack to lockout: the fist travels straight up past the face, finishing with
   the biceps by the ear and the wrist straight; then back to the rack. */
export const PRESS: MoveDef = {
  label: "Press",
  cfg: { armN: "world", armF: "world", grip: "bar" },
  still: 0.5,
  keys: [
    { pose: { ...TALL, ...RACK, ...HANG_FAR }, dur: 0.55, hold: 0.5, stop: true, order: "over", handF: "relaxed" },
    { pose: { ...TALL, armN: [158, 0.5], bellRot: -20, bellFollow: 0, bellTwist: 0, ...HANG_FAR }, dur: 0.4, order: "over", handF: "relaxed" },
    { pose: { ...TALL, ...LOCK, ...HANG_FAR }, dur: 1.0, hold: 0.55, stop: true, order: "over", handF: "relaxed" },
  ],
};

/* --------------------------------------------------------------- snatch
   One continuous pull: hike, hip snap, a high pull with the elbow leading,
   then the hand punches through to lockout. The drop retraces the arc. */
export const SNATCH: MoveDef = {
  label: "Snatch",
  cfg: { armN: "world", armF: "world", grip: "bar" },
  still: 0.91,
  trace: true,
  keys: [
    { pose: { ...TALL, ...LOCK, ...HANG_FAR }, dur: 0.3, hold: 0.4, stop: true, order: "over", handF: "relaxed" },
    { pose: { ...TALL, armN: [96, 1], bellRot: 0, bellFollow: 1, bellTwist: 0, armF: [10, 0.96] }, dur: 0.2, handF: "relaxed" },
    { pose: { ...TALL, hip: [X + 0.5, 0], armN: [22, 1], bellRot: 0, bellFollow: 1, bellTwist: 0, armF: [6, 0.96] }, dur: 0.18, handF: "relaxed" },
    { pose: { ...HINGE, armN: [-14, 1], bellRot: 0, bellFollow: 1, bellTwist: 0, armF: [-6, 0.96] }, dur: 0.2, order: "between", handF: "relaxed" },
    { pose: { ...HIKE, armN: [-48, 1], bellRot: 0, bellFollow: 1, bellTwist: -20, armF: [-26, 0.96] }, dur: 0.24, stop: true, order: "between", handF: "relaxed" },
    { pose: { ...SNAP, armN: [40, 1], bellRot: 0, bellFollow: 1, bellTwist: 0, armF: [12, 0.96] }, dur: 0.16, handF: "relaxed" },
    { pose: { ...TALL, armN: [128, 0.7], bellRot: -8, bellFollow: 0.6, bellTwist: 0, ...HANG_FAR }, dur: 0.18, handF: "relaxed" },
  ],
};

/* ------------------------------------------------------------- deadlift
   Two hands on the handle, the bell between the feet. Hinge with a little
   more knee than a swing, flat back, arms long; the bell travels straight up. */
const DL_GRIP_X = X + 3;
export const DEADLIFT: MoveDef = {
  label: "Deadlift",
  cfg: { armN: "point", armF: "world", grip: "bar2" },
  still: 0.5,
  keys: [
    { pose: { ...FEET, hip: [X + 1.5, HIP_Y], pelvis: -1, chest: -2, head: 0, armN: [DL_GRIP_X, 150], armF: [0, 1], bellRot: 0 }, dur: 1.0, hold: 0.45, stop: true },
    { pose: { ...FEET, hip: [X - 33, 165], pelvis: 56, chest: 52, head: 30, armN: [DL_GRIP_X, GROUND - 31.6], armF: [0, 1], bellRot: 0 }, dur: 0.85, hold: 0.35, stop: true },
  ],
};

/* ---------------------------------------------------------- bent-over row
   Hinged, flat back, the bell hanging under the shoulder; the elbow drives
   back and the bell rows to the hip. */
// The free hand braces on the far knee.
const ROW_BASE = { ...FEET, hip: [X - 22, 0] as V, shin: 7, pelvis: 52, chest: 50, head: 32, bellRot: 0, armF: [X + 6, 176] as V, wristF: 30 };
export const ROW: MoveDef = {
  label: "Bent-over row",
  cfg: { armN: "world", armF: "point", grip: "bar" },
  still: 0.5,
  keys: [
    { pose: { ...ROW_BASE, armN: [0, 1] }, dur: 0.7, hold: 0.35, stop: true, handF: "relaxed" },
    { pose: { ...ROW_BASE, armN: [-38, 0.44] }, dur: 0.95, hold: 0.4, stop: true, handF: "relaxed" },
  ],
};

/* --------------------------------------------------------- reverse lunge
   Goblet hold. Step back onto the ball of the foot and sink until the back
   knee hovers over the floor: front shin near vertical, torso tall. */
const LG = { armN: [74, 0.3] as V, armF: [74, 0.3] as V, bellRot: 0 };
export const LUNGE: MoveDef = {
  label: "Reverse lunge",
  cfg: { armN: "torso", armF: "torso", grip: "horns" },
  still: 0.55,
  keys: [
    { pose: { ...LG, ankleN: [X, AY], ankleF: [X - 3, AY], hip: [X + 2, HIP_Y], pelvis: 0, chest: -1, head: 0, footF: 0 }, dur: 0.5, hold: 0.45, stop: true, order: "over" },
    { pose: { ...LG, ankleN: [X, AY], ankleF: [X - 42, AY - 14], hip: [X - 10, HIP_Y + 10], pelvis: 4, chest: 1, head: 0, footF: 22 }, dur: 0.5, order: "over" },
    { pose: { ...LG, ankleN: [X, AY], ankleF: [X - 80, AY - 5], hip: [X - 36, GROUND - 50], pelvis: 6, chest: 2, head: 0, footF: 52 }, dur: 1.05, hold: 0.35, stop: true, order: "over" },
  ],
};

/* ----------------------------------------------------------------- halo
   Bell held bottom-up by the horns, circled around the head at head height:
   in front of the face, past the ear, behind the head, and round again. */
const HALO_BASE = { ...TALL, chest: -2, armF: [0, 1] as V, bellRot: 180 };
export const HALO: MoveDef = {
  label: "Halo",
  cfg: { armN: "point", armF: "world", grip: "horns" },
  still: 0,
  extra: "orbit",
  keys: [
    { pose: { ...HALO_BASE, armN: [X + 25, 80], bell: 1, head: 2 }, dur: 0.55, order: "over" },
    { pose: { ...HALO_BASE, armN: [X + 6, 74], bell: 1.03, head: 0 }, dur: 0.55, order: "over" },
    { pose: { ...HALO_BASE, armN: [X - 16, 78], bell: 0.97, head: 6 }, dur: 0.55, order: "behind" },
    { pose: { ...HALO_BASE, armN: [X + 4, 74], bell: 0.93, head: 2 }, dur: 0.55, order: "behind" },
  ],
};

/* ------------------------------------------------------------ breathing
   Seated on the heels, hands resting on the thighs. A slow nasal breath:
   the belly, then the chest, rise; a longer exhale. */
const BR = {
  hip: [X - 14, GROUND - 21] as V,
  pelvis: -4,
  ankleN: [X - 15, GROUND - 6] as V,
  ankleF: [X - 18, GROUND - 6] as V,
  footN: 172,
  footF: 172,
  farOff: [-3, -0.6] as V,
  armN: [X + 16, 199] as V,
  armF: [X + 13, 199] as V,
  wristN: -6,
  wristF: -6,
};
export const BREATHING: MoveDef = {
  label: "Breathing",
  cfg: { armN: "point", armF: "point", grip: "none" },
  still: 0.5,
  extra: "breath",
  view: [26, 70, 172],
  keys: [
    { pose: { ...BR, chest: -2, head: 2, breath: 0 }, dur: 4, hold: 0.6, stop: true, handN: "relaxed", handF: "relaxed" },
    { pose: { ...BR, chest: -4.5, head: 0, breath: 1 }, dur: 4.6, hold: 0.8, stop: true, handN: "relaxed", handF: "relaxed" },
  ],
};

/* -------------------------------------------------------------- walking
   A loaded carry: a suitcase-hold bell at the side, an easy walk in place
   (heel strike, roll through, toe off), the free arm swinging opposite. */
const WK = { pelvis: 1, chest: 0, head: 0, farOff: [-3, -0.6] as V, bellRot: 0, armN: [3, 0.98] as V };
export const WALKING: MoveDef = {
  label: "Walking",
  cfg: { armN: "world", armF: "world", grip: "bar" },
  still: 0,
  keys: [
    { pose: { ...WK, hip: [X, HIP_Y + 4.5], ankleN: [X + 26, AY - 1.6], footN: -14, ankleF: [X - 26, AY - 6.5], footF: 26, armF: [22, 0.95] }, dur: 0.28, handF: "relaxed" },
    { pose: { ...WK, hip: [X, HIP_Y - 0.4], ankleN: [X + 1, AY], footN: 0, ankleF: [X + 2, AY - 12], footF: 16, armF: [2, 0.96], armN: [1, 0.98] }, dur: 0.28, handF: "relaxed" },
    { pose: { ...WK, hip: [X, HIP_Y + 4.5], ankleF: [X + 26, AY - 1.6], footF: -14, ankleN: [X - 26, AY - 6.5], footN: 26, armF: [-20, 0.95], armN: [5, 0.98] }, dur: 0.28, handF: "relaxed" },
    { pose: { ...WK, hip: [X, HIP_Y - 0.4], ankleF: [X + 1, AY], footF: 0, ankleN: [X + 2, AY - 12], footN: 16, armF: [2, 0.96], armN: [1, 0.98] }, dur: 0.28, handF: "relaxed" },
  ],
};

export type MoveName =
  | "swing"
  | "clean"
  | "press"
  | "snatch"
  | "getup"
  | "squat"
  | "lunge"
  | "row"
  | "deadlift"
  | "halo"
  | "breathing"
  | "walking";

export const MOVES: Record<MoveName, MoveDef> = {
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
  walking: WALKING,
};

export const STUDY_MOVES = { swing: SWING, getup: GETUP, squat: GOBLET_SQUAT } as const;
