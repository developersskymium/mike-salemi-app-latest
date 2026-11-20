import "server-only";
import { isoDate } from "@ms/core";
import { emailConfigured } from "@/lib/email/config";
import { normalizePrefs, type ReminderPrefs } from "@/lib/email/prefs";
import { mockable } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

export interface NotificationsData {
  email: string;
  timezone: string;
  /** Member-local date and time when loaded ("YYYY-MM-DD", "HH:MM"). */
  today: string;
  now: string;
  prefs: ReminderPrefs;
  emailReady: boolean;
  pushKey: string | null;
  isAdmin: boolean;
}

export interface ReminderEvent {
  id: string;
  kind: string;
  channel: "email" | "push" | "in_app";
  status: "queued" | "sent" | "opened" | "failed" | "skipped" | "snoozed";
  title: string;
  body: string | null;
  detail: string | null;
  error: string | null;
  created_at: string;
  opened_at: string | null;
}

export interface HistoryData {
  timezone: string;
  events: ReminderEvent[];
}

function localNow(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return { today: `${g("year")}-${g("month")}-${g("day")}`, now: `${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}` };
  } catch {
    const d = new Date();
    return { today: isoDate(d), now: d.toISOString().slice(11, 16) };
  }
}

async function session() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Not signed in");
  return { sb: supabase, user };
}

/** Reminder and notification preferences, with the member's clock and delivery readiness. */
export const loadNotifications = mockable("email-settings", async (): Promise<NotificationsData> => {
  const { sb, user } = await session();
  const [{ data: profile }, { data: prefs }, { data: admin }] = await Promise.all([
    sb.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    sb.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle(),
    sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
  ]);
  const timezone = profile?.timezone || "UTC";
  return {
    email: user.email ?? "",
    timezone,
    ...localNow(timezone),
    prefs: normalizePrefs(prefs as never),
    emailReady: emailConfigured(),
    pushKey: process.env.VAPID_PUBLIC_KEY ?? null,
    isAdmin: Boolean(admin),
  };
});

/** Every nudge we tried to deliver (newest first, last 200, cleared ones hidden). */
export const loadReminderHistory = mockable("email-history", async (): Promise<HistoryData> => {
  const { sb, user } = await session();
  const [{ data: profile }, { data }] = await Promise.all([
    sb.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    sb
      .from("notification_events" as never)
      .select("id, kind, channel, status, title, body, detail, error, created_at, opened_at")
      .eq("user_id", user.id)
      .is("cleared_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  return { timezone: profile?.timezone || "UTC", events: (data ?? []) as unknown as ReminderEvent[] };
});
