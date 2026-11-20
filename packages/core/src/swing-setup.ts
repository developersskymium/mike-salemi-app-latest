/**
 * Swing Set-Up Coach (spec 13): pure geometry over pose landmarks, step scoring, the one-fix
 * priority and Mike's cues. Platform-neutral: the web app feeds it MediaPipe PoseLandmarker output
 * (33 normalised points); the phone apps can feed it the same shape later.
 *
 * Coordinates are normalised image coordinates (x right, y down, 0–1). Angles are measured in a
 * square space, so every function takes the frame's aspect ratio (width / height).
 * Every pass range is a DRAFT from the source plan, awaiting Mike's sign-off.
 */

export interface PosePoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}
export type Pose = PosePoint[];

/** MediaPipe pose landmark indices we use. */
export const LM = {
  nose: 0,
  ear: { left: 7, right: 8 },
  shoulder: { left: 11, right: 12 },
  hip: { left: 23, right: 24 },
  knee: { left: 25, right: 26 },
  ankle: { left: 27, right: 28 },
  toe: { left: 31, right: 32 },
} as const;

export type Side = "left" | "right";
export type CheckStatus = "good" | "adjust" | "cant";
export type StepStatus = CheckStatus | "self";

/** Minimum landmark visibility for a measure to count. Below it: "can't see it". */
export const VIS_MIN = 0.6;
/** Apparent shoulder width ÷ torso length above which the camera is not side-on. */
export const SIDE_ON_MAX = 0.4;

/* ------------------------------------------------------------------ geometry */

interface V { x: number; y: number }
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v: V) => Math.hypot(v.x, v.y);
const deg = (r: number) => (r * 180) / Math.PI;
const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** The named body points of one side, in square space with y UP and the member facing +x. */
export interface SidePoints {
  ear: V;
  nose: V;
  shoulder: V;
  hip: V;
  knee: V;
  ankle: V;
  toe: V;
}

const vis = (p: PosePoint | undefined) => (p ? (p.visibility ?? 1) : 0);

/** The side of the body nearer the camera: the one whose points the model sees best. */
export function nearSide(pose: Pose): Side {
  const score = (s: Side) =>
    [LM.ear[s], LM.shoulder[s], LM.hip[s], LM.knee[s], LM.ankle[s]].reduce((t, i) => t + vis(pose[i]), 0);
  return score("left") >= score("right") ? "left" : "right";
}

/** Facing direction in the image: +1 when the nose is to the right of the ear. */
export function facing(pose: Pose, side: Side): 1 | -1 {
  const nose = pose[LM.nose];
  const ear = pose[LM.ear[side]];
  if (!nose || !ear) return 1;
  return nose.x >= ear.x ? 1 : -1;
}

/** Converts one side to square space, y up, facing +x (so angles keep one sign convention). */
export function sidePoints(pose: Pose, aspect: number, side: Side = nearSide(pose)): SidePoints {
  const f = facing(pose, side);
  const at = (i: number): V => {
    const p = pose[i] ?? { x: 0, y: 0 };
    return { x: p.x * aspect * f, y: -p.y };
  };
  return {
    ear: at(LM.ear[side]),
    nose: at(LM.nose),
    shoulder: at(LM.shoulder[side]),
    hip: at(LM.hip[side]),
    knee: at(LM.knee[side]),
    ankle: at(LM.ankle[side]),
    toe: at(LM.toe[side]),
  };
}

/** Signed angle (degrees) from vector a to vector b, counter-clockwise positive. */
export function signedAngle(a: V, b: V): number {
  return deg(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y));
}

/** Shin angle against vertical (degrees, 0 = vertical). */
export function shinAngle(p: SidePoints): number {
  const v = sub(p.knee, p.ankle);
  return deg(Math.atan2(Math.abs(v.x), Math.abs(v.y)));
}

/**
 * Where the hip sits between knee (0) and shoulder (1) height. Mike: "hips above knees, below
 * shoulders". Below 0 = hips at or below the knees; above 1 = hips above the shoulders.
 */
export function hipHeight(p: SidePoints): number {
  const span = p.shoulder.y - p.knee.y;
  if (Math.abs(span) < 1e-6) return 0;
  return (p.hip.y - p.knee.y) / span;
}

/** Torso length (hip to shoulder) — the member's unit of measure. */
export const torsoLength = (p: SidePoints) => len(sub(p.shoulder, p.hip));

