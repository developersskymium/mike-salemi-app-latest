import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReminderFrequency = "every_day" | "weekdays" | "custom_days";

export type NotificationPrefs = {
  training_reminders: boolean;
  reminder_time: string;
  reminder_days: number[];
  /** Per-weekday override times, keyed by ISO weekday ("1" = Monday … "7" = Sunday). */
  reminder_times: Record<string, string>;
  reminder_frequency: ReminderFrequency;
  reminder_timezone: string;
  streak_nudges: boolean;
  weekly_summary: boolean;
  new_content: boolean;
  announcements: boolean;
  channel_email: boolean;
  channel_in_app: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
};

export const defaultPrefs: NotificationPrefs = {
  training_reminders: true,
  reminder_time: "07:00",
  reminder_days: [1, 2, 3, 4, 5],
  reminder_times: {},
  reminder_frequency: "custom_days",
  reminder_timezone: "UTC",
  streak_nudges: true,
  weekly_summary: true,
  new_content: true,
  announcements: false,
  channel_email: true,
  channel_in_app: true,
  quiet_hours_enabled: false,
  quiet_hours_start: "21:00",
  quiet_hours_end: "07:00",
};


export const getNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    // A clock-skew rejection ("JWT issued at future") is transient and must not
    // blank the screen — fall back to defaults until the next read succeeds.
    if (error) {
      if (/issued at future|jwt/i.test(error.message)) return null;
      throw new Error(error.message);
    }
    return data;

  });

export const saveNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prefs: Partial<NotificationPrefs> }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notification_preferences").upsert(
      {
        user_id: context.userId,
        ...data.prefs,
        reminder_days: (data.prefs.reminder_days ?? defaultPrefs.reminder_days) as never,
        reminder_times: (data.prefs.reminder_times ?? undefined) as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
