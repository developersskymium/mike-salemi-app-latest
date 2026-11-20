/**
 * Kettlebell Roadmap Coach (spec 14) — the platform-neutral rules: the catalog (Mike's 4 phases, their
 * movements and benchmarks, Level I / Level II pairs), placement, node states, the pass rules, the
 * "moderate (for you)" bell and the rules-built phase session.
 *
 * v1 has no camera and no AI: benchmarks are counted/timed by the app and confirmed by the member.
 * The seam for v2: `AttemptInput.check` carries a rep-check outcome (Swing Set-Up engine,
 * packages/core/src/swing-setup.ts on ui/swing); `attemptMeets` already refuses a "close" check.
 *
 * The catalog here is the source of the 0038 seed (`roadmapSeedSql`), so DB and code never drift; the
 * DB rows are what Mike edits later (Admin Studio), and the loaders prefer them.
 */

export type RoadmapPhase = 1 | 2 | 3 | 4;
export type NodeState = "locked" | "learning" | "practising" | "passed";
export type MtkTag =
  | "general" | "deadlift" | "single-leg-deadlift" | "swing" | "clean" | "snatch" | "press" | "jerk"
  | "turkish-get-up" | "windmill" | "squat" | "lunge" | "row";

export interface RoadmapClip {
  providerId: string;
  hash: string | null;
  thumb: string | null;
  seconds: number | null;
}

export interface RoadmapMovement {
  key: string;
  phase: RoadmapPhase;
  position: number;
  name: string;
  /** Short label for map nodes. */
  short: string;
  kind: "bodyweight" | "lift" | "mastery";
  /** The PDF's own fallback (Halo for the press, staggered stance for the row). Passing it counts. */
  fallback: { name: string; when: string } | null;
  /** Movements (earlier phase) that must be passed before this node opens. Phase 1 opens at once. */
  unlockAfter: string[];
  /** Level I (easier) and Level II (harder) track for phase sessions. */
  easier: string;
  harder: string;
  clip: RoadmapClip | null;
  /** Shown when the clip is missing or borrowed. */
  clipNote?: string;
  mtk: MtkTag | null;
  /** What to practise this week (draft copy; Mike to confirm). */
  practise: string;
  /** Phases 1 and 3: nasal breathing is part of the standard. */
  nasal: boolean;
  /** Show the Swing Set-Up Coach link before this node. */
  swingSetup?: boolean;
}

export type BenchLoad = "bodyweight" | "light" | "low-medium" | "moderate";

export interface RoadmapBenchmark {
  key: string;
  movement: string;
  phase: RoadmapPhase;
  /** Order inside the phase: bodyweight first, then light, then loaded (safety). */
  position: number;
  label: string;
  measure: "reps" | "distance" | "stages";
  /** Target reps per set (per side when `eachSide`). For "stages": get-ups per side. */
  reps: number;
  repsMax?: number;
  sets: number;
  eachSide: boolean;
  restSeconds: number;
  distanceYards?: number;
  load: BenchLoad;
  /** The quality line the member confirms (draft wording until Mike writes the standards). */
  standard: string;
  /** How the app measures it in v1. */
  how: string;
}

const clip = (providerId: string, hash: string, thumb: string, seconds: number): RoadmapClip => ({
  providerId, hash, seconds, thumb: `https://i.vimeocdn.com/video/${thumb}-d_640?region=us`,
});

/* --------------------------------------------------------------- catalog */

export const ROADMAP_PHASES: { phase: RoadmapPhase; name: string; theme: string; handoff: string }[] = [
  { phase: 1, name: "The Foundation", theme: "Body integrity: own the four basic patterns before anything swings.", handoff: "kbl-1" },
  { phase: 2, name: "Adding Complexity", theme: "The swing, the standing press, the carry and the loaded lunge.", handoff: "kbl-1" },
  { phase: 3, name: "Ready for Performance", theme: "Cleans, presses, get-ups and single-arm work under nasal breathing.", handoff: "kbl-2" },
  { phase: 4, name: "Mastery", theme: "Vary the weight, the rest periods and the reps to suit your goal.", handoff: "mtk" },
];