/**
 * Head angle against the torso line (degrees): the shoulder→ear line compared with the
 * hip→shoulder line. Positive = head lifted (toward the "broken neck"), negative = head dropped.
 */
export function rawHeadAngle(p: SidePoints): number {
  return signedAngle(sub(p.shoulder, p.hip), sub(p.ear, p.shoulder));
}

/** Shoulder-to-ear gap in torso lengths. */
export const shoulderEarGap = (p: SidePoints) => len(sub(p.ear, p.shoulder)) / (torsoLength(p) || 1);

/**
 * How far the shoulder sits above the straight hip→ear line, in torso lengths. With only these
 * three points it mirrors the head angle, so v1 does not score the back on it (kept for the
 * body-outline version of the stick test).
 */
export function backBulge(p: SidePoints): number {
  const line = sub(p.ear, p.hip);
  const l = len(line) || 1;
  const s = sub(p.shoulder, p.hip);
  return (line.x * s.y - line.y * s.x) / l / (torsoLength(p) || 1);
}

/** Apparent shoulder width ÷ torso length: small when the camera is truly side-on. */
export function sideOnRatio(pose: Pose, aspect: number): number {
  const l = pose[LM.shoulder.left];
  const r = pose[LM.shoulder.right];
  if (!l || !r) return 1;
  const p = sidePoints(pose, aspect);
  return (Math.abs(l.x - r.x) * aspect) / (torsoLength(p) || 1);
}

/* ------------------------------------------------------------------ framing */

export interface Framing {
  /** Every point we need is inside the frame. */
  inFrame: boolean;
  /** The camera is side-on (shoulders overlap). */
  sideOn: boolean;
  /** Mean visibility of the near-side points. */
  visibility: number;
  side: Side;
  ok: boolean;
  hint: string | null;
}

const NEED = (s: Side) => [LM.nose, LM.ear[s], LM.shoulder[s], LM.hip[s], LM.knee[s], LM.ankle[s]];

/** Placement guide: is the whole body in frame, seen clearly and side-on? */
export function framing(pose: Pose | null | undefined, aspect: number): Framing {
  if (!pose || pose.length < 33) return { inFrame: false, sideOn: false, visibility: 0, side: "left", ok: false, hint: "Step into the frame, side-on to the phone." };
  const side = nearSide(pose);
  const pts = NEED(side).map((i) => pose[i]!);
  const inFrame = pts.every((p) => p.x > 0.02 && p.x < 0.98 && p.y > 0.02 && p.y < 0.98);
  const visibility = pts.reduce((t, p) => t + vis(p), 0) / pts.length;
  const sideOn = sideOnRatio(pose, aspect) <= SIDE_ON_MAX;
  const hint = !inFrame
    ? "Move the phone back until your head and feet are both in the frame."
    : visibility < VIS_MIN
      ? "More light, and fitted clothes if you can. The camera can't see you clearly."
      : !sideOn
        ? "Turn side-on to the phone, so one shoulder hides the other."
        : null;
  return { inFrame, sideOn, visibility: round3(visibility), side, ok: inFrame && sideOn && visibility >= VIS_MIN, hint };
}

/* ------------------------------------------------------------------ steadiest frames */

/** Mean movement of the near-side points between two poses (normalised units). */
export function motion(a: Pose, b: Pose, side: Side): number {
  const idx = NEED(side);
  return idx.reduce((t, i) => t + Math.hypot((a[i]?.x ?? 0) - (b[i]?.x ?? 0), (a[i]?.y ?? 0) - (b[i]?.y ?? 0)), 0) / idx.length;
}

/** Point-wise median of several poses (robust to a jittery frame). */
export function medianPose(poses: Pose[]): Pose {
  if (!poses.length) return [];
  const med = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
  };
  return poses[0]!.map((_, i) => ({
    x: med(poses.map((p) => p[i]?.x ?? 0)),
    y: med(poses.map((p) => p[i]?.y ?? 0)),
    z: med(poses.map((p) => p[i]?.z ?? 0)),
    visibility: med(poses.map((p) => p[i]?.visibility ?? 0)),
  }));
}

