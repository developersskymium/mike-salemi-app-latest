"use server";

import { FAULT_PRIORITY, SWING_STEPS, fixFor, type FaultId } from "@ms/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import { SWING_TOOL_ID } from "@/lib/swing";

export type SwingResult<T> = { ok: true; data: T } | { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

const PREVIEW = "Preview mode: this isn't saved.";

async function run<T>(fn: (sb: Loose, userId: string) => Promise<T>): Promise<SwingResult<T>> {
  if (MOCK) return { ok: false, error: PREVIEW };
  try {
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, error: "Please sign in again." };
    const data = await fn(supabase as Loose, user.id);
    revalidatePath("/tools/swing-setup");
    return { ok: true, data };
  } catch {
    return { ok: false, error: "That didn't save. Check your connection and try again." };
  }
}

const profileSchema = z.object({
  neck_history: z.boolean(),
  bell_type: z.enum(["competition", "cast-iron"]),
  bell_kg: z.number().min(2).max(64).nullable(),
  goal: z.enum(["learn", "fix", "program"]).nullable(),
  accept_disclaimer: z.boolean().optional(),
});

/** Saves the three profile answers (and the accepted disclaimer, once). */
export async function saveSetupProfile(input: z.infer<typeof profileSchema>): Promise<SwingResult<true>> {
  const p = profileSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Check your answers and try again." };
  return run(async (sb, userId) => {
    const { accept_disclaimer, ...rest } = p.data;
    const row: Record<string, unknown> = { user_id: userId, ...rest, updated_at: new Date().toISOString() };
    if (accept_disclaimer) row.disclaimer_at = new Date().toISOString();
    const { error } = await sb.from("setup_profiles").upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return true as const;
  });
}

/** Accepts the disclaimer before the first check (keeps the other answers). */
export async function acceptSwingDisclaimer(): Promise<SwingResult<true>> {
  return run(async (sb, userId) => {
    const { error } = await sb.from("setup_profiles").upsert({ user_id: userId, disclaimer_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return true as const;
  });
}

const num = z.number().finite().nullable();
const pt = z.object({ x: z.number().min(-1).max(2), y: z.number().min(-1).max(2) });
const status = z.enum(["good", "adjust", "cant", "self"]);
const checkSchema = z.object({
  measures: z.object({
    side: z.enum(["left", "right"]),
    sideOn: z.number().finite(),
    visibility: z.number().min(0).max(1),
    shin: num,
    hip: num,
    head: num,
    torsoRatio: num,
    gapRatio: num,
    calibrated: z.boolean(),
    aspect: z.number().min(0.2).max(5),
    neck_history: z.boolean(),
    bell_distance: z.enum(["ok", "far", "near", "unsure"]).optional(),
    overlay: z.object({ ear: pt, shoulder: pt, hip: pt, knee: pt, ankle: pt }).nullable(),
  }),
  steps: z.object(Object.fromEntries(SWING_STEPS.map((s) => [s.id, status])) as Record<string, typeof status>),
  faults: z.array(z.enum(FAULT_PRIORITY as [FaultId, ...FaultId[]])).max(10),
});

/**
 * Saves one Set-Up Check: only numbers (no video, no images), plus a summary row in tool_results
 * so it shows in Saves like the other tools.
 */
export async function saveSetupCheck(input: z.infer<typeof checkSchema>): Promise<SwingResult<{ id: string }>> {
  const p = checkSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "That check couldn't be saved." };
  const faults = FAULT_PRIORITY.filter((f) => p.data.faults.includes(f));
  const main = faults[0] ?? null;
  return run(async (sb, userId) => {
    const { data, error } = await sb
      .from("setup_checks")
      .insert({ user_id: userId, measures: p.data.measures, steps: p.data.steps, faults, main_fault: main })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const fix = main ? fixFor(main, p.data.measures.neck_history) : null;
    const good = SWING_STEPS.filter((s) => p.data.steps[s.id] === "good").length;
    await sb.from("tool_results").insert({
      user_id: userId,
      tool_id: SWING_TOOL_ID,
      answers: { check_id: data.id },
      result: {
        kind: "swing-setup",
        check_id: data.id,
        title: fix ? fix.title : "Set-up on track",
        headline: fix ? fix.title : "Set-up on track",
        summary: fix ? `Mike's cue: “${fix.cue}”. ${fix.do}` : `${good} of the 4 camera-checked steps look right. Keep the self-checks for feet, grip and breath.`,
        notes: fix ? [fix.do, "Run the check again after a few sets with the cue."] : ["Run the check again before your next session."],
        steps: p.data.steps,
      },
    });
    return { id: data.id as string };
  });
}

const kg = z.number().min(2).max(64);

/** Starts a 2-week swing program cycle with the chosen bell. */
export async function startSwingProgram(bellKg: number): Promise<SwingResult<{ id: string }>> {
  if (!kg.safeParse(bellKg).success) return { ok: false, error: "Pick a bell between 2 and 64 kg." };
  return run(async (sb, userId) => {
    const { data, error } = await sb.from("swing_program_runs").insert({ user_id: userId, bell_kg: bellKg }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: data.id as string };
  });
}

const setSchema = z.object({
  runId: z.string().uuid(),
  session: z.number().int().min(1).max(6),
  sets: z.array(z.object({ set_no: z.number().int().min(1).max(12), reps: z.number().int().min(0).max(40), feel: z.enum(["easy", "right", "hard"]).nullable() })).min(1).max(12),
  finish: z.boolean().optional(),
});

/** Logs a finished session's sets (and closes the cycle after session 6). */
export async function logSwingSession(input: z.infer<typeof setSchema>): Promise<SwingResult<true>> {
  const p = setSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Those sets couldn't be saved." };
  return run(async (sb, userId) => {
    const rows = p.data.sets.map((s) => ({ ...s, run_id: p.data.runId, user_id: userId, session: p.data.session }));
    const { error } = await sb.from("swing_program_sets").insert(rows);
    if (error) throw new Error(error.message);
    if (p.data.finish) await sb.from("swing_program_runs").update({ finished_at: new Date().toISOString() }).eq("id", p.data.runId).eq("user_id", userId);
    return true as const;
  });
}
