import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assessSetup,
  calibrate,
  fixFor,
  framing,
  hipHeight,
  rawHeadAngle,
  ruleCoach,
  SELF_CHECKS,
  shinAngle,
  sidePoints,
  startingBell,
  steadiestPose,
  stepScore,
  SWING_FIXES,
  type FaultId,
  type Pose,
} from "./swing-setup";

/**
 * Synthesises a side-on MediaPipe pose (33 points) from joint angles, so the geometry can be
 * tested without a camera. Square space, y up, member facing +x, ankle at the origin.
 */
interface Shape {
  shin: number; // degrees from vertical, knee forward
  thigh: number; // degrees from vertical, hip back
  torso: number; // incline above horizontal (90 = upright)
  head: number; // degrees relative to the torso line, + = lifted
  torsoLen?: number;
  gap?: number; // shoulder→ear length
  facing?: 1 | -1;
  aspect?: number;
  shoulderWidth?: number; // apparent shoulder gap (side-on ≈ 0)
  visibility?: number;
}
const rad = (d: number) => (d * Math.PI) / 180;
function makePose(s: Shape): Pose {
  const shinL = 0.24;
  const thighL = 0.24;
  const torsoL = s.torsoLen ?? 0.3;
  const gap = s.gap ?? 0.13;
  const A = { x: 0, y: 0 };
  const K = { x: A.x + shinL * Math.sin(rad(s.shin)), y: A.y + shinL * Math.cos(rad(s.shin)) };
  const H = { x: K.x - thighL * Math.sin(rad(s.thigh)), y: K.y + thighL * Math.cos(rad(s.thigh)) };
  const S = { x: H.x + torsoL * Math.cos(rad(s.torso)), y: H.y + torsoL * Math.sin(rad(s.torso)) };
  const E = { x: S.x + gap * Math.cos(rad(s.torso + s.head)), y: S.y + gap * Math.sin(rad(s.torso + s.head)) };
  const N = { x: E.x + 0.04 * Math.cos(rad(s.torso + s.head - 70)), y: E.y + 0.04 * Math.sin(rad(s.torso + s.head - 70)) };
  const T = { x: A.x + 0.08, y: A.y - 0.02 };
  const f = s.facing ?? 1;
  const aspect = s.aspect ?? 1;
  const v = s.visibility ?? 0.95;
  // Square space → normalised image coordinates (y down), centred, the body ~70% of the height.
  const img = (p: { x: number; y: number }, dx = 0) => ({ x: 0.5 + ((p.x + dx) * 0.85 * f) / aspect, y: 0.95 - p.y * 0.85, z: 0, visibility: v });
  const pose: Pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.2 }));
  const w = s.shoulderWidth ?? 0.02;
  pose[0] = img(N);
  pose[7] = img(E);
  pose[8] = { ...img(E), visibility: 0.3 };
  pose[11] = img(S);
  pose[12] = { ...img(S, w), visibility: 0.4 };
  pose[23] = img(H);
  pose[24] = { ...img(H, 0.01), visibility: 0.4 };
  pose[25] = img(K);
  pose[26] = { ...img(K), visibility: 0.4 };
  pose[27] = img(A);
  pose[28] = { ...img(A), visibility: 0.4 };
  pose[31] = img(T);
  pose[32] = { ...img(T), visibility: 0.4 };
  return pose;
}

const STAND: Shape = { shin: 0, thigh: 0, torso: 90, head: 0 };
const GOOD: Shape = { shin: 5, thigh: 70, torso: 35, head: 5 };
const cal = calibrate(makePose(STAND), 1)!;
const run = (s: Shape, extra: Partial<Parameters<typeof assessSetup>[0]> = {}) =>
  assessSetup({ pose: makePose(s), aspect: s.aspect ?? 1, calibration: cal, neckHistory: false, ...extra });

