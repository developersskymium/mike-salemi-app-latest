import "server-only";
import { appUrl, emailConfigured } from "./config";
import { drainOutbox } from "./outbox";
import { sendEmail } from "./send";
import { renderEmail } from "./templates";

/** Service client when the key is set; null otherwise (local preview, missing env). */
async function service() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createServiceClient } = await import("@/lib/supabase/admin");
  return createServiceClient();
}

/** Delivers this member's queued welcome email right away instead of waiting for the 5-minute cron. Never throws. */
export async function deliverWelcomeNow(userId: string) {
  try {
    const sb = await service();
    if (!sb) return;
    const { data } = await sb.from("email_outbox").select("id").eq("user_id", userId).eq("kind", "welcome").in("status", ["pending"]).limit(1);
    if (data?.length) await drainOutbox(sb, { ids: data.map((r) => r.id as string) });
  } catch (e) {
    console.error("welcome delivery failed", e);
  }
}

/**
 * Branded password reset: a recovery token from Supabase Auth, our own email through Resend, and a
 * link back to /auth/confirm (never to the caller's host). Returns false when email or the service
 * key isn't configured, so the caller falls back to Supabase's built-in reset email.
 */
export async function sendBrandedReset(email: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  const sb = await service();
  if (!sb) return false;
  try {
    const { data, error } = await sb.auth.admin.generateLink({ type: "recovery", email });
    // Never reveal whether an account exists: unknown emails simply get nothing.
    if (error || !data?.properties?.hashed_token) return true;
    const actionUrl = `${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=${encodeURIComponent("/auth/reset?mode=update")}`;
    const r = renderEmail({ kind: "password_reset", actionUrl });
    const res = await sendEmail({ to: email, subject: r.subject, html: r.html, text: r.text, sender: r.sender });
    await sb.from("email_outbox").insert({
      user_id: data.user.id, kind: "password_reset", dedupe_key: `reset:${Date.now()}`, status: res.status === "sent" ? "sent" : res.status === "not_configured" ? "not_configured" : "failed",
      subject: r.subject, to_email: email, attempts: 1, provider_id: "id" in res ? res.id : null, last_error: "error" in res ? res.error : null,
      sent_at: res.status === "sent" ? new Date().toISOString() : null,
    });
    return res.status === "sent";
  } catch (e) {
    console.error("branded reset failed", e);
    return false;
  }
}
