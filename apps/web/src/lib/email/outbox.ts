import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emailConfigured } from "./config";
import { sendEmail, type SendResult } from "./send";
import { renderEmail, type AppEmail } from "./templates";
import { ALWAYS_SEND } from "./catalog";

/**
 * Drains public.email_outbox (filled by DB triggers, the welcome queue and the reminders cron).
 * Uses the service-role client. Never throws for a single bad row; every row ends in a status:
 * sent · failed (retried up to 5 times) · skipped (preferences) · not_configured (no Resend key yet).
 */

type SB = SupabaseClient;
type Row = { id: string; user_id: string; kind: string; dedupe_key: string; payload: Record<string, unknown>; status: string; attempts: number; event_id: string | null; created_at: string };
type Prefs = { email_enabled: boolean; new_content: boolean; streak_nudge: boolean } | null;

/** Kinds worth delivering late once email is configured (reminders are not: they'd arrive stale). */
const DURABLE = [
  "welcome", "tool_result", "reward", "certificate", "schedule_created",
  "payment_receipt", "payment_failed", "plan_ending", "plan_ended", "plan_paused",
  "order_confirmation", "order_shipped", "coaching_booked", "retreat_application_received", "retreat_application_update", "referral_reward",
];
const MAX_ATTEMPTS = 5;

const longDate = (iso: string, tz = "UTC") =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: iso.length === 10 ? "UTC" : tz });
const cleanTitle = (t: string) => {
  const m = /^day\s+(\d+)\s*[-–—:]\s*(.+)$/i.exec(t.trim());
  return m ? `Day ${m[1]} · ${m[2]!.trim()}` : t.replace(/\s{2,}/g, " ").trim();
};
const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h! + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
};

/** "$119.00" from cents and an ISO currency. */
export const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format((cents ?? 0) / 100);

const validTz = (tz: string | null | undefined) => {
  try {
    if (tz) new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz || "UTC";
  } catch {
    return "UTC";
  }
};
/** "Thursday, November 27 at 9:00 AM" in the member's time zone. */
export const whenLabel = (iso: string, tz = "UTC") => {
  const d = new Date(iso);
  const zone = validTz(tz);
  const date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: zone });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: zone, timeZoneName: "short" });
  return `${date} at ${time}`;
};
const dateRange = (start: string | null, end: string | null, tz = "UTC") => {
  if (!start) return undefined;
  const zone = validTz(tz);
  const f = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: zone });
  const year = new Date(start).toLocaleDateString("en-US", { year: "numeric", timeZone: zone });
  return end && f(end) !== f(start) ? `${f(start)} to ${f(end)}, ${year}` : `${f(start)}, ${year}`;
};
const placeOf = (loc: unknown) => {
  if (!loc || typeof loc !== "object") return undefined;
  const l = loc as Record<string, unknown>;
  const parts = [l.name, l.city, l.region, l.country].filter((x): x is string => typeof x === "string" && x.trim() !== "");
  return parts.length ? [...new Set(parts)].join(", ") : undefined;
};
const addressOf = (a: unknown) => {
  if (!a || typeof a !== "object") return undefined;
  const r = a as Record<string, unknown>;
  const addr = (r.address && typeof r.address === "object" ? r.address : r) as Record<string, unknown>;
  const parts = [r.name, addr.line1, addr.line2, addr.city, [addr.state, addr.postal_code].filter(Boolean).join(" "), addr.country]
    .filter((x): x is string => typeof x === "string" && x.trim() !== "");
  return parts.length ? parts.join(", ") : undefined;
};

async function profileOf(sb: SB, userId: string) {
  const { data } = await sb.from("profiles").select("display_name, first_name, timezone").eq("id", userId).maybeSingle();
  return data as { display_name: string | null; first_name: string | null; timezone: string | null } | null;
}

