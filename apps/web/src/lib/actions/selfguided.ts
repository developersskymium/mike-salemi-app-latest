"use server";

import { revalidatePath } from "next/cache";
import {
  startSession,
  customSession, enroll, endSession, logDayCompletion, quickSession, repeatSession, saveDayNote, saveTrainingPlan, sessionProgress, setSessionFavourite,
  librarySession,
} from "@ms/api";
import type { Intent } from "@ms/core";
import { fixture, MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import type { SessionPlayerData } from "@/lib/loaders/selfguided";

/**
 * Self-Guided writes. Typed results instead of throws (same contract as actions/training.ts):
 * "offline" keeps optimistic UI, "rule" rolls back with a friendly message.
 * In preview mode (MOCK_DATA=1) writes succeed locally against the fixtures.
 */
export type SgError = { ok: false; code: "offline" | "rule" | "auth"; message: string };
export type SgResult<T> = ({ ok: true } & T) | SgError;

function fail(e: unknown): SgError {
  const message = e instanceof Error ? e.message : String(e);
  if (/fetch failed|network|ENOTFOUND|ECONN|timeout/i.test(message)) {
    return { ok: false, code: "offline", message: "Couldn't reach the server. We'll save it when you're back online." };
  }
  if (/not signed in/i.test(message)) return { ok: false, code: "auth", message: "Please sign in again." };
  if (/no access/i.test(message)) return { ok: false, code: "rule", message: "This needs a membership or the program." };
  if (/finish the required steps/i.test(message)) return { ok: false, code: "rule", message: "Finish the day's steps first, then log it." };
  return { ok: false, code: "rule", message: message.replace(/^[a-z ]+: /, "") };
}

async function session() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("not signed in");
  return { supabase, user };
}

const mockSessionId = async () => (await fixture<SessionPlayerData>("selfguided-session")).session.id;

/** Opening a day starts (or resumes) its session; called by SessionAutoStart. */
export async function startSessionAction(lessonId: string): Promise<SgResult<{ sessionId: string | null }>> {
  try {
    if (MOCK) return { ok: true, sessionId: null };
    const { supabase } = await session();
    return { ok: true, sessionId: await startSession(supabase, lessonId) };
  } catch (e) {
    return fail(e);
  }
}

export async function quickSessionAction(programId: string, minutes: number, intent: Intent | null, pathId: string | null): Promise<SgResult<{ sessionId: string }>> {
  try {
    if (MOCK) return { ok: true, sessionId: await mockSessionId() };
    const { supabase } = await session();
    const r = await quickSession(supabase, programId, minutes, intent, pathId);
    return { ok: true, sessionId: r.sessionId };
  } catch (e) {
    return fail(e);
  }
}

export async function customSessionAction(programId: string, stepIds: string[], title: string | null): Promise<SgResult<{ sessionId: string }>> {
  try {
    if (!stepIds.length) return { ok: false, code: "rule", message: "Pick at least one step." };
    if (MOCK) return { ok: true, sessionId: await mockSessionId() };
    const { supabase } = await session();
    const r = await customSession(supabase, programId, stepIds, title);
    return { ok: true, sessionId: r.sessionId };
  } catch (e) {
    return fail(e);
  }
}

/** Library: "Do this as a session". */
export async function librarySessionAction(videoId: string): Promise<SgResult<{ sessionId: string }>> {
  try {
    if (MOCK) return { ok: true, sessionId: await mockSessionId() };
    const { supabase } = await session();
    return { ok: true, sessionId: (await librarySession(supabase, videoId)).sessionId };
  } catch (e) {
    return fail(e);
  }
}

export async function repeatSessionAction(sessionId: string): Promise<SgResult<{ sessionId: string | null; lessonId: string | null; lessonKey: string | null }>> {
  try {
    if (MOCK) return { ok: true, sessionId: await mockSessionId(), lessonId: null, lessonKey: null };
    const { supabase } = await session();
    return { ok: true, ...(await repeatSession(supabase, sessionId)) };
  } catch (e) {
    return fail(e);
  }
}

export async function sessionProgressAction(sessionId: string, item: string, patch: { done?: boolean; video?: string; seconds?: number }): Promise<SgResult<object>> {
  try {
    if (MOCK) return { ok: true };
    const { supabase } = await session();
    await sessionProgress(supabase, sessionId, item, patch);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function endSessionAction(sessionId: string, minutes: number | null, notes: string | null, slug: string): Promise<SgResult<{ minutes: number; streak: number; sessionsToday: number }>> {
  try {
    if (MOCK) return { ok: true, minutes: minutes ?? 20, streak: 27, sessionsToday: 1 };
    const { supabase } = await session();
    const r = await endSession(supabase, sessionId, minutes, notes);
    revalidatePath(`/programs/${slug}`);
    return { ok: true, minutes: r.minutes, streak: r.streak, sessionsToday: r.sessionsToday };
  } catch (e) {
    return fail(e);
  }
}

export async function favouriteAction(sessionId: string, on: boolean): Promise<SgResult<object>> {
  try {
    if (MOCK) return { ok: true };
    const { supabase } = await session();
    await setSessionFavourite(supabase, sessionId, on);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** "Did it again": count another completion of a day whose steps are all done. */
export async function logCompletionAction(lessonId: string): Promise<SgResult<{ count: number; logged: boolean }>> {
  try {
    if (MOCK) return { ok: true, count: 2, logged: true };
    const { supabase } = await session();
    const r = await logDayCompletion(supabase, lessonId);
    return { ok: true, count: r.count, logged: r.logged };
  } catch (e) {
    return fail(e);
  }
}

export async function saveDayNoteAction(lessonId: string, body: string): Promise<SgResult<{ savedAt: string }>> {
  try {
    if (body.length > 4000) return { ok: false, code: "rule", message: "Notes can be up to 4,000 characters." };
    if (MOCK) return { ok: true, savedAt: new Date().toISOString() };
    const { supabase } = await session();
    return { ok: true, savedAt: await saveDayNote(supabase, lessonId, body) };
  } catch (e) {
    return fail(e);
  }
}

export async function savePlanAction(
  name: string,
  inputs: Record<string, unknown>,
  items: { date: string; lessonId: string; kind: "training" | "recovery"; note?: string }[],
  /** The level the plan trains: enrolled in Self-Guided first, so its days are open (an Immersion enrollment keeps them locked). */
  level?: { programId: string; pathId: string | null; slug: string },
): Promise<SgResult<{ planId: string }>> {
  try {
    if (!items.length) return { ok: false, code: "rule", message: "Build the plan first." };
    if (MOCK) return { ok: true, planId: "preview" };
    const { supabase } = await session();
    if (level) {
      await enroll(supabase, level.programId, level.pathId, "self_guided");
      revalidatePath(`/programs/${level.slug}`);
    }
    const planId = await saveTrainingPlan(supabase, name, inputs, items, items[0]?.date ?? null);
    revalidatePath("/plan");
    return { ok: true, planId };
  } catch (e) {
    return fail(e);
  }
}
