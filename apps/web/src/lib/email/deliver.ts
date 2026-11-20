import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { drainOutbox, type DrainSummary } from "./outbox";
import { sendPush, type WebPushSubscription } from "./push";
import { decide, type Candidate, type Decision } from "./reminders";

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
  email: DrainSummary;
}

export async function runReminders(sb: SupabaseClient, now = new Date()): Promise<ReminderSummary> {
  const { data, error } = await sb.rpc("reminder_candidates", { p_now: now.toISOString() });
  if (error) throw new Error(error.message);
  const candidates = (data ?? []) as Candidate[];
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

  const email = await drainOutbox(sb, { limit: 200 });
  return { candidates: candidates.length, decisions, events, push, email };
}