/** Turns one outbox row into the email it describes, from live data. null = nothing to send. */
export async function buildFromRow(sb: SB, row: Row): Promise<{ email: AppEmail } | { skip: string }> {
  const p = row.payload ?? {};
  switch (row.kind) {
    case "training_reminder":
    case "streak_nudge":
    case "weekly_summary":
    case "new_content":
    case "test":
      return p.email ? { email: p.email as AppEmail } : { skip: "Missing email payload" };

    case "payment_receipt":
    case "payment_failed":
    case "plan_ending":
    case "plan_ended":
    case "plan_paused":
    case "win_back":
      return p.email ? { email: p.email as AppEmail } : { skip: "Missing email payload" };

    case "order_confirmation":
    case "order_shipped": {
      const { data: o } = await sb
        .from("orders")
        .select("id, reference, status, total_cents, shipping_cents, currency, shipping_address, fulfillment, tracking_carrier, tracking_number, tracking_url, order_items(kind, name, quantity, unit_cents)")
        .eq("id", p.order_id as string)
        .maybeSingle();
      if (!o) return { skip: "Order not found" };
      if (o.status !== "paid") return { skip: "Order is not paid" };
      const items = ((o.order_items ?? []) as { kind: string; name: string; quantity: number; unit_cents: number }[]).filter((i) => i.kind !== "shipping");
      const ref = (o.reference as string | null) ?? String(o.id).slice(0, 8).toUpperCase();
      if (row.kind === "order_shipped") {
        if (o.fulfillment !== "shipped" && o.fulfillment !== "delivered") return { skip: "Order is not shipped" };
        return {
          email: {
            kind: "order_shipped",
            reference: ref,
            items: items.map((i) => (i.quantity > 1 ? `${i.name} × ${i.quantity}` : i.name)),
            carrier: o.tracking_carrier ?? undefined,
            trackingNumber: o.tracking_number ?? undefined,
            trackingUrl: o.tracking_url && /^https?:\/\//.test(o.tracking_url) ? o.tracking_url : undefined,
            shipTo: addressOf(o.shipping_address),
          },
        };
      }
      return {
        email: {
          kind: "order_confirmation",
          reference: ref,
          items: items.map((i) => ({ name: i.name, quantity: i.quantity, amount: money(i.unit_cents * i.quantity, o.currency) })),
          shipping: o.shipping_cents ? money(o.shipping_cents, o.currency) : undefined,
          total: money(o.total_cents, o.currency),
          shipTo: addressOf(o.shipping_address),
          physical: Boolean(o.fulfillment) || Boolean(o.shipping_address),
        },
      };
    }

    case "coaching_booked":
    case "coaching_reminder": {
      const { data: b } = await sb
        .from("coaching_bookings")
        .select("id, status, starts_at, duration_minutes, meeting_url, coaching_credits(coaching_packages(name))")
        .eq("id", p.booking_id as string)
        .maybeSingle();
      if (!b) return { skip: "Booking not found" };
      if (b.status !== "booked") return { skip: "Booking is no longer active" };
      if (Date.parse(b.starts_at) < Date.now()) return { skip: "Call already started" };
      const pr = await profileOf(sb, row.user_id);
      const pkg = (b.coaching_credits as unknown as { coaching_packages: { name: string } | null } | null)?.coaching_packages?.name;
      return {
        email: {
          kind: row.kind,
          when: whenLabel(b.starts_at, pr?.timezone ?? "UTC"),
          minutes: b.duration_minutes ?? 45,
          packageName: pkg ?? undefined,
          meetingUrl: b.meeting_url && /^https?:\/\//.test(b.meeting_url) ? b.meeting_url : undefined,
          bookingId: b.id,
        },
      };
    }

    case "retreat_application_received":
    case "retreat_application_update": {
      const { data: a } = await sb
        .from("run_applications")
        .select("id, run_id, status, program_runs(name, starts_at, ends_at, timezone, location, programs(name))")
        .eq("id", p.application_id as string)
        .maybeSingle();
      if (!a) return { skip: "Application not found" };
      const run = a.program_runs as unknown as { name: string | null; starts_at: string | null; ends_at: string | null; timezone: string | null; location: unknown; programs: { name: string } | null } | null;
      const retreatName = run?.name || run?.programs?.name || "your retreat";
      const base = { retreatName, dates: dateRange(run?.starts_at ?? null, run?.ends_at ?? null, run?.timezone ?? "UTC"), place: placeOf(run?.location), runId: a.run_id as string };
      if (row.kind === "retreat_application_received") {
        if (a.status === "cancelled") return { skip: "Application was withdrawn" };
        return { email: { kind: "retreat_application_received", ...base } };
      }
      // Only the decision this row was queued for, and only if it still stands.
      const want = p.status as string;
      if ((want !== "accepted" && want !== "waitlist") || a.status !== want) return { skip: "Application status has changed" };
      return { email: { kind: "retreat_application_update", status: want, ...base } };
    }

    case "referral_reward": {
      const { data: r } = await sb.from("referrals").select("id, referred_id, status").eq("id", p.referral_id as string).maybeSingle();
      if (!r || r.status !== "rewarded") return { skip: "Referral not rewarded" };
      const [friend, { data: sub }] = await Promise.all([
        profileOf(sb, r.referred_id as string),
        sb.from("subscriptions").select("current_period_end").eq("user_id", row.user_id).eq("plan_id", "pro").in("status", ["active", "trialing"]).order("current_period_end", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const me = await profileOf(sb, row.user_id);
      return {
        email: {
          kind: "referral_reward",
          friendName: friend?.first_name || friend?.display_name?.split(" ")[0] || undefined,
          days: 30,
          points: 500,
          proUntil: sub?.current_period_end
            ? new Date(sub.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: validTz(me?.timezone) })
            : undefined,
        },
      };
    }

    case "welcome": {
      const pr = await profileOf(sb, row.user_id);
      return { email: { kind: "welcome", name: pr?.first_name || pr?.display_name?.split(" ")[0] || undefined } };
    }

    case "reward": {
      const ids = (p.badge_ids as string[] | undefined) ?? [];
      const [{ data: badges }, { count }] = await Promise.all([
        sb.from("badges").select("id, name, position").in("id", ids),
        sb.from("member_badges").select("*", { count: "exact", head: true }).eq("user_id", row.user_id),
      ]);
      const names = (badges ?? []).sort((a, b) => a.position - b.position).map((b) => b.name as string);
      if (!names.length) return { skip: "Medals no longer exist" };
      return { email: { kind: "reward", badgeNames: names, totalBadges: count ?? undefined } };
    }

    case "certificate": {
      const { data: c } = await sb
        .from("certificates")
        .select("id, program_id, path_id, name_on_certificate, verify_code, issued_at, programs(name), program_paths(name)")
        .eq("id", p.certificate_id as string)
        .maybeSingle();
      if (!c) return { skip: "Certificate not found" };
      const prog = (c.programs as unknown as { name: string } | null)?.name ?? "Your program";
      const path = (c.program_paths as unknown as { name: string } | null)?.name;
      const { data: phases } = c.path_id
        ? await sb.from("sections").select("title, position").eq("path_id", c.path_id).is("parent_id", null).order("position")
        : { data: [] as { title: string }[] };
      return {
        email: {
          kind: "certificate",
          certificateId: c.id,
          title: path ? `${prog} · ${path}` : prog,
          athleteName: c.name_on_certificate ?? undefined,
          issuedOn: longDate(c.issued_at),
          phases: (phases ?? []).map((s) => s.title as string).filter(Boolean).slice(0, 8),
          verifyCode: c.verify_code ?? undefined,
        },
      };
    }

    case "tool_result": {
      const { data: r } = await sb.from("tool_results").select("id, tool_id, answers, result, tools(name, config)").eq("id", p.tool_result_id as string).maybeSingle();
      if (!r) return { skip: "Result not found" };
      const tool = r.tools as unknown as { name: string; config: { questions?: { id: string; question: string; options?: { value: string; label: string }[] }[] } } | null;
      const res = (r.result ?? {}) as { headline?: string; title?: string; summary?: string; score?: number; max?: number; notes?: string[]; points?: string[]; bells?: { label: string }[]; movements?: string[] };
      const answers = (r.answers ?? {}) as Record<string, string>;
      const details = (tool?.config?.questions ?? [])
        .filter((q) => answers[q.id] != null)
        .map((q) => ({ label: q.question, value: q.options?.find((o) => o.value === answers[q.id])?.label ?? String(answers[q.id]) }))
        .slice(0, 6);
      const actions = [...(res.notes ?? []), ...(res.points ?? [])].slice(0, 3);
      return {
        email: {
          kind: "tool_result",
          toolName: tool?.name ?? "Your tool",
          resultTitle: res.headline ?? res.title ?? "Your result",
          summary: res.summary,
          score: typeof res.score === "number" ? res.score : undefined,
          scoreMax: typeof res.max === "number" ? res.max : undefined,
          details,
          actions: actions.length ? actions : undefined,
        },
      };
    }

    case "schedule_created": {
      const { data: plan } = await sb.from("member_plans").select("id, name, status, starts_on, inputs").eq("id", p.plan_id as string).maybeSingle();
      if (!plan || plan.status !== "active") return { skip: "Plan is no longer active" };
      const [{ data: items }, { data: prefs }] = await Promise.all([
        sb.from("plan_items").select("on_date, title, kind, lessons(title, programs(name))").eq("plan_id", plan.id).neq("kind", "rest").order("on_date").order("position").limit(40),
        sb.from("notification_prefs").select("reminder_time, reminders_enabled").eq("user_id", row.user_id).maybeSingle(),
      ]);
      if (!items?.length) return { skip: "Plan has no sessions yet" };
      const programs = new Set(items.map((i) => (i.lessons as unknown as { programs: { name: string } | null } | null)?.programs?.name).filter(Boolean));
      const days = (plan.inputs as { days?: number[]; trainingDays?: number[] } | null)?.days ?? (plan.inputs as { trainingDays?: number[] } | null)?.trainingDays;
      const weekSpan = new Set(items.slice(0, 14).map((i) => Math.floor(Date.parse(i.on_date) / (7 * 86_400_000)))).size || 1;
      return {
        email: {
          kind: "schedule_created",
          planId: plan.id,
          scheduleName: plan.name,
          startDate: longDate(items[0]!.on_date),
          courseLabel: programs.size === 1 ? [...programs][0] : programs.size > 1 ? `${programs.size} programs` : undefined,
          daysPerWeek: days?.length ?? Math.round(Math.min(items.length, 14) / weekSpan),
          reminderTime: prefs?.reminders_enabled === false ? undefined : time12(String(prefs?.reminder_time ?? "07:00").slice(0, 5)),
          firstDays: items.slice(0, 3).map((i) => `${cleanTitle((i.lessons as unknown as { title: string } | null)?.title ?? i.title ?? "Session")} — ${longDate(i.on_date)}`),
        },
      };
    }
  }
  return { skip: `Unknown kind ${row.kind}` };
}

export function allowed(kind: string, prefs: Prefs) {
  if (ALWAYS_SEND.includes(kind)) return true;
  if (prefs && !prefs.email_enabled) return false;
  if (kind === "new_content" && prefs && !prefs.new_content) return false;
  if (kind === "win_back" && prefs && prefs.streak_nudge === false) return false;
  return true;
}

/** Optional certificate PDF (W4's route). Attached only when that route answers with a PDF. */
async function certificateAttachment(certificateId: string) {
  try {
    const { appUrl } = await import("./config");
    const res = await fetch(`${appUrl()}/api/certificates/${certificateId}/pdf`, {
      headers: process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("pdf")) return undefined;
    return [{ filename: "certificate.pdf", content: Buffer.from(await res.arrayBuffer()).toString("base64") }];
  } catch {
    return undefined;
  }
}

async function emailOf(sb: SB, userId: string, cache: Map<string, string | null>) {
  if (cache.has(userId)) return cache.get(userId)!;
  const { data } = await sb.auth.admin.getUserById(userId);
  const e = data.user?.email ?? null;
  cache.set(userId, e);
  return e;
}

export interface DrainSummary {
  picked: number;
  sent: number;
  failed: number;
  skipped: number;
  notConfigured: number;
}

/** Sends pending outbox rows. Pass `ids` to deliver specific rows right away (welcome, test). */
export async function drainOutbox(sb: SB, opts: { limit?: number; ids?: string[] } = {}): Promise<DrainSummary> {
  const limit = opts.limit ?? 50;
  let q = sb.from("email_outbox").select("id, user_id, kind, dedupe_key, payload, status, attempts, event_id, created_at").order("created_at").limit(limit);
  q = opts.ids?.length ? q.in("id", opts.ids).in("status", ["pending", "not_configured"]) : q.eq("status", "pending");
  const { data: pending, error } = await q;
  if (error) throw new Error(error.message);
  let rows = (pending ?? []) as Row[];
  if (!opts.ids && emailConfigured() && rows.length < limit) {
    const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const { data: late } = await sb
      .from("email_outbox")
      .select("id, user_id, kind, dedupe_key, payload, status, attempts, event_id, created_at")
      .eq("status", "not_configured")
      .in("kind", DURABLE)
      .gte("created_at", since)
      .order("created_at")
      .limit(limit - rows.length);
    rows = rows.concat((late ?? []) as Row[]);
  }

  const sum: DrainSummary = { picked: rows.length, sent: 0, failed: 0, skipped: 0, notConfigured: 0 };
  const emails = new Map<string, string | null>();
  const prefsCache = new Map<string, Prefs>();

  for (const row of rows) {
    const now = new Date().toISOString();
    const finish = async (patch: Record<string, unknown>, event?: { status: string; error?: string | null }) => {
      await sb.from("email_outbox").update({ ...patch, updated_at: now }).eq("id", row.id);
      if (row.event_id && event) await sb.from("notification_events").update({ status: event.status, error: event.error ?? null }).eq("id", row.event_id);
    };
    try {
      if (!prefsCache.has(row.user_id)) {
        const { data } = await sb.from("notification_prefs").select("email_enabled, new_content, streak_nudge").eq("user_id", row.user_id).maybeSingle();
        prefsCache.set(row.user_id, (data as Prefs) ?? null);
      }
      if (!allowed(row.kind, prefsCache.get(row.user_id)!)) {
        sum.skipped++;
        await finish({ status: "skipped", last_error: "Email is switched off in the member's settings" }, { status: "skipped", error: "Email switched off" });
        continue;
      }
      const to = await emailOf(sb, row.user_id, emails);
      if (!to) {
        sum.skipped++;
        await finish({ status: "skipped", last_error: "No email on the account" }, { status: "failed", error: "No email on the account" });
        continue;
      }
      const built = await buildFromRow(sb, row);
      if ("skip" in built) {
        sum.skipped++;
        await finish({ status: "skipped", last_error: built.skip, to_email: to }, { status: "skipped", error: built.skip });
        continue;
      }
      const r = renderEmail(built.email);
      const attachments = built.email.kind === "certificate" && built.email.certificateId && emailConfigured() ? await certificateAttachment(built.email.certificateId) : undefined;
      const res: SendResult = await sendEmail({ to, subject: r.subject, html: r.html, text: r.text, sender: r.sender, attachments, idempotencyKey: `outbox-${row.id}` });
      if (res.status === "sent") {
        sum.sent++;
        await finish({ status: "sent", sent_at: now, provider_id: res.id, to_email: to, subject: r.subject, attempts: row.attempts + 1, last_error: null }, { status: "sent" });
      } else if (res.status === "not_configured") {
        sum.notConfigured++;
        await finish({ status: "not_configured", to_email: to, subject: r.subject, last_error: res.error, attempts: row.attempts + 1 }, { status: "failed", error: "Email isn't set up yet" });
      } else {
        sum.failed++;
        const attempts = row.attempts + 1;
        await finish({ status: attempts >= MAX_ATTEMPTS ? "failed" : "pending", to_email: to, subject: r.subject, last_error: res.error, attempts }, attempts >= MAX_ATTEMPTS ? { status: "failed", error: res.error } : undefined);
      }
    } catch (e) {
      sum.failed++;
      const attempts = row.attempts + 1;
      await finish({ status: attempts >= MAX_ATTEMPTS ? "failed" : "pending", last_error: e instanceof Error ? e.message : "Error", attempts }).catch(() => {});
    }
  }
  return sum;
}
