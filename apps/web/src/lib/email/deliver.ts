import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { drainOutbox, type DrainSummary } from "./outbox";
import { sendPush, type WebPushSubscription } from "./push";
import { coachingReminderDue, decide, minutesOf, WIN_BACK_GAP, type Candidate, type Decision } from "./reminders";

/**
 * Hourly reminder run: ask the database who could get a reminder, decide per member (pure rules),
 * log every channel attempt to notification_events (deduped per local day), queue emails in the
 * outbox, wake push subscriptions, then drain the outbox.
 */
export interface ReminderSummary {
  candidates: number;
  decisions: number;
  events: number;
  push: { sent: number; failed: number; gone: number; notConfigured: number };
  coaching: number;
  email: DrainSummary;
}

export async function runReminders(sb: SupabaseClient, now = new Date()): Promise<ReminderSummary> {
  const { data, error } = await sb.rpc("reminder_candidates", { p_now: now.toISOString() });
  if (error) throw new Error(error.message);
  const candidates = (data ?? []) as Candidate[];

  // Who already got a win-back email in the last 30 days (decide() needs it; the DB function doesn't carry it).
  const { data: recentWins } = await sb
    .from("email_outbox")
    .select("user_id, created_at")
    .eq("kind", "win_back")
    .gte("created_at", new Date(now.getTime() - WIN_BACK_GAP * 86_400_000).toISOString());
  const lastWin = new Map<string, string>();
  for (const r of recentWins ?? []) if (!lastWin.has(r.user_id as string) || (r.created_at as string) > lastWin.get(r.user_id as string)!) lastWin.set(r.user_id as string, r.created_at as string);
  for (const c of candidates) c.last_win_back = lastWin.get(c.user_id) ?? null;
  const push = { sent: 0, failed: 0, gone: 0, notConfigured: 0 };
  let decisions = 0;
  let events = 0;

  for (const c of candidates) {
    let list: Decision[] = [];
    try {
      list = decide(c, now);
    } catch {
      continue;
    }
    decisions += list.length;
    for (const d of list) {
      for (const channel of d.channels) {
        const { data: inserted } = await sb
          .from("notification_events")
          .upsert(
            {
              user_id: c.user_id, kind: d.kind, channel, dedupe_key: d.dedupeKey, title: d.title, body: d.body, url: d.url,
              status: channel === "email" ? "queued" : "sent", scheduled_for: now.toISOString(), payload: { local_date: c.local_date, local_time: c.local_time },
            },
            { onConflict: "user_id,kind,channel,dedupe_key", ignoreDuplicates: true },
          )
          .select("id");
        const ev = inserted?.[0]?.id as string | undefined;
        if (!ev) continue; // already handled today
        events++;

        if (channel === "email") {
          await sb.from("email_outbox").upsert(
            { user_id: c.user_id, kind: d.kind, dedupe_key: d.dedupeKey, payload: { email: d.email }, event_id: ev },
            { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true },
          );
        } else if (channel === "push") {
          const { data: tokens } = await sb.from("push_tokens").select("token").eq("user_id", c.user_id).eq("platform", "web");
          let delivered = false;
          let err: string | null = null;
          for (const t of tokens ?? []) {
            let sub: WebPushSubscription;
            try {
              sub = JSON.parse(t.token as string) as WebPushSubscription;
            } catch {
              continue;
            }
            const r = await sendPush(sub);
            if (r.status === "sent") {
              delivered = true;
              push.sent++;
            } else if (r.status === "gone") {
              push.gone++;
              await sb.from("push_tokens").delete().eq("token", t.token as string);
            } else if (r.status === "not_configured") {
              push.notConfigured++;
              err = "Push isn't set up yet";
            } else {
              push.failed++;
              err = r.error;
            }
          }
          if (!delivered) await sb.from("notification_events").update({ status: "failed", error: err ?? "No browser subscribed" }).eq("id", ev);
        }
      }
    }
  }

  let coaching = 0;
  try {
    coaching = await queueCoachingReminders(sb, now);
  } catch (e) {
    console.error("coaching reminders", e);
  }

  const email = await drainOutbox(sb, { limit: 200 });
  return { candidates: candidates.length, decisions, events, push, coaching, email };
}

const localMinutes = (now: Date, tz: string | null | undefined) => {
  try {
    const t = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz || "UTC" });
    return minutesOf(t, 0);
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
};

/** Coaching call reminders about 24 hours ahead, once per booking, outside the member's quiet hours. */
export async function queueCoachingReminders(sb: SupabaseClient, now = new Date()): Promise<number> {
  const { data: bookings } = await sb
    .from("coaching_bookings")
    .select("id, user_id, starts_at, created_at, status")
    .eq("status", "booked")
    .gt("starts_at", new Date(now.getTime() + 2 * 3_600_000).toISOString())
    .lte("starts_at", new Date(now.getTime() + 24 * 3_600_000).toISOString())
    .limit(500);
  if (!bookings?.length) return 0;
  const users = [...new Set(bookings.map((b) => b.user_id as string))];
  const [{ data: prefs }, { data: profiles }] = await Promise.all([
    sb.from("notification_prefs").select("user_id, email_enabled, quiet_start, quiet_end").in("user_id", users),
    sb.from("profiles").select("id, timezone").in("id", users),
  ]);
  const prefOf = new Map((prefs ?? []).map((p) => [p.user_id as string, p]));
  const tzOf = new Map((profiles ?? []).map((p) => [p.id as string, p.timezone as string | null]));
  let queued = 0;
  for (const b of bookings) {
    const p = prefOf.get(b.user_id as string);
    const pr = p ? { email_enabled: p.email_enabled as boolean, quiet_start: (p.quiet_start as string | null)?.slice(0, 5) ?? null, quiet_end: (p.quiet_end as string | null)?.slice(0, 5) ?? null } : null;
    if (!coachingReminderDue(b as { starts_at: string; created_at: string; status: string }, pr, localMinutes(now, tzOf.get(b.user_id as string)), now)) continue;
    const { data: ins } = await sb
      .from("email_outbox")
      .upsert({ user_id: b.user_id, kind: "coaching_reminder", dedupe_key: `booking:${b.id}:${b.starts_at}`, payload: { booking_id: b.id } }, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true })
      .select("id");
    if (ins?.length) queued++;
  }
  return queued;
}