export const ROADMAP_MOVEMENTS: RoadmapMovement[] = [
  // Phase 1 — The Foundation
  { key: "body-integrity", phase: 1, position: 1, name: "Body Integrity (bodyweight)", short: "Body integrity", kind: "bodyweight", fallback: null, unlockAfter: [],
    easier: "Glute Bridge", harder: "Single Leg Glute Bridge", clip: null, clipNote: "Bodyweight: no clip needed", mtk: "general",
    practise: "Daily: 10 spinal roll-ups, 15 glute bridges (feel the glutes, not the back), 15 slow squats. Nose breathing throughout.", nasal: true },
  { key: "goblet-squat", phase: 1, position: 2, name: "Goblet Squat", short: "Goblet squat", kind: "lift", fallback: null, unlockAfter: [],
    easier: "Goblet Squat", harder: "Goblet Squat with pause", clip: clip("730402831", "0497c34f68", "1469928657-d0eaf0a16a6a92e35e1fac71787770e2c6a8fbce456a775ca9e54f4da81ee1b3", 24), mtk: "squat",
    practise: "3 sets of 8 with a light bell: heels down, knees over toes, bell stays at the chest. Pause 2 s at the bottom on the last rep.", nasal: true },
  { key: "deadlift", phase: 1, position: 3, name: "Deadlift", short: "Deadlift", kind: "lift", fallback: null, unlockAfter: [],
    easier: "Two Hand Deadlift", harder: "Single Leg Deadlift (supported)", clip: null, clipNote: "Clip coming", mtk: "deadlift",
    practise: "3 sets of 10: push the hips back, flat back, bell close to the body. Stand tall by squeezing the glutes.", nasal: true },
  { key: "hk-press", phase: 1, position: 4, name: "Half Kneeling Overhead Press", short: "Half kneeling press", kind: "lift",
    fallback: { name: "Halo", when: "if your overhead mobility doesn't allow quality overhead work yet" }, unlockAfter: [],
    easier: "Halo", harder: "Half Kneeling Overhead Press", clip: clip("730402968", "14bb1a8f37", "1469930015-91f9f7eff2ea02cdccf5170fb4b555a8901637ca6b4e7eff97162bf4e3c2a585", 22), mtk: "press",
    practise: "3 sets of 6 each arm: torso tall, ribs down, finish with the arm vertical. Use the Halo if overhead is not there yet.", nasal: true },
  { key: "sa-row", phase: 1, position: 5, name: "Single Arm Row", short: "Single arm row", kind: "lift", fallback: null, unlockAfter: [],
    easier: "Lunge Row (supported)", harder: "Lunge Row (unsupported)", clip: null, clipNote: "Clip coming", mtk: "row",
    practise: "3 sets of 10 each arm: back flat and still, draw the elbow past the ribs, no twisting.", nasal: true },
  // Phase 2 — Adding Complexity
  { key: "two-hand-swing", phase: 2, position: 1, name: "2-Hand Swing", short: "2-hand swing", kind: "lift", fallback: null, unlockAfter: ["deadlift"],
    easier: "Two Hand Deadlift", harder: "Two Hand Swing", clip: clip("730403398", "da91854120", "1469929730-5484526710e482b12f83e7362c503acae30d5d1fc27624bae4bd9d77923f3b9e", 6), mtk: "swing",
    practise: "5 sets of 10 with 60 s rest: hinge, don't squat; snap the hips; the bell floats no higher than the chest.", nasal: false, swingSetup: true },
  { key: "standing-press", phase: 2, position: 2, name: "Standing Overhead Press", short: "Standing press", kind: "lift", fallback: null, unlockAfter: ["hk-press"],
    easier: "Half Kneeling Overhead Press", harder: "Standing Overhead Press", clip: null, clipNote: "Clip coming", mtk: "press",
    practise: "2 sets of 7–10 each arm with a moderate bell: glutes and abs tight, no lean back, lock out vertical.", nasal: false },
  { key: "farmers-carry", phase: 2, position: 3, name: "Single Arm Farmer's Carry", short: "Farmer's carry", kind: "lift", fallback: null, unlockAfter: ["sa-row"],
    easier: "Suitcase Deadlift", harder: "Single Arm Farmer's Carry", clip: null, clipNote: "Clip coming", mtk: "deadlift",
    practise: "3 carries of 30 yd each arm: shoulders level, don't lean toward the bell, walk slow and tall.", nasal: false },
  { key: "rack-lunge", phase: 2, position: 4, name: "Reverse Lunge in Rack Position", short: "Rack lunge", kind: "lift", fallback: null, unlockAfter: ["goblet-squat"],
    easier: "Split Squat (Goblet Grip)", harder: "Static Split Squat – Overhead Press", clip: null, clipNote: "Clip coming", mtk: "lunge",
    practise: "3 sets of 6 each side: step back softly, torso upright, front shin near vertical, bell tight in the rack.", nasal: false },
  // Phase 3 — Ready for Performance (nasal breathing is the standard)
  { key: "clean", phase: 3, position: 1, name: "Clean", short: "Clean", kind: "lift", fallback: null, unlockAfter: ["two-hand-swing"],
    easier: "Dead Stop Clean", harder: "Clean", clip: clip("730403305", "424dbd6335", "1469929378-ec658becc56ae3bdd677845ee2067d99a390f473cbcfbdefac9a54005bc783d0", 9), mtk: "clean",
    practise: "5 sets of 5 each side: the bell travels close, elbow tucked, soft catch in the rack. No banging the forearm.", nasal: true },
  { key: "push-press", phase: 3, position: 2, name: "Push Press", short: "Push press", kind: "lift", fallback: null, unlockAfter: ["standing-press"],
    easier: "Strict Press", harder: "Push Press", clip: clip("730403174", "23bb239d64", "1469929257-54900da22c95b6c52bfaa19b59ceeec732096eecf56a571bddc8812d96ac1e38", 11), mtk: "jerk",
    practise: "3 sets of 5 each side after a clean: short knee dip (no hip hinge), drive, lock out vertical.", nasal: true },
  { key: "half-getup", phase: 3, position: 3, name: "Loaded Half Turkish Getup", short: "Half get-up", kind: "lift", fallback: null, unlockAfter: ["standing-press"],
    easier: "Floor Press", harder: "Elbow Post Raises", clip: clip("730403035", "f2934c9377", "1469928949-c4abd5c8bc06a969efc2770423755b7f07fa2a5c43c5d59f577739bc33266511", 51), mtk: "turkish-get-up",
    practise: "3 get-ups each side, slow: arm vertical at every stage, hold each stage before the next.", nasal: true },
  { key: "sa-swing", phase: 3, position: 4, name: "Single Arm Swing", short: "Single arm swing", kind: "lift", fallback: null, unlockAfter: ["two-hand-swing"],
    easier: "Two Hand Swing", harder: "Single Arm Swing", clip: clip("730403509", "5365c5a9bb", "1469929909-780e33af55343b4e89ac3e17ff2afcb9bb137f567ac937ed5e4ad55f705014b7", 6), mtk: "swing",
    practise: "4 sets of 8 each arm with 30 s rest: shoulders level, no torso twist, same hip snap as the 2-hand swing.", nasal: true },
  { key: "oh-lunge", phase: 3, position: 5, name: "Overhead Reverse Lunge", short: "Overhead lunge", kind: "lift",
    fallback: { name: "Walking Lunge", when: "the PDF accepts walking or overhead reverse lunges" }, unlockAfter: ["rack-lunge"],
    easier: "Reverse Lunge in Rack Position", harder: "Overhead Reverse Lunge", clip: clip("730403243", "3d44e30e44", "1469929410-df0d6d0d8e9aefc6ad09ffaf5fb7e1a754ad4a6f8134b6256364e84b431b6a7a", 7),
    clipNote: "The course lists this clip under Phase 2; it shows the overhead reverse lunge", mtk: "lunge",
    practise: "3 sets of 6 each side: the overhead arm stays vertical through the lunge, torso upright.", nasal: true },
  { key: "row-reciprocity", phase: 3, position: 6, name: "Row With Reciprocity", short: "Row w/ reciprocity", kind: "lift",
    fallback: { name: "Staggered Stance Row", when: "if the reciprocal row isn't there yet" }, unlockAfter: ["farmers-carry"],
    easier: "Staggered Stance Row", harder: "Row With Reciprocity", clip: clip("730403272", "c390cc665d", "1469929312-dfd6f64ed9a3d8021db6a19f90b9264f82c480f7808ec0893aed596112ba9c56", 10), mtk: "row",
    practise: "3 sets of 8 each side: back flat and still, no torso twist, the elbow passes the torso.", nasal: true },
  // Phase 4 — Mastery (open-ended, no benchmarks)
  { key: "snatch", phase: 4, position: 1, name: "Snatch (half and full)", short: "Snatch", kind: "mastery", fallback: null, unlockAfter: [],
    easier: "Half Snatch", harder: "Snatch", clip: null, clipNote: "Clip coming", mtk: "snatch", practise: "Vary the weight, the rest periods and the reps to suit your goal.", nasal: false },
  { key: "full-getup", phase: 4, position: 2, name: "Loaded Full Turkish Getup", short: "Full get-up", kind: "mastery", fallback: null, unlockAfter: [],
    easier: "Loaded Half Turkish Getup", harder: "Loaded Full Turkish Getup", clip: null, clipNote: "Clip coming", mtk: "turkish-get-up", practise: "Vary the weight, the rest periods and the reps to suit your goal.", nasal: false },
  { key: "double-bell", phase: 4, position: 3, name: "Double Bell Work", short: "Double bell", kind: "mastery", fallback: null, unlockAfter: [],
    easier: "Double Front Squat", harder: "Double Clean and Press", clip: null, clipNote: "Clip coming", mtk: "clean", practise: "Vary the weight, the rest periods and the reps to suit your goal.", nasal: false },
  { key: "overhead-squat", phase: 4, position: 4, name: "Overhead Squat", short: "Overhead squat", kind: "mastery", fallback: null, unlockAfter: [],
    easier: "Goblet Squat with pause", harder: "Overhead Squat", clip: null, clipNote: "Clip coming", mtk: "squat", practise: "Vary the weight, the rest periods and the reps to suit your goal.", nasal: false },
  { key: "rotational", phase: 4, position: 5, name: "Rotational (RMT) Exercises", short: "Rotational", kind: "mastery", fallback: null, unlockAfter: [],
    easier: "Halo", harder: "Rotational Mace / Club Work", clip: null, clipNote: "Clip coming", mtk: "windmill", practise: "Vary the weight, the rest periods and the reps to suit your goal.", nasal: false },
];

