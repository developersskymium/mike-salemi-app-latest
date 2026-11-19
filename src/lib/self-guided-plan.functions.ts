import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  goal: z.string().trim().min(2).max(200),
  weeks: z.number().int().min(2).max(8),
  daysPerWeek: z.number().int().min(2).max(6),
  minutes: z.number().int().min(10).max(120),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  equipment: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  programSlugs: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  recovery: z.string().trim().max(500),
  constraints: z.string().trim().max(1000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type SourceLesson = { id: string; title: string; sectionTitle: string; programId: string; programSlug: string; programName: string };
type PlannedSession = SourceLesson & { week: number; day: number; durationMinutes: number; rationale: string };

function deterministicPlan(input: z.infer<typeof inputSchema>, lessons: SourceLesson[]) {
  const count = input.weeks * input.daysPerWeek;
  const sessions: PlannedSession[] = [];
  for (let i = 0; i < count; i += 1) {
    const lesson = lessons[i % lessons.length];
    sessions.push({
      ...lesson,
      week: Math.floor(i / input.daysPerWeek) + 1,
      day: (i % input.daysPerWeek) + 1,
      durationMinutes: input.minutes,
      rationale: i % input.daysPerWeek === 0 ? `Build the week around ${lesson.sectionTitle}.` : "Progress without crowding recovery.",
    });
  }
  return sessions;
}

export const generateSelfGuidedPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: programs, error } = await context.supabase
      .from("programs")
      .select("id, slug, name, included_in_subscription, meta, program_sections(id, title, sequence, program_lessons(id, title, sequence))")
      .eq("status", "published")
      .in("slug", data.programSlugs);
    if (error) throw new Error(error.message);
    const entitled = await context.supabase
      .from("entitlements")
      .select("product_id")
      .eq("user_id", context.userId)
      .eq("status", "active");
    const owned = new Set((entitled.data ?? []).map((row) => row.product_id));
    const accessible = (programs ?? []).filter((p) => p.included_in_subscription || owned.has(p.id) || owned.has(`program-${p.id}`));
    const lessons: SourceLesson[] = accessible.flatMap((program) =>
      program.program_sections
        .filter((section) => section.id !== ((program.meta ?? {}) as { introSectionId?: string }).introSectionId)
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .flatMap((section) =>
          section.program_lessons
            .slice()
            .sort((a, b) => a.sequence - b.sequence)
            .map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              sectionTitle: section.title,
              programId: program.id,
              programSlug: program.slug,
              programName: program.name,
            })),
        ),
    );
    if (!lessons.length) throw new Error("No accessible lessons were found for those programs.");

    let sessions = deterministicPlan(data, lessons);
    let overview = `A ${data.weeks}-week path built around ${data.goal.toLowerCase()}, with ${data.daysPerWeek} sessions each week.`;
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (apiKey) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "Create a safe training plan using only lesson IDs in the supplied catalog. Return JSON with overview and sessions. Each session must have lessonId, week, day, durationMinutes, rationale. Do not invent lessons." },
              { role: "user", content: JSON.stringify({ preferences: data, catalog: lessons.slice(0, 300) }) },
            ],
          }),
        });
        if (response.ok) {
          const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
          const raw = payload.choices?.[0]?.message?.content;
          const generated = raw ? JSON.parse(raw) as { overview?: string; sessions?: { lessonId?: string; week?: number; day?: number; durationMinutes?: number; rationale?: string }[] } : null;
          const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
          const validated = (generated?.sessions ?? []).flatMap((item) => {
            const lesson = item.lessonId ? byId.get(item.lessonId) : undefined;
            if (!lesson || !item.week || !item.day) return [];
            return [{ ...lesson, week: Math.min(data.weeks, Math.max(1, item.week)), day: Math.min(data.daysPerWeek, Math.max(1, item.day)), durationMinutes: Math.min(120, Math.max(10, item.durationMinutes ?? data.minutes)), rationale: (item.rationale ?? "Selected for your goal.").slice(0, 300) }];
          });
          if (validated.length === data.weeks * data.daysPerWeek) sessions = validated;
          if (generated?.overview) overview = generated.overview.slice(0, 600);
        }
      } catch {
        // The deterministic plan remains available when generation is unavailable.
      }
    }
    return { overview, sessions };
  });

const sessionSchema = z.object({
  id: z.string().uuid(), title: z.string().max(300), sectionTitle: z.string().max(300), programId: z.string().uuid(), programSlug: z.string().max(120), programName: z.string().max(300), week: z.number().int().min(1).max(8), day: z.number().int().min(1).max(6), durationMinutes: z.number().int().min(10).max(120), rationale: z.string().max(500),
});

export const saveSelfGuidedPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ name: z.string().trim().min(2).max(100), inputs: inputSchema, overview: z.string().max(600), sessions: z.array(sessionSchema).min(1).max(48) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("self_guided_plans").insert({ user_id: context.userId, name: data.name, status: "active", inputs: data.inputs, plan: { overview: data.overview } }).select("id").single();
    if (error) throw new Error(error.message);
    const start = new Date(`${data.inputs.startDate}T00:00:00`);
    const { error: sessionsError } = await context.supabase.from("self_guided_plan_sessions").insert(data.sessions.map((session, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + (session.week - 1) * 7 + Math.round((session.day - 1) * (7 / data.inputs.daysPerWeek)));
      return { plan_id: row.id, user_id: context.userId, sequence: index, week_number: session.week, scheduled_on: date.toISOString().slice(0, 10), program_id: session.programId, lesson_id: session.id, title: session.title, rationale: session.rationale, duration_minutes: session.durationMinutes, source: { programSlug: session.programSlug, programName: session.programName, sectionTitle: session.sectionTitle, day: session.day } };
    }));
    if (sessionsError) throw new Error(sessionsError.message);
    return { ok: true, id: row.id };
  });

export const getSelfGuidedPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("self_guided_plans").select("id, name, status, inputs, plan, created_at, self_guided_plan_sessions(id, sequence, week_number, scheduled_on, lesson_id, title, rationale, duration_minutes, source, status)").eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // MTK personalized plans reuse these tables but have their own experience at /mtk-plan.
    return (data ?? []).filter((p) => (p.inputs as { kind?: string } | null)?.kind !== "mtk");
  });