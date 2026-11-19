/**
 * Pure reminder scheduling helpers.
 *
 * Delivery is local (browser Notification + in-app toast) so reminders work
 * without an email provider. Everything here is deterministic and testable —
 * the hook in `use-reminders.tsx` only wires timers and permissions.
 */

import type { NotificationPrefs } from "@/lib/notifications.functions";

/** Minutes since midnight for a "HH:MM" string. */
export function minutesOfDay(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const [h, m] = value.slice(0, 5).split(":").map((n) => Number.parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return h * 60 + m;
}

/** ISO weekday, Monday = 1 … Sunday = 7 (prefs store this shape). */
export function isoWeekday(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

/** Local YYYY-MM-DD key — used to fire a reminder at most once per day. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Quiet hours may wrap past midnight (e.g. 21:00 → 07:00). */
export function inQuietHours(prefs: NotificationPrefs, date: Date): boolean {
  if (!prefs.quiet_hours_enabled) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  const start = minutesOfDay(prefs.quiet_hours_start, 21 * 60);
  const end = minutesOfDay(prefs.quiet_hours_end, 7 * 60);
  return start <= end ? now >= start && now < end : now >= start || now < end;
}

/** Days a reminder should fire, derived from frequency + custom day picks. */
export function activeReminderDays(
  prefs: Pick<NotificationPrefs, "reminder_frequency" | "reminder_days">,
): number[] {
  if (prefs.reminder_frequency === "every_day") return [1, 2, 3, 4, 5, 6, 7];
  if (prefs.reminder_frequency === "weekdays") return [1, 2, 3, 4, 5];
  const days = Array.isArray(prefs.reminder_days) ? prefs.reminder_days : [];
  return days.length > 0 ? [...days].sort((a, b) => a - b) : [1, 2, 3, 4, 5];
}

/** Reminder time for one ISO weekday, falling back to the global time. */
export function reminderTimeFor(
  prefs: Pick<NotificationPrefs, "reminder_time" | "reminder_times">,
  isoDay: number,
): string {
  const perDay = prefs.reminder_times?.[String(isoDay)];
  return (perDay || prefs.reminder_time || "07:00").slice(0, 5);
}

/** The browser's own timezone, e.g. "Europe/Berlin". */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** "HH:MM" wall-clock time in the given timezone for a moment in time. */
export function wallClockIn(date: Date, timeZone: string): { minutes: number; isoDay: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(date);
  } catch {
    return { minutes: date.getHours() * 60 + date.getMinutes(), isoDay: isoWeekday(date) };
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number.parseInt(get("hour"), 10) % 24;
  const minute = Number.parseInt(get("minute"), 10);
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const isoDay = order.indexOf(get("weekday")) + 1 || isoWeekday(date);
  return { minutes: hour * 60 + minute, isoDay };
}

export type ReminderDecision =
  | { fire: false; reason: "disabled" | "wrong-day" | "too-early" | "quiet" | "already-sent" }
  | { fire: true };

/**
 * Should the training reminder fire right now?
 *
 * Fires on the user's chosen days, at that day's own time (in their chosen
 * timezone), within a two-hour catch-up window so a user who opens the app
 * mid-morning still gets nudged — but never twice a day, never in quiet hours.
 */
export function shouldRemind(
  prefs: NotificationPrefs,
  now: Date,
  lastSentKey: string | null,
  catchUpMinutes = 120,
): ReminderDecision {
  if (!prefs.training_reminders) return { fire: false, reason: "disabled" };
  const tz = prefs.reminder_timezone || detectTimezone();
  const { minutes: current, isoDay } = wallClockIn(now, tz);
  const days = activeReminderDays(prefs);
  if (!days.includes(isoDay)) return { fire: false, reason: "wrong-day" };
  if (lastSentKey === dayKey(now)) return { fire: false, reason: "already-sent" };

  const target = minutesOfDay(reminderTimeFor(prefs, isoDay), 7 * 60);
  if (current < target || current > target + catchUpMinutes) return { fire: false, reason: "too-early" };
  if (inQuietHours(prefs, now)) return { fire: false, reason: "quiet" };
  return { fire: true };
}

/** Next date/time the reminder is expected to fire, for the settings UI. */
export function nextReminderAt(prefs: NotificationPrefs, from: Date): Date | null {
  if (!prefs.training_reminders) return null;
  const days = activeReminderDays(prefs);
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + offset);
    const iso = isoWeekday(candidate);
    if (!days.includes(iso)) continue;
    const target = minutesOfDay(reminderTimeFor(prefs, iso), 7 * 60);
    candidate.setHours(Math.floor(target / 60), target % 60, 0, 0);
    if (candidate.getTime() <= from.getTime()) continue;
    return candidate;
  }
  return null;
}


export function formatReminderDate(date: Date | null): string {
  if (!date) return "Reminders off";
  return date.toLocaleString(undefined, {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}
