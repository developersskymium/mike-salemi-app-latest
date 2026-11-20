"use server";

import { completeStep, enroll, savePosition, uncompleteStep } from "@ms/api";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/**
 * Course player writes. Typed results instead of throws, so the player keeps its optimistic
 * state when offline and rolls back when the server refuses.
 */
export type CourseError = { ok: false; code: "offline" | "rule" | "auth"; message: string };
export type CourseResult<T = object> = ({ ok: true } & T) | CourseError;

function fail(e: unknown): CourseError {
  const message = e instanceof Error ? e.message : String(e);
  if (MOCK || /fetch failed|network|ENOTFOUND|ECONN|timeout/i.test(message)) {
    return { ok: false, code: "offline", message: "Couldn't reach the server. Your progress will save when you're back online." };
  }
  if (/not signed in/i.test(message)) return { ok: false, code: "auth", message: "Please sign in again." };
  if (/no access/i.test(message)) return { ok: false, code: "rule", message: "This lesson needs the program or a membership." };
  return { ok: false, code: "rule", message };
}

async function session() {
  if (MOCK) throw new Error("preview mode");
  const { supabase, user } = await getUser();
  if (!user) throw new Error("not signed in");
  return { supabase, user };
}

/**
 * Completes every required step of a lesson that isn't done yet (in order), and enrols the member
 * in the course (self-guided) on their first completion so it shows on Today and Programs.
 */
export async function completeLessonAction(
  programId: string,
  lessonId: string,
  via: "button" | "watched" = "button",
): Promise<CourseResult<{ lessonDone: boolean; certificateId: string | null }>> {
  try {
    const { supabase, user } = await session();
    const [{ data: steps, error }, { data: done }, { data: enr }] = await Promise.all([
      supabase.from("steps").select("id, position, is_required, special").eq("lesson_id", lessonId).order("position"),
      supabase.from("step_progress").select("step_id").eq("user_id", user.id).eq("lesson_id", lessonId),
      supabase.from("enrollments").select("id").eq("user_id", user.id).eq("program_id", programId).limit(1),
    ]);
    if (error) throw new Error(error.message);
    if (!(enr ?? []).length) await enroll(supabase, programId, null, "self_guided").catch(() => null);
    const have = new Set((done ?? []).map((r) => r.step_id));
    let lessonDone = false;
    let certificateId: string | null = null;
    for (const s of steps ?? []) {
      if (!s.is_required || have.has(s.id) || s.special === "readiness") continue;
      const r = await completeStep(supabase, s.id, via);
      if (r.lesson_done) lessonDone = true;
      if (r.certificate_id) certificateId = r.certificate_id;
    }
    return { ok: true, lessonDone, certificateId };
  } catch (e) {
    return fail(e);
  }
}

/** "Mark as not done": clears the lesson's completed steps. */
export async function uncompleteLessonAction(lessonId: string): Promise<CourseResult> {
  try {
    const { supabase, user } = await session();
    const { data } = await supabase.from("step_progress").select("step_id").eq("user_id", user.id).eq("lesson_id", lessonId);
    for (const r of data ?? []) await uncompleteStep(supabase, r.step_id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Last-lesson memory (cross-device) and video resume positions. */
export async function touchLessonAction(lessonId: string, stepId: string | null, videoSeconds?: Record<string, number>): Promise<CourseResult> {
  try {
    const { supabase, user } = await session();
    await savePosition(supabase, user.id, lessonId, { activeStepId: stepId, ...(videoSeconds ? { videoSeconds } : {}) });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
