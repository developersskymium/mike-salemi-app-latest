"use server";

import { revalidatePath } from "next/cache";
import { emailConfigured } from "@/lib/email/config";
import { cleanPatch, type PrefPatch } from "@/lib/email/prefs";
import { sendEmail } from "@/lib/email/send";
import { renderEmail } from "@/lib/email/templates";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };
const OFFLINE = { ok: false as const, error: "offline" };

async function member() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Sign in first");
  return { sb: supabase, user };
}

async function wrap<T>(fn: () => Promise<T>, paths: string[] = []): Promise<Result<T>> {
  if (MOCK) return OFFLINE;
  try {
    const data = await fn();
    for (const p of paths) revalidatePath(p);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

/** Saves any subset of the reminder / notification preferences (and the member's time zone). */
export async function saveReminderPrefs(patch: PrefPatch & { timezone?: string }): Promise<Result> {
  const clean = cleanPatch(patch as Record<string, unknown>);
  if (!clean.ok) return { ok: false, error: clean.error };
  const tz = patch.timezone;
  if (tz !== undefined) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
    } catch {
      return { ok: false, error: "Unknown time zone" };
    }
  }
  return wrap(async () => {
    const { sb, user } = await member();
    if (Object.keys(clean.data).length) {
      const { error } = await sb.from("notification_prefs").upsert({ user_id: user.id, ...clean.data, updated_at: new Date().toISOString() } as never);
      if (error) throw new Error(error.message);
    }
    if (tz) {
      const { error } = await sb.from("profiles").update({ timezone: tz }).eq("id", user.id);
      if (error) throw new Error(error.message);
    }
  }, ["/plan", "/you/settings"]);
}

/** Skip today's reminder, snooze for N minutes, or resume. Logged to reminder history. */
export async function reminderControl(action: "skip_today" | "snooze" | "resume", minutes = 60): Promise<Result<{ snoozed_until: string | null; skip_date: string | null }>> {
  if (!["skip_today", "snooze", "resume"].includes(action)) return { ok: false, error: "Unknown action" };
  return wrap(async () => {
    const { sb } = await member();
    const { data, error } = await sb.rpc("reminder_control" as never, { p_action: action, p_minutes: Math.round(minutes) } as never);
    if (error) throw new Error(error.message);
    return data as unknown as { snoozed_until: string | null; skip_date: string | null };
  }, ["/plan", "/you/notifications"]);
}

export async function clearReminderHistory(): Promise<Result<number>> {
  return wrap(async () => {
    const { sb } = await member();
    const { data, error } = await sb.rpc("clear_notification_history" as never);
    if (error) throw new Error(error.message);
    return data as unknown as number;
  }, ["/you/notifications"]);
}

/** "Send me a test email" — goes out right away (not through the cron), and is logged. */
export async function sendTestEmail(): Promise<Result<{ status: "sent" | "not_configured" | "failed"; to: string; error?: string }>> {
  if (MOCK) return { ok: true, data: { status: "not_configured", to: "member.test@example.com", error: "Email isn't set up yet." } };
  return wrap(async () => {
    const { user } = await member();
    const to = user.email;
    if (!to) throw new Error("There's no email on your account.");
    const r = renderEmail({ kind: "test", to });
    const res = await sendEmail({ to, subject: r.subject, html: r.html, text: r.text, sender: r.sender });
    await logDirect(user.id, "test", r.subject, to, res.status, "error" in res ? res.error : null, "id" in res ? res.id : null);
    return { status: res.status, to, error: "error" in res ? res.error : undefined };
  });
}

/** Records a directly-sent email in the outbox for the Studio log (needs the service key; skipped without it). */
async function logDirect(userId: string, kind: string, subject: string, to: string, status: string, error: string | null, providerId: string | null) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const { createServiceClient } = await import("@/lib/supabase/admin");
    await createServiceClient().from("email_outbox").insert({
      user_id: userId, kind, dedupe_key: `${kind}:${Date.now()}`, status: status === "sent" ? "sent" : status === "not_configured" ? "not_configured" : "failed",
      subject, to_email: to, last_error: error, provider_id: providerId, attempts: 1, sent_at: status === "sent" ? new Date().toISOString() : null,
    });
  } catch {
    /* logging is best effort */
  }
}

/* ------------------------------------------------------------- web push */

export async function pushConfig(): Promise<{ publicKey: string | null; emailReady: boolean }> {
  return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null, emailReady: emailConfigured() };
}

/** Stores this browser's push subscription and turns push on. */
export async function savePushSubscription(sub: { endpoint: string; keys?: { p256dh?: string; auth?: string } }): Promise<Result> {
  if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) return { ok: false, error: "Invalid subscription" };
  return wrap(async () => {
    const { sb, user } = await member();
    const token = JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys ?? {} });
    const { error } = await sb.from("push_tokens").upsert({ token, user_id: user.id, platform: "web" });
    if (error) throw new Error(error.message);
    await sb.from("notification_prefs").upsert({ user_id: user.id, push_enabled: true, updated_at: new Date().toISOString() } as never);
  }, ["/you/settings"]);
}

export async function removePushSubscription(endpoint: string): Promise<Result> {
  return wrap(async () => {
    const { sb, user } = await member();
    const { data } = await sb.from("push_tokens").select("token").eq("user_id", user.id).eq("platform", "web");
    for (const t of data ?? []) {
      try {
        if ((JSON.parse(t.token) as { endpoint?: string }).endpoint === endpoint) await sb.from("push_tokens").delete().eq("token", t.token);
      } catch {
        /* not a web subscription */
      }
    }
  });
}
