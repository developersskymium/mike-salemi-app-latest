import {
  ROADMAP_CATALOG, type NodeInfo, type RoadmapAttempt, type RoadmapBenchmark, type RoadmapCatalog, type RoadmapMovement, type RoadmapPhase,
} from "@ms/core";
import type { DB } from "./client";

/**
 * Kettlebell Roadmap Coach data (0038_roadmap_coach.sql). The tables are newer than database.types.ts,
 * so this module talks to them untyped and maps rows to the @ms/core types itself.
 */

type Q = {
  select: (c?: string) => Q; eq: (c: string, v: unknown) => Q; gte: (c: string, v: unknown) => Q; order: (c: string, o?: { ascending: boolean }) => Q;
  limit: (n: number) => Q; maybeSingle: () => Q; single: () => Q; insert: (v: unknown) => Q; upsert: (v: unknown, o?: unknown) => Q; update: (v: unknown) => Q;
  then: PromiseLike<{ data: unknown; error: { message: string } | null }>["then"];
};
const from = (sb: DB, t: string) => (sb as unknown as { from: (t: string) => Q }).from(t);

type MovementRow = {
  key: string; phase: number; position: number; name: string; short_name: string; kind: RoadmapMovement["kind"];
  fallback_name: string | null; fallback_when: string | null; unlock_after: string[] | null; pair_easier: string; pair_harder: string;
  clip_provider_id: string | null; clip_hash: string | null; clip_thumb: string | null; clip_seconds: number | null; clip_note: string | null;
  mtk_tag: RoadmapMovement["mtk"]; mtk_lesson_ids: string[] | null; practise: string | null; nasal_breathing: boolean; swing_setup: boolean;
};
type BenchmarkRow = {
  key: string; movement_key: string; phase: number; position: number; label: string; measure: RoadmapBenchmark["measure"]; reps: number;
  reps_max: number | null; sets: number; each_side: boolean; rest_seconds: number; distance_yards: number | null; load: RoadmapBenchmark["load"];
  standard: string | null; how_measured: string | null;
};

export type RoadmapMovementRow = RoadmapMovement & { mtkLessonIds: string[] | null };

const toMovement = (r: MovementRow): RoadmapMovementRow => ({
  key: r.key, phase: r.phase as RoadmapPhase, position: r.position, name: r.name, short: r.short_name, kind: r.kind,
  fallback: r.fallback_name ? { name: r.fallback_name, when: r.fallback_when ?? "" } : null,
  unlockAfter: r.unlock_after ?? [], easier: r.pair_easier, harder: r.pair_harder,
  clip: r.clip_provider_id ? { providerId: r.clip_provider_id, hash: r.clip_hash, thumb: r.clip_thumb, seconds: r.clip_seconds } : null,
  clipNote: r.clip_note ?? undefined, mtk: r.mtk_tag, practise: r.practise ?? "", nasal: r.nasal_breathing, swingSetup: r.swing_setup,
  mtkLessonIds: r.mtk_lesson_ids,
});
const toBenchmark = (r: BenchmarkRow): RoadmapBenchmark => ({
  key: r.key, movement: r.movement_key, phase: r.phase as RoadmapPhase, position: r.position, label: r.label, measure: r.measure, reps: r.reps,
  repsMax: r.reps_max ?? undefined, sets: r.sets, eachSide: r.each_side, restSeconds: r.rest_seconds, distanceYards: r.distance_yards ?? undefined,
  load: r.load, standard: r.standard ?? "", how: r.how_measured ?? "",
});

/** The content (Mike's edits included); falls back to the built-in catalog if the tables are empty. */
export async function roadmapCatalog(sb: DB): Promise<RoadmapCatalog & { movements: RoadmapMovementRow[] }> {
  const [m, b] = await Promise.all([
    from(sb, "roadmap_movements").select("*").order("phase").order("position"),
    from(sb, "roadmap_benchmarks").select("*").order("phase").order("position"),
  ]);
  if (m.error) throw new Error(`roadmapCatalog: ${m.error.message}`);
  if (b.error) throw new Error(`roadmapCatalog: ${b.error.message}`);
  const movements = ((m.data ?? []) as MovementRow[]).map(toMovement);
  if (!movements.length) return { ...ROADMAP_CATALOG, movements: ROADMAP_CATALOG.movements.map((x) => ({ ...x, mtkLessonIds: null })) };
  return { movements, benchmarks: ((b.data ?? []) as BenchmarkRow[]).map(toBenchmark) };
}

export interface RoadmapPlacementRow {
  id: string;
  answers: Record<string, unknown>;
  overhead_ok: boolean | null;
  start_phase: number | null;
  result_phase: number;
  status: "done" | "blocked_pain" | "stopped";
  created_at: string;
}

type AttemptRow = {
  benchmark_key: string; movement_key: string; day: string; passed: boolean; nasal: boolean; source: "placement" | "retest";
  variant: "main" | "fallback"; rep_check: RoadmapAttempt["check"]; effort: string | null; bell_kg: number | null; created_at: string; set_reps: number[];
};

export interface MyRoadmap {
  placement: RoadmapPlacementRow | null;
  attempts: (RoadmapAttempt & { effort: string | null; bellKg: number | null; at: string; setReps: number[] })[];
}