/** The steadiest run of `n` consecutive frames, merged into one pose. */
export function steadiestPose(frames: Pose[], n = 8): { pose: Pose; motion: number } | null {
  const usable = frames.filter((f) => f.length >= 33);
  if (!usable.length) return null;
  if (usable.length <= n) return { pose: medianPose(usable), motion: 0 };
  const side = nearSide(usable[0]!);
  const step = usable.slice(1).map((f, i) => motion(usable[i]!, f, side));
  let best = 0;
  let bestScore = Infinity;
  for (let s = 0; s + n <= usable.length; s++) {
    const m = step.slice(s, s + n - 1).reduce((a, b) => a + b, 0);
    if (m < bestScore) {
      bestScore = m;
      best = s;
    }
  }
  return { pose: medianPose(usable.slice(best, best + n)), motion: round3(bestScore / (n - 1)) };
}

/* ------------------------------------------------------------------ measures + scoring */

export type SwingStepId = "feet" | "hips" | "back" | "shoulders" | "head" | "grip" | "breath";
export const SWING_STEPS: { id: SwingStepId; n: number; title: string; measured: boolean }[] = [
  { id: "feet", n: 1, title: "Feet", measured: false },
  { id: "hips", n: 2, title: "Hips", measured: true },
  { id: "back", n: 3, title: "Back", measured: true },
  { id: "shoulders", n: 4, title: "Shoulders", measured: true },
  { id: "head", n: 5, title: "Head and neck", measured: true },
  { id: "grip", n: 6, title: "Grip", measured: false },
  { id: "breath", n: 7, title: "Breath", measured: false },
];

/** Standing-tall calibration (2 s before the set-up). */
export interface Calibration {
  torso: number;
  gap: number;
  head: number;
}

export function calibrate(pose: Pose, aspect: number): Calibration | null {
  const f = framing(pose, aspect);
  if (!f.ok) return null;
  const p = sidePoints(pose, aspect, f.side);
  return { torso: round3(torsoLength(p)), gap: round3(shoulderEarGap(p)), head: round1(rawHeadAngle(p)) };
}

/** The member's answer to the one Step 1 question the camera can't measure yet. */
export type BellDistance = "ok" | "far" | "near" | "unsure";

export interface SetupInput {
  pose: Pose;
  aspect: number;
  calibration: Calibration | null;
  neckHistory: boolean;
  bellDistance?: BellDistance;
}

export interface Measures {
  side: Side;
  sideOn: number;
  visibility: number;
  shin: number | null;
  hip: number | null;
  head: number | null;
  torsoRatio: number | null;
  gapRatio: number | null;
  calibrated: boolean;
}

export type FaultId =
  | "back_rounding"
  | "broken_neck"
  | "bell_far"
  | "squat_pattern"
  | "shoulders_hiked"
  | "hips_high"
  | "head_down"
  | "head_high"
  | "shin_tilt"
  | "bell_near";

/** Mike's priority (protect the spine, then bending force, then loading the hips, then the finer points). */
export const FAULT_PRIORITY: FaultId[] = [
  "back_rounding",
  "broken_neck",
  "bell_far",
  "squat_pattern",
  "shoulders_hiked",
  "hips_high",
  "shin_tilt",
  "head_high",
  "head_down",
  "bell_near",
];

export interface CheckResult {
  status: CheckStatus;
  value: number | null;
  fault?: FaultId;
  /** Medium-confidence measures are labelled as such. */
  confidence: "high" | "medium";
}

export interface SetupAssessment {
  measures: Measures;
  checks: { shin: CheckResult; hip: CheckResult; back: CheckResult; shoulders: CheckResult; head: CheckResult };
  steps: Record<SwingStepId, StepStatus>;
  faults: FaultId[];
  mainFault: FaultId | null;
  /** Overlay points (normalised image coords) for the 4-line drawing; never the 33 raw points. */
  overlay: Record<"ear" | "shoulder" | "hip" | "knee" | "ankle", { x: number; y: number }> | null;
}

const ok = (pose: Pose, idx: number[]) => idx.every((i) => vis(pose[i]) >= VIS_MIN);
const cant = (confidence: "high" | "medium" = "high"): CheckResult => ({ status: "cant", value: null, confidence });

