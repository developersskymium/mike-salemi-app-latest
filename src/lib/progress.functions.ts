import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findDay } from "@/content/program";
import { z } from "zod";

export const getProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lesson_progress")
      .select("phase_id, day_id, lesson_id, completed_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setLessonProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        phaseId: z.string().max(100),
        dayId: z.string().max(100),
        lessonId: z.string().max(100),
        completed: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const location = findDay(data.dayId);
    if (
      !location ||
      location.phase.id !== data.phaseId ||
      !location.day.lessons.some((lesson) => lesson.id === data.lessonId)
    ) {
      throw new Error("This lesson is not part of Kettlebell Lifestyle.");
    }
    if (data.completed) {
      const { error } = await context.supabase.from("lesson_progress").upsert(
        {
          user_id: context.userId,
          phase_id: data.phaseId,
          day_id: data.dayId,
          lesson_id: data.lessonId,
        },
        { onConflict: "user_id,day_id,lesson_id" },
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("lesson_progress")
        .delete()
        .eq("user_id", context.userId)
        .eq("day_id", data.dayId)
        .eq("lesson_id", data.lessonId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const getToolResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tool_results")
      .select("id, tool_id, answers, result, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveToolResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      toolId: string;
      answers: Record<string, string>;
      result: { score: number; title: string; detail?: Record<string, unknown> };
    }) => input,
  )

  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tool_results").insert({
      user_id: context.userId,
      tool_id: data.toolId,
      answers: data.answers,
      result: data.result as unknown as Record<string, never>,
    });
    if (error) throw new Error(error.message);

    const [{ notifyByEmail }, { tools }] = await Promise.all([
      import("@/lib/notify.server"),
      import("@/content/tools"),
    ]);
    const tool = tools.find((t) => t.id === data.toolId);
    const toolName = tool?.title ?? "Assessment";

    // Turn the raw answer values into readable label/value rows for the email.
    const details = (tool?.questions ?? []).flatMap((question) => {
      const answer = data.answers[question.id];
      const option = question.options.find((o) => o.value === answer);
      if (!option) return [];
      return [{ label: question.question, value: option.label }];
    });

    const band = tool?.bands.find((b) => b.title === data.result.title);

    await notifyByEmail({
      supabase: context.supabase,
      userId: context.userId,
      email: context.claims?.email as string | undefined,
      event: {
        kind: "tool_result",
        toolName,
        resultTitle: data.result.title,
        score: data.result.score,
        summary: band?.summary,
        details,
        actions: band?.points,
      },
    });

    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, avatar_url, program_level, onboarding_completed_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { displayName: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").upsert({
      id: context.userId,
      display_name: data.displayName,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type CourseAttemptRow = {
  id: string;
  course_id: string;
  attempt_index: number;
  started_at: string;
  archived_at: string;
  completed_at: string | null;
  lessons_completed: number;
  days_completed: number;
  lessons_total: number;
  days_total: number;
  snapshot: { completedDayIds?: string[] } | null;
};

export const getCourseAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("course_attempts")
      .select(
        "id, course_id, attempt_index, started_at, archived_at, completed_at, lessons_completed, days_completed, lessons_total, days_total, snapshot",
      )
      .eq("user_id", context.userId)
      .order("archived_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CourseAttemptRow[];
  });

/**
 * Archive the current run of a level, then clear its lesson progress so the
 * athlete starts fresh. Certificates and badges are intentionally kept.
 */
export const restartCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      courseId: string;
      dayIds: string[];
      lessonsTotal: number;
      daysTotal: number;
      completedDayIds: string[];
      wasComplete: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const dayIds = data.dayIds.slice(0, 500);
    if (!dayIds.length) return { ok: true, attemptIndex: 0 };

    const { data: rows, error: readError } = await context.supabase
      .from("lesson_progress")
      .select("day_id, lesson_id, completed_at")
      .eq("user_id", context.userId)
      .in("day_id", dayIds);
    if (readError) throw new Error(readError.message);

    const { data: last } = await context.supabase
      .from("course_attempts")
      .select("attempt_index")
      .eq("user_id", context.userId)
      .eq("course_id", data.courseId)
      .order("attempt_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const attemptIndex = (last?.attempt_index ?? 0) + 1;
    const stamps = (rows ?? [])
      .map((r) => r.completed_at)
      .filter(Boolean)
      .sort();

    const { error: insertError } = await context.supabase.from("course_attempts").insert({
      user_id: context.userId,
      course_id: data.courseId,
      attempt_index: attemptIndex,
      started_at: stamps[0] ?? new Date().toISOString(),
      completed_at: data.wasComplete
        ? (stamps[stamps.length - 1] ?? new Date().toISOString())
        : null,
      lessons_completed: rows?.length ?? 0,
      days_completed: data.completedDayIds.length,
      lessons_total: data.lessonsTotal,
      days_total: data.daysTotal,
      snapshot: { completedDayIds: data.completedDayIds } as never,
    });
    if (insertError) throw new Error(insertError.message);

    const { error: deleteError } = await context.supabase
      .from("lesson_progress")
      .delete()
      .eq("user_id", context.userId)
      .in("day_id", dayIds);
    if (deleteError) throw new Error(deleteError.message);

    return { ok: true, attemptIndex };
  });