const b = (x: Omit<RoadmapBenchmark, "eachSide" | "sets" | "restSeconds" | "measure"> & Partial<Pick<RoadmapBenchmark, "eachSide" | "sets" | "restSeconds" | "measure">>): RoadmapBenchmark => ({
  measure: "reps", sets: 1, eachSide: false, restSeconds: 0, ...x,
});

export const ROADMAP_BENCHMARKS: RoadmapBenchmark[] = [
  // Phase 1: bodyweight first, then the light bell on the four movements.
  b({ key: "p1-rollups", movement: "body-integrity", phase: 1, position: 1, label: "20 spinal roll-ups", reps: 20, load: "bodyweight", standard: "Smooth, one vertebra at a time, breathing through the nose.", how: "Tap once per rep" }),
  b({ key: "p1-bridges", movement: "body-integrity", phase: 1, position: 2, label: "30 glute bridges", reps: 30, load: "bodyweight", standard: "You feel it in the glutes, not in the lower back.", how: "Tap once per rep" }),
  b({ key: "p1-squats", movement: "body-integrity", phase: 1, position: 3, label: "30 bodyweight squats", reps: 30, load: "bodyweight", standard: "Heels down, knees over toes, nose breathing all the way.", how: "Tap once per rep" }),
  b({ key: "p1-goblet", movement: "goblet-squat", phase: 1, position: 4, label: "15 quality goblet squats", reps: 15, load: "light", standard: "Depth, heels down, bell stays at the chest.", how: "Tap once per rep" }),
  b({ key: "p1-deadlift", movement: "deadlift", phase: 1, position: 5, label: "15 quality deadlifts", reps: 15, load: "light", standard: "Hips back, flat back, stand tall with the glutes.", how: "Tap once per rep" }),
  b({ key: "p1-press", movement: "hk-press", phase: 1, position: 6, label: "15 quality half kneeling presses each arm", reps: 15, eachSide: true, load: "light", standard: "Torso upright, no lean back, arm finishes vertical.", how: "Tap once per rep, each arm" }),
  b({ key: "p1-row", movement: "sa-row", phase: 1, position: 7, label: "15 quality single arm rows each arm", reps: 15, eachSide: true, load: "light", standard: "Back flat and still, elbow past the ribs.", how: "Tap once per rep, each arm" }),
  // Phase 2
  b({ key: "p2-carry", movement: "farmers-carry", phase: 2, position: 1, label: "Farmer's carry 30 yd each arm", measure: "distance", reps: 1, distanceYards: 30, eachSide: true, load: "low-medium", standard: "Good posture: shoulders level, no lean toward the bell.", how: "Mark each 30 yd walk done" }),
  b({ key: "p2-lunge", movement: "rack-lunge", phase: 2, position: 2, label: "8 rack reverse lunges each side", reps: 8, eachSide: true, load: "light", standard: "Torso upright, soft knee touch, bell tight in the rack (draft standard).", how: "Tap once per rep, each side" }),
  b({ key: "p2-press", movement: "standing-press", phase: 2, position: 3, label: "Overhead press 2 × 7–10 each arm", reps: 7, repsMax: 10, sets: 2, eachSide: true, restSeconds: 60, load: "moderate", standard: "No lean back, lock out vertical.", how: "Tap reps, rest timer between sets" }),
  b({ key: "p2-swing", movement: "two-hand-swing", phase: 2, position: 4, label: "5 × 10 swings, 60 s rest", reps: 10, sets: 5, restSeconds: 60, load: "moderate", standard: "Hinge, hips snap, bell floats to chest height.", how: "Tap reps, 60 s rest timer" }),
  // Phase 3 (nasal breathing is the standard)
  b({ key: "p3-lunge", movement: "oh-lunge", phase: 3, position: 1, label: "10 overhead (or walking) lunges each side", reps: 10, eachSide: true, load: "light", standard: "Overhead arm vertical, torso upright.", how: "Tap once per rep, each side" }),
  b({ key: "p3-row", movement: "row-reciprocity", phase: 3, position: 2, label: "3 × 8 rows with reciprocity each side", reps: 8, sets: 3, eachSide: true, restSeconds: 45, load: "moderate", standard: "Back flat and still, no twist (draft benchmark).", how: "Tap reps, rest timer" }),
  b({ key: "p3-getup", movement: "half-getup", phase: 3, position: 3, label: "Loaded half get-up 3–5 each side", measure: "stages", reps: 3, repsMax: 5, eachSide: true, load: "moderate", standard: "Arm vertical at every stage, each stage held.", how: "Tap once per get-up, each side" }),
  b({ key: "p3-clean", movement: "clean", phase: 3, position: 4, label: "Clean 3 × 5 each side", reps: 5, sets: 3, eachSide: true, restSeconds: 60, load: "moderate", standard: "Close path, soft catch, elbow tucked.", how: "Tap reps, rest timer" }),
  b({ key: "p3-pushpress", movement: "push-press", phase: 3, position: 5, label: "Push press (or strict press) 3 × 5 each side", reps: 5, sets: 3, eachSide: true, restSeconds: 60, load: "moderate", standard: "Short dip, vertical lockout, back to the rack.", how: "Tap reps, rest timer" }),
  b({ key: "p3-saswing", movement: "sa-swing", phase: 3, position: 6, label: "Single arm swing 4 × 8 each arm, 30 s rest", reps: 8, sets: 4, eachSide: true, restSeconds: 30, load: "moderate", standard: "Shoulders level, no twist.", how: "Tap reps, 30 s rest timer" }),
];