/** Measures one held set-up and scores the camera-checked steps. */
export function assessSetup(input: SetupInput): SetupAssessment {
  const { pose, aspect, calibration: cal, neckHistory } = input;
  const f = framing(pose, aspect);
  const s = f.side;
  const p = sidePoints(pose, aspect, s);
  const usable = f.inFrame && f.sideOn;

  // Step 2: shin angle
  let shin: CheckResult = cant();
  if (usable && ok(pose, [LM.knee[s], LM.ankle[s]])) {
    const a = round1(shinAngle(p));
    shin = { value: a, confidence: "high", status: a < 10 ? "good" : "adjust", fault: a > 20 ? "squat_pattern" : a >= 10 ? "shin_tilt" : undefined };
  }
  // Step 2: hip height between knee and shoulder
  let hip: CheckResult = cant();
  if (usable && ok(pose, [LM.shoulder[s], LM.hip[s], LM.knee[s]])) {
    const r = round3(hipHeight(p));
    hip = { value: r, confidence: "high", status: r > 0.05 && r < 0.95 ? "good" : "adjust", fault: r <= 0.05 ? "squat_pattern" : r >= 0.95 ? "hips_high" : undefined };
  }
  // Step 5: head vs torso line, relative to the standing-tall neutral when calibrated
  let head: CheckResult = cant("medium");
  if (usable && ok(pose, [LM.ear[s], LM.shoulder[s], LM.hip[s]])) {
    const a = round1(rawHeadAngle(p) - (cal?.head ?? 0));
    const top = neckHistory ? 5 : 15;
    const fault: FaultId | undefined = a > 25 ? (neckHistory ? "head_high" : "broken_neck") : a > top ? "head_high" : a < -10 ? "head_down" : undefined;
    head = { value: a, confidence: "medium", status: fault ? "adjust" : "good", fault };
  }
  // Step 3: back line. With three side-on points (hip, shoulder, ear) the only straight-line signal
  // that is not the head angle is spinal flexion: a rounding back shortens hip→shoulder against
  // the standing-tall torso. Medium confidence; needs the calibration.
  let back: CheckResult = cant("medium");
  let torsoRatio: number | null = null;
  if (usable && cal && ok(pose, [LM.shoulder[s], LM.hip[s]])) {
    torsoRatio = round3(torsoLength(p) / (cal.torso || 1));
    back = { value: torsoRatio, confidence: "medium", status: torsoRatio >= 0.93 ? "good" : "adjust", fault: torsoRatio < 0.88 ? "back_rounding" : undefined };
  }
  // Step 4: shoulder-to-ear gap vs standing (needs the calibration)
  let shoulders: CheckResult = cant("medium");
  let gapRatio: number | null = null;
  if (usable && cal && ok(pose, [LM.ear[s], LM.shoulder[s], LM.hip[s]])) {
    gapRatio = round3(shoulderEarGap(p) / (cal.gap || 1));
    shoulders = { value: gapRatio, confidence: "medium", status: gapRatio >= 0.9 ? "good" : "adjust", fault: gapRatio < 0.8 ? "shoulders_hiked" : undefined };
  }

  const bellFault: FaultId | undefined = input.bellDistance === "far" ? "bell_far" : input.bellDistance === "near" ? "bell_near" : undefined;
  const worst = (...cs: CheckResult[]): CheckStatus => (cs.some((c) => c.status === "adjust") ? "adjust" : cs.some((c) => c.status === "cant") ? "cant" : "good");
  const steps: Record<SwingStepId, StepStatus> = {
    feet: bellFault ? "adjust" : "self",
    hips: worst(shin, hip),
    back: back.status,
    shoulders: shoulders.status,
    head: head.status,
    grip: "self",
    breath: "self",
  };
  const found = new Set<FaultId>([shin.fault, hip.fault, head.fault, back.fault, shoulders.fault, bellFault].filter((x): x is FaultId => !!x));
  const faults = FAULT_PRIORITY.filter((x) => found.has(x));
  const raw = (i: number) => ({ x: round3(pose[i]?.x ?? 0), y: round3(pose[i]?.y ?? 0) });
  return {
    measures: {
      side: s,
      sideOn: round3(sideOnRatio(pose, aspect)),
      visibility: f.visibility,
      shin: shin.value,
      hip: hip.value,
      head: head.value,
      torsoRatio,
      gapRatio,
      calibrated: !!cal,
    },
    checks: { shin, hip, back, shoulders, head },
    steps,
    faults,
    mainFault: faults[0] ?? null,
    overlay: usable ? { ear: raw(LM.ear[s]), shoulder: raw(LM.shoulder[s]), hip: raw(LM.hip[s]), knee: raw(LM.knee[s]), ankle: raw(LM.ankle[s]) } : null,
  };
}

