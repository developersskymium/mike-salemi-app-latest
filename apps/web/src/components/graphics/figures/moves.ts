import type { Key, Pose } from "./skeleton";

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

export interface Move {
  label: string;
  /** Loop length in seconds. */
  dur: number;
  keys: Key[];
  /** Index of the key that reads best as a still. */
  still: number;
  /** Faint accent extras: the halo's orbit or the breath ring. */
  extra?: "orbit" | "breath";
  /** The bell's path as a dotted accent trace (hand-drawn, in figure space). */
  trace?: string;
}

/* --- shared poses -------------------------------------------------------- */

const FEET = { foot: [52, 91.6] as const, footFar: [47, 91.6] as const, knee: -1 as const };
const STAND_HIP = [50.5, 58.3] as const;

const stand: Pose = { hip: STAND_HIP, trunk: 0, hand: [51, 58], elbow: -1, ...FEET };

/* Swing family: two hands on the bell. */
const hike: Pose = {
  hip: [36.5, 64.5],
  trunk: 62,
  head: -22,
  hand: [45, 73],
  elbow: -1,
  ...FEET,
  bell: { follow: 1 },
};
const drive: Pose = {
  hip: [45, 60.5],
  trunk: 24,
  head: -10,
  hand: [65, 63],
  elbow: -1,
  ...FEET,
  bell: { follow: 1 },
};
const float: Pose = {
  hip: STAND_HIP,
  trunk: -4,
  head: 3,
  hand: [74, 37.5],
  elbow: -1,
  ...FEET,
  bell: { follow: 1 },
};

/* Single-arm family: far arm relaxed at the side. */
const FAR_HANG = { handFar: [52.5, 57.5] as const, elbowFar: -1 as const };
const rack: Pose = {
  hip: STAND_HIP,
  trunk: -3,
  head: 4,
  hand: [54, 33.5],
  elbow: 1,
  ...FAR_HANG,
  ...FEET,
  bell: { rot: -8 },
};
const lockout: Pose = {
  hip: STAND_HIP,
  trunk: -3,
  head: 26,
  hand: [46.4, 11.6],
  elbow: -1,
  ...FAR_HANG,
  ...FEET,
  bell: { rot: 174 },
};

/* Goblet hold: both hands on the horns, bell against the chest. */
const gobletStand: Pose = { ...stand, hand: [57, 41], elbow: 1, bell: { rot: 0 } };

/** Cross-legged seat; t = 0 exhaled, 1 inhaled. */
function seated(t: number): Pose {
  return {
    hip: [42, 89.2],
    trunk: -1 - t * 2,
    head: 4 - t * 7,
    lift: 1 + t * 0.04,
    hand: [49.6, 79.5 - t * 0.8],
    elbow: 1,
    handFar: [48.6, 80.5 - t * 0.8],
    elbowFar: 1,
    foot: [43, 91.8],
    knee: -1,
    footFar: [47.5, 91.4],
    kneeFar: -1,
    toe: 0,
    toeFar: 6,
  };
}

/* Turkish get-up stations, bell arm vertical throughout. */
const TGU = {
  lie: {
    hip: [64, 89.4],
    trunk: -90,
    head: 0,
    hand: [39.2, 64],
    elbow: 1,
    handFar: [17, 91.8],
    elbowFar: 1,
    foot: [76, 91.6],
    knee: -1,
    footFar: [97.5, 91.8],
    kneeFar: 1,
    toeFar: -84,
    bell: { rot: 180 },
  } satisfies Pose,
  elbow: {
    hip: [64, 89.4],
    trunk: -60,
    head: 14,
    hand: [42.6, 52],
    elbow: 1,
    handFar: [30, 91.8],
    elbowFar: 1,
    foot: [76, 91.6],
    knee: -1,
    footFar: [97.5, 91.8],
    kneeFar: 1,
    toeFar: -84,
    bell: { rot: 180 },
  } satisfies Pose,
  sit: {
    hip: [62.5, 89.2],
    trunk: -22,
    head: 16,
    hand: [53.6, 41],
    elbow: 1,
    handFar: [43, 91.8],
    elbowFar: 1,
    foot: [76, 91.6],
    knee: -1,
    footFar: [95, 91.8],
    kneeFar: 1,
    toeFar: -84,
    bell: { rot: 180 },
  } satisfies Pose,
  kneel: {
    hip: [55, 74.6],
    trunk: -2,
    head: 26,
    hand: [52.4, 27.8],
    elbow: 1,
    handFar: [55.5, 74],
    elbowFar: -1,
    foot: [69, 91.6],
    knee: -1,
    footFar: [38, 91.6],
    kneeFar: 1,
    toeFar: 180,
    bell: { rot: 180 },
  } satisfies Pose,
  stand: {
    hip: [55, 58.3],
    trunk: -2,
    head: 26,
    hand: [52.2, 11.4],
    elbow: 1,
    handFar: [56, 57.6],
    elbowFar: -1,
    foot: [57, 91.6],
    footFar: [52, 91.6],
    knee: -1,
    bell: { rot: 180 },
  } satisfies Pose,
};

