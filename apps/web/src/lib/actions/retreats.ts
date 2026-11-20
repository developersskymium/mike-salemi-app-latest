"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { MOCK } from "@/lib/mock";

/** Retreat writes (spec 12): notify-me / question-call requests and the shared photo wall. Never throws to the client. */
export type RetreatResult = { ok: true } | { ok: false; message: string };

const Lead = z.object({
  kind: z.enum(["notify", "question_call"]),
  email: z.string().trim().email().max(254),
  runId: z.string().uuid().nullable(),
  note: z.string().trim().max(1000).nullable(),
});

/** "Notify me" and "Questions? Book a 15-min call": one row in retreat_leads via public.retreat_lead(). */
export async function retreatLeadAction(input: { kind: "notify" | "question_call"; email: string; runId?: string | null; note?: string | null }): Promise<RetreatResult> {
  const p = Lead.safeParse({ kind: input.kind, email: input.email, runId: input.runId ?? null, note: input.note?.trim() || null });
  if (!p.success) return { ok: false, message: "Check your email address." };
  if (MOCK) return { ok: true };
  try {
    const { supabase: sb } = await getUser();
    const { error } = await sb.rpc("retreat_lead" as never, { p_kind: p.data.kind, p_email: p.data.email, p_run: p.data.runId, p_note: p.data.note } as never);
    if (error) return { ok: false, message: /email/i.test(error.message) ? "Check your email address." : "That didn’t go through. Try again in a moment." };
    return { ok: true };
  } catch {
    return { ok: false, message: "That didn’t go through. Try again in a moment." };
  }
}

const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

/** Shared photo wall: booked men add a photo (≤12 MB) with an optional caption. RLS checks the booking. */
export async function postWallPhotoAction(form: FormData): Promise<RetreatResult> {
  const runId = String(form.get("runId") ?? "");
  const file = form.get("photo");
  const caption = String(form.get("caption") ?? "").trim().slice(0, 280) || null;
  if (!/^[0-9a-f-]{36}$/i.test(runId) || !(file instanceof File) || !file.size) return { ok: false, message: "Pick a photo first." };
  if (!TYPES.has(file.type)) return { ok: false, message: "Photos only: JPEG, PNG, WebP or HEIC." };
  if (file.size > 12 * 1024 * 1024) return { ok: false, message: "That photo is over 12 MB." };
  if (MOCK) return { ok: true };
  try {
    const { supabase: sb, user } = await getUser();
    if (!user) return { ok: false, message: "Sign in to share photos." };
    const ext = file.type.split("/")[1]!.replace("jpeg", "jpg");
    const path = `${runId}/${user.id}/${crypto.randomUUID()}.${ext}`;
    const up = await sb.storage.from("retreat-wall").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) return { ok: false, message: "Only men booked on this retreat can share here." };
    const { error } = await sb.from("run_wall_posts" as never).insert({ run_id: runId, user_id: user.id, path, caption } as never);
    if (error) return { ok: false, message: "The photo uploaded but didn’t post. Try again." };
    revalidatePath(`/experiences/${runId}`);
    return { ok: true };
  } catch {
    return { ok: false, message: "That didn’t go through. Try again in a moment." };
  }
}