/** Numeric step score for the trend (good 2, adjust 1; self-checks and "can't see" are gaps). */
export const stepScore = (s: StepStatus | undefined): number | null => (s === "good" ? 2 : s === "adjust" ? 1 : null);

/* ------------------------------------------------------------------ Mike's words + clips */

/**
 * Mike's cues. Every `cue` is copied word for word from the source plan's quotes of the ebook and
 * videos (docs/specs/13-swing-setup-coach-source-plan.md); `why` and `do` are our plain-language
 * framing. Clip times are DRAFTS from an 8-second frame scan until the videos are transcribed.
 */
export interface SwingClip {
  step: SwingStepId;
  /** Vimeo id of the lesson video. */
  video: string;
  start: number;
  label: string;
}

export interface SwingFix {
  fault: FaultId;
  step: SwingStepId;
  title: string;
  cue: string;
  why: string;
  do: string;
  clip: SwingClip;
}

export const STEP_VIDEO: Record<SwingStepId, string> = {
  feet: "346142396",
  hips: "346133895",
  back: "346125535",
  shoulders: "346121569",
  head: "346115972",
  grip: "346106161",
  breath: "346098901",
};

const clip = (step: SwingStepId, start: number, label: string): SwingClip => ({ step, video: STEP_VIDEO[step], start, label });

export const SWING_FIXES: Record<FaultId, Omit<SwingFix, "fault">> = {
  back_rounding: {
    step: "back",
    title: "Your back is rounding",
    cue: "Long from crown to tailbone",
    why: "Your spine is the beam the bell hangs from. A rounded back leaks the force and loads the spine instead of the hips.",
    do: "Picture a stick along your back touching three points: head, mid-back, tailbone. Keep all three on it as you hinge.",
    clip: clip("back", 24, "Stick demo with Dr. Drew, side view"),
  },
  broken_neck: {
    step: "head",
    title: "Your head is cranked up",
    cue: "avoid the \"broken neck\"",
    why: "Looking up past the horizon bends the neck at the top of a straight back.",
    do: "Bring your chin back in line with your back. Neutral, or only slightly up.",
    clip: clip("head", 16, "Head down, neutral, slight lift, broken neck"),
  },
  bell_far: {
    step: "feet",
    title: "The bell is too far away",
    cue: "bell 0.5–1.5 ft from the toes",
    why: "A bell far in front puts bending force on your spine before the first hike.",
    do: "Set the bell about a foot in front of your toes. The heavier the bell, the closer it sits.",
    clip: clip("feet", 288, "Set-up with the bell"),
  },
  bell_near: {
    step: "feet",
    title: "The bell is very close",
    cue: "bell 0.5–1.5 ft from the toes",
    why: "Too close and you can't hike it back into the swing; you'll lift it straight up.",
    do: "Give the bell a little room: about a foot in front of your toes.",
    clip: clip("feet", 288, "Set-up with the bell"),
  },
  squat_pattern: {
    step: "hips",
    title: "You're squatting, not hinging",
    cue: "Back, then down",
    why: "Tilted shins and low hips turn the swing into a squat, and the hips stop doing the work.",
    do: "Send the hips back first, then bend the knees only as much as you need. Shins near vertical.",
    clip: clip("hips", 40, "Karate-chop hinge"),
  },
  shoulders_hiked: {
    step: "shoulders",
    title: "Your shoulders are creeping up",
    cue: "Shoulders down away from the ears",
    why: "Hiked shoulders switch off the lats that connect the bell to your body.",
    do: "Pull the shoulders down away from the ears and bend the handle so the elbow creases turn forward.",
    clip: clip("shoulders", 16, "Hands-on demo with Dr. Drew"),
  },
  hips_high: {
    step: "hips",
    title: "Your hips are too high",
    cue: "hips above knees, below shoulders",
    why: "Hips above the shoulders turn the set-up into a stiff-legged reach.",
    do: "Unlock the knees a touch and sit the hips back, so they land between your knees and shoulders.",
    clip: clip("hips", 144, "Set-up and backswing"),
  },
  shin_tilt: {
    step: "hips",
    title: "Your shins are tipping forward",
    cue: "shins near vertical",
    why: "Forward shins move the load from the hips to the knees.",
    do: "Push the hips further back until you feel the hamstring stretch and the shins stand up.",
    clip: clip("hips", 40, "Karate-chop hinge"),
  },
  head_high: {
    step: "head",
    title: "Your head is lifting too far",
    cue: "Neutral, or slightly up so the eyes hold the horizon",
    why: "A little lift is fine. Much more and the neck starts to bend.",
    do: "Ease the chin back so your head stays in line with your back.",
    clip: clip("head", 16, "Head down, neutral, slight lift, broken neck"),
  },
  head_down: {
    step: "head",
    title: "Your head is dropping",
    cue: "Long from crown to tailbone",
    why: "A dropped head pulls the upper back round with it.",
    do: "Bring the back of your head in line with your back, as if the stick touches it.",
    clip: clip("head", 16, "Head down, neutral, slight lift, broken neck"),
  },
};

