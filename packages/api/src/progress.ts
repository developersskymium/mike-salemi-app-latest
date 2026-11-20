import type { LearningMode } from "@ms/core";
import type { DB } from "./client";

export interface StepResult {
  step_id: string;
  lesson_id: string;
  lesson_done?: boolean;
  section_done?: boolean;
  path_done?: boolean;
  section_id?: string;
  certificate_id?: string | null;
}

export async function enroll(sb: DB, programId: string, pathId: string | null, mode: LearningMode = "immersion") {
  const { data, error } = await sb.rpc("enroll", { p_program: programId, p_path: pathId ?? undefined, p_mode: mode });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function completeStep(sb: DB, stepId: string, via: "button" | "watched" | "sync" = "button") {
  const { data, error } = await sb.rpc("complete_step", { p_step: stepId, p_via: via });
  if (error) throw new Error(error.message);
  return data as unknown as StepResult;
}

export async function uncompleteStep(sb: DB, stepId: string) {
  const { error } = await sb.rpc("uncomplete_step", { p_step: stepId });
  if (error) throw new Error(error.message);
}

export async function lessonState(sb: DB, lessonId: string) {
  const { data, error } = await sb.rpc("lesson_state", { p_lesson: lessonId });
  if (error) throw new Error(error.message);
  return data as unknown as {
    access: boolean; locked_order?: boolean; unlocked?: boolean; open_through?: number; completed_steps?: string[]; done?: boolean;
  };
}

export async function restartPath(sb: DB, programId: string, pathId: string | null) {
  const { data, error } = await sb.rpc("restart_path", { p_program: programId, p_path: pathId ?? undefined });
  if (error) throw new Error(error.message);
  return data as unknown as { run_number: number; archived_lessons: number };
}

/** Completed step ids for one program (for rendering maps and players). */
export async function completedSteps(sb: DB, userId: string, lessonIds: string[]) {
  if (!lessonIds.length) return new Set<string>();
  const { data, error } = await sb.from("step_progress").select("step_id").eq("user_id", userId).in("lesson_id", lessonIds);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.step_id));
}

/** Cross-device resume: which step the member is on and video positions. */
export async function savePosition(
  sb: DB,
  userId: string,
  lessonId: string,
  patch: { activeStepId?: string | null; videoSeconds?: Record<string, number>; draftAnswers?: Record<string, string> | null },
) {
  const { error } = await sb.from("lesson_positions").upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      ...(patch.activeStepId !== undefined ? { active_step_id: patch.activeStepId } : {}),
      ...(patch.videoSeconds ? { video_seconds: patch.videoSeconds } : {}),
      ...(patch.draftAnswers !== undefined ? { draft_answers: patch.draftAnswers } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );
  if (error) throw new Error(error.message);
}

export async function getPosition(sb: DB, userId: string, lessonId: string) {
  const { data } = await sb.from("lesson_positions").select("*").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();
  return data;
}

export async function myEnrollments(sb: DB) {
  const { data, error } = await sb.rpc("my_enrollments");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Has this marker (celebration, start/end-of-day screen) been seen on any device? Marks it if not. */
export async function markSeenOnce(sb: DB, userId: string, key: string) {
  const { error } = await sb.from("seen_markers").insert({ user_id: userId, key });
  return !error; // true = first time (show it); duplicate key = already seen
}