/** The member's latest placement and every attempt since it (older attempts belong to an earlier placement). */
export async function myRoadmap(sb: DB, userId: string): Promise<MyRoadmap> {
  const p = await from(sb, "roadmap_placements").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (p.error) throw new Error(`myRoadmap: ${p.error.message}`);
  const placement = (p.data ?? null) as RoadmapPlacementRow | null;
  let q = from(sb, "benchmark_attempts").select("*").eq("user_id", userId);
  if (placement) q = q.gte("created_at", placement.created_at);
  const a = await q.order("created_at", { ascending: true }).limit(1000);
  if (a.error) throw new Error(`myRoadmap: ${a.error.message}`);
  return {
    placement,
    attempts: ((a.data ?? []) as AttemptRow[]).map((r) => ({
      benchmark: r.benchmark_key, movement: r.movement_key, day: r.day, passed: r.passed, nasal: r.nasal, source: r.source, variant: r.variant,
      check: r.rep_check, effort: r.effort, bellKg: r.bell_kg, at: r.created_at, setReps: r.set_reps ?? [],
    })),
  };
}

export interface AttemptWrite {
  benchmark: string;
  movement: string;
  day: string;
  passed: boolean;
  setReps: number[];
  nasal: boolean;
  variant: "main" | "fallback";
  bellKg: number | null;
  effort: "easy" | "ok" | "too_hard" | null;
  stopped: boolean;
  source: "placement" | "retest";
}

const attemptRow = (userId: string, a: AttemptWrite, placementId: string | null) => ({
  user_id: userId, benchmark_key: a.benchmark, movement_key: a.movement, day: a.day, passed: a.passed, set_reps: a.setReps, nasal: a.nasal,
  variant: a.variant, bell_kg: a.bellKg, effort: a.effort, stopped: a.stopped, source: a.source, placement_id: placementId,
});

export async function savePlacement(
  sb: DB, userId: string,
  p: { answers: Record<string, unknown>; overheadOk: boolean | null; startPhase: number | null; resultPhase: RoadmapPhase; status: RoadmapPlacementRow["status"]; attempts: AttemptWrite[] },
): Promise<string> {
  const r = await from(sb, "roadmap_placements").insert({
    user_id: userId, answers: p.answers, overhead_ok: p.overheadOk, start_phase: p.startPhase, result_phase: p.resultPhase, status: p.status,
    benchmarks: p.attempts.map((a) => ({ key: a.benchmark, passed: a.passed })),
  }).select("id").single();
  if (r.error) throw new Error(`savePlacement: ${r.error.message}`);
  const id = (r.data as { id: string }).id;
  if (p.attempts.length) {
    const w = await from(sb, "benchmark_attempts").insert(p.attempts.map((a) => attemptRow(userId, a, id)));
    if (w.error) throw new Error(`savePlacement: ${w.error.message}`);
  }
  return id;
}

export async function logAttempt(sb: DB, userId: string, a: AttemptWrite): Promise<void> {
  const w = await from(sb, "benchmark_attempts").insert(attemptRow(userId, a, null));
  if (w.error) throw new Error(`logAttempt: ${w.error.message}`);
}

/** Cache of the computed node states, for Admin Studio ("where do members get stuck"). */
export async function saveNodeStates(sb: DB, userId: string, nodes: NodeInfo[], variants: Record<string, "main" | "fallback"> = {}): Promise<void> {
  const w = await from(sb, "roadmap_node_states").upsert(
    nodes.map((n) => ({ user_id: userId, movement_key: n.key, state: n.state, why: n.why, variant: variants[n.key] ?? "main", updated_at: new Date().toISOString() })),
    { onConflict: "user_id,movement_key" },
  );
  if (w.error) throw new Error(`saveNodeStates: ${w.error.message}`);
}

export async function startPhaseSession(sb: DB, userId: string, s: { phase: RoadmapPhase; plan: unknown; checks: unknown; readiness: string | null }): Promise<string> {
  const r = await from(sb, "phase_sessions").insert({ user_id: userId, phase: s.phase, plan: s.plan, checks: s.checks, readiness: s.readiness }).select("id").single();
  if (r.error) throw new Error(`startPhaseSession: ${r.error.message}`);
  return (r.data as { id: string }).id;
}

export async function finishPhaseSession(sb: DB, userId: string, id: string, status: "done" | "stopped", done: Record<string, unknown>): Promise<void> {
  const r = await from(sb, "phase_sessions").update({ status, done, finished_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  if (r.error) throw new Error(`finishPhaseSession: ${r.error.message}`);
}

/** Inputs for "moderate (for you)": the latest Kettlebell Selector bell, the training profile's bells. */
export async function roadmapBellInputs(sb: DB, userId: string): Promise<{ selectorKg: number | null; profileBells: string | null }> {
  const [t, p] = await Promise.all([
    from(sb, "tool_results").select("result").eq("user_id", userId).eq("tool_id", "kettlebell-selector").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    from(sb, "training_profiles").select("data").eq("user_id", userId).maybeSingle(),
  ]);
  const bells = ((t.data as { result?: { bells?: { size?: number }[] } } | null)?.result?.bells ?? []).map((x) => Number(x.size)).filter((n) => n > 0);
  const data = (p.data as { data?: { bell_weights?: string } } | null)?.data;
  return { selectorKg: bells.length ? Math.min(...bells) : null, profileBells: data?.bell_weights ?? null };
}

/** Today's KBL readiness outcome (any lesson), if the member checked in since `sinceIso` (start of their day). */
export async function readinessToday(sb: DB, userId: string, sinceIso: string): Promise<"workout" | "recovery" | "rest" | null> {
  const r = await from(sb, "readiness_results").select("outcome, created_at").eq("user_id", userId).gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return ((r.data as { outcome?: "workout" | "recovery" | "rest" } | null)?.outcome) ?? null;
}