describe("geometry", () => {
  it("measures the shin angle against vertical, either facing", () => {
    for (const facing of [1, -1] as const) {
      const p = sidePoints(makePose({ ...GOOD, shin: 15, facing }), 1);
      expect(shinAngle(p)).toBeCloseTo(15, 3);
    }
  });

  it("keeps angles true on a portrait phone frame (aspect 9:16)", () => {
    const aspect = 9 / 16;
    const p = sidePoints(makePose({ ...GOOD, shin: 12, aspect }), aspect);
    expect(shinAngle(p)).toBeCloseTo(12, 3);
  });

  it("places the hip between knee (0) and shoulder (1)", () => {
    const p = sidePoints(makePose(GOOD), 1);
    const r = hipHeight(p);
    expect(r).toBeGreaterThan(0.1);
    expect(r).toBeLessThan(0.9);
  });

  it("reads the head angle against the torso line, + lifted and − dropped, either facing", () => {
    for (const facing of [1, -1] as const) {
      expect(rawHeadAngle(sidePoints(makePose({ ...GOOD, head: 30, facing }), 1))).toBeCloseTo(30, 3);
      expect(rawHeadAngle(sidePoints(makePose({ ...GOOD, head: -20, facing }), 1))).toBeCloseTo(-20, 3);
    }
  });
});

describe("framing (placement guide)", () => {
  it("accepts a clear side-on body in frame", () => {
    expect(framing(makePose(GOOD), 1).ok).toBe(true);
  });
  it("rejects a front-on camera", () => {
    const f = framing(makePose({ ...GOOD, shoulderWidth: 0.25 }), 1);
    expect(f.sideOn).toBe(false);
    expect(f.hint).toMatch(/side-on/);
  });
  it("rejects a body cut off by the frame", () => {
    const pose = makePose(GOOD);
    pose[27] = { ...pose[27]!, y: 0.995 };
    expect(framing(pose, 1).inFrame).toBe(false);
  });
  it("rejects low visibility and no pose at all", () => {
    expect(framing(makePose({ ...GOOD, visibility: 0.3 }), 1).ok).toBe(false);
    expect(framing(null, 1).ok).toBe(false);
  });
});

