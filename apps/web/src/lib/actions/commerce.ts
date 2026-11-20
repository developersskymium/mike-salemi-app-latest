"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  acceptOrgInvite, applyForCoaching, applyToRun, bookCoaching, bookRunCall, cancelCoaching, inviteToOrg, joinOrg, logOfferEvent,
  removeOrgMember, rescheduleCoaching, saveCoachingPrep, setChecklistItem, setOrgCoach, type OfferPlacement,
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
    [/no longer available/i, "That time was just taken. Pick another."],
    [/call step is already done/i, "Your call is already done. Mike’s team will be in touch about the next step."],
    [/apply first/i, "Send your application first."],
    [/24 hours/i, "Sessions can only be moved up to 24 hours before they start."],
    [/web address/i, "The footage link should start with https://"],
    [/does not need an application/i, "This package doesn’t need an application. Book it directly."],
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

/**
 * Stores when the member confirmed "I'm 18 or older" on the row they just created (adult_confirmed_at, 0041).
 * The answer itself is already enforced above and, for applications, saved in the answers. Best effort: before
 * 0041 is applied (no column) or without the service key it does nothing, and it never fails the action.
 */
async function recordAdult(table: "run_applications" | "coaching_applications" | "coaching_bookings", match: Record<string, string>) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const { createServiceClient } = await import("@/lib/supabase/admin");
    let q = (createServiceClient() as unknown as { from: (t: string) => any }).from(table).update({ adult_confirmed_at: new Date().toISOString() }); // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
    const { error } = await q.is("adult_confirmed_at", null);
    if (error) console.warn("recordAdult", table, error.message);
  } catch (e) {
    console.warn("recordAdult", table, e instanceof Error ? e.message : e);
  }
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
  intention: z.string().trim().min(1, "Choose what you're coming for.").max(200),
  calling: z.string().trim().min(10, "Tell Mike a little more about what's calling you (a sentence or two).").max(4000),
  experience: z.string().trim().min(1, "Choose where you're starting from.").max(200),
  health: z.string().trim().max(2000).default(""),
  diet: z.string().trim().max(500).default(""),
  sweatLodgeOk: z.literal(true, "Please confirm you understand the practices."),
  fullAttendance: z.literal(true, "Please confirm you can attend the full retreat."),
  agreements: z.literal(true, "Please agree to the circle agreements."),
  phone: z.string().trim().min(7, "Add a phone number so the team can reach you.").max(40),
  emergencyName: z.string().trim().min(2, "Add an emergency contact.").max(120),
  emergencyPhone: z.string().trim().min(7, "Add your emergency contact's phone.").max(40),
  adult: z.literal(true, "Please confirm you're 18 or older."),
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
    await recordAdult("run_applications", { run_id: runId, user_id: user.id });
    revalidatePath(`/experiences/${runId}`);
    return { ok: true, data: { status: r.status } };
  } catch (e) {
    return friendly(e, "Your application didn't go through. Try again in a moment.");
  }
}

/** Step 2 of the retreat sign-up: book or move the alignment call. */
export async function bookRunCallAction(runId: string, slotId: string): Promise<ActionResult<{ callAt: string }>> {
  const p = z.object({ runId: z.uuid(), slotId: z.uuid() }).safeParse({ runId, slotId });
  if (!p.success) return fail("invalid", "Pick a time first.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    const r = await bookRunCall(sb, p.data.runId, p.data.slotId);
    revalidatePath(`/experiences/${p.data.runId}`);
    revalidatePath("/today");
    return { ok: true, data: { callAt: r.call_at } };
  } catch (e) {
    return friendly(e, "That time didn't go through. Try another.");
  }
}

/* ---------------------------------------------------------------- coaching */

export async function saveCoachingPrepAction(bookingId: string, goals: string, footageUrl: string): Promise<ActionResult> {
  const p = z.object({ bookingId: z.uuid(), goals: z.string().trim().max(2000), footageUrl: z.union([z.literal(""), z.url("The footage link should start with https://").max(600)]) }).safeParse({ bookingId, goals, footageUrl: footageUrl.trim() });
  if (!p.success) return fail("invalid", p.error.issues[0]?.message ?? "Check your prep.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    await saveCoachingPrep(sb, p.data.bookingId, p.data.goals, p.data.footageUrl || null);
    revalidatePath("/coaching");
    return { ok: true, data: undefined };
  } catch (e) {
    return friendly(e, "Couldn't save your prep. Try again.");
  }
}

export async function rescheduleCoachingAction(bookingId: string, slotId: string): Promise<ActionResult<{ startsAt: string }>> {
  const p = z.object({ bookingId: z.uuid(), slotId: z.uuid() }).safeParse({ bookingId, slotId });
  if (!p.success) return fail("invalid", "Pick a new time first.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    const r = await rescheduleCoaching(sb, p.data.bookingId, p.data.slotId);
    revalidatePath("/coaching");
    return { ok: true, data: { startsAt: r.starts_at } };
  } catch (e) {
    return friendly(e, "Couldn't move the session. Try again.");
  }
}

const CoachingApplication = z.object({
  role: z.string().trim().min(2, "Tell Mike what you do.").max(200),
  goal: z.string().trim().min(10, "Tell Mike what you want from the eight weeks (a sentence or two).").max(2000),
  pressure: z.string().trim().max(2000).default(""),
  commit: z.literal(true, "Please confirm the daily five minutes."),
  adult: z.literal(true, "Please confirm you're 18 or older."),
});
export type CoachingApplicationAnswers = z.input<typeof CoachingApplication>;

export async function applyForCoachingAction(packageId: string, answers: CoachingApplicationAnswers): Promise<ActionResult<{ status: string }>> {
  if (!z.uuid().safeParse(packageId).success) return fail("invalid", "Unknown package.");
  const p = CoachingApplication.safeParse(answers);
  if (!p.success) return fail("invalid", p.error.issues[0]?.message ?? "Check your answers.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    const r = await applyForCoaching(sb, packageId, p.data);
    await recordAdult("coaching_applications", { package_id: packageId, user_id: user.id });
    revalidatePath("/coaching");
    return { ok: true, data: { status: r.status } };
  } catch (e) {
    return friendly(e, "Your application didn't go through. Try again in a moment.");
  }
}

export async function bookCoachingAction(slotId: string, note: string | undefined, adult: boolean): Promise<ActionResult<{ startsAt: string; creditsLeft: number }>> {
  const p = z.object({ slotId: z.uuid(), note: z.string().trim().max(1000).optional() }).safeParse({ slotId, note });
  if (!p.success) return fail("invalid", "Pick a time first.");
  if (adult !== true) return fail("adult_required", "Please confirm you're 18 or older. Coaching is for adults only.");
  if (MOCK) return OFFLINE;
  try {
    const { sb, user } = await member();
    if (!user) return fail("not_signed_in", "Sign in first.");
    const r = await bookCoaching(sb, p.data.slotId, p.data.note || undefined);
    await recordAdult("coaching_bookings", { slot_id: p.data.slotId, user_id: user.id, status: "booked" });
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