/* --------------------------------------------------------------- catalog helpers */

export interface RoadmapCatalog {
  movements: RoadmapMovement[];
  benchmarks: RoadmapBenchmark[];
}
export const ROADMAP_CATALOG: RoadmapCatalog = { movements: ROADMAP_MOVEMENTS, benchmarks: ROADMAP_BENCHMARKS };

export const movementOf = (cat: RoadmapCatalog, key: string) => cat.movements.find((m) => m.key === key) ?? null;
export const benchmarksOf = (cat: RoadmapCatalog, movement: string) =>
  cat.benchmarks.filter((x) => x.movement === movement).sort((a, c) => a.position - c.position);
export const phaseBenchmarks = (cat: RoadmapCatalog, phase: RoadmapPhase) =>
  cat.benchmarks.filter((x) => x.phase === phase).sort((a, c) => a.position - c.position);
export const phaseMovements = (cat: RoadmapCatalog, phase: RoadmapPhase) =>
  cat.movements.filter((m) => m.phase === phase).sort((a, c) => a.position - c.position);

/* --------------------------------------------------------------- attempts and the pass rule */

export interface RoadmapAttempt {
  benchmark: string;
  movement: string;
  /** Member's local date (YYYY-MM-DD): the 2-separate-days rule counts distinct days. */
  day: string;
  passed: boolean;
  /** Nasal breathing self-confirmed (needed in Phases 1 and 3). */
  nasal: boolean;
  source: "placement" | "retest";
  /** "main" or the PDF fallback (Halo, staggered stance, walking lunge): both count. */
  variant?: "main" | "fallback";
  /** v2 seam: camera rep-check outcome. "close" / "cant_judge" never count as met. */
  check?: "meets" | "close" | "cant_judge" | null;
}

export interface AttemptInput {
  /** Reps per set; with `eachSide`, sets alternate left/right: [L1, R1, L2, R2…]. */
  setReps: number[];
  /** Member tapped "done" (not "couldn't"). */
  confirmed: boolean;
  /** Pain or dizziness stops the attempt: never a pass. */
  stopped?: boolean;
}

/** Did the counted/timed run meet the benchmark? Pure: the member's confirmation plus the counts. */
export function scoreAttempt(bm: RoadmapBenchmark, input: AttemptInput): boolean {
  if (!input.confirmed || input.stopped) return false;
  const needed = bm.sets * (bm.eachSide ? 2 : 1);
  if (input.setReps.length < needed) return false;
  return input.setReps.slice(0, needed).every((r) => r >= bm.reps);
}

/** An attempt counts toward passing when met, breathing confirmed where the phase asks for it, and no failed camera check. */
export function attemptMeets(m: Pick<RoadmapMovement, "nasal">, a: RoadmapAttempt): boolean {
  if (!a.passed) return false;
  if (m.nasal && !a.nasal) return false;
  if (a.check && a.check !== "meets") return false;
  return true;
}