const lungeBottom: Pose = {
  hip: [46.5, 75.5],
  trunk: 0,
  head: 0,
  hand: [54, 52.5],
  elbow: 1,
  foot: [62, 91.6],
  knee: -1,
  footFar: [29, 87.5],
  kneeFar: 1,
  toeFar: 62,
  bell: { rot: 0 },
};
const lungeMid: Pose = {
  ...gobletStand,
  hip: [48.5, 63],
  hand: [56, 45],
  foot: [57, 91.6],
  footFar: [38, 86],
  kneeFar: -1,
  toeFar: 30,
};

const rowDown: Pose = {
  hip: [38.5, 61],
  trunk: 72,
  head: -30,
  hand: [62.5, 77],
  elbow: -1,
  handFar: [64.5, 75],
  elbowFar: -1,
  ...FEET,
  bell: { rot: 0 },
};
const rowUp: Pose = { ...rowDown, hand: [53, 63.5], elbow: 1 };

const dlBottom: Pose = {
  hip: [38.5, 67],
  trunk: 54,
  head: -30,
  hand: [57.4, 76.4],
  elbow: -1,
  ...FEET,
  bell: { rot: 0 },
};
const dlTop: Pose = { ...stand, trunk: -1, hand: [53.5, 57.6], bell: { rot: 0 } };

const squatBottom: Pose = {
  hip: [43.5, 80.5],
  trunk: 22,
  head: -18,
  hand: [62, 60],
  elbow: 1,
  ...FEET,
  bell: { rot: 0 },
};

const pressMid: Pose = { ...rack, hand: [56, 25], elbow: 1, head: 8, bell: { rot: 120 } };

/* --- moves --------------------------------------------------------------- */

