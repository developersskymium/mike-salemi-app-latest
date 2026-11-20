"use server";

import { revalidatePath } from "next/cache";
import { finishPhaseSession, logAttempt, saveNodeStates, savePlacement, startPhaseSession, type AttemptWrite } from "@ms/api";
import { buildPhaseSession, newlyPassed, nodeStates, type RoadmapPhase } from "@ms/core";
import { loadRoadmap, mockLogAttempt, mockSavePlacement } from "@/lib/loaders/roadmap";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/**
 * Kettlebell Roadmap Coach writes. The member writes only their own rows (RLS); the pass rule and
 * node states are computed by @ms/core from the attempts, never sent by the client.
 */
export type RmResult<T> = ({ ok: true } & T) | { ok: false; message: string };

const fail = (e: unknown) => ({ ok: false as const, message: e instanceof Error ? e.message.replace(/^[a-zA-Z]+: /, "") : String(e) });
const dayOk = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

function clean(a: AttemptWrite, source: AttemptWrite["source"]): AttemptWrite {
  if (!dayOk(a.day)) throw new Error("bad day");
  return {
    benchmark: String(a.benchmark), movement: String(a.movement), day: a.day, passed: !!a.passed && !a.stopped,
    setReps: (a.setReps ?? []).slice(0, 20).map((n) => Math.max(0, Math.min(999, Math.round(Number(n) || 0)))),
    nasal: !!a.nasal, variant: a.variant === "fallback" ? "fallback" : "main", bellKg: a.bellKg == null ? null : Number(a.bellKg),
    effort: a.effort === "easy" || a.effort === "ok" || a.effort === "too_hard" ? a.effort : null, stopped: !!a.stopped, source,
  };
}

/** Save the placement test (answers, the phase, the benchmarks run) and refresh the node-state cache. */
export async function savePlacementAction(p: {
  answers: Record<string, unknown>; overheadOk: boolean | null; startPhase: number | null; resultPhase: RoadmapPhase;
  status: "done" | "blocked_pain" | "stopped"; attempts: AttemptWrite[];
}): Promise<RmResult<{ summary: string | null }>> {
  try {
    const attempts = p.attempts.slice(0, 40).map((a) => clean(a, "placement"));
    const resultPhase = Math.max(1, Math.min(4, Math.round(p.resultPhase))) as RoadmapPhase;
    const payload = { answers: p.answers, overheadOk: p.overheadOk, startPhase: p.startPhase, resultPhase, status: p.status, attempts };
    if (MOCK) await mockSavePlacement(payload);
    else {
      const { supabase, user } = await getUser();
      if (!user) throw new Error("Please sign in again.");
      await savePlacement(supabase, user.id, payload);
      const v = await loadRoadmap();
      if (v) await saveNodeStates(supabase, user.id, nodeStates(v, { phase: resultPhase }, v.attempts), v.variants).catch(() => undefined);
    }
    revalidatePath("/tools/roadmap");
    const v = await loadRoadmap();
    return { ok: true, summary: v?.summary ?? null };
  } catch (e) {
    return fail(e);
  }
}

/** Log a re-test; returns what it unlocked (movements passed, nodes opened, phases passed). */
export async function logRetestAction(a: AttemptWrite): Promise<RmResult<{ passed: string[]; opened: string[]; phases: number[] }>> {
  try {
    const before = await loadRoadmap();
    if (!before) throw new Error("Please sign in again.");
    if (!before.member) throw new Error("Re-tests are part of membership.");
    const row = clean(a, "retest");
    if (!before.benchmarks.some((b) => b.key === row.benchmark && b.movement === row.movement)) throw new Error("Unknown benchmark.");
    const cat = { movements: before.movements, benchmarks: before.benchmarks };
    const placed = before.placement ? { phase: before.placement.result_phase as RoadmapPhase } : null;
    const attempt = { ...row, check: null, at: new Date().toISOString() };
    const after = nodeStates(cat, placed, [...before.attempts, attempt]);
    if (MOCK) await mockLogAttempt(row);
    else {
      const { supabase, user } = await getUser();
      if (!user) throw new Error("Please sign in again.");
      await logAttempt(supabase, user.id, row);
      await saveNodeStates(supabase, user.id, after, { ...before.variants, [row.movement]: row.variant }).catch(() => undefined);
    }
    revalidatePath("/tools/roadmap");
    const diff = newlyPassed(before.nodes, after);
    return { ok: true, passed: diff.movements, opened: diff.opened, phases: diff.phases };
  } catch (e) {
    return fail(e);
  }
}

/** Record a phase session (the plan is rebuilt on the server from the rules, never taken from the client). */
export async function startSessionAction(): Promise<RmResult<{ id: string | null }>> {
  try {
    const v = await loadRoadmap();
    if (!v?.member) throw new Error("Phase sessions are part of membership.");
    const s = buildPhaseSession(v, v.nodes, v.readiness);
    if (MOCK) return { ok: true, id: null };
    const { supabase, user } = await getUser();
    if (!user) throw new Error("Please sign in again.");
    return { ok: true, id: await startPhaseSession(supabase, user.id, { phase: s.phase, plan: s, checks: s.checks, readiness: v.readiness }) };
  } catch (e) {
    return fail(e);
  }
}

export async function finishSessionAction(id: string | null, status: "done" | "stopped", done: { seconds: number; reason?: string }): Promise<RmResult<object>> {
  try {
    if (MOCK || !id) return { ok: true };
    const { supabase, user } = await getUser();
    if (!user) throw new Error("Please sign in again.");
    await finishPhaseSession(supabase, user.id, id, status, { seconds: Math.round(done.seconds), reason: done.reason?.slice(0, 200) ?? null });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