/** Distinct days on which this benchmark was met. */
export function metDays(m: RoadmapMovement, benchmark: string, attempts: RoadmapAttempt[]): number {
  return new Set(attempts.filter((a) => a.benchmark === benchmark && attemptMeets(m, a)).map((a) => a.day)).size;
}

/** Days needed: a movement passes when every one of its benchmarks is met on 2 separate days. */
export const DAYS_TO_PASS = 2;

export function movementPassed(cat: RoadmapCatalog, m: RoadmapMovement, attempts: RoadmapAttempt[]): boolean {
  const bms = benchmarksOf(cat, m.key);
  if (!bms.length) return false;
  return bms.every((x) => metDays(m, x.key, attempts) >= DAYS_TO_PASS);
}

/* --------------------------------------------------------------- node states */

export interface PlacementSummary {
  /** The phase the test placed the member in. Every movement below it is credited as passed. */
  phase: RoadmapPhase;
}

export interface NodeInfo {
  key: string;
  phase: RoadmapPhase;
  state: NodeState;
  why: string;
  /** Per benchmark: distinct days met (out of DAYS_TO_PASS). */
  progress: { benchmark: string; days: number }[];
}

/**
 * Every node's state, from the placement and the attempts. Rules:
 * - Below the placed phase: passed (credited by the placement test).
 * - Phase 1, the placed phase, and any node whose `unlockAfter` movements are passed: open.
 *   So the next phase opens movement by movement.
 * - Open: passed when every benchmark is met on 2 separate days (+ nasal breathing in Phases 1 and 3);
 *   practising once anything is met; otherwise learning.
 * - Phase 4 opens when Phase 3 is passed; its nodes are "practising" (Mastery), never passed.
 */
export function nodeStates(cat: RoadmapCatalog, placement: PlacementSummary | null, attempts: RoadmapAttempt[]): NodeInfo[] {
  const placed = placement?.phase ?? 1;
  const out = new Map<string, NodeInfo>();
  const ordered = [...cat.movements].sort((a, c) => a.phase - c.phase || a.position - c.position);
  const passedKey = (k: string) => out.get(k)?.state === "passed";
  for (const m of ordered.filter((x) => x.phase < 4)) {
    const progress = benchmarksOf(cat, m.key).map((x) => ({ benchmark: x.key, days: metDays(m, x.key, attempts) }));
    if (m.phase < placed) {
      out.set(m.key, { key: m.key, phase: m.phase, state: "passed", why: "Credited by your placement test", progress });
      continue;
    }
    const open = m.phase === 1 || m.phase <= placed || (m.unlockAfter.length > 0 && m.unlockAfter.every(passedKey));
    if (!open) {
      const need = m.unlockAfter.map((k) => cat.movements.find((x) => x.key === k)?.short ?? k).join(" and ");
      out.set(m.key, { key: m.key, phase: m.phase, state: "locked", why: need ? `Opens when ${need} is passed` : `Opens with Phase ${m.phase}`, progress });
      continue;
    }
    if (movementPassed(cat, m, attempts)) {
      out.set(m.key, { key: m.key, phase: m.phase, state: "passed", why: "Benchmark met on 2 separate days", progress });
      continue;
    }
    const any = progress.some((p) => p.days > 0);
    const left = progress.filter((p) => p.days < DAYS_TO_PASS).length;
    out.set(m.key, {
      key: m.key, phase: m.phase, state: any ? "practising" : "learning",
      why: any ? `Met once — meet it again on another day${left > 1 ? ` (${left} benchmarks left)` : ""}` : "Not met yet — practise, then re-test",
      progress,
    });
  }
  const phase3Done = ordered.filter((x) => x.phase === 3).every((x) => passedKey(x.key));
  for (const m of ordered.filter((x) => x.phase === 4)) {
    out.set(m.key, phase3Done || placed === 4
      ? { key: m.key, phase: 4, state: "practising", why: "Mastery: open-ended practice", progress: [] }
      : { key: m.key, phase: 4, state: "locked", why: "Opens when Phase 3 is passed", progress: [] });
  }
  return ordered.map((m) => out.get(m.key)!);
}

/** A phase is passed when every movement in it is passed (fallbacks count). Phase 4 is never "passed". */
export function phasePassed(nodes: NodeInfo[], phase: RoadmapPhase): boolean {
  if (phase === 4) return false;
  const ns = nodes.filter((n) => n.phase === phase);
  return ns.length > 0 && ns.every((n) => n.state === "passed");
}

/** The member's phase: the lowest of 1–3 not yet passed, else 4 (Mastery). */
export function currentPhase(nodes: NodeInfo[]): RoadmapPhase {
  for (const p of [1, 2, 3] as const) if (!phasePassed(nodes, p)) return p;
  return 4;
}

/** The one next node: in the current phase, the first open node not passed (closest to passing first). */
export function nextNode(nodes: NodeInfo[]): NodeInfo | null {
  const phase = currentPhase(nodes);
  const open = nodes.filter((n) => n.phase === phase && (n.state === "practising" || n.state === "learning"));
  return open.find((n) => n.state === "practising") ?? open[0] ?? null;
}

/** Phases unlocked by passing this attempt (for the celebration). */
export function newlyPassed(before: NodeInfo[], after: NodeInfo[]) {
  const was = new Map(before.map((n) => [n.key, n.state]));
  const movements = after.filter((n) => n.state === "passed" && was.get(n.key) !== "passed").map((n) => n.key);
  const opened = after.filter((n) => n.state !== "locked" && was.get(n.key) === "locked").map((n) => n.key);
  const phases = ([1, 2, 3] as const).filter((p) => phasePassed(after, p) && !phasePassed(before, p));
  return { movements, opened, phases };
}