describe("assessSetup", () => {
  it("scores Mike's set-up as good on every measured step", () => {
    const a = run(GOOD);
    expect(a.steps).toMatchObject({ hips: "good", back: "good", shoulders: "good", head: "good", feet: "self", grip: "self", breath: "self" });
    expect(a.mainFault).toBeNull();
    expect(a.overlay).not.toBeNull();
  });

  it("shin angle bands: <10 good, 10–20 adjust, >20 squat pattern", () => {
    expect(run({ ...GOOD, shin: 8 }).checks.shin.status).toBe("good");
    expect(run({ ...GOOD, shin: 15 }).checks.shin.fault).toBe("shin_tilt");
    expect(run({ ...GOOD, shin: 28 }).checks.shin.fault).toBe("squat_pattern");
  });

  it("flags hips at or below the knees as a squat pattern, and hips above the shoulders", () => {
    expect(run({ shin: 5, thigh: 100, torso: 45, head: 5 }).checks.hip.fault).toBe("squat_pattern");
    expect(run({ shin: 0, thigh: 10, torso: -10, head: 5 }).checks.hip.fault).toBe("hips_high");
  });

  it("head bands: 0–15 ok, 15–25 adjust, >25 broken neck, dropped < −10", () => {
    expect(run({ ...GOOD, head: 12 }).checks.head.status).toBe("good");
    expect(run({ ...GOOD, head: 20 }).checks.head.fault).toBe("head_high");
    expect(run({ ...GOOD, head: 35 }).checks.head.fault).toBe("broken_neck");
    expect(run({ ...GOOD, head: -25 }).checks.head.fault).toBe("head_down");
  });

  it("with neck history: neutral only, never the lift cue", () => {
    const a = run({ ...GOOD, head: 12 }, { neckHistory: true });
    expect(a.checks.head.fault).toBe("head_high");
    const b = run({ ...GOOD, head: 35 }, { neckHistory: true });
    expect(b.faults).not.toContain("broken_neck");
    for (const f of ["head_high", "head_down"] as FaultId[]) {
      const fix = fixFor(f, true);
      expect(`${fix.cue} ${fix.do}`).not.toMatch(/slightly up|lift|horizon/i);
    }
  });

  it("flags a rounding back from a shortened torso against the standing calibration", () => {
    expect(run({ ...GOOD, torsoLen: 0.25 }).checks.back.fault).toBe("back_rounding");
    expect(run({ ...GOOD, torsoLen: 0.27 }).checks.back.status).toBe("adjust");
    expect(run({ ...GOOD, torsoLen: 0.295 }).checks.back.status).toBe("good");
  });

  it("flags hiked shoulders from the shoulder–ear gap against standing (≥ 90% ok)", () => {
    expect(run({ ...GOOD, gap: 0.125 }).checks.shoulders.status).toBe("good");
    expect(run({ ...GOOD, gap: 0.112 }).checks.shoulders.status).toBe("adjust");
    expect(run({ ...GOOD, gap: 0.09 }).checks.shoulders.fault).toBe("shoulders_hiked");
  });

  it("says can't see it instead of guessing", () => {
    const front = run({ ...GOOD, shoulderWidth: 0.25 });
    expect(front.steps).toMatchObject({ hips: "cant", back: "cant", shoulders: "cant", head: "cant" });
    expect(front.mainFault).toBeNull();
    expect(front.overlay).toBeNull();
    const dim = run({ ...GOOD, visibility: 0.4 });
    expect(dim.steps.hips).toBe("cant");
    const uncal = assessSetup({ pose: makePose(GOOD), aspect: 1, calibration: null, neckHistory: false });
    expect(uncal.steps.shoulders).toBe("cant");
    expect(uncal.steps.back).toBe("cant");
    expect(uncal.steps.hips).toBe("good");
  });

  it("picks ONE fix in Mike's priority: back → neck → bell far → squat → shoulders", () => {
    const all = run({ shin: 28, thigh: 70, torso: 35, head: 35, torsoLen: 0.25, gap: 0.07 }, { bellDistance: "far" });
    expect(all.faults.slice(0, 5)).toEqual(["back_rounding", "broken_neck", "bell_far", "squat_pattern", "shoulders_hiked"]);
    expect(all.mainFault).toBe("back_rounding");
    expect(run({ ...GOOD, shin: 28, head: 35 }).mainFault).toBe("broken_neck");
    expect(run({ ...GOOD, shin: 28 }, { bellDistance: "far" }).mainFault).toBe("bell_far");
    expect(run({ ...GOOD, shin: 28, gap: 0.07 }).mainFault).toBe("squat_pattern");
    const advice = ruleCoach.advise({ assessment: all, neckHistory: false }) as ReturnType<typeof ruleCoach.advise> & { fix: unknown };
    expect((advice as { fix: { fault: string } }).fix.fault).toBe("back_rounding");
    expect((advice as { also: unknown[] }).also).toHaveLength(2);
  });
});

describe("steadiest frames", () => {
  it("picks the still window and ignores the wobble", () => {
    const still = makePose(GOOD);
    const wobble = (k: number) => makePose({ ...GOOD, shin: 5 + 10 * Math.sin(k), head: 5 + 20 * Math.cos(k) });
    const frames = [...Array.from({ length: 10 }, (_, k) => wobble(k)), ...Array.from({ length: 8 }, () => still), wobble(3)];
    const r = steadiestPose(frames, 8)!;
    expect(r.motion).toBeLessThan(0.001);
    expect(shinAngle(sidePoints(r.pose, 1))).toBeCloseTo(5, 3);
  });
});

describe("Mike's words", () => {
  const source = readFileSync(new URL("../../../docs/specs/13-swing-setup-coach-source-plan.md", import.meta.url), "utf8").toLowerCase();
  it("every cue is an exact quote from the source material", () => {
    const cues = [
      ...Object.keys(SWING_FIXES).flatMap((f) => [fixFor(f as FaultId, false).cue, fixFor(f as FaultId, true).cue]),
      ...Object.values(SELF_CHECKS).map((c) => c.cue),
    ];
    for (const cue of cues) expect(source, cue).toContain(cue.toLowerCase());
  });
  it("step scores and starting bell", () => {
    expect([stepScore("good"), stepScore("adjust"), stepScore("cant"), stepScore("self")]).toEqual([2, 1, null, null]);
    expect(startingBell({ sex: "female" })).toBe(8);
    expect(startingBell({ sex: "male" })).toBe(16);
    expect(startingBell({ selectorKg: 12, sex: "male" })).toBe(12);
  });
});
