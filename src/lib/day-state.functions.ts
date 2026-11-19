import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Where the member is inside each training day, plus any unsubmitted answers. */
export const getDayStates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("day_state")
      .select("day_id, course_id, active_lesson_id, draft_answers, updated_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDayState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      courseId: string;
      dayId: string;
      activeLessonId?: string | null;
      draftAnswers?: Record<string, string>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("day_state").upsert(
      {
        user_id: context.userId,
        course_id: data.courseId,
        day_id: data.dayId,
        active_lesson_id: data.activeLessonId ?? null,
        ...(data.draftAnswers ? { draft_answers: data.draftAnswers } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
