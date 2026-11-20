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
  label: "Kettlebell swing",
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

export const STUDY_MOVES = { swing: SWING, getup: GETUP, squat: GOBLET_SQUAT } as const;
