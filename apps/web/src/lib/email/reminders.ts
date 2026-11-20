/**
 * Pure reminder rules (no I/O): given one member's row from public.reminder_candidates() and the
 * current moment, decide which reminders to send now. Runs hourly; every decision carries a dedupe
 * key so a member gets each reminder at most once per local day even if the cron runs twice.
 */
import type { AppEmail } from "./templates";

export interface CandidatePrefs {
  has_row: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  reminders_enabled: boolean;
  frequency: "every_day" | "weekdays" | "custom_days";
  reminder_time: string;
  reminder_days: number[];
  reminder_times: Record<string, string>;
  quiet_start: string | null;
  quiet_end: string | null;
  streak_nudge: boolean;
  weekly_recap: boolean;
  snoozed_until: string | null;
  skip_date: string | null;
}

export interface Candidate {
  user_id: string;
  email: string;
  first_name: string | null;
  tz: string;
  local_date: string;
  local_time: string;
  local_dow: number;
  prefs: CandidatePrefs;
  /** `locked` (0040): the member can no longer open this program; such sessions are never reminded about. */
  today_items: { id: string; title: string; kind: string; lesson_id: string | null; program_slug: string | null; program_name: string | null; minutes: number | null; done: boolean; plan_name: string | null; locked?: boolean }[];
  has_active_plan: boolean;
  enrollment: { program_name: string; program_slug: string } | null;
  streak: number;
  last_active: string | null;
  week: { days: number; lessons: number; minutes: number; badges: string[] };
  next_up: { title: string; on_date: string; locked?: boolean } | null;
  push_count: number;
}

export type Channel = "email" | "push" | "in_app";

export interface Decision {
  kind: "training_reminder" | "streak_nudge" | "weekly_summary";
  dedupeKey: string;
  channels: Channel[];
  title: string;
  body: string;
  url: string;
  email: AppEmail;
}

/* ---------------------------------------------------------------- helpers (shared with the UI) */

export const minutesOf = (hhmm: string | null | undefined, fallback = 7 * 60) => {
  if (!hhmm) return fallback;
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h! * 60 + m! : fallback;
};

/** JS weekdays (0 = Sunday) the training reminder runs on. */
export function activeDays(p: Pick<CandidatePrefs, "frequency" | "reminder_days">): number[] {
  if (p.frequency === "every_day") return [0, 1, 2, 3, 4, 5, 6];
  if (p.frequency === "weekdays") return [1, 2, 3, 4, 5];
  return p.reminder_days?.length ? [...p.reminder_days].sort() : [1, 2, 3, 4, 5];
}

/** Reminder time for one weekday (per-day override or the global time), "HH:MM". */
export const timeFor = (p: Pick<CandidatePrefs, "reminder_time" | "reminder_times">, dow: number) =>
  (p.reminder_times?.[String(dow)] || p.reminder_time || "07:00").slice(0, 5);

