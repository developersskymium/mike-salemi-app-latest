import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findDay } from "@/content/program";
import { isReadinessComplete, resolveReadiness } from "@/content/readiness-table";
import { readinessSteps } from "@/content/average-day";

export type WorkoutTableRow = {
  id: string;
  course_id: string;
  phase_id: string;
  day_id: string;
  lesson_id: string | null;
  answers: Record<string, string>;
  table_data: Record<string, unknown>;
  created_at: string;
};

export const getWorkoutTables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workout_tables")
      .select("id, course_id, phase_id, day_id, lesson_id, answers, table_data, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).filter((row) => {
      const location = findDay(row.day_id);
      return location?.course.id === row.course_id && location.phase.id === row.phase_id;
    });
  });

export const saveWorkoutTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      courseId: string;
      phaseId: string;
      dayId: string;
      lessonId?: string;
      answers: Record<string, string>;
      table: Record<string, unknown>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const location = findDay(data.dayId);
    if (
      !location ||
      location.course.id !== data.courseId ||
      location.phase.id !== data.phaseId ||
      !location.day.lessons.some(
        (lesson) => lesson.id === data.lessonId && lesson.special === "readiness",
      ) ||
      !isReadinessComplete(data.answers)
    ) {
      throw new Error("Complete the Training Readiness Assessment for this KBL workout.");
    }
    const answers = Object.fromEntries(
      readinessSteps.map((question) => [question.id, data.answers[question.id]]),
    );
    const result = resolveReadiness(answers, data.dayId);
    const { error } = await context.supabase.from("workout_tables").insert({
      user_id: context.userId,
      course_id: data.courseId,
      phase_id: data.phaseId,
      day_id: data.dayId,
      lesson_id: data.lessonId ?? null,
      answers: answers as never,
      table_data: {
        tableId: result.table?.id ?? null,
        score: result.score,
        band: result.band.id,
        outcome: result.outcome,
        sourceFormId: result.sourceFormId,
        version: 2,
      } as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [badges, certificates] = await Promise.all([
      context.supabase
        .from("user_badges")
        .select("badge_id, earned_at")
        .eq("user_id", context.userId),
      context.supabase
        .from("certificates")
        .select("id, course_id, title, issued_at")
        .eq("user_id", context.userId),
    ]);
    if (badges.error) throw new Error(badges.error.message);
    if (certificates.error) throw new Error(certificates.error.message);
    return { badges: badges.data ?? [], certificates: certificates.data ?? [] };
  });

export const awardBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { badgeIds: string[] }) => input)
  .handler(async ({ data, context }) => {
    const ids = data.badgeIds.slice(0, 40).filter(Boolean);
    if (!ids.length) return { ok: true };
    const { data: existing } = await context.supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", context.userId)
      .in("badge_id", ids);
    const already = new Set((existing ?? []).map((row) => row.badge_id));
    const fresh = ids.filter((id) => !already.has(id));

    const { error } = await context.supabase.from("user_badges").upsert(
      ids.map((badge_id) => ({ user_id: context.userId, badge_id })),
      { onConflict: "user_id,badge_id", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);

    if (fresh.length) {
      const [{ notifyByEmail }, { badgeById }] = await Promise.all([
        import("@/lib/notify.server"),
        import("@/content/badges"),
      ]);
      await notifyByEmail({
        supabase: context.supabase,
        userId: context.userId,
        email: context.claims?.email as string | undefined,
        event: {
          kind: "reward",
          badgeNames: fresh.map((id) => badgeById(id)?.name ?? id),
          totalBadges: ids.length,
        },
      });
    }

    return { ok: true };
  });

export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string; title: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("certificates")
      .select("id")
      .eq("user_id", context.userId)
      .eq("course_id", data.courseId)
      .maybeSingle();

    const { error } = await context.supabase
      .from("certificates")
      .upsert(
        { user_id: context.userId, course_id: data.courseId, title: data.title.slice(0, 120) },
        { onConflict: "user_id,course_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);

    if (!existing) {
      const [{ notifyByEmail }, { courses }, profile] = await Promise.all([
        import("@/lib/notify.server"),
        import("@/content/program"),
        context.supabase
          .from("profiles")
          .select("display_name")
          .eq("id", context.userId)
          .maybeSingle(),
      ]);
      const course = courses.find((c) => c.id === data.courseId);
      await notifyByEmail({
        supabase: context.supabase,
        userId: context.userId,
        email: context.claims?.email as string | undefined,
        event: {
          kind: "certificate",
          title: data.title.slice(0, 120),
          athleteName: (profile.data?.display_name as string | undefined)?.trim() || undefined,
          issuedOn: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          phases: course?.phases.map((p) => p.label),
        },
      });
    }

    return { ok: true };
  });
