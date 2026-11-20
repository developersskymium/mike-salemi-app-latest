"use server";

import { revalidatePath } from "next/cache";
import { completeStep, enroll, markSeenOnce, restartPath, savePosition, scheduleImmersion, submitReadiness, uncompleteStep, type StepResult } from "@ms/api";
import type { LearningMode } from "@ms/core";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/**
 * Training writes. Every action returns a typed result instead of throwing so the UI can keep
 * its optimistic state on a network failure ("offline": retry later) and roll back when the
 * server refuses ("rule": locked day, previous step unfinished, no access).
 */
export type ActionError = { ok: false; code: "offline" | "rule" | "auth"; message: string };
export type ActionResult<T> = ({ ok: true } & T) | ActionError;

function fail(e: unknown): ActionError {
  const message = e instanceof Error ? e.message : String(e);
  if (MOCK || /fetch failed|network|ENOTFOUND|ECONN|timeout/i.test(message)) {
    return { ok: false, code: "offline", message: "Couldn't reach the server. Your progress will save when you're back online." };
  }
  if (/not signed in/i.test(message)) return { ok: false, code: "auth", message: "Please sign in again." };
  return { ok: false, code: "rule", message: friendly(message) };
}

function friendly(m: string) {
  if (/locked/i.test(m)) return "This day is still locked. Finish the days before it first.";
  if (/previous step/i.test(m)) return "Finish the previous step first.";
  if (/no access/i.test(m)) return "This needs a membership or the program.";
  if (/readiness steps complete/i.test(m)) return "Answer the readiness questions to complete this step.";
  return m;
}

async function session() {
  if (MOCK) throw new Error("preview mode");
  const { supabase, user } = await getUser();
  if (!user) throw new Error("not signed in");
  return { supabase, user };
}

export async function completeStepAction(stepId: string, via: "button" | "watched" = "button"): Promise<ActionResult<{ result: StepResult }>> {
  try {
    const { supabase } = await session();
    const result = await completeStep(supabase, stepId, via);
    return { ok: true, result };
  } catch (e) {
    return fail(e);
  }
}

export async function uncompleteStepAction(stepId: string): Promise<ActionResult<object>> {
  try {
    const { supabase } = await session();
    await uncompleteStep(supabase, stepId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export type ReadinessResultDTO = Awaited<ReturnType<typeof submitReadiness>>;

export async function submitReadinessAction(lessonId: string, answers: Record<string, string>): Promise<ActionResult<{ result: ReadinessResultDTO }>> {
  try {
    const { supabase } = await session();
    const result = await submitReadiness(supabase, lessonId, answers);
    return { ok: true, result };
  } catch (e) {
    return fail(e);
  }
}

export async function savePositionAction(
  lessonId: string,
  patch: { activeStepId?: string | null; videoSeconds?: Record<string, number>; draftAnswers?: Record<string, string> | null },
): Promise<ActionResult<object>> {
  try {
    const { supabase, user } = await session();
    await savePosition(supabase, user.id, lessonId, patch);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Start/end-of-day screens and celebrations show once per member across devices. */
export async function markSeenAction(key: string): Promise<ActionResult<{ first: boolean }>> {
  try {
    const { supabase, user } = await session();
    return { ok: true, first: await markSeenOnce(supabase, user.id, key) };
  } catch (e) {
    return fail(e);
  }
}

export async function enrollAction(programId: string, pathId: string | null, mode: LearningMode, slug: string): Promise<ActionResult<{ enrollmentId: string }>> {
  try {
    const { supabase } = await session();
    const enrollmentId = await enroll(supabase, programId, pathId, mode);
    revalidatePath(`/programs/${slug}`);
    return { ok: true, enrollmentId };
  } catch (e) {
    return fail(e);
  }
}

export async function scheduleImmersionAction(enrollmentId: string, days: number[], startsOn: string | null, slug: string): Promise<ActionResult<object>> {
  try {
    if (!days.length || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return { ok: false, code: "rule", message: "Pick at least one training day." };
    const { supabase } = await session();
    await scheduleImmersion(supabase, enrollmentId, days, startsOn);
    revalidatePath(`/programs/${slug}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function restartPathAction(programId: string, pathId: string | null, slug: string): Promise<ActionResult<{ runNumber: number }>> {
  try {
    const { supabase } = await session();
    const r = await restartPath(supabase, programId, pathId);
    revalidatePath(`/programs/${slug}`);
    return { ok: true, runNumber: r.run_number };
  } catch (e) {
    return fail(e);
  }
}

/** "Autoplay next" lives in profiles.preferences.autoplayNext (members may write their own preferences). */
export async function setAutoplayAction(on: boolean): Promise<ActionResult<object>> {
  try {
    const { supabase, user } = await session();
    const { data } = await supabase.from("profiles").select("preferences").eq("id", user.id).single();
    const prefs = (data?.preferences && typeof data.preferences === "object" ? data.preferences : {}) as Record<string, unknown>;
    const { error } = await supabase.from("profiles").update({ preferences: { ...prefs, autoplayNext: on } }).eq("id", user.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
