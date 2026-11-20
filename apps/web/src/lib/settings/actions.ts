"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import { NOTIFY_TOPICS, normalizeMatrix, type NotifyMatrix, type Result, type TrainingProfile } from "./model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/** Preview mode (MOCK_DATA) accepts writes without a database so every flow can be walked through. */
async function run<T>(fn: (sb: Loose, userId: string, email: string) => Promise<T>, mock: T, paths: string[] = ["/you/settings"]): Promise<Result<T>> {
  if (MOCK) return { ok: true, data: mock };
  try {
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, error: "Please sign in again." };
    const data = await fn(supabase as Loose, user.id, user.email ?? "");
    for (const p of paths) revalidatePath(p);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

async function upsertSettings(sb: Loose, userId: string, patch: Record<string, unknown>) {
  const { error } = await sb.from("member_settings").upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

/* ---------------------------------------------------------------- account */

export async function saveName(name: string) {
  const n = z.string().trim().min(1, "Please add your name.").max(80).safeParse(name);
  if (!n.success) return { ok: false, error: n.error.issues[0]!.message } as Result;
  return run(async (sb, uid) => {
    const { error } = await sb.from("profiles").update({ display_name: n.data, first_name: n.data.split(" ")[0] }).eq("id", uid);
    if (error) throw new Error(error.message);
  }, undefined);
}

export async function saveUnits(units: "kg" | "lb") {
  if (units !== "kg" && units !== "lb") return { ok: false, error: "Unknown unit" } as Result;
  return run((sb, uid) => upsertSettings(sb, uid, { units }), undefined);
}

export async function saveReducedMotion(on: boolean) {
  return run((sb, uid) => upsertSettings(sb, uid, { reduced_motion: Boolean(on) }), undefined);
}

export async function saveAutoplay(on: boolean) {
  return run(async (sb, uid) => {
    const { data } = await sb.from("profiles").select("preferences").eq("id", uid).maybeSingle();
    const { error } = await sb.from("profiles").update({ preferences: { ...(data?.preferences ?? {}), autoplay: Boolean(on) } }).eq("id", uid);
    if (error) throw new Error(error.message);
  }, undefined);
}

/* ---------------------------------------------------------- training profile */

const profilePatch = z
  .object({
    goal_kind: z.string().max(40),
    days_per_week: z.number().int().min(1).max(7),
    training_days: z.array(z.number().int().min(0).max(6)).max(7),
    session_minutes: z.number().int().min(5).max(120),
    equipment: z.array(z.string().max(60)).max(12),
    bell_weights: z.string().max(200),
    kb_experience: z.number().int().min(0).max(3),
    kb_level: z.enum(["beginner", "intermediate", "advanced"]),
    limitations: z.string().max(600),
  })
  .partial();

/** The single write path for the training profile: save_training_profile (0025). */
export async function saveProfile(patch: TrainingProfile, source = "profile") {
  const p = profilePatch.safeParse(patch);
  if (!p.success) return { ok: false, error: "Something in that answer looks off." } as Result<TrainingProfile>;
  return run(async (sb) => {
    const { data, error } = await sb.rpc("save_training_profile", { p_patch: p.data, p_source: source.slice(0, 64) });
    if (error) throw new Error(error.message);
    return (data ?? {}) as TrainingProfile;
  }, p.data as TrainingProfile, ["/you/settings", "/today", "/plan"]);
}

/** Kettlebells I own: kept in member_settings and mirrored into the profile's bell_weights (what intakes read). */
export async function saveOwnedBells(kg: number[]) {
  const bells = [...new Set(kg.map(Number).filter((x) => Number.isFinite(x) && x > 0 && x <= 100))].sort((a, b) => a - b).slice(0, 24);
  return run(async (sb, uid) => {
    await upsertSettings(sb, uid, { owned_bells: bells });
    if (bells.length) await sb.rpc("save_training_profile", { p_patch: { bell_weights: bells.map((b) => `${b} kg`).join(", ") }, p_source: "settings" });
  }, undefined);
}

/* ------------------------------------------------------------ notifications */

export async function saveMatrix(matrix: NotifyMatrix) {
  const m = normalizeMatrix(matrix);
  return run(async (sb, uid) => {
    await upsertSettings(sb, uid, { notify_matrix: m });
    // Mirror into the reminder engine's switches (0013) so sending follows the matrix.
    const any = (ch: "push" | "email") => NOTIFY_TOPICS.some((t) => m[t.id][ch]);
    const { error } = await sb.from("notification_prefs").upsert(
      {
        user_id: uid,
        email_enabled: any("email"),
        push_enabled: any("push"),
        reminders_enabled: m.reminders.push || m.reminders.email,
        streak_nudge: m.streak.push || m.streak.email,
        weekly_recap: m.recap.email || m.recap.push,
        new_content: m.new_content.email || m.new_content.push,
        announcements: m.coaching.email || m.coaching.push,
        offers_email: m.offers.email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
  }, undefined);
}

const hhmm = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

export async function saveReminderTime(time: string) {
  if (!hhmm.safeParse(time).success) return { ok: false, error: "Pick a time." } as Result;
  return run(async (sb, uid) => {
    const { error } = await sb.from("notification_prefs").upsert({ user_id: uid, reminder_time: time, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    await tick(sb, uid, "reminder_time");
  }, undefined, ["/you/settings", "/today"]);
}

export async function saveQuietHours(start: string | null, end: string | null) {
  if ((start && !hhmm.safeParse(start).success) || (end && !hhmm.safeParse(end).success)) return { ok: false, error: "Pick both times." } as Result;
  return run(async (sb, uid) => {
    const { error } = await sb.from("notification_prefs").upsert({ user_id: uid, quiet_start: start, quiet_end: end, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  }, undefined);
}

/* ------------------------------------------------------------------ billing */

/** Change / pause / cancel. Until Stripe is live these record the intent for Mike's team and say so plainly. */
export async function billingIntent(kind: "change" | "pause" | "cancel", detail: { plan?: string; interval?: string; months?: number; reason?: string }) {
  if (!["change", "pause", "cancel"].includes(kind)) return { ok: false, error: "Unknown action" } as Result<{ live: boolean }>;
  return run(async (sb, uid) => {
    const { error } = await sb.from("account_requests").insert({ user_id: uid, kind: "billing", topic: kind, message: detail.reason?.slice(0, 2000) ?? null, payload: { plan: detail.plan ?? null, interval: detail.interval ?? null, months: detail.months ?? null } });
    if (error) throw new Error(error.message);
    return { live: false };
  }, { live: false });
}

/* ------------------------------------------------------------------ privacy */

/**
 * Delete request. Before Mike's team deletes anything: any card-billed plan is set to end at its period end
 * (no more charges; it stays open until then) and upcoming coaching sessions are cancelled (credit returned
 * under the usual 24-hour rule). Retreat places are left to Mike's team. What was done is saved on the request.
 */
export async function requestDeletion(reason: string) {
  return run(async (sb, uid) => {
    const { data: open } = await sb.from("account_requests").select("id").eq("user_id", uid).eq("kind", "delete").eq("status", "open").maybeSingle();
    if (open) return { already: true, plansStopped: 0, sessionsCancelled: 0, problems: [] as string[] };

    const problems: string[] = [];
    const plansStopped = await stopRenewals(uid, problems);

    let sessionsCancelled = 0;
    const { data: bookings } = await sb.from("coaching_bookings").select("id").eq("user_id", uid).eq("status", "booked").gt("starts_at", new Date().toISOString());
    for (const b of (bookings ?? []) as { id: string }[]) {
      const { error } = await sb.rpc("cancel_coaching", { p_booking: b.id });
      if (error) problems.push(`coaching ${b.id}: ${error.message}`);
      else sessionsCancelled++;
    }

    const { error } = await sb.from("account_requests").insert({
      user_id: uid, kind: "delete", message: reason.slice(0, 2000) || null,
      payload: { plans_set_to_end: plansStopped, coaching_cancelled: sessionsCancelled, problems: problems.slice(0, 10) },
    });
    if (error) throw new Error(error.message);
    return { already: false, plansStopped, sessionsCancelled, problems };
  }, { already: false, plansStopped: 0, sessionsCancelled: 0, problems: [] as string[] }, ["/you/settings", "/you/billing", "/coaching"]);
}

/** Sets every live card-billed Stripe subscription of the member to end at period end. No-op without Stripe keys. */
async function stopRenewals(uid: string, problems: string[]): Promise<number> {
  const { stripeConfigured, getStripe } = await import("@/lib/stripe");
  if (!stripeConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;
  const { createServiceClient } = await import("@/lib/supabase/admin");
  const { syncSubscription } = await import("@/lib/commerce/subscriptions");
  const admin = createServiceClient();
  const { data } = await admin
    .from("subscriptions")
    .select("provider_ref")
    .eq("user_id", uid)
    .eq("provider", "stripe")
    .like("provider_ref", "sub_%")
    .in("status", ["trialing", "active", "past_due"])
    .gt("current_period_end", new Date().toISOString());
  const stripe = getStripe();
  let n = 0;
  for (const row of data ?? []) {
    try {
      const sub = await stripe.subscriptions.update(row.provider_ref as string, { cancel_at_period_end: true });
      await syncSubscription(admin, sub, false, stripe);
      n++;
    } catch (e) {
      problems.push(`plan ${row.provider_ref}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return n;
}

export async function requestExport() {
  return run(async (sb, uid) => {
    const { error } = await sb.from("account_requests").insert({ user_id: uid, kind: "export" });
    if (error) throw new Error(error.message);
  }, undefined);
}

/* --------------------------------------------------------------------- help */

export async function sendSupport(topic: string, message: string, context: Record<string, string>) {
  const m = z.string().trim().min(10, "Tell us a little more (a sentence or two).").max(4000).safeParse(message);
  if (!m.success) return { ok: false, error: m.error.issues[0]!.message } as Result;
  return run(async (sb, uid) => {
    const { error } = await sb.from("account_requests").insert({ user_id: uid, kind: "support", topic: topic.slice(0, 80), message: m.data, payload: Object.fromEntries(Object.entries(context).slice(0, 12).map(([k, v]) => [k.slice(0, 40), String(v).slice(0, 300)])) });
    if (error) throw new Error(error.message);
  }, undefined);
}

/* ---------------------------------------------------------- onboarding + first week */

async function tick(sb: Loose, uid: string, item: string) {
  const { data } = await sb.from("member_settings").select("checklist").eq("user_id", uid).maybeSingle();
  await upsertSettings(sb, uid, { checklist: { ...(data?.checklist ?? {}), [item]: new Date().toISOString() } });
}

export async function completeOnboarding(profile: TrainingProfile, recommended: string) {
  const p = profilePatch.safeParse(profile);
  if (!p.success) return { ok: false, error: "Something in your answers looks off." } as Result;
  return run(async (sb, uid) => {
    const { error } = await sb.rpc("save_training_profile", { p_patch: p.data, p_source: "onboarding" });
    if (error) throw new Error(error.message);
    const { data } = await sb.from("profiles").select("onboarding").eq("id", uid).maybeSingle();
    await sb.from("profiles").update({ onboarding: { ...(data?.onboarding ?? {}), completed_at: new Date().toISOString(), recommended: recommended.slice(0, 80) } }).eq("id", uid);
  }, undefined, ["/today", "/you/settings"]);
}

export async function skipOnboardingNow() {
  return run(async (sb, uid) => {
    const { data } = await sb.from("profiles").select("onboarding").eq("id", uid).maybeSingle();
    await sb.from("profiles").update({ onboarding: { ...(data?.onboarding ?? {}), skipped_at: new Date().toISOString() } }).eq("id", uid);
  }, undefined, ["/today"]);
}

export async function markWelcomeSeen() {
  return run((sb, uid) => upsertSettings(sb, uid, { welcome_seen_at: new Date().toISOString() }), undefined, []);
}

export async function tickChecklist(item: "first_session" | "reminder_time" | "home_screen" | "dismissed") {
  return run((sb, uid) => tick(sb, uid, item), undefined, ["/today"]);
}

export async function markInstallPrompted() {
  return run((sb, uid) => upsertSettings(sb, uid, { install_prompt_at: new Date().toISOString() }), undefined, []);
}

/** Server copy of a form draft (autosave/resume across devices). `null` clears it. */
export async function saveFormDraft(key: string, draft: { answers: unknown; step: number; savedAt: string } | null) {
  if (!/^[a-z0-9-]{2,48}$/.test(key)) return { ok: false, error: "bad key" } as Result;
  return run(async (sb, uid) => {
    const { data } = await sb.from("member_settings").select("form_drafts").eq("user_id", uid).maybeSingle();
    const all = { ...(data?.form_drafts ?? {}) } as Record<string, unknown>;
    if (draft) all[key] = draft;
    else delete all[key];
    await upsertSettings(sb, uid, { form_drafts: all });
  }, undefined, []);
}
