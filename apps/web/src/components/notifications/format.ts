/** Pure display helpers for reminders (server and client safe). */
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday-first order of JS weekdays. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function time12(hhmm: string) {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return `${((h! + 11) % 12) + 1}:${String(m ?? 0).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
}

export function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function timezoneList(current: string): string[] {
  const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  const list = fn ? fn("timeZone") : ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Karachi", "Asia/Tokyo", "Australia/Sydney"];
  return list.includes(current) ? list : [current, ...list];
}

/** "Tomorrow at 7:00 AM", "Monday at 6:30 AM", "Today at 5:30 PM". */
export function describeNext(next: { date: string; time: string } | null, today: string) {
  if (!next) return "Reminders are off";
  const diff = Math.round((Date.parse(`${next.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  const day = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : DAY_NAMES[new Date(`${next.date}T12:00:00Z`).getUTCDay()];
  return `${day} at ${time12(next.time)}`;
}
