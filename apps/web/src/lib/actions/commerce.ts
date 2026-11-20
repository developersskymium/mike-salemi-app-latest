"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  acceptOrgInvite, applyToRun, bookCoaching, cancelCoaching, inviteToOrg, joinOrg, logOfferEvent, removeOrgMember,
  setChecklistItem, setOrgCoach, type OfferPlacement,
} from "@ms/api";
import { getUser } from "@/lib/supabase/server";
import { MOCK } from "@/lib/mock";

/** Every write returns a typed result the UI handles; nothing here throws to the client. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; message: string };

const OFFLINE: ActionResult<never> = {
  ok: false,
  error: "preview_offline",
  message: "Saving isn't available in the local preview.",
};

function fail(error: string, message: string): ActionResult<never> {
  return { ok: false, error, message };
}

/** Friendly copy for the reasons the database functions raise. */
function friendly(e: unknown, fallback: string): ActionResult<never> {
  const raw = e instanceof Error ? e.message : String(e);
  const map: [RegExp, string][] = [
    [/no.*credit/i, "You have no coaching credits left. Pick a package to add more."],
    [/slot.*(taken|closed|not open)/i, "That time was just taken. Pick another."],
    [/seat/i, "This organization has no seats left. Ask your admin to add more."],
    [/expired/i, "This invite has expired. Ask for a new one."],
    [/email/i, "This invite was sent to a different email. Sign in with that email."],
    [/not.*(allowed|authorized|admin)/i, "You don't have permission to do that."],
    [/not found|invalid/i, "That link isn't valid anymore."],
  ];
  const hit = map.find(([re]) => re.test(raw));
  return fail("failed", hit ? hit[1] : fallback);
}

async function member() {
  const { supabase, user } = await getUser();
  return { sb: supabase, user };
}

/* ------------------------------------------------------------------ offers */

const Placement = z.enum(["today", "program_page", "day_complete", "program_complete", "library", "tool_result", "checkout"]);

export async function logOfferEventAction(offerId: string, placement: OfferPlacement, event: "view" | "click" | "dismiss"): Promise<ActionResult> {
  const parsed = z.object({ offerId: z.uuid(), placement: Placement, event: z.enum(["view", "click", "dismiss"]) }).safeParse({ offerId, placement, event });
  if (!parsed.success) return fail("invalid", "Invalid offer event.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    await logOfferEvent(sb, parsed.data.offerId, parsed.data.placement, parsed.data.event);
    return { ok: true, data: undefined };
  } catch (e) {
    console.error("logOfferEvent", e);
    return fail("failed", "Couldn't record that.");
  }
}

/* ------------------------------------------------------------- experiences */

export async function toggleChecklistAction(runId: string, itemKey: string, done: boolean): Promise<ActionResult> {
  const p = z.object({ runId: z.uuid(), itemKey: z.string().min(1).max(120), done: z.boolean() }).safeParse({ runId, itemKey, done });
  if (!p.success) return fail("invalid", "Invalid item.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    await setChecklistItem(sb, user.id, p.data.runId, p.data.itemKey, p.data.done);
    return { ok: true, data: undefined };
  } catch (e) {
    return friendly(e, "Couldn't save that tick. Try again.");
  }
}

const Application = z.object({
  why: z.string().trim().min(10, "Tell Mike a little more (a sentence or two).").max(4000),
  where: z.string().trim().max(4000).optional().default(""),
  experience: z.enum(["new", "some", "returning"]),
  health: z.string().trim().max(2000).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  heard: z.string().trim().max(200).optional().default(""),
});
export type ApplicationAnswers = z.input<typeof Application>;

export async function applyToRunAction(runId: string, answers: ApplicationAnswers): Promise<ActionResult<{ status: string }>> {
  if (!z.uuid().safeParse(runId).success) return fail("invalid", "Unknown retreat.");
  const p = Application.safeParse(answers);
  if (!p.success) return fail("invalid", p.error.issues[0]?.message ?? "Check your answers.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    const r = await applyToRun(sb, runId, p.data);
    revalidatePath(`/experiences/${runId}`);
    return { ok: true, data: { status: r.status } };
  } catch (e) {
    return friendly(e, "Your application didn't go through. Try again in a moment.");
  }
}

/* ---------------------------------------------------------------- coaching */

export async function bookCoachingAction(slotId: string, note?: string): Promise<ActionResult<{ startsAt: string; creditsLeft: number }>> {
  const p = z.object({ slotId: z.uuid(), note: z.string().trim().max(1000).optional() }).safeParse({ slotId, note });
  if (!p.success) return fail("invalid", "Pick a time first.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    const r = await bookCoaching(sb, p.data.slotId, p.data.note || undefined);
    revalidatePath("/coaching");
    return { ok: true, data: { startsAt: r.starts_at, creditsLeft: r.credits_left } };
  } catch (e) {
    return friendly(e, "Booking didn't go through. Try again.");
  }
}

export async function cancelCoachingAction(bookingId: string): Promise<ActionResult<{ creditReturned: boolean }>> {
  if (!z.uuid().safeParse(bookingId).success) return fail("invalid", "Unknown session.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    const r = await cancelCoaching(sb, bookingId);
    revalidatePath("/coaching");
    return { ok: true, data: { creditReturned: r.credit_returned } };
  } catch (e) {
    return friendly(e, "Couldn't cancel. Try again.");
  }
}

/* ----------------------------------------------------------- organizations */

export async function joinOrgAction(token: string, kind: "invite" | "link"): Promise<ActionResult<{ orgId: string; role: string }>> {
  if (!z.string().min(8).max(200).safeParse(token).success) return fail("invalid", "That link isn't valid anymore.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    const r = kind === "invite" ? await acceptOrgInvite(sb, token) : await joinOrg(sb, token);
    revalidatePath("/you/organization");
    return { ok: true, data: { orgId: r.org_id, role: r.role } };
  } catch (e) {
    return friendly(e, "Couldn't join. Try again.");
  }
}

export async function inviteToOrgAction(orgId: string, email: string, role: "admin" | "coach" | "member"): Promise<ActionResult<{ seatsLeft: number }>> {
  const p = z.object({ orgId: z.uuid(), email: z.email("Enter a valid email."), role: z.enum(["admin", "coach", "member"]) }).safeParse({ orgId, email, role });
  if (!p.success) return fail("invalid", p.error.issues[0]?.message ?? "Check the email.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    const r = await inviteToOrg(sb, p.data.orgId, p.data.email, p.data.role);
    revalidatePath("/you/organization");
    return { ok: true, data: { seatsLeft: r.seats_left } };
  } catch (e) {
    return friendly(e, "Couldn't send the invite.");
  }
}

export async function removeOrgMemberAction(orgId: string, userId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(orgId).success || !z.uuid().safeParse(userId).success) return fail("invalid", "Unknown member.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    await removeOrgMember(sb, orgId, userId);
    revalidatePath("/you/organization");
    return { ok: true, data: undefined };
  } catch (e) {
    return friendly(e, "Couldn't remove that member.");
  }
}

export async function setOrgCoachAction(orgId: string, memberId: string, coachId: string | null): Promise<ActionResult> {
  if (!z.uuid().safeParse(orgId).success || !z.uuid().safeParse(memberId).success || (coachId && !z.uuid().safeParse(coachId).success))
    return fail("invalid", "Unknown member.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    await setOrgCoach(sb, orgId, memberId, coachId);
    revalidatePath("/you/organization");
    return { ok: true, data: undefined };
  } catch (e) {
    return friendly(e, "Couldn't change the coach.");
  }
}
