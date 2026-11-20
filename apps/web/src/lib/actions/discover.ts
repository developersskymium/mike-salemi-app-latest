"use server";

import { addToCollection, createCollection, saveToolResult, saveVideoPosition, toggleSave } from "@ms/api";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const OFFLINE = "Preview mode: changes can't be saved here.";
const uuid = z.string().uuid();

async function run<T>(fn: (ctx: Awaited<ReturnType<typeof getUser>> & { userId: string }) => Promise<T>): Promise<ActionResult<T>> {
  if (MOCK) return { ok: false, error: OFFLINE };
  try {
    const ctx = await getUser();
    if (!ctx.user) return { ok: false, error: "Please sign in again." };
    return { ok: true, data: await fn({ ...ctx, userId: ctx.user.id }) };
  } catch {
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

/** Save or un-save a library video; returns the new saved state. */
export async function toggleSaveVideo(videoId: string): Promise<ActionResult<boolean>> {
  if (!uuid.safeParse(videoId).success) return { ok: false, error: "Unknown video." };
  return run(({ supabase, userId }) => toggleSave(supabase, userId, videoId));
}

/** Add a video to a collection, creating the collection first when a new name is given. */
export async function addVideoToCollection(videoId: string, target: { id?: string; name?: string }): Promise<ActionResult<{ id: string }>> {
  const parsed = z
    .object({ videoId: uuid, id: uuid.optional(), name: z.string().trim().min(1).max(60).optional() })
    .refine((x) => x.id || x.name)
    .safeParse({ videoId, ...target });
  if (!parsed.success) return { ok: false, error: "Choose a collection or give it a name." };
  return run(async ({ supabase, userId }) => {
    const id = parsed.data.id ?? (await createCollection(supabase, userId, parsed.data.name!));
    await addToCollection(supabase, id, videoId);
    return { id };
  });
}

/** Stores a tool result for the signed-in member (shown in You → Saves). */
export async function saveToolRun(
  toolId: string,
  answers: Record<string, string>,
  result: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  const ok = z
    .object({ toolId: z.string().regex(/^[a-z0-9-]{2,40}$/), answers: z.record(z.string(), z.string().max(80)) })
    .safeParse({ toolId, answers });
  if (!ok.success || JSON.stringify(result).length > 8000) return { ok: false, error: "That result couldn't be saved." };
  return run(async ({ supabase, userId }) => ({ id: (await saveToolResult(supabase, userId, toolId, answers, result)).id }));
}

/** Remembers where the member stopped in a library video (Continue watching). Fire-and-forget from the player. */
export async function saveVideoPositionAction(videoId: string, seconds: number, duration: number | null): Promise<ActionResult<true>> {
  const ok = z.object({ videoId: uuid, seconds: z.number().min(0).max(86400), duration: z.number().min(0).max(86400).nullable() }).safeParse({ videoId, seconds, duration });
  if (!ok.success) return { ok: false, error: "Bad position." };
  return run(async ({ supabase, userId }) => {
    await saveVideoPosition(supabase, userId, videoId, seconds, duration);
    return true as const;
  });
}
