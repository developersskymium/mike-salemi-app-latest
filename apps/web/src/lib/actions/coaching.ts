"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { markCoachingMessagesRead, saveCoachingPrepForm, sendCoachingMessage, setCoachingHomeworkTick, setCoachingLiveReminder, type CoachingMessage } from "@ms/api";
import { getUser } from "@/lib/supabase/server";
import { MOCK } from "@/lib/mock";

export type CoachResult<T = undefined> = { ok: true; data: T } | { ok: false; message: string };

function friendly(e: unknown, fallback: string): CoachResult<never> {
  const raw = e instanceof Error ? e.message : String(e);
  if (/web address/i.test(raw)) return { ok: false, message: "The footage link should start with https://" };
  if (/not booked/i.test(raw)) return { ok: false, message: "This session is no longer booked." };
  if (/2,000/i.test(raw)) return { ok: false, message: "Keep each answer under 2,000 characters." };
  return { ok: false, message: fallback };
}

async function member() {
  const { supabase: sb, user } = await getUser();
  return { sb, user };
}

const Prep = z.object({
  bookingId: z.uuid(),
  goals: z.string().trim().min(3, "Say in a few words what you want from the call.").max(2000),
  since_last: z.string().trim().max(2000),
  watch: z.string().trim().max(2000),
  footage_url: z.union([z.literal(""), z.url("The footage link should start with https://").max(600)]),
});

/** Pre-call form: three questions plus an optional footage link. */
export async function saveCoachPrepAction(input: z.input<typeof Prep>): Promise<CoachResult> {
  const p = Prep.safeParse({ ...input, footage_url: input.footage_url.trim() });
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check your answers." };
  if (MOCK) return { ok: true, data: undefined };
  try {
    const { sb, user } = await member();
    if (!user) return { ok: false, message: "Sign in first." };
    await saveCoachingPrepForm(sb, p.data.bookingId, { goals: p.data.goals, since_last: p.data.since_last || null, watch: p.data.watch || null, footage_url: p.data.footage_url || null });
    revalidatePath("/coaching", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return friendly(e, "Couldn't save your answers. Try again.");
  }
}

/** Tick (or untick) a day of Mike's homework. */
export async function tickHomeworkAction(bookingId: string, onDate: string, done: boolean): Promise<CoachResult<{ done: boolean }>> {
  const p = z.object({ bookingId: z.uuid(), onDate: z.iso.date(), done: z.boolean() }).safeParse({ bookingId, onDate, done });
  if (!p.success) return { ok: false, message: "That day can't be ticked." };
  if (MOCK) return { ok: true, data: { done: p.data.done } };
  try {
    const { sb, user } = await member();
    if (!user) return { ok: false, message: "Sign in first." };
    await setCoachingHomeworkTick(sb, user.id, p.data.bookingId, p.data.onDate, p.data.done);
    revalidatePath("/coaching", "layout");
    return { ok: true, data: { done: p.data.done } };
  } catch (e) {
    return friendly(e, "Couldn't save that tick. Try again.");
  }
}

/** Send Mike a message in the member's own thread. */
export async function sendCoachMessageAction(body: string): Promise<CoachResult<CoachingMessage>> {
  const p = z.string().trim().min(1, "Write a message first.").max(4000, "Keep it under 4,000 characters.").safeParse(body);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check your message." };
  if (MOCK) return { ok: true, data: { id: crypto.randomUUID(), from_coach: false, body: p.data, attachment_url: null, created_at: new Date().toISOString(), read_at: null } };
  try {
    const { sb, user } = await member();
    if (!user) return { ok: false, message: "Sign in first." };
    const m = await sendCoachingMessage(sb, user.id, p.data);
    revalidatePath("/coaching/messages");
    return { ok: true, data: m };
  } catch (e) {
    return friendly(e, "Couldn't send. Try again.");
  }
}

export async function markCoachMessagesReadAction(): Promise<CoachResult> {
  if (MOCK) return { ok: true, data: undefined };
  try {
    const { sb, user } = await member();
    if (!user) return { ok: false, message: "Sign in first." };
    await markCoachingMessagesRead(sb);
    return { ok: true, data: undefined };
  } catch (e) {
    return friendly(e, "Couldn't update.");
  }
}

/** Remind me about a Zen Savage live. */
export async function liveReminderAction(liveId: string, on: boolean): Promise<CoachResult<{ on: boolean }>> {
  const p = z.object({ liveId: z.uuid(), on: z.boolean() }).safeParse({ liveId, on });
  if (!p.success) return { ok: false, message: "Couldn't set the reminder." };
  if (MOCK) return { ok: true, data: { on: p.data.on } };
  try {
    const { sb, user } = await member();
    if (!user) return { ok: false, message: "Sign in first." };
    await setCoachingLiveReminder(sb, user.id, p.data.liveId, p.data.on);
    revalidatePath("/coaching/zen-savage");
    return { ok: true, data: { on: p.data.on } };
  } catch (e) {
    return friendly(e, "Couldn't set the reminder.");
  }
}
