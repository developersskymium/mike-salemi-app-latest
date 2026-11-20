import "server-only";
import { coachingHomeworkTicks, coachingLives, myCoachingMessages, podcastEpisodes, type CoachingLive, type CoachingMessage, type PodcastEpisode } from "@ms/api";
import { getUser } from "@/lib/supabase/server";
import { MOCK, fixture } from "@/lib/mock";
import { loadCoaching, type CoachingData, type CoachingSessionView } from "./commerce";

export type { CoachingLive, CoachingMessage, PodcastEpisode };

/** A session with the three pre-call answers (0028) on top of the base view. */
export type CoachSession = CoachingSessionView & {
  prep?: { goals: string | null; footage_url: string | null; since_last?: string | null; watch?: string | null } | null;
};

export interface CoachingHub extends Omit<CoachingData, "upcoming" | "past"> {
  upcoming: CoachSession[];
  past: CoachSession[];
  /** Homework days ticked, per session id (YYYY-MM-DD). */
  ticks: Record<string, string[]>;
  messages: CoachingMessage[];
  lives: CoachingLive[];
  podcast: PodcastEpisode[];
  /** Has bought or booked 1:1 coaching (unlocks the message thread). */
  member: boolean;
}

type Extras = Pick<CoachingHub, "ticks" | "messages" | "lives" | "podcast">;

async function mockHub(preview: string | null): Promise<CoachingHub> {
  const base = preview === "today" ? "active" : preview;
  const data = (await loadCoaching(base)) as CoachingHub;
  const extras = await fixture<Extras>(`coaching-plus${base === "active" ? "-active" : ""}`).catch(() => fixture<Extras>("coaching-plus"));
  const hub: CoachingHub = { ...data, ...extras, member: data.credits > 0 || data.upcoming.length + data.past.length > 0 };
  if (preview === "today" && hub.upcoming[0]) {
    // The call room state: first session starts in 8 minutes, so Join is unlocked.
    hub.upcoming = [{ ...hub.upcoming[0], starts_at: new Date(Date.now() + 8 * 60000).toISOString() }, ...hub.upcoming.slice(1)];
  }
  if (preview === "soon" && hub.upcoming[0]) {
    hub.upcoming = [{ ...hub.upcoming[0], starts_at: new Date(Date.now() + 3 * 3600000).toISOString() }, ...hub.upcoming.slice(1)];
  }
  return hub;
}

async function realHub(): Promise<CoachingHub> {
  const { supabase: sb, user } = await getUser();
  if (!user) throw new Error("not signed in");
  const data = await loadCoaching(null);
  const ids = [...data.upcoming, ...data.past].map((s) => s.id);
  const [prep, ticks, messages, lives, podcast] = await Promise.all([
    ids.length ? sb.from("coaching_bookings").select("id, prep").in("id", ids) : Promise.resolve({ data: [] as { id: string; prep: unknown }[] }),
    coachingHomeworkTicks(sb, user.id, data.past.filter((s) => s.homework).map((s) => s.id)).catch(() => []),
    myCoachingMessages(sb, user.id).catch(() => []),
    coachingLives(sb, user.id).catch(() => []),
    podcastEpisodes(sb).catch(() => []),
  ]);
  const prepById = new Map((prep.data ?? []).map((p) => [p.id, (p.prep ?? {}) as { goals?: string; footage_url?: string; since_last?: string; watch?: string }]));
  const withPrep = (s: CoachingSessionView): CoachSession => {
    const p = prepById.get(s.id);
    return p && (p.goals || p.footage_url || p.since_last || p.watch)
      ? { ...s, prep: { goals: p.goals ?? null, footage_url: p.footage_url ?? null, since_last: p.since_last ?? null, watch: p.watch ?? null } }
      : s;
  };
  const byBooking: Record<string, string[]> = {};
  for (const t of ticks) (byBooking[t.booking_id] ??= []).push(t.on_date);
  return {
    ...data,
    upcoming: data.upcoming.map(withPrep),
    past: data.past.map(withPrep),
    ticks: byBooking,
    messages,
    lives,
    podcast,
    member: data.credits > 0 || ids.length > 0,
  };
}

/**
 * Everything the coaching pages need. Local previews (MOCK_DATA=1, `?preview=`):
 * none (no bookings) · active (upcoming + past with notes, homework, thread) · today (call in 8 min) · soon (call in 3 hours).
 */
export async function loadCoachingHub(preview?: string | null): Promise<CoachingHub> {
  return MOCK ? mockHub(preview ?? null) : realHub();
}

/** The latest completed session with homework: Mike's current "one thing". */
export function currentHomework(hub: Pick<CoachingHub, "past">): CoachSession | null {
  return hub.past.find((s) => s.status === "completed" && s.homework) ?? null;
}