/** The neck-safe version of the head fixes: never suggest lifting the head. */
const NECK_SAFE: Partial<Record<FaultId, Partial<Omit<SwingFix, "fault">>>> = {
  head_high: { cue: "keep it neutral if you have neck problems", title: "Keep your head neutral", do: "Bring the chin back so your head sits in line with your back. Don't look up." },
  head_down: { cue: "keep it neutral if you have neck problems", do: "Let the back of your head line up with your back. Neutral, not up." },
};

/** Self-check prompts for the steps the camera can't measure in v1. */
export const SELF_CHECKS: Record<"feet" | "grip" | "breath", { cue: string; prompt: string; clip: SwingClip }> = {
  feet: { cue: "Root through the floor", prompt: "Tripod down (big toe, little toe, heel), toes flat, a 10–20% press through the tips. Bell 0.5–1.5 ft in front of your toes.", clip: clip("feet", 16, "Tripod drill") },
  grip: { cue: "Relaxed yet secure", prompt: "Hands on the handle, firm but not white-knuckled. A bell that swings out like a tail means the grip is too loose.", clip: clip("grip", 8, "Two-hand grip, close-up") },
  breath: { cue: "Rock back so the bell tips off the floor, belly breath in, draw the navel in, hold", prompt: "Before the hike: rock back, belly breath in, navel in, hold, then hike.", clip: clip("breath", 24, "Set-up, tip-back and breath") },
};

/* ------------------------------------------------------------------ coach seam */

export interface CoachInput {
  assessment: SetupAssessment;
  neckHistory: boolean;
}
export interface CoachAdvice {
  fix: SwingFix | null;
  /** Up to two other things to look at next time. */
  also: SwingFix[];
  source: "rules" | "ai";
}
/** The coach seam: `ruleCoach` today; an AI coach (verified quotes, same shape) can replace it later. */
export interface Coach {
  advise(input: CoachInput): CoachAdvice | Promise<CoachAdvice>;
}

export function fixFor(fault: FaultId, neckHistory: boolean): SwingFix {
  const base = SWING_FIXES[fault];
  return { fault, ...base, ...(neckHistory ? (NECK_SAFE[fault] ?? {}) : {}) };
}

/** Deterministic coach: the highest-priority fault, in Mike's words, one at a time. */
export const ruleCoach: Coach = {
  advise({ assessment, neckHistory }) {
    const fixes = assessment.faults.map((f) => fixFor(f, neckHistory));
    return { fix: fixes[0] ?? null, also: fixes.slice(1, 3), source: "rules" };
  },
};

/* ------------------------------------------------------------------ 2-week program */

export interface SwingSession {
  n: number;
  reps: number;
  sets: number;
}

/**
 * The ebook's 2-week program: 6 sessions on the minute, 8–14 reps, 3–8 sets (rows are a draft
 * spread of those ranges until Mike's exact table is entered).
 */
export const SWING_PROGRAM: SwingSession[] = [
  { n: 1, reps: 8, sets: 3 },
  { n: 2, reps: 10, sets: 4 },
  { n: 3, reps: 10, sets: 5 },
  { n: 4, reps: 12, sets: 6 },
  { n: 5, reps: 12, sets: 7 },
  { n: 6, reps: 14, sets: 8 },
];

/** Starting bell from the ebook: about 16 kg for men, 8 kg for women; the Selector's working bell wins. */
export function startingBell(opts: { selectorKg?: number | null; sex?: "male" | "female" | null }): number {
  if (opts.selectorKg && opts.selectorKg > 0) return opts.selectorKg;
  return opts.sex === "female" ? 8 : 16;
}
