/** Notification preferences as stored in public.notification_prefs (client-safe). */
export interface ReminderPrefs {
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
  offers_email: boolean;
  new_content: boolean;
  announcements: boolean;
  snoozed_until: string | null;
  skip_date: string | null;
}

/** Column defaults (a member without a row gets these). */
export const DEFAULT_PREFS: ReminderPrefs = {
  email_enabled: true,
  push_enabled: false,
  in_app_enabled: true,
  reminders_enabled: true,
  frequency: "custom_days",
  reminder_time: "07:00",
  reminder_days: [1, 2, 3, 4, 5],
  reminder_times: {},
  quiet_start: null,
  quiet_end: null,
  streak_nudge: true,
  weekly_recap: true,
  offers_email: true,
  new_content: true,
  announcements: true,
  snoozed_until: null,
  skip_date: null,
};

export function normalizePrefs(row: Partial<Record<keyof ReminderPrefs, unknown>> | null | undefined): ReminderPrefs {
  if (!row) return { ...DEFAULT_PREFS };
  const t = (v: unknown) => (typeof v === "string" ? v.slice(0, 5) : null);
  return {
    ...DEFAULT_PREFS,
    ...(row as Partial<ReminderPrefs>),
    reminder_time: t(row.reminder_time) ?? "07:00",
    quiet_start: t(row.quiet_start),
    quiet_end: t(row.quiet_end),
    reminder_days: Array.isArray(row.reminder_days) ? (row.reminder_days as number[]) : DEFAULT_PREFS.reminder_days,
    reminder_times: row.reminder_times && typeof row.reminder_times === "object" ? (row.reminder_times as Record<string, string>) : {},
  };
}

export const PREF_KEYS = [
  "email_enabled", "push_enabled", "in_app_enabled", "reminders_enabled", "frequency", "reminder_time", "reminder_days", "reminder_times",
  "quiet_start", "quiet_end", "streak_nudge", "weekly_recap", "offers_email", "new_content", "announcements",
] as const;
export type PrefPatch = Partial<Pick<ReminderPrefs, (typeof PREF_KEYS)[number]>>;

const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

/** Validates a patch; returns the clean patch or an error message. */
export function cleanPatch(patch: Record<string, unknown>): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const out: Record<string, unknown> = {};
  for (const k of PREF_KEYS) {
    if (!(k in patch)) continue;
    const v = patch[k];
    if (k === "reminder_days") {
      if (!Array.isArray(v) || !v.every((x) => Number.isInteger(x) && x >= 0 && x <= 6)) return { ok: false, error: "Invalid days" };
      out[k] = [...new Set(v as number[])].sort();
    } else if (k === "reminder_times") {
      if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "Invalid times" };
      const times: Record<string, string> = {};
      for (const [d, tm] of Object.entries(v as Record<string, unknown>)) {
        if (!/^[0-6]$/.test(d) || typeof tm !== "string" || !TIME.test(tm)) return { ok: false, error: "Invalid time" };
        times[d] = tm.slice(0, 5);
      }
      out[k] = times;
    } else if (k === "frequency") {
      if (!["every_day", "weekdays", "custom_days"].includes(v as string)) return { ok: false, error: "Invalid frequency" };
      out[k] = v;
    } else if (k === "reminder_time" || k === "quiet_start" || k === "quiet_end") {
      if (!(v === null && k !== "reminder_time") && !(typeof v === "string" && TIME.test(v))) return { ok: false, error: "Invalid time" };
      out[k] = v;
    } else if (typeof v !== "boolean") return { ok: false, error: "Invalid value" };
    else out[k] = v;
  }
  return { ok: true, data: out };
}