/* --------------------------------------------------------------- placement test */

export type TrainingTime = "new" | "under-1y" | "1-3y" | "3y-plus";
export interface PlacementAnswers {
  time: TrainingTime;
  /** Current pain or injury in the hips, back, knees, shoulders, wrists or neck. */
  injury: "none" | "yes";
  /** The member's own guess; null = not sure. */
  guess: RoadmapPhase | null;
  /** Overhead self-check: true = quality overhead work (press), false/unsure = Halo. */
  overheadOk: boolean | null;
}

/** No placement test with reported pain or injury (every test loads the hips, back, knees or shoulders). */
export const placementBlocked = (a: Pick<PlacementAnswers, "injury">) => a.injury !== "none";

/**
 * Where testing starts: one phase below the member's guess, never above Phase 3, and Phase 1 for anyone
 * new to kettlebells (when in doubt, lower).
 */
export function placementStart(a: Pick<PlacementAnswers, "time" | "guess">): Exclude<RoadmapPhase, 4> {
  if (a.time === "new" || !a.guess) return 1;
  const start = Math.max(1, Math.min(3, a.guess - 1));
  if (a.time === "under-1y") return Math.min(start, 2) as 1 | 2;
  return start as 1 | 2 | 3;
}

/** Order of a phase's benchmarks in a run: bodyweight, then light, then loaded. */
const LOAD_ORDER: Record<BenchLoad, number> = { bodyweight: 0, light: 1, "low-medium": 2, moderate: 3 };
export function runOrder(cat: RoadmapCatalog, phase: RoadmapPhase): RoadmapBenchmark[] {
  return phaseBenchmarks(cat, phase).sort((a, c) => LOAD_ORDER[a.load] - LOAD_ORDER[c.load] || a.position - c.position);
}

export type PlacementStep =
  | { done: false; benchmark: RoadmapBenchmark; phase: RoadmapPhase; index: number; dropped: boolean }
  | { done: true; phase: RoadmapPhase; reason: string };

/**
 * The adaptive run. `results` are the outcomes so far, in order. Each pass moves the test on (through the
 * phase, then up); the first clear fail stops it in that phase. One exception, to place lower when in
 * doubt: failing the very first test of a start phase above 1 drops the run one phase and continues there.
 */
export function placementNext(cat: RoadmapCatalog, start: Exclude<RoadmapPhase, 4>, results: boolean[]): PlacementStep {
  let phase: RoadmapPhase = start;
  let i = 0;
  let dropped = false;
  for (;;) {
    if (phase === 4) return { done: true, phase: 4, reason: "Every Phase 3 benchmark met" };
    const q = runOrder(cat, phase);
    let restarted = false;
    for (let j = 0; j < q.length; j++) {
      if (i >= results.length) return { done: false, benchmark: q[j]!, phase, index: i, dropped };
      const ok = results[i++]!;
      if (ok) continue;
      if (j === 0 && phase === start && phase > 1 && !dropped) {
        dropped = true;
        phase = (phase - 1) as RoadmapPhase;
        restarted = true;
        break;
      }
      return { done: true, phase, reason: `Stopped at: ${q[j]!.label}` };
    }
    if (restarted) continue;
    if (dropped) return { done: true, phase: (phase + 1) as RoadmapPhase, reason: `Phase ${phase} met; the Phase ${phase + 1} start was not` };
    phase = (phase + 1) as RoadmapPhase;
  }
}

/** Upper bound of benchmarks a run can take from `start` (for the progress rail). */
export const placementLength = (cat: RoadmapCatalog, start: Exclude<RoadmapPhase, 4>) =>
  ([1, 2, 3] as const).filter((p) => p >= start).reduce((s, p) => s + runOrder(cat, p).length, 0);

/** "Phase 2 — 2-hand swing and standing press met; farmer's carry and rack lunge still to come." */
export function placementSummary(cat: RoadmapCatalog, nodes: NodeInfo[]): string {
  const phase = currentPhase(nodes);
  const name = ROADMAP_PHASES[phase - 1]!.name;
  if (phase === 4) return `Phase 4 — ${name}. Every benchmark through Phase 3 met.`;
  const ns = phaseMovements(cat, phase).map((m) => ({ m, n: nodes.find((x) => x.key === m.key)! }));
  const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  const met = ns.filter((x) => x.n.state === "passed" || x.n.state === "practising").map((x) => low(x.m.short));
  const todo = ns.filter((x) => x.n.state !== "passed" && x.n.state !== "practising").map((x) => low(x.m.short));
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
  const parts = [met.length ? `${list(met)} met` : "", todo.length ? `${list(todo)} still to come` : ""].filter(Boolean);
  return `Phase ${phase} — ${parts.join("; ")}.`;
}

/* --------------------------------------------------------------- the bell */

export const BELL_SIZES_KG = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48] as const;

/** Snap to the nearest standard bell, then step `steps` sizes up (negative = down). */
export function bellStep(kg: number, steps: number): number {
  let i = 0;
  let best = Infinity;
  BELL_SIZES_KG.forEach((s, k) => {
    if (Math.abs(s - kg) < best) { best = Math.abs(s - kg); i = k; }
  });
  return BELL_SIZES_KG[Math.max(0, Math.min(BELL_SIZES_KG.length - 1, i + steps))]!;
}

/** All kg numbers in a free-text "bell weights" answer ("16 kg, 20 kg pair", "35 lb"). */
export function parseBells(text: string | null | undefined): number[] {
  if (!text) return [];
  const out: number[] = [];
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(kg|lb|lbs|pounds?)?/gi)) {
    const n = Number(m[1]);
    if (!n) continue;
    out.push(/lb|pound/i.test(m[2] ?? "") ? Math.round(n * 0.4536) : n);
  }
  return out.filter((n) => n >= 2 && n <= 64);
}