export const MOVES: Record<MoveName, Move> = {
  swing: {
    label: "Swing",
    dur: 2.2,
    still: 2,
    trace: "M40 82C60 88 80 70 84.6 38.5",
    keys: [
      { at: 0, pose: hike },
      { at: 0.24, pose: drive },
      { at: 0.46, pose: float },
      { at: 0.54, pose: float },
      { at: 0.76, pose: drive },
    ],
  },
  clean: {
    label: "Clean",
    dur: 3,
    still: 2,
    keys: [
      { at: 0, pose: { ...hike, handFar: [58, 76], elbowFar: -1 } },
      { at: 0.24, pose: { ...drive, hand: [60, 56], elbow: 1, handFar: [56, 60], elbowFar: -1, bell: { rot: 8, follow: 0.4 } } },
      { at: 0.4, pose: rack },
      { at: 0.7, pose: rack },
    ],
  },
  press: {
    label: "Press",
    dur: 3.2,
    still: 3,
    keys: [
      { at: 0, pose: rack },
      { at: 0.16, pose: rack },
      { at: 0.32, pose: pressMid },
      { at: 0.5, pose: lockout },
      { at: 0.7, pose: lockout },
      { at: 0.86, pose: pressMid },
    ],
  },
  snatch: {
    label: "Snatch",
    dur: 3,
    still: 3,
    trace: "M40 82C62 88 78 66 70 40S56 8 48 1",
    keys: [
      { at: 0, pose: { ...hike, handFar: [58, 76], elbowFar: -1 } },
      { at: 0.2, pose: { ...drive, handFar: [56, 60], elbowFar: -1 } },
      { at: 0.34, pose: { ...float, hand: [62, 28], elbow: 1, ...FAR_HANG, head: 6, bell: { rot: 120, follow: 0.2 } } },
      { at: 0.46, pose: lockout },
      { at: 0.66, pose: lockout },
      { at: 0.82, pose: { ...float, ...FAR_HANG } },
    ],
  },
  getup: {
    label: "Turkish get-up",
    dur: 10,
    still: 3,
    keys: [
      { at: 0, pose: TGU.lie },
      { at: 0.14, pose: TGU.elbow },
      { at: 0.28, pose: TGU.sit },
      { at: 0.46, pose: TGU.kneel },
      { at: 0.6, pose: TGU.stand },
      { at: 0.7, pose: TGU.stand },
      { at: 0.84, pose: TGU.kneel },
      { at: 0.93, pose: TGU.sit },
    ],
  },
  squat: {
    label: "Goblet squat",
    dur: 3,
    still: 2,
    keys: [
      { at: 0, pose: gobletStand },
      { at: 0.12, pose: gobletStand },
      { at: 0.48, pose: squatBottom },
      { at: 0.6, pose: squatBottom },
    ],
  },
  lunge: {
    label: "Reverse lunge",
    dur: 3.4,
    still: 3,
    keys: [
      { at: 0, pose: gobletStand },
      { at: 0.1, pose: gobletStand },
      { at: 0.28, pose: lungeMid },
      { at: 0.5, pose: lungeBottom },
      { at: 0.64, pose: lungeBottom },
      { at: 0.84, pose: lungeMid },
    ],
  },
  row: {
    label: "Bent-over row",
    dur: 2.6,
    still: 2,
    keys: [
      { at: 0, pose: rowDown },
      { at: 0.12, pose: rowDown },
      { at: 0.46, pose: rowUp },
      { at: 0.6, pose: rowUp },
    ],
  },
  deadlift: {
    label: "Deadlift",
    dur: 3,
    still: 0,
    keys: [
      { at: 0, pose: dlBottom },
      { at: 0.1, pose: dlBottom },
      { at: 0.46, pose: dlTop },
      { at: 0.6, pose: dlTop },
    ],
  },
  halo: {
    label: "Halo",
    dur: 3.6,
    still: 0,
    extra: "orbit",
    keys: [
      { at: 0, pose: { ...stand, hand: [65, 36], elbow: 1, bell: { rot: 180, opacity: 1 } } },
      { at: 0.12, pose: { ...stand, hand: [65, 36], elbow: 1, bell: { rot: 180, opacity: 1 } } },
      { at: 0.3, pose: { ...stand, hand: [53, 35], elbow: 1, bell: { rot: 180, opacity: 0.15 } } },
      { at: 0.5, pose: { ...stand, hand: [38, 36], elbow: 1, bell: { rot: 180, opacity: 0 } } },
      { at: 0.62, pose: { ...stand, hand: [38, 36], elbow: 1, bell: { rot: 180, opacity: 0 } } },
      { at: 0.8, pose: { ...stand, hand: [53, 35], elbow: 1, bell: { rot: 180, opacity: 0.15 } } },
    ],
  },
  breathing: {
    label: "Breathing",
    dur: 10,
    still: 0,
    extra: "breath",
    keys: [
      { at: 0, pose: seated(0) },
      { at: 0.4, pose: seated(1) },
    ],
  },
  walking: {
    label: "Walking",
    dur: 1.3,
    still: 0,
    keys: [
      {
        at: 0,
        pose: {
          hip: [50, 59.2],
          trunk: 3,
          hand: [43, 78],
          elbow: -1,
          handFar: [61, 77],
          elbowFar: 1,
          foot: [62, 91.4],
          knee: -1,
          footFar: [38, 88.4],
          toe: -14,
          toeFar: 38,
        },
      },
      {
        at: 0.25,
        pose: {
          hip: [50, 57.8],
          trunk: 3,
          hand: [50, 82],
          elbow: -1,
          handFar: [53, 82],
          elbowFar: 1,
          foot: [50, 91.6],
          knee: -1,
          footFar: [52, 83.5],
          toe: 4,
          toeFar: 22,
        },
      },
      {
        at: 0.5,
        pose: {
          hip: [50, 59.2],
          trunk: 3,
          hand: [61, 77],
          elbow: 1,
          handFar: [43, 78],
          elbowFar: -1,
          foot: [38, 88.4],
          knee: -1,
          footFar: [62, 91.4],
          toe: 38,
          toeFar: -14,
        },
      },
      {
        at: 0.75,
        pose: {
          hip: [50, 57.8],
          trunk: 3,
          hand: [53, 82],
          elbow: 1,
          handFar: [50, 82],
          elbowFar: -1,
          foot: [52, 83.5],
          knee: -1,
          footFar: [50, 91.6],
          toe: 22,
          toeFar: 4,
        },
      },
    ],
  },
};
