import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MTK_SLUG } from "@/lib/mtk-paths";
import { MOVEMENT_LABEL, groupIntoDays, selectMtkLessons, weeksNeeded, type DbLesson, type MtkAnswers, type MtkPlanDay } from "@/lib/mtk-plan";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

export type MtkResult = {
  attempt: number;
  level: string;
  coach: boolean;
  strengths: string[];
  gaps: string[];
  focusAreas: { label: string; count: number; why: string }[];
  lessonIds: string[];
  recommended: number;
  total: number;
  minutes: number;
  summary: string;
  aiSummary: boolean;
};

async function loadMtk(sb: Sb) {
  const { data: program, error } = await sb.from("programs").select("id").eq("slug", MTK_SLUG).single();
  if (error) throw new Error(error.message);
  const { data: sections, error: sErr } = await sb.from("program_sections").select("id, sequence, program_lessons(id, sequence)").eq("program_id", program.id);
  if (sErr) throw new Error(sErr.message);
  const lessons: DbLesson[] = (sections ?? []).flatMap((s: { sequence: number; program_lessons: { id: string; sequence: number }[] }) =>
    s.program_lessons.map((l) => ({ id: l.id, sectionSeq: s.sequence, lessonSeq: l.sequence })),
  );
  return { programId: program.id as string, lessons };
}

const DEPTH_WHY: Record<string, string> = {
  fix: "You said you struggle with this — pre-checks, technique and error corrections",
  learn: "Part of your chosen focus — full technique progression",
  refine: "You're confident here — error corrections and variations to refine it",
  prereq: "Required foundation for the lifts you're focusing on",
};

function factsFor(answers: MtkAnswers, attempt: number, lessons: DbLesson[]): MtkResult {
  const sel = selectMtkLessons(answers, lessons);
  const p = sel.profile;
  const strengths = p.confident.map((m) => MOVEMENT_LABEL[m]);
  const gaps = [...new Set([...p.struggles, ...p.focus.filter((m) => !p.confident.includes(m))])].map((m) => MOVEMENT_LABEL[m]);
  const focusAreas = sel.byMovement.map((b) => ({
    label: b.label,
    count: b.count,
    why: b.depth ? DEPTH_WHY[b.depth] : b.movement === "general" ? "Set-up, grips and orientation" : "Programming and expert material",
  }));
  const parts: string[] = [];
  if (strengths.length) parts.push(`You reported confidence in the ${strengths.join(", ")}`);
  if (p.struggles.length) parts.push(`identified the ${p.struggles.map((m) => MOVEMENT_LABEL[m]).join(", ")} as areas you struggle with`);
  const summary = `${parts.length ? parts.join(" and ") + ". " : ""}Your plan concentrates on ${p.focus.map((m) => MOVEMENT_LABEL[m]).join(", ") || "the fundamentals"}${p.foundationFirst ? ", starting from set-up, grips and pre-checks" : ""}${p.coach ? ", with the coaching and programming material you asked for" : ""}. That is ${sel.lessonIds.length} of ${sel.total} lessons; the rest of MTK stays open in Full Curriculum.`;
  return { attempt, level: p.level, coach: p.coach, strengths, gaps, focusAreas, lessonIds: sel.lessonIds, recommended: sel.lessonIds.length, total: sel.total, minutes: sel.minutes, summary, aiSummary: false };
}

/** One lightweight streamed AI call per assessment attempt. Falls back to the factual summary. */
async function aiSummary(r: MtkResult, answers: MtkAnswers): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const facts = { level: r.level, coach: r.coach, confident: r.strengths, gapsOrFocus: r.gaps, goal: answers.improve, challenge: answers.challenge, focusAreas: r.focusAreas.map((f) => `${f.label}: ${f.count} lessons (${f.why})`), recommended: r.recommended, total: r.total };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: "You are a kettlebell coach writing a 2-3 sentence plan explanation in second person. Use ONLY the facts given. Never praise skill or claim anything about technique quality. Prefer wording like 'You reported confidence in X while identifying Y as areas to improve.' Mention the exact recommended lesson count. No markdown.",
        input: [{ role: "user", content: JSON.stringify(facts) }],
        text: { format: { type: "json_schema", name: "plan_summary", strict: true, schema: { type: "object", additionalProperties: false, required: ["summary"], properties: { summary: { type: "string" } } } } },
      }),
    });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim()) as { type?: string; delta?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        } catch { /* keep-alive or [DONE] */ }
      }
    }
    const summary = (JSON.parse(text) as { summary?: string }).summary?.trim();
    if (!summary || !summary.includes(String(r.recommended))) return null;
    return summary.slice(0, 700);
  } catch {
    return null;
  }
}