export interface BellAdvice {
  light: number;
  moderate: number;
  from: "selector" | "profile" | "default";
}

/**
 * "Moderate weight (for you)": one bell size up from the Kettlebell Selector's suggestion (else the
 * lightest bell in the training profile, else 12 kg), one size down per recent "too hard".
 * "Light" (and the Phase 2 carry's "low to medium") is the suggestion itself.
 */
export function bellAdvice(opts: { selectorKg?: number | null; profileBells?: string | null; tooHard?: number }): BellAdvice {
  const profile = parseBells(opts.profileBells);
  const base = opts.selectorKg ?? (profile.length ? Math.min(...profile) : null);
  const from: BellAdvice["from"] = opts.selectorKg ? "selector" : profile.length ? "profile" : "default";
  const light = bellStep(base ?? 12, 0);
  const moderate = Math.max(light, bellStep(light, 1 - Math.max(0, opts.tooHard ?? 0)));
  return { light, moderate, from };
}

export const bellFor = (bm: Pick<RoadmapBenchmark, "load">, advice: BellAdvice): number | null =>
  bm.load === "bodyweight" ? null : bm.load === "moderate" ? advice.moderate : advice.light;

/* --------------------------------------------------------------- phase sessions */

export interface SessionVideo { providerId: string; hash: string | null; title: string; seconds: number }

/** KBL / Working In videos the session plays (from the DB; v2 can move these to a table). */
export const SESSION_VIDEOS = {
  warmup: {
    1: { providerId: "406099916", hash: "7e5f6c90e5", title: "Phase I Kettlebell Warm Up", seconds: 312 },
    2: { providerId: "412078800", hash: "b9340a5df1", title: "Phase II Kettlebell Warm Up", seconds: 550 },
    3: { providerId: "414021970", hash: "9104693365", title: "Phase III Kettlebell Warm Up", seconds: 310 },
    4: { providerId: "414021970", hash: "9104693365", title: "Phase III Kettlebell Warm Up", seconds: 310 },
  } as Record<RoadmapPhase, SessionVideo>,
  breath: { providerId: "898689937", hash: "767600fdb6", title: "Breathe Light", seconds: 321 },
  decompress: { providerId: "394830858", hash: "73fb8f7c53", title: "Spinal Roll Down with Chest Opener", seconds: 247 },
  spine: { providerId: "897966439", hash: "13988faf43", title: "Spine decompression", seconds: 129 },
  followAlong: { providerId: "412071887", hash: "e309bdb20a", title: "Phase II Workout I (follow-along)", seconds: 1919 },
} as const;

export const SESSION_TIMING = { teachSeconds: 45, workSeconds: 20, restSeconds: 10, rounds: 4, changeSeconds: 30 } as const;

export type SessionBlock =
  | { kind: "warmup" | "breath" | "decompress"; title: string; seconds: number; video: SessionVideo }
  | {
      kind: "movement";
      title: string;
      seconds: number;
      movement: string;
      level1: string;
      level2: string;
      /** The member's track: learning → Level I, practising/passed/mastery → Level II. */
      track: 1 | 2;
      rounds: number;
      work: number;
      rest: number;
      teach: number;
    };

export interface PhaseSession {
  phase: RoadmapPhase;
  recovery: boolean;
  blocks: SessionBlock[];
  totalSeconds: number;
  checks: { rule: string; ok: boolean }[];
}

export type RoadmapReadiness = "workout" | "recovery" | "rest" | null;

/**
 * The rules-built follow-along (v1, no AI). Warm-up (KBL) → breath training → 2–4 movement blocks from
 * the member's open nodes in the current phase (two tracks, Level I / Level II) → decompression.
 * Today's KBL readiness carries over: a Recovery (or rest) day is breath + decompression only.
 */
export function buildPhaseSession(cat: RoadmapCatalog, nodes: NodeInfo[], readiness: RoadmapReadiness = null): PhaseSession {
  const phase = currentPhase(nodes);
  const recovery = readiness === "recovery" || readiness === "rest";
  const T = SESSION_TIMING;
  const blocks: SessionBlock[] = [];
  if (!recovery) blocks.push({ kind: "warmup", title: "Warm-up", seconds: SESSION_VIDEOS.warmup[phase].seconds, video: SESSION_VIDEOS.warmup[phase] });
  blocks.push({ kind: "breath", title: "Breath training", seconds: SESSION_VIDEOS.breath.seconds, video: SESSION_VIDEOS.breath });
  if (!recovery) {
    const state = new Map(nodes.map((n) => [n.key, n]));
    const rank = (s: NodeState) => (s === "practising" ? 0 : s === "learning" ? 1 : 2);
    const inPhase = phaseMovements(cat, phase).filter((m) => state.get(m.key)?.state !== "locked" && state.get(m.key)?.state !== "passed");
    // Open nodes in later phases (movement-by-movement unlocks) come after, then passed ones for practice.
    const ahead = cat.movements.filter((m) => m.phase > phase && m.phase < 4 && state.get(m.key) && state.get(m.key)!.state !== "locked" && state.get(m.key)!.state !== "passed");
    const passed = phaseMovements(cat, phase).filter((m) => state.get(m.key)?.state === "passed");
    const pick = [...inPhase.sort((a, c) => rank(state.get(a.key)!.state) - rank(state.get(c.key)!.state) || a.position - c.position), ...ahead, ...passed].slice(0, 4);
    if (pick.length < 2) {
      for (const m of cat.movements.filter((x) => x.phase < phase || x.phase === 4)) {
        if (pick.length >= 2) break;
        if (state.get(m.key)?.state !== "locked" && !pick.includes(m)) pick.push(m);
      }
    }
    for (const m of pick) {
      const s = state.get(m.key)?.state ?? "learning";
      blocks.push({
        kind: "movement", title: m.name, movement: m.key, level1: m.easier, level2: m.harder, track: s === "learning" ? 1 : 2,
        rounds: T.rounds, work: T.workSeconds, rest: T.restSeconds, teach: T.teachSeconds,
        seconds: T.teachSeconds + T.rounds * (T.workSeconds + T.restSeconds) + T.changeSeconds,
      });
    }
  }
  blocks.push({ kind: "decompress", title: "Decompression stretches", seconds: SESSION_VIDEOS.decompress.seconds, video: SESSION_VIDEOS.decompress });
  if (recovery) blocks.push({ kind: "decompress", title: "Spine decompression", seconds: SESSION_VIDEOS.spine.seconds, video: SESSION_VIDEOS.spine });
  return { phase, recovery, blocks, totalSeconds: blocks.reduce((s, x) => s + x.seconds, 0), checks: sessionChecks(cat, nodes, blocks, recovery) };
}

