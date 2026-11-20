import type { ReadinessForm, WorkoutTable } from "@ms/core";
import type { DB } from "./client";

export async function getForm(sb: DB, formId: string): Promise<ReadinessForm | null> {
  const { data, error } = await sb
    .from("forms")
    .select("*, form_questions(*), form_bands(*)")
    .eq("id", formId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    maxScore: data.max_score,
    defaultTableId: data.default_table_id,
    questions: data.form_questions
      .sort((a, b) => a.position - b.position)
      .map((q) => ({
        key: q.key,
        position: q.position,
        prompt: q.prompt,
        note: (q.note as ReadinessForm["questions"][number]["note"]) ?? null,
        options: q.options as unknown as ReadinessForm["questions"][number]["options"],
      })),
    bands: data.form_bands
      .sort((a, b) => a.position - b.position)
      .map((b) => ({
        name: b.name, band: b.band as "green" | "amber" | "red", outcome: b.outcome, tableId: b.table_id, message: b.message,
        minScore: b.min_score, maxScore: b.max_score, position: b.position,
      })),
  };
}

export async function getWorkoutTable(sb: DB, tableId: string): Promise<WorkoutTable | null> {
  const { data } = await sb.from("workout_tables").select("*").eq("id", tableId).maybeSingle();
  if (!data) return null;
  return { id: data.id, title: data.title, rows: data.rows as unknown as WorkoutTable["rows"], notes: data.notes, images: data.images as unknown as WorkoutTable["images"] };
}

export async function submitReadiness(sb: DB, lessonId: string, answers: Record<string, string>) {
  const { data, error } = await sb.rpc("submit_readiness", { p_lesson: lessonId, p_answers: answers });
  if (error) throw new Error(error.message);
  return data as unknown as {
    result_id: string; score: number; band_name: string; band: string; outcome: "workout" | "recovery" | "rest";
    table_id: string | null; message: string; lesson_done?: boolean; section_done?: boolean; path_done?: boolean;
  };
}

/** Latest readiness result for a lesson (with the prescription snapshot). */
export async function latestReadiness(sb: DB, userId: string, lessonId: string) {
  const { data } = await sb
    .from("readiness_results")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