/** Quiet hours may wrap past midnight (21:00 → 07:00). */
export function inQuiet(p: Pick<CandidatePrefs, "quiet_start" | "quiet_end">, minutes: number) {
  if (!p.quiet_start || !p.quiet_end) return false;
  const s = minutesOf(p.quiet_start);
  const e = minutesOf(p.quiet_end);
  if (s === e) return false;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const lessonHref = (slug: string | null, lesson: string | null) => (slug ? (lesson ? `/programs/${slug}/learn/${lesson}` : `/programs/${slug}`) : "/today");
const cleanTitle = (t: string) => {
  const m = /^day\s+(\d+)\s*[-–—:]\s*(.+)$/i.exec(t.trim());
  return m ? `Day ${m[1]} · ${m[2]!.trim()}` : t.replace(/\s{2,}/g, " ").trim();
};
const weekdayName = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

/** Catch-up window after the target time (the cron runs hourly). */
export const WINDOW_MIN = 120;
const STREAK_HOUR = 18 * 60;
const WEEKLY_HOUR = 18 * 60;

/* ---------------------------------------------------------------- decision */

export function decide(c: Candidate, now: Date = new Date()): Decision[] {
  const p = c.prefs;
  const out: Decision[] = [];
  const minutes = minutesOf(c.local_time, 0);
  const snoozedUntil = p.snoozed_until ? Date.parse(p.snoozed_until) : 0;
  const snoozed = snoozedUntil > now.getTime();
  const quiet = inQuiet(p, minutes);
  const skippedToday = p.skip_date === c.local_date;
  const channels = (allowEmail = true): Channel[] => [
    ...(allowEmail && p.email_enabled ? (["email"] as const) : []),
    ...(p.push_enabled && c.push_count > 0 ? (["push"] as const) : []),
    ...(p.in_app_enabled ? (["in_app"] as const) : []),
  ];
  if (snoozed || quiet) return out;

  // A snooze that just ended extends the catch-up window so the reminder still lands.
  const snoozeJustEnded = snoozedUntil > 0 && now.getTime() - snoozedUntil < 90 * 60_000;
  const inWindow = (target: number) => minutes >= target && minutes < target + (snoozeJustEnded ? 6 * 60 : WINDOW_MIN);

  /* Training reminder — on scheduled days (or reminder days without a plan), at that day's time. */
  if (p.reminders_enabled && !skippedToday && activeDays(p).includes(c.local_dow) && inWindow(minutesOf(timeFor(p, c.local_dow)))) {
    const open = c.today_items.filter((i) => !i.done && !i.locked);
    const fallback = !c.has_active_plan && c.enrollment;
    if (open.length || fallback) {
      const first = open[0];
      const dayLabel = first ? cleanTitle(first.title) : undefined;
      const minutesToday = open.reduce((n, i) => n + (i.minutes ?? 0), 0) || undefined;
      const href = first ? lessonHref(first.program_slug, first.lesson_id) : `/programs/${c.enrollment!.program_slug}`;
      const ch = channels();
      if (ch.length)
        out.push({
          kind: "training_reminder",
          dedupeKey: `day:${c.local_date}`,
          channels: ch,
          title: "Time to train",
          body: first ? `${dayLabel}${first.program_name ? ` · ${first.program_name}` : ""}` : `Pick up ${c.enrollment!.program_name} where you left off.`,
          url: href,
          email: {
            kind: "training_reminder",
            dayLabel,
            href,
            phaseLabel: first?.program_name ?? first?.plan_name ?? c.enrollment?.program_name ?? undefined,
            lessons: open.map((i) => cleanTitle(i.title)),
            minutes: minutesToday,
            streakDays: c.streak || undefined,
            message: fallback && !first ? `Your next ${c.enrollment!.program_name} session is ready when you are.` : undefined,
          },
        });
    }
  }

  /* Streak nudge — evening when a streak is at risk, or after three quiet days at reminder time. */
  if (p.streak_nudge && !skippedToday && c.last_active) {
    const gap = daysBetween(c.last_active, c.local_date);
    const atRisk = gap === 1 && c.streak >= 2 && inWindow(STREAK_HOUR);
    const lapsed = gap === 3 && !out.some((d) => d.kind === "training_reminder") && inWindow(minutesOf(timeFor(p, c.local_dow)));
    const ch = channels();
    if ((atRisk || lapsed) && ch.length)
      out.push({
        kind: "streak_nudge",
        dedupeKey: `day:${c.local_date}`,
        channels: ch,
        title: atRisk ? "Don't break the chain" : "Ready when you are",
        body: atRisk ? `Your ${c.streak}-day streak ends tonight. A short session keeps it alive.` : "It's been a few days. One short session gets you back.",
        url: "/today",
        email: { kind: "streak_nudge", streakDays: atRisk ? c.streak : undefined, atRisk, lastTrained: gap === 1 ? "Yesterday" : `${gap} days ago` },
      });
  }

  /* Weekly summary — Sunday evening, email only, for members who have trained at all. */
  if (p.weekly_recap && p.email_enabled && c.local_dow === 0 && c.last_active && inWindow(WEEKLY_HOUR)) {
    out.push({
      kind: "weekly_summary",
      dedupeKey: `week:${c.local_date}`,
      channels: ["email"],
      title: "Your week in training",
      body: `${c.week.days} days, ${c.week.lessons} lessons this week.`,
      url: "/today",
      email: {
        kind: "weekly_summary",
        daysCompleted: c.week.days,
        lessonsCompleted: c.week.lessons,
        minutes: c.week.minutes || undefined,
        streakDays: c.streak || undefined,
        wins: c.week.badges.length ? c.week.badges.map((b) => `Earned ${b}`) : undefined,
        nextUp: c.next_up && !c.next_up.locked ? `${cleanTitle(c.next_up.title)} — ${weekdayName(c.next_up.on_date)}` : undefined,
      },
    });
  }
  return out;
}

/** Next moment the training reminder is expected (for the UI), as local date + time. */
export function nextReminder(p: Pick<CandidatePrefs, "reminders_enabled" | "frequency" | "reminder_days" | "reminder_time" | "reminder_times" | "skip_date">, localDate: string, localTime: string) {
  if (!p.reminders_enabled) return null;
  const days = activeDays(p);
  const now = minutesOf(localTime, 0);
  for (let i = 0; i < 8; i++) {
    const d = addDays(localDate, i);
    const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (!days.includes(dow)) continue;
    if (i === 0 && (p.skip_date === d || minutesOf(timeFor(p, dow)) <= now)) continue;
    return { date: d, time: timeFor(p, dow) };
  }
  return null;
}