/** The fixed rules every session must pass before it is shown (the AI in v2 is checked by the same). */
export function sessionChecks(cat: RoadmapCatalog, nodes: NodeInfo[], blocks: SessionBlock[], recovery: boolean) {
  const state = new Map(nodes.map((n) => [n.key, n.state]));
  const moves = blocks.filter((x): x is Extract<SessionBlock, { kind: "movement" }> => x.kind === "movement");
  return [
    { rule: "Only open movements", ok: moves.every((x) => state.get(x.movement) && state.get(x.movement) !== "locked" && !!movementOf(cat, x.movement)) },
    { rule: "Warm-up first", ok: recovery || blocks[0]?.kind === "warmup" },
    { rule: "Breath training", ok: blocks.some((x) => x.kind === "breath") },
    { rule: "Decompression last", ok: blocks.at(-1)?.kind === "decompress" },
    { rule: recovery ? "Recovery day: no loaded work" : "2–4 movement blocks", ok: recovery ? moves.length === 0 : moves.length >= 2 && moves.length <= 4 },
  ];
}

export type TimelineStep = {
  block: number;
  kind: "video" | "teach" | "work" | "rest" | "change";
  label: string;
  seconds: number;
  round?: number;
};

/** The player's timeline: video blocks play through; movement blocks run teach → (work, rest) × rounds → change. */
export function sessionTimeline(s: PhaseSession): TimelineStep[] {
  const out: TimelineStep[] = [];
  s.blocks.forEach((x, i) => {
    if (x.kind !== "movement") return void out.push({ block: i, kind: "video", label: x.title, seconds: x.seconds });
    out.push({ block: i, kind: "teach", label: "Teaching set: 5–10 easy reps", seconds: x.teach });
    for (let r = 1; r <= x.rounds; r++) {
      out.push({ block: i, kind: "work", label: "Work", seconds: x.work, round: r });
      out.push({ block: i, kind: "rest", label: r === x.rounds ? "Rest" : "Rest", seconds: x.rest, round: r });
    }
    out.push({ block: i, kind: "change", label: "Change over", seconds: SESSION_TIMING.changeSeconds });
  });
  return out;
}

/* --------------------------------------------------------------- hand-offs */

/** Next program after the Roadmap: Phase 1–2 → KBL Level I, Phase 3 → KBL Level II, Phase 4 → Mastering the Kettlebell. */
export function roadmapHandoff(phase: RoadmapPhase): { slug: string; path: string | null; label: string } {
  if (phase <= 2) return { slug: "kettlebell-lifestyle", path: "beginner", label: "Kettlebell Lifestyle Level I" };
  if (phase === 3) return { slug: "kettlebell-lifestyle", path: "intermediate", label: "Kettlebell Lifestyle Level II" };
  return { slug: "mastering-the-kettlebell", path: null, label: "Mastering the Kettlebell" };
}

/* --------------------------------------------------------------- seed */

const q = (v: unknown) => (v == null ? "null" : typeof v === "number" || typeof v === "boolean" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const arr = (xs: string[]) => (xs.length ? `array[${xs.map(q).join(",")}]::text[]` : "'{}'::text[]");

/** INSERT … ON CONFLICT DO NOTHING for both content tables (the 0038 seed; Mike's later edits are kept). */
export function roadmapSeedSql(cat: RoadmapCatalog = ROADMAP_CATALOG): string {
  const mv = cat.movements.map((m) =>
    `(${[q(m.key), m.phase, m.position, q(m.name), q(m.short), q(m.kind), q(m.fallback?.name ?? null), q(m.fallback?.when ?? null), arr(m.unlockAfter), q(m.easier), q(m.harder),
      q(m.clip?.providerId ?? null), q(m.clip?.hash ?? null), q(m.clip?.thumb ?? null), q(m.clip?.seconds ?? null), q(m.clipNote ?? null), q(m.mtk), q(m.practise), m.nasal, !!m.swingSetup].join(", ")})`).join(",\n");
  const bm = cat.benchmarks.map((x) =>
    `(${[q(x.key), q(x.movement), x.phase, x.position, q(x.label), q(x.measure), x.reps, q(x.repsMax ?? null), x.sets, x.eachSide, x.restSeconds, q(x.distanceYards ?? null), q(x.load), q(x.standard), q(x.how)].join(", ")})`).join(",\n");
  return `insert into public.roadmap_movements (key, phase, position, name, short_name, kind, fallback_name, fallback_when, unlock_after, pair_easier, pair_harder, clip_provider_id, clip_hash, clip_thumb, clip_seconds, clip_note, mtk_tag, practise, nasal_breathing, swing_setup) values
${mv}
on conflict (key) do nothing;

insert into public.roadmap_benchmarks (key, movement_key, phase, position, label, measure, reps, reps_max, sets, each_side, rest_seconds, distance_yards, load, standard, how_measured) values
${bm}
on conflict (key) do nothing;
`;
}
