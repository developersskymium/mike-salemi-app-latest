import type { SupabaseClient } from "@supabase/supabase-js";
import type { DB } from "./client";

/*
 * Coaching plus (migration 0028): pre-call form, homework ticks, message thread with Mike,
 * Zen Savage lives and replays, King Within podcast. The generated types predate 0028,
 * so these queries go through an untyped client view and return explicit shapes.
 */
const raw = (sb: DB) => sb as unknown as SupabaseClient;

function ok<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

/* ------------------------------------------------------------ pre-call form */

export interface CoachingPrepForm { goals: string; since_last?: string | null; watch?: string | null; footage_url?: string | null }

/** Save the three pre-call answers (and footage link) on the member's own booking. */
export async function saveCoachingPrepForm(sb: DB, bookingId: string, f: CoachingPrepForm) {
  const r = await raw(sb).rpc("save_coaching_prep_form", {
    p_booking: bookingId,
    p_goals: f.goals,
    p_since_last: f.since_last ?? null,
    p_watch: f.watch ?? null,
    p_footage_url: f.footage_url ?? null,
  });
  return ok<{ saved: boolean }>(r, "save prep");
}

/* ----------------------------------------------------------------- homework */

export interface CoachingHomeworkDay {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  booking_id: string;
  homework: string;
  done: boolean;
}

const ymd = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

/**
 * The schedule's read function: for each day in [from, to] (YYYY-MM-DD), Mike's current homework
 * (from the latest completed session on or before that day) and whether the member ticked it.
 * Homework runs daily from the day after the session until the next completed session.
 */
export async function coachingHomeworkDays(sb: DB, userId: string, from: string, to: string): Promise<CoachingHomeworkDay[]> {
  const [bookings, ticks] = await Promise.all([
    raw(sb).from("coaching_bookings").select("id, starts_at, homework, status").eq("user_id", userId).eq("status", "completed").not("homework", "is", null).order("starts_at", { ascending: true }),
    raw(sb).from("coaching_homework_ticks").select("booking_id, on_date").eq("user_id", userId).gte("on_date", from).lte("on_date", to),
  ]);
  const bs = ok<{ id: string; starts_at: string; homework: string }[]>(bookings, "homework") ?? [];
  const done = new Set((ok<{ booking_id: string; on_date: string }[]>(ticks, "ticks") ?? []).map((t) => `${t.booking_id}|${t.on_date}`));
  const out: CoachingHomeworkDay[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); ymd(d) <= to; d = new Date(d.getTime() + 86400000)) {
    const day = ymd(d);
    const b = [...bs].reverse().find((x) => x.starts_at.slice(0, 10) <= day);
    if (b) out.push({ date: day, booking_id: b.id, homework: b.homework, done: done.has(`${b.id}|${day}`) });
  }
  return out;
}

/** Days ticked for one session's homework. */
export async function coachingHomeworkTicks(sb: DB, userId: string, bookingIds: string[]): Promise<{ booking_id: string; on_date: string }[]> {
  if (!bookingIds.length) return [];
  const r = await raw(sb).from("coaching_homework_ticks").select("booking_id, on_date").eq("user_id", userId).in("booking_id", bookingIds);
  return ok<{ booking_id: string; on_date: string }[]>(r, "ticks") ?? [];
}

/** Tick or untick a day of homework (member's own rows only; RLS checks the booking). */
export async function setCoachingHomeworkTick(sb: DB, userId: string, bookingId: string, onDate: string, done: boolean) {
  const t = raw(sb).from("coaching_homework_ticks");
  const r = done
    ? await t.upsert({ user_id: userId, booking_id: bookingId, on_date: onDate }, { onConflict: "user_id,booking_id,on_date", ignoreDuplicates: true })
    : await t.delete().eq("user_id", userId).eq("booking_id", bookingId).eq("on_date", onDate);
  if (r.error) throw new Error(`tick: ${r.error.message}`);
  return { done };
}

/* ----------------------------------------------------------------- messages */

export interface CoachingMessage { id: string; from_coach: boolean; body: string; attachment_url: string | null; created_at: string; read_at: string | null }

export async function myCoachingMessages(sb: DB, userId: string, limit = 200): Promise<CoachingMessage[]> {
  const r = await raw(sb).from("coaching_messages").select("id, from_coach, body, attachment_url, created_at, read_at").eq("member_id", userId).order("created_at", { ascending: true }).limit(limit);
  return ok<CoachingMessage[]>(r, "messages") ?? [];
}

export async function sendCoachingMessage(sb: DB, userId: string, body: string, attachmentUrl?: string | null): Promise<CoachingMessage> {
  const r = await raw(sb)
    .from("coaching_messages")
    .insert({ member_id: userId, author_id: userId, from_coach: false, body, attachment_url: attachmentUrl ?? null })
    .select("id, from_coach, body, attachment_url, created_at, read_at")
    .single();
  return ok<CoachingMessage>(r, "send message");
}

export async function markCoachingMessagesRead(sb: DB) {
  const r = await raw(sb).rpc("mark_coaching_messages_read");
  return ok<number>(r, "mark read");
}

/* ------------------------------------------------------- Zen Savage lives */

export interface CoachingLive {
  id: string;
  title: string;
  summary: string | null;
  starts_at: string;
  duration_minutes: number;
  join_url: string | null;
  replay_url: string | null;
  replay_thumb: string | null;
  draft_note: string | null;
  reminded: boolean;
}

export async function coachingLives(sb: DB, userId: string | null, series = "zen-savage"): Promise<CoachingLive[]> {
  const [lives, rem] = await Promise.all([
    raw(sb).from("coaching_live_sessions").select("id, title, summary, starts_at, duration_minutes, join_url, replay_url, replay_thumb, draft_note").eq("series", series).order("starts_at", { ascending: true }),
    userId ? raw(sb).from("coaching_live_reminders").select("live_id").eq("user_id", userId) : Promise.resolve({ data: [], error: null }),
  ]);
  const on = new Set((ok<{ live_id: string }[]>(rem as never, "reminders") ?? []).map((r) => r.live_id));
  return (ok<Omit<CoachingLive, "reminded">[]>(lives, "lives") ?? []).map((l) => ({ ...l, reminded: on.has(l.id) }));
}

export async function setCoachingLiveReminder(sb: DB, userId: string, liveId: string, on: boolean) {
  const t = raw(sb).from("coaching_live_reminders");
  const r = on
    ? await t.upsert({ user_id: userId, live_id: liveId }, { onConflict: "user_id,live_id", ignoreDuplicates: true })
    : await t.delete().eq("user_id", userId).eq("live_id", liveId);
  if (r.error) throw new Error(`reminder: ${r.error.message}`);
  return { on };
}

/* ------------------------------------------------------------------ podcast */

export interface PodcastEpisode { id: string; title: string; published_on: string | null; url: string; image_url: string | null }

export async function podcastEpisodes(sb: DB, show = "king-within", limit = 12): Promise<PodcastEpisode[]> {
  const r = await raw(sb).from("podcast_episodes").select("id, title, published_on, url, image_url").eq("show", show).order("published_on", { ascending: false, nullsFirst: false }).order("position").limit(limit);
  return ok<PodcastEpisode[]>(r, "podcast") ?? [];
}
