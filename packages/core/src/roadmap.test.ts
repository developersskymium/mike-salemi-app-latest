import { describe, expect, it } from "vitest";
import {
  ROADMAP_CATALOG as CAT, attemptMeets, bellAdvice, bellStep, buildPhaseSession, currentPhase, movementOf, newlyPassed, nextNode,
  nodeStates, parseBells, phasePassed, placementBlocked, placementNext, placementStart, placementSummary, roadmapHandoff,
  roadmapSeedSql, runOrder, scoreAttempt, sessionTimeline, type RoadmapAttempt,
} from "./roadmap";

const att = (benchmark: string, day: string, passed = true, nasal = true, extra: Partial<RoadmapAttempt> = {}): RoadmapAttempt => ({
  benchmark, movement: CAT.benchmarks.find((b) => b.key === benchmark)!.movement, day, passed, nasal, source: "retest", ...extra,
});
const state = (nodes: ReturnType<typeof nodeStates>, k: string) => nodes.find((n) => n.key === k)!.state;

describe("catalog", () => {
  it("has 4 phases, 20 nodes and benchmarks only for real movements", () => {
    expect(CAT.movements.filter((m) => m.phase === 1)).toHaveLength(5);
    expect(CAT.movements.filter((m) => m.phase === 2)).toHaveLength(4);
    expect(CAT.movements.filter((m) => m.phase === 3)).toHaveLength(6);
    expect(CAT.movements.filter((m) => m.phase === 4)).toHaveLength(5);
    for (const b of CAT.benchmarks) expect(movementOf(CAT, b.movement)?.phase).toBe(b.phase);
    for (const m of CAT.movements.filter((x) => x.phase < 4)) expect(CAT.benchmarks.some((b) => b.movement === m.key)).toBe(true);
    for (const m of CAT.movements) for (const k of m.unlockAfter) expect(movementOf(CAT, k)!.phase).toBeLessThan(m.phase);
  });
  it("puts the unnamed 4 × 8 benchmark on the Single Arm Swing and the lunge clip on Phase 3", () => {
    expect(CAT.benchmarks.find((b) => b.key === "p3-saswing")).toMatchObject({ movement: "sa-swing", sets: 4, reps: 8, restSeconds: 30, eachSide: true });
    expect(movementOf(CAT, "oh-lunge")!.clip?.providerId).toBe("730403243");
    expect(movementOf(CAT, "rack-lunge")!.clip).toBeNull();
  });
  it("runs bodyweight before loaded benchmarks", () => {
    const loads = runOrder(CAT, 1).map((b) => b.load);
    expect(loads.slice(0, 3)).toEqual(["bodyweight", "bodyweight", "bodyweight"]);
    expect(runOrder(CAT, 2).at(-1)!.load).toBe("moderate");
  });
  it("builds a seed with every row", () => {
    const sql = roadmapSeedSql();
    expect(sql.match(/\('/g)!.length).toBe(CAT.movements.length + CAT.benchmarks.length);
    expect(sql).toContain("Static Split Squat – Overhead Press");
  });
});

describe("scoring an attempt", () => {
  const swing = CAT.benchmarks.find((b) => b.key === "p2-swing")!;
  const press = CAT.benchmarks.find((b) => b.key === "p2-press")!;
  it("needs every set at target and the member's confirmation", () => {
    expect(scoreAttempt(swing, { setReps: [10, 10, 10, 10, 10], confirmed: true })).toBe(true);
    expect(scoreAttempt(swing, { setReps: [10, 10, 10, 10, 9], confirmed: true })).toBe(false);
    expect(scoreAttempt(swing, { setReps: [10, 10, 10, 10], confirmed: true })).toBe(false);
    expect(scoreAttempt(swing, { setReps: [10, 10, 10, 10, 10], confirmed: false })).toBe(false);
    expect(scoreAttempt(swing, { setReps: [10, 10, 10, 10, 10], confirmed: true, stopped: true })).toBe(false);
  });
  it("counts each side for each-arm benchmarks", () => {
    expect(scoreAttempt(press, { setReps: [7, 8, 10, 7], confirmed: true })).toBe(true);
    expect(scoreAttempt(press, { setReps: [7, 8], confirmed: true })).toBe(false);
  });
  it("needs nasal breathing in Phases 1 and 3 only, and refuses a failed camera check", () => {
    expect(attemptMeets(movementOf(CAT, "goblet-squat")!, att("p1-goblet", "2026-11-01", true, false))).toBe(false);
    expect(attemptMeets(movementOf(CAT, "two-hand-swing")!, att("p2-swing", "2026-11-01", true, false))).toBe(true);
    expect(attemptMeets(movementOf(CAT, "clean")!, att("p3-clean", "2026-11-01", true, true, { check: "close" }))).toBe(false);
  });
});

describe("node states and the pass rule", () => {
  it("starts a new member in Phase 1 with Phase 2+ locked", () => {
    const n = nodeStates(CAT, null, []);
    expect(state(n, "goblet-squat")).toBe("learning");
    expect(state(n, "two-hand-swing")).toBe("locked");
    expect(state(n, "snatch")).toBe("locked");
    expect(currentPhase(n)).toBe(1);
    expect(nextNode(n)!.key).toBe("body-integrity");
  });
  it("passes a movement only on 2 separate days", () => {
    const one = nodeStates(CAT, null, [att("p1-deadlift", "2026-11-01"), att("p1-deadlift", "2026-11-01")]);
    expect(state(one, "deadlift")).toBe("practising");
    expect(state(one, "two-hand-swing")).toBe("locked");
    const two = nodeStates(CAT, null, [att("p1-deadlift", "2026-11-01"), att("p1-deadlift", "2026-11-03")]);
    expect(state(two, "deadlift")).toBe("passed");
    // The next phase opens movement by movement: the swing opens after the deadlift, the press does not.
    expect(state(two, "two-hand-swing")).toBe("learning");
    expect(state(two, "standing-press")).toBe("locked");
    expect(currentPhase(two)).toBe(1);
  });
  it("needs every benchmark of a multi-benchmark node", () => {
    const n = nodeStates(CAT, null, ["p1-rollups", "p1-bridges"].flatMap((k) => [att(k, "2026-11-01"), att(k, "2026-11-02")]));
    expect(state(n, "body-integrity")).toBe("practising");
  });
  it("counts the PDF fallbacks (Halo) as a pass", () => {
    const n = nodeStates(CAT, null, [att("p1-press", "2026-11-01", true, true, { variant: "fallback" }), att("p1-press", "2026-11-02", true, true, { variant: "fallback" })]);
    expect(state(n, "hk-press")).toBe("passed");
  });
  it("credits phases below the placement and opens the placed phase", () => {
    const n = nodeStates(CAT, { phase: 2 }, [att("p2-swing", "2026-11-01")]);
    expect(phasePassed(n, 1)).toBe(true);
    expect(state(n, "two-hand-swing")).toBe("practising");
    expect(state(n, "farmers-carry")).toBe("learning");
    expect(state(n, "clean")).toBe("locked");
    expect(currentPhase(n)).toBe(2);
    expect(nextNode(n)!.key).toBe("two-hand-swing");
    expect(placementSummary(CAT, n)).toBe("Phase 2 — 2-hand swing met; standing press, farmer's carry and rack lunge still to come.");
  });
  it("opens Phase 4 as Mastery once Phase 3 is passed, and reports what changed", () => {
    const p3 = CAT.benchmarks.filter((b) => b.phase === 3);
    const before = nodeStates(CAT, { phase: 3 }, p3.slice(1).flatMap((b) => [att(b.key, "2026-11-01"), att(b.key, "2026-11-02")]).concat(att(p3[0]!.key, "2026-11-01")));
    expect(state(before, "snatch")).toBe("locked");
    const after = nodeStates(CAT, { phase: 3 }, p3.flatMap((b) => [att(b.key, "2026-11-01"), att(b.key, "2026-11-02")]));
    expect(state(after, "snatch")).toBe("practising");
    expect(currentPhase(after)).toBe(4);
    const diff = newlyPassed(before, after);
    expect(diff.phases).toEqual([3]);
    expect(diff.opened).toContain("snatch");
  });
});

describe("placement", () => {
  it("never tests with reported pain or injury", () => {
    expect(placementBlocked({ injury: "yes" })).toBe(true);
    expect(placementBlocked({ injury: "none" })).toBe(false);
  });
  it("starts one phase below the guess, and lower when in doubt", () => {
    expect(placementStart({ time: "3y-plus", guess: 3 })).toBe(2);
    expect(placementStart({ time: "3y-plus", guess: 4 })).toBe(3);
    expect(placementStart({ time: "1-3y", guess: 1 })).toBe(1);
    expect(placementStart({ time: "new", guess: 3 })).toBe(1);
    expect(placementStart({ time: "under-1y", guess: 4 })).toBe(2);
    expect(placementStart({ time: "3y-plus", guess: null })).toBe(1);
  });
  it("moves up on each pass and stops at the first clear fail", () => {
    const first = placementNext(CAT, 2, []);
    expect(first).toMatchObject({ done: false, phase: 2 });
    const p2 = runOrder(CAT, 2).length;
    const stop = placementNext(CAT, 2, [true, true, false]);
    expect(stop).toMatchObject({ done: true, phase: 2 });
    const up = placementNext(CAT, 2, Array(p2).fill(true));
    expect(up).toMatchObject({ done: false, phase: 3 });
    const all = placementNext(CAT, 2, Array(p2 + runOrder(CAT, 3).length).fill(true));
    expect(all).toMatchObject({ done: true, phase: 4 });
  });
  it("drops a phase when the very first test of a higher start fails", () => {
    const dropped = placementNext(CAT, 3, [false]);
    expect(dropped).toMatchObject({ done: false, phase: 2, dropped: true });
    const p2 = runOrder(CAT, 2).length;
    expect(placementNext(CAT, 3, [false, ...Array(p2).fill(true)])).toMatchObject({ done: true, phase: 3 });
    expect(placementNext(CAT, 3, [false, true, false])).toMatchObject({ done: true, phase: 2 });
    // Phase 1 has nowhere lower to go.
    expect(placementNext(CAT, 1, [false])).toMatchObject({ done: true, phase: 1 });
  });
});

describe("the bell", () => {
  it("parses the profile and steps standard sizes", () => {
    expect(parseBells("16 kg, 20 kg pair")).toEqual([16, 20]);
    expect(parseBells("35 lb")).toEqual([16]);
    expect(bellStep(16, 1)).toBe(18);
    expect(bellStep(23, 0)).toBe(22);
  });
  it("is one size up from the Selector, else the profile, and comes down when too hard", () => {
    expect(bellAdvice({ selectorKg: 12 })).toEqual({ light: 12, moderate: 14, from: "selector" });
    expect(bellAdvice({ profileBells: "16 kg, 20 kg pair" })).toEqual({ light: 16, moderate: 18, from: "profile" });
    expect(bellAdvice({})).toMatchObject({ light: 12, moderate: 14, from: "default" });
    expect(bellAdvice({ selectorKg: 12, tooHard: 1 }).moderate).toBe(12);
    expect(bellAdvice({ selectorKg: 12, tooHard: 3 }).moderate).toBe(12);
  });
});

describe("phase sessions", () => {
  it("follows warm-up → breath → 2–4 two-track blocks → decompression, and passes its checks", () => {
    const nodes = nodeStates(CAT, { phase: 2 }, [att("p2-swing", "2026-11-01")]);
    const s = buildPhaseSession(CAT, nodes);
    expect(s.blocks.map((x) => x.kind)).toEqual(["warmup", "breath", "movement", "movement", "movement", "movement", "decompress"]);
    const swing = s.blocks.find((x) => x.kind === "movement" && x.movement === "two-hand-swing");
    expect(swing).toMatchObject({ track: 2, level1: "Two Hand Deadlift", level2: "Two Hand Swing" });
    const carry = s.blocks.find((x) => x.kind === "movement" && x.movement === "farmers-carry");
    expect(carry).toMatchObject({ track: 1 });
    expect(s.checks.every((c) => c.ok)).toBe(true);
    const tl = sessionTimeline(s);
    expect(tl.filter((t) => t.kind === "work")).toHaveLength(4 * 4);
    expect(tl.reduce((a, t) => a + t.seconds, 0)).toBe(s.totalSeconds);
  });
  it("never uses locked movements", () => {
    const s = buildPhaseSession(CAT, nodeStates(CAT, null, []));
    for (const b of s.blocks) if (b.kind === "movement") expect(movementOf(CAT, b.movement)!.phase).toBe(1);
    expect(s.checks.every((c) => c.ok)).toBe(true);
  });
  it("turns a Recovery Day into breath + decompression only", () => {
    const s = buildPhaseSession(CAT, nodeStates(CAT, { phase: 2 }, []), "recovery");
    expect(s.recovery).toBe(true);
    expect(s.blocks.map((x) => x.kind)).toEqual(["breath", "decompress", "decompress"]);
    expect(s.checks.every((c) => c.ok)).toBe(true);
  });
});

it("hands off Phase 1–2 to KBL Level I, Phase 3 to Level II", () => {
  expect(roadmapHandoff(1).label).toBe("Kettlebell Lifestyle Level I");
  expect(roadmapHandoff(2).path).toBe("beginner");
  expect(roadmapHandoff(3).path).toBe("intermediate");
  expect(roadmapHandoff(4).slug).toBe("mastering-the-kettlebell");
});
