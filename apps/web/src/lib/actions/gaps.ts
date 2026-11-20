"use server";

import type { DB } from "@ms/api";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/* Account-saved memory for the day player (bell weights, "How did today feel?") and named saved lists. */

export type GapResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: (sb: DB, userId: string) => Promise<T>, paths: string[] = []): Promise<GapResult<T>> {
  if (MOCK) return { ok: false, error: "offline" };
  try {
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, error: "Sign in first" };
    const data = await fn(supabase as unknown as DB, user.id);
    for (const p of paths) revalidatePath(p);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = (sb: DB) => (sb.rpc as unknown as Rpc).bind(sb);
// Tables added in 0036 are not in the generated types yet.
type Loose = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const loose = (sb: DB) => sb as unknown as Loose;

const uuid = z.string().uuid();

/** Bell used for an exercise: kept per member (history), mirrored into today's session progress.weights. */
export async function logExerciseWeightAction(key: string, exercise: string, kg: number, lessonId: string | null): Promise<GapResult> {
  const p = z.object({ key: z.string().min(1).max(120), exercise: z.string().min(1).max(200), kg: z.number().positive().max(200), lessonId: uuid.nullable() }).safeParse({ key, exercise, kg, lessonId });
  if (!p.success) return { ok: false, error: "Invalid weight" };
  return run(async (sb) => {
    const { error } = await rpc(sb)("log_exercise_weight", { p_exercise_key: p.data.key, p_exercise: p.data.exercise, p_kg: p.data.kg, p_lesson: p.data.lessonId });
    if (error) throw new Error(error.message);
  });
}

/** "How did today feel?" per member per day, mirrored into the session's progress.feel. */
export async function setDayFeelAction(lessonId: string, feel: "easy" | "right" | "hard"): Promise<GapResult> {
  const p = z.object({ lessonId: uuid, feel: z.enum(["easy", "right", "hard"]) }).safeParse({ lessonId, feel });
  if (!p.success) return { ok: false, error: "Invalid answer" };
  return run(async (sb) => {
    const { error } = await rpc(sb)("set_day_feel", { p_lesson: p.data.lessonId, p_feel: p.data.feel });
    if (error) throw new Error(error.message);
  });
}

/* ------------------------------------------------------------------ named saved lists */

const listName = z.string().trim().min(1).max(60);

export async function createSavedListAction(name: string, videoId?: string): Promise<GapResult<{ id: string; name: string }>> {
  const n = listName.safeParse(name);
  if (!n.success) return { ok: false, error: "Give the list a name (up to 60 characters)." };
  if (videoId && !uuid.safeParse(videoId).success) return { ok: false, error: "Invalid video" };
  return run(
    async (sb, userId) => {
      const { data, error } = await loose(sb).from("saved_lists").insert({ user_id: userId, name: n.data }).select("id, name").single();
      if (error) throw new Error(/duplicate/i.test(error.message) ? "You already have a list with that name." : error.message);
      if (videoId) {
        const r = await loose(sb).from("saved_list_items").insert({ list_id: data.id, user_id: userId, video_id: videoId });
        if (r.error) throw new Error(r.error.message);
      }
      return data as { id: string; name: string };
    },
    ["/you", "/library"],
  );
}

export async function toggleSavedListItemAction(listId: string, videoId: string, on: boolean): Promise<GapResult> {
  if (!uuid.safeParse(listId).success || !uuid.safeParse(videoId).success) return { ok: false, error: "Invalid list" };
  return run(
    async (sb, userId) => {
      const t = loose(sb).from("saved_list_items");
      const { error } = on
        ? await t.upsert({ list_id: listId, user_id: userId, video_id: videoId }, { onConflict: "list_id,video_id", ignoreDuplicates: true })
        : await t.delete().eq("list_id", listId).eq("video_id", videoId);
      if (error) throw new Error(error.message);
    },
    ["/you", "/library"],
  );
}

export async function renameSavedListAction(listId: string, name: string): Promise<GapResult> {
  const n = listName.safeParse(name);
  if (!uuid.safeParse(listId).success || !n.success) return { ok: false, error: "Invalid name" };
  return run(
    async (sb) => {
      const { error } = await loose(sb).from("saved_lists").update({ name: n.data }).eq("id", listId);
      if (error) throw new Error(error.message);
    },
    ["/you", "/library"],
  );
}
