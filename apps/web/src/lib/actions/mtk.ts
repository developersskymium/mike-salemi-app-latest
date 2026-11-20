"use server";

import { revalidatePath } from "next/cache";
import { createMtkPlan } from "@ms/api";
import { groupIntoDays, mtkResult, type MtkAnswers } from "@ms/core";
import { mtkBase } from "@/lib/loaders/mtk";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

export type MtkActionResult = { ok: true; id: string; version: number } | { ok: false; code: "offline" | "rule" | "auth"; message: string };

const WEEKS = [2, 4, 6, 8, 12, 16, 24, 36, 52];
const DAYS = [2, 3, 4, 5, 6];
const MINUTES = [15, 20, 30, 45, 60];

/**
 * Creates the next MTK plan version from the member's assessment. The lessons and days are
 * recomputed here from the stored answers (never trusted from the browser).
 */
export async function createMtkPlanAction(responseId: string, schedule: { weeks: number; daysPerWeek: number; minutes: number }): Promise<MtkActionResult> {
  try {
    if (MOCK) throw new Error("preview mode");
    if (!WEEKS.includes(schedule.weeks) || !DAYS.includes(schedule.daysPerWeek) || !MINUTES.includes(schedule.minutes)) {
      return { ok: false, code: "rule", message: "Pick a schedule from the options." };
    }
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, code: "auth", message: "Please sign in again." };
    const [{ data: resp }, base] = await Promise.all([
      supabase.from("intake_responses").select("id, answers").eq("id", responseId).eq("user_id", user.id).maybeSingle(),
      mtkBase(supabase),
    ]);
    if (!resp || !base) return { ok: false, code: "rule", message: "Complete the assessment first." };
    const result = mtkResult((resp.answers ?? {}) as MtkAnswers, base.db);
    const days = groupIntoDays(result.lessonIds, schedule.minutes, schedule.daysPerWeek);
    if (!days.length) return { ok: false, code: "rule", message: "Your assessment didn't select any lessons. Retake it or browse the full curriculum." };
    const { lessonIds: _ids, ...summary } = result;
    const r = await createMtkPlan(supabase, { responseId, schedule, result: summary as unknown as Record<string, unknown>, days });
    revalidatePath("/mtk");
    revalidatePath("/mtk/results");
    return { ok: true, ...r };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (MOCK || /fetch failed|network|ENOTFOUND|ECONN|timeout/i.test(message)) {
      return { ok: false, code: "offline", message: "Couldn't reach the server. Try again in a moment." };
    }
    return { ok: false, code: "rule", message: "Couldn't create your plan." };
  }
}
