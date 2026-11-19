import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MTK_SLUG, recommendMtkPath } from "@/lib/mtk-paths";

/**
 * Intake history lives inside the response row's guidance JSON:
 * top level = current attempt, `history` = every completed attempt (oldest first).
 * Retakes never delete earlier attempts.
 */
type HistoryEntry = { attempt: number; completed_at: string; answers: unknown; guidance: unknown };
type StoredGuidance = Record<string, unknown> & { attempt?: number; history?: HistoryEntry[] };

const slugSchema = z.object({ slug: z.string().trim().min(1).max(120) });
const answerValue = z.union([z.string().max(1000), z.array(z.string().max(160)).max(12)]);

export const getProgramIntake = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => slugSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: program, error: programError } = await context.supabase
      .from("programs")
      .select("id, slug, name, summary, hero_image_url")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (programError) throw new Error(programError.message);
    if (!program) return null;

    const [{ data: definition, error: definitionError }, { data: response, error: responseError }] =
      await Promise.all([
        context.supabase
          .from("program_intake_definitions")
          .select("id, title, introduction, questions, completion_copy")
          .eq("program_id", program.id)
          .eq("is_published", true)
          .maybeSingle(),
        context.supabase
          .from("program_intake_responses")
          .select("answers, guidance, completed_at")
          .eq("program_id", program.id)
          .eq("user_id", context.userId)
          .maybeSingle(),
      ]);
    if (definitionError) throw new Error(definitionError.message);
    if (responseError) throw new Error(responseError.message);
    return { program, definition, response };
  });

export const saveProgramIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ slug: z.string().trim().min(1).max(120), answers: z.record(answerValue) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: program, error: programError } = await context.supabase
      .from("programs")
      .select("id, slug")
      .eq("slug", data.slug)
      .eq("status", "published")
      .single();
    if (programError) throw new Error(programError.message);
    const answer = (key: string, fallback: string) => typeof data.answers[key] === "string" ? data.answers[key] as string : fallback;
    const goal = answer("goal", "Build consistency");
    const days = answer("days", answer("time", "3 days"));
    const experience = answer("experience", answer("energy", answer("readiness", "Some experience")));
    const constraints = typeof data.answers.constraints === "string" ? data.answers.constraints.trim() : "";
    const tailored: Record<string, { headline: string; priorities: string[]; caution: string }> = {
      "athleticism-4-life": { headline: `${goal} is your 30-day anchor`, priorities: [`Protect ${days.toLowerCase()} each week`, `Begin at a ${experience.toLowerCase()} pace`, "Complete the 30-Day Program before adding library work"], caution: constraints || "Scale range, speed and load before sacrificing movement quality." },
      "the-training-room": { headline: `Make ${goal.toLowerCase()} your first practice block`, priorities: [`Schedule ${days.toLowerCase()} of focused practice`, "Repeat one technical cue before adding complexity", "Use the library to solve a specific lift"], caution: constraints || "Stop a drill when technique degrades." },
      "mastering-the-kettlebell": { headline: `Start your mastery with ${goal.toLowerCase()}`, priorities: ["Complete the pre-check for that lift before loading it", `Practise ${days.toLowerCase()} with one technical cue per session`, "Review the common errors before each new variation"], caution: constraints || "Go light and stop the set when the position changes." },
      "kettlebell-roadmap": { headline: `Your next marker is to ${goal.toLowerCase()}`, priorities: [`Use ${days.toLowerCase()} as short skill exposures`, "Start at the earliest movement you cannot repeat with control", "Advance only when each position is consistent"], caution: constraints || "Treat the roadmap as a sequence, not a race." },
      "working-in": { headline: `Let ${goal.toLowerCase()} set today’s dose`, priorities: [`Create ${days.toLowerCase()} for practice`, `Match the session to your ${experience.toLowerCase()} energy`, "Finish feeling more resourced than when you started"], caution: constraints || "Choose less intensity when sleep, stress or pain is elevated." },
      "the-path-to-inspired-action": { headline: `Use ${goal.toLowerCase()} as your weekly intention`, priorities: [`Protect ${days.toLowerCase()} for reflection`, "Complete one piece of playwork before moving on", "Turn each insight into one small action"], caution: constraints || "Slow down when reflection becomes another task to perform." },
      "men-of-movement": { headline: `${goal} is how you will enter the retreat`, priorities: ["Practise Rotation, Movement, Breathwork, Nature and Storywork", `Meet the work at a ${experience.toLowerCase()} pace`, "Bring support questions to the preparation call"], caution: constraints || "Preparation helps you arrive grounded; it is not a test of readiness." },
    };
    const base = tailored[program.slug] ?? {
      headline: `Use ${goal.toLowerCase()} as your filter`,
      priorities: [`Aim for ${days.toLowerCase()} each week`, `Start at a ${experience.toLowerCase()} pace`, "Leave room for recovery between demanding sessions"],
      caution: constraints || "Adjust any session that does not feel right for your body today.",
    };
    let guidance: Record<string, unknown> = base;
    if (program.slug === MTK_SLUG) {
      const rec = recommendMtkPath(data.answers);
      guidance = {
        headline: `Your recommended path: ${rec.pathName}`,
        priorities: rec.initialFocus,
        caution: rec.foundationFirst ? "Start at the foundations and pre-checks, then load the lifts." : "Go light and stop the set when the position changes.",
        mtk: rec,
      };
    }
    const { data: existing } = await context.supabase
      .from("program_intake_responses").select("answers, guidance, completed_at")
      .eq("program_id", program.id).eq("user_id", context.userId).maybeSingle();
    const prev = (existing?.guidance ?? {}) as StoredGuidance;
    let history = Array.isArray(prev.history) ? prev.history : [];
    if (!history.length && existing?.completed_at) {
      const { history: _h, attempt: _a, ...rest } = prev;
      history = [{ attempt: 1, completed_at: existing.completed_at, answers: existing.answers, guidance: rest }];
    }
    const attempt = history.reduce((n, h) => Math.max(n, h.attempt), 0) + 1;
    const completedAt = new Date().toISOString();
    guidance = { ...guidance, attempt, history: [...history, { attempt, completed_at: completedAt, answers: data.answers, guidance: { ...guidance } }] };
    const { error } = await context.supabase.from("program_intake_responses").upsert(
      {
        user_id: context.userId,
        program_id: program.id,
        answers: data.answers,
        guidance: guidance as never,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,program_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, guidance: guidance as unknown as Record<string, string | number | boolean | null> };
  });
/** Starts a fresh attempt: clears the current answers but keeps every past attempt in history. Course progress is untouched. */
export const resetProgramIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ slug: z.string().trim().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: program, error: programError } = await context.supabase
      .from("programs").select("id").eq("slug", data.slug).single();
    if (programError) throw new Error(programError.message);
    const { data: existing, error: readError } = await context.supabase
      .from("program_intake_responses").select("answers, guidance, completed_at")
      .eq("program_id", program.id).eq("user_id", context.userId).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) return { ok: true };
    const prev = (existing.guidance ?? {}) as StoredGuidance;
    let history = Array.isArray(prev.history) ? prev.history : [];
    // Responses saved before history existed: archive them as attempt 1 so nothing is lost.
    if (!history.length && existing.completed_at) {
      const { history: _h, attempt: _a, ...rest } = prev;
      history = [{ attempt: 1, completed_at: existing.completed_at, answers: existing.answers, guidance: rest }];
    }
    const { error } = await context.supabase
      .from("program_intake_responses")
      .update({ answers: {}, guidance: { history } as never, completed_at: null, updated_at: new Date().toISOString() })
      .eq("program_id", program.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
