/**
 * Snooze + skip state for training reminders.
 *
 * Deliberately local to the device: these are "not right now" controls that
 * must not touch the saved schedule. A snooze pushes the next check-in past a
 * timestamp; a skip silences one calendar day.
 */

const SNOOZE_KEY = "kbl:reminder-snooze-until";
const SKIP_KEY = "kbl:reminder-skip-day";

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — controls simply don't persist */
  }
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Timestamp (ms) the snooze runs until, or null when not snoozed. */
export function snoozeUntil(): number | null {
  const raw = read(SNOOZE_KEY);
  if (!raw) return null;
  const ms = Number.parseInt(raw, 10);
  if (Number.isNaN(ms) || ms <= Date.now()) return null;
  return ms;
}

export function snoozeFor(minutes: number): Date {
  const until = new Date(Date.now() + minutes * 60_000);
  write(SNOOZE_KEY, String(until.getTime()));
  window.dispatchEvent(new Event("kbl:reminder-controls"));
  return until;
}

export function clearSnooze() {
  write(SNOOZE_KEY, null);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("kbl:reminder-controls"));
}

export function isSkipped(date = new Date()): boolean {
  return read(SKIP_KEY) === dayKey(date);
}

export function skipToday(date = new Date()) {
  write(SKIP_KEY, dayKey(date));
  window.dispatchEvent(new Event("kbl:reminder-controls"));
}

export function clearSkip() {
  write(SKIP_KEY, null);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("kbl:reminder-controls"));
}

/** True when reminders are currently muted by a snooze or a skip. */
export function remindersMuted(now = new Date()): boolean {
  const until = snoozeUntil();
  return (until != null && until > now.getTime()) || isSkipped(now);
}