async function readIntake(sb: Sb, userId: string, programId: string) {
  const { data, error } = await sb.from("program_intake_responses").select("answers, guidance, completed_at").eq("user_id", userId).eq("program_id", programId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as { answers: MtkAnswers; guidance: Record<string, unknown> & { attempt?: number; mtkResult?: MtkResult }; completed_at: string | null } | null;
}

/** Results for the current assessment attempt; computed (and AI-summarised) once, then stored. */
export const getMtkResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { programId, lessons } = await loadMtk(sb);
    const intake = await readIntake(sb, context.userId, programId);
    if (!intake?.completed_at) return null;
    const attempt = intake.guidance.attempt ?? 1;
    const cached = intake.guidance.mtkResult;
    if (cached && cached.attempt === attempt) return cached;
    const result = factsFor(intake.answers, attempt, lessons);
    const ai = await aiSummary(result, intake.answers);
    if (ai) { result.summary = ai; result.aiSummary = true; }
    await sb.from("program_intake_responses").update({ guidance: { ...intake.guidance, mtkResult: result } as never }).eq("user_id", context.userId).eq("program_id", programId);
    return result;
  });

const scheduleSchema = z.object({ daysPerWeek: z.number().int().min(1).max(7), minutes: z.number().int().min(10).max(120), weeks: z.number().int().min(1).max(104) });

export type MtkPlanStored = { kind: "mtk"; version: number; attempt: number; result: MtkResult; days: MtkPlanDay[]; schedule: z.infer<typeof scheduleSchema> & { weeksNeeded: number } };

/** Creates a new plan version from the stored result. Earlier MTK plans are archived, never deleted; lesson progress is untouched. */
export const createMtkPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => scheduleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { programId, lessons } = await loadMtk(sb);
    const intake = await readIntake(sb, context.userId, programId);
    const result = intake?.guidance.mtkResult;
    if (!result) throw new Error("Complete the assessment first.");
    const valid = new Set(lessons.map((l) => l.id));
    const lessonIds = result.lessonIds.filter((id) => valid.has(id));
    const days = groupIntoDays(lessonIds, data.minutes, data.daysPerWeek);
    const needed = weeksNeeded(days.length, data.daysPerWeek);
    const { data: existing } = await sb.from("self_guided_plans").select("id, status, inputs").eq("user_id", context.userId);
    const mtkPlans = ((existing ?? []) as Sb[]).filter((p: { inputs: { kind?: string } }) => p.inputs?.kind === "mtk");
    const version = mtkPlans.length + 1;
    const active = mtkPlans.filter((p: { status: string }) => p.status === "active").map((p: { id: string }) => p.id);
    if (active.length) {
      const { error } = await sb.from("self_guided_plans").update({ status: "archived" }).in("id", active);
      if (error) throw new Error(error.message);
    }
    const plan: MtkPlanStored = { kind: "mtk", version, attempt: result.attempt, result: { ...result, lessonIds }, days, schedule: { ...data, weeksNeeded: needed } };
    const { data: row, error } = await sb.from("self_guided_plans").insert({
      user_id: context.userId, name: `My MTK Plan · v${version}`, status: "active",
      inputs: { kind: "mtk", programSlug: MTK_SLUG, attempt: result.attempt, ...data }, plan: plan as never,
    }).select("id").single();
    if (error) throw new Error(error.message);
    const dayOf = new Map(days.flatMap((d) => d.lessonIds.map((id) => [id, d] as const)));
    const rows = lessonIds.map((id, i) => {
      const d = dayOf.get(id)!;
      return { plan_id: row.id, user_id: context.userId, sequence: i, week_number: Math.min(12, d.week), scheduled_on: null, program_id: programId, lesson_id: id, title: `Day ${d.day}: ${d.title}`, rationale: "Selected from your MTK assessment", duration_minutes: Math.max(5, Math.min(240, d.minutes)), source: { kind: "mtk", day: d.day, week: d.week }, status: "planned" };
    });
    const { error: sErr } = await sb.from("self_guided_plan_sessions").insert(rows);
    if (sErr) throw new Error(sErr.message);
    return { ok: true, id: row.id, version };
  });

/** Everything the MTK home / My Plan needs in one read. */
export const getMtkPlanState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: program } = await sb.from("programs").select("id").eq("slug", MTK_SLUG).single();
    const [intake, { data: plans }, { data: progress }] = await Promise.all([
      program ? readIntake(sb, context.userId, program.id) : Promise.resolve(null),
      sb.from("self_guided_plans").select("id, status, plan, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }),
      program ? sb.from("program_lesson_progress").select("lesson_id").eq("user_id", context.userId).eq("program_id", program.id) : Promise.resolve({ data: [] }),
    ]);
    const mtk = ((plans ?? []) as Sb[]).filter((p: { plan: { kind?: string } }) => p.plan?.kind === "mtk");
    const active = mtk.find((p: { status: string }) => p.status === "active");
    return {
      assessmentDone: Boolean(intake?.completed_at),
      hasResult: Boolean(intake?.completed_at && intake.guidance.mtkResult && intake.guidance.mtkResult.attempt === (intake.guidance.attempt ?? 1)),
      attempt: intake?.guidance.attempt ?? 0,
      plan: active ? { id: active.id as string, createdAt: active.created_at as string, ...(active.plan as MtkPlanStored) } : null,
      archivedVersions: mtk.filter((p: { status: string }) => p.status === "archived").length,
      completed: (progress ?? []).map((r: { lesson_id: string }) => r.lesson_id),
    };
  });
