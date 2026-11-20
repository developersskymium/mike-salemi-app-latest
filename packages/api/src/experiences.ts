import type { DB } from "./client";

export type RunStatus = "draft" | "open" | "waitlist" | "full" | "in_progress" | "past" | "cancelled";
export type ApplicationStatus = "submitted" | "call_booked" | "accepted" | "waitlist" | "declined" | "booked" | "cancelled";

export interface MyRun {
  application_id: string;
  status: ApplicationStatus;
  applied_at: string;
  run_id: string;
  run_name: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  run_status: RunStatus;
  location: Record<string, unknown>;
  price_note: string | null;
  draft_note: string | null;
  program_id: string;
  program_slug: string;
  program_name: string;
  program_type: string;
  countdown_days: number;
  phase: "before" | "during" | "after";
  next_itinerary_item: { id: string; day_index: number; title: string; description: string | null; location: string | null; at: string } | null;
  checklist: { done: number; total: number };
}

export interface MyCoachingBooking {
  id: string;
  starts_at: string;
  duration_minutes: number;
  status: "booked" | "completed" | "cancelled" | "no_show";
  meeting_url: string | null;
  member_note: string | null;
  can_cancel_with_refund: boolean;
  package: string | null;
}

export interface MyExperiences {
  runs: MyRun[];
  coaching: { credits_remaining: number; bookings: MyCoachingBooking[] };
}

async function rpc<T>(sb: DB, fn: string, args: Record<string, unknown> = {}): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.rpc as any)(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Runs (retreats, live cohorts, challenges) of a program, with itinerary — public. */
export async function listRuns(sb: DB, programId?: string) {
  let q = sb.from("program_runs").select("*, programs(id, slug, name, type), itinerary_items(*)").order("starts_at");
  if (programId) q = q.eq("program_id", programId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...r,
    itinerary_items: [...(r.itinerary_items ?? [])].sort((a, b) => a.day_index - b.day_index || a.position - b.position),
  }));
}

export async function getRun(sb: DB, runId: string) {
  const { data, error } = await sb
    .from("program_runs")
    .select("*, programs(id, slug, name, type, description), itinerary_items(*)")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, itinerary_items: [...(data.itinerary_items ?? [])].sort((a, b) => a.day_index - b.day_index || a.position - b.position) };
}

/** Apply (or update answers). Waitlisted runs file the application as waitlist. */
export function applyToRun(sb: DB, runId: string, answers: Record<string, unknown>) {
  return rpc<{ application_id: string; status: ApplicationStatus }>(sb, "apply_to_run", { p_run: runId, p_answers: answers });
}

/** The member's applications/bookings with countdown, next itinerary item, checklist progress, and coaching. */
export function myExperiences(sb: DB) {
  return rpc<MyExperiences>(sb, "my_experiences");
}

/** Tick a packing/prerequisite item for a run (item keys are details.packing[].id / details.prerequisites[].id). */
export async function setChecklistItem(sb: DB, userId: string, runId: string, itemKey: string, done: boolean) {
  const { error } = await sb
    .from("run_checklist")
    .upsert({ user_id: userId, run_id: runId, item_key: itemKey, done }, { onConflict: "user_id,run_id,item_key" });
  if (error) throw new Error(error.message);
}

export async function myChecklist(sb: DB, userId: string, runId: string) {
  const { data, error } = await sb.from("run_checklist").select("item_key, done").eq("user_id", userId).eq("run_id", runId);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r) => [r.item_key, r.done]));
}

/** Booked participants only (RLS): live session join links and recordings. */
export async function runSessions(sb: DB, runId: string) {
  const { data, error } = await sb.from("run_sessions").select("*").eq("run_id", runId).order("starts_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Coaching packages with their active prices. */
export async function coachingPackages(sb: DB) {
  const [{ data: pkgs, error }, { data: prices }] = await Promise.all([
    sb.from("coaching_packages").select("*").eq("is_active", true).order("position"),
    sb.from("prices").select("*").eq("kind", "coaching").eq("is_active", true),
  ]);
  if (error) throw new Error(error.message);
  return (pkgs ?? []).map((p) => ({ ...p, prices: (prices ?? []).filter((x) => x.ref_id === p.id) }));
}

/** Open coaching slots in the future. */
export async function openCoachingSlots(sb: DB, from?: Date, to?: Date) {
  let q = sb.from("coaching_slots").select("*").eq("is_open", true).gt("starts_at", (from ?? new Date()).toISOString());
  if (to) q = q.lt("starts_at", to.toISOString());
  const { data, error } = await q.order("starts_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Uses one credit (oldest valid first) and closes the slot. */
export function bookCoaching(sb: DB, slotId: string, note?: string) {
  return rpc<{ booking_id: string; starts_at: string; credit_id: string; credits_left: number }>(
    sb, "book_coaching", { p_slot: slotId, p_note: note ?? null },
  );
}

/** Cancels; 24h or more before the start returns the credit. */
export function cancelCoaching(sb: DB, bookingId: string) {
  return rpc<{ cancelled: boolean; credit_returned: boolean }>(sb, "cancel_coaching", { p_booking: bookingId });
}
