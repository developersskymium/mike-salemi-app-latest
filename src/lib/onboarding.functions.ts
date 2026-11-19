import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IntakeAnswerMap = Record<string, string | string[]>;

export type IntakeRecord = {
  answers: IntakeAnswerMap;
  recommendation: {
    courseSlug?: string;
    courseLabel?: string;
    headline?: string;
    summary?: string;
    priorities?: string[];
  };
  completed_at: string | null;
} | null;

export const getIntake = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("intake_responses")
      .select("answers, recommendation, completed_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as IntakeRecord;
  });

export const saveIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      answers: Record<string, string | string[]>;
      recommendation: {
        courseSlug: string;
        courseLabel: string;
        headline: string;
        summary: string;
        priorities: string[];
      };
      completed: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("intake_responses").upsert(
      {
        user_id: context.userId,
        answers: data.answers,
        recommendation: data.recommendation,
        completed_at: data.completed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    if (data.completed) {
      const level = data.recommendation.courseSlug === "intermediate" ? 2 : 1;
      const { error: profileError } = await context.supabase
        .from("profiles")
        .update({
          program_level: level,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", context.userId);
      if (profileError) throw new Error(profileError.message);
      return { ok: true, level };
    }

    return { ok: true, level: null as number | null };
  });

/** Onboarding gate status: whether intake is complete and the assigned program level. */
export const getOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [intake, profile] = await Promise.all([
      context.supabase
        .from("intake_responses")
        .select("completed_at")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("profiles")
        .select("program_level, onboarding_completed_at")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);
    const completed = Boolean(intake.data?.completed_at ?? profile.data?.onboarding_completed_at);
    return {
      completed,
      level: (profile.data?.program_level as number | null) ?? null,
    };
  });
