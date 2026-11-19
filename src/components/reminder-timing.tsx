/**
 * Per-day reminder timing controls: frequency, timezone and a time for each
 * day of the week. Edits the user's notification preferences directly.
 */
import { useMemo } from "react";
import { Clock, Globe2, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  activeReminderDays,
  detectTimezone,
  formatReminderDate,
  nextReminderAt,
  reminderTimeFor,
} from "@/lib/reminders";
import type { NotificationPrefs, ReminderFrequency } from "@/lib/notifications.functions";

const DAYS: { iso: number; short: string; long: string }[] = [
  { iso: 1, short: "Mon", long: "Monday" },
  { iso: 2, short: "Tue", long: "Tuesday" },
  { iso: 3, short: "Wed", long: "Wednesday" },
  { iso: 4, short: "Thu", long: "Thursday" },
  { iso: 5, short: "Fri", long: "Friday" },
  { iso: 6, short: "Sat", long: "Saturday" },
  { iso: 7, short: "Sun", long: "Sunday" },
];

const FREQUENCIES: { value: ReminderFrequency; label: string }[] = [
  { value: "every_day", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "custom_days", label: "Chosen days" },
];

function timezoneList(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  const list = supported ? supported("timeZone") : [];
  if (list.length > 0) return list;
  return ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo"];
}

export function ReminderTiming({
  prefs,
  onChange,
  disabled,
}: {
  prefs: NotificationPrefs;
  onChange: (patch: Partial<NotificationPrefs>) => void;
  disabled?: boolean;
}) {
  const zones = useMemo(timezoneList, []);
  const tz = prefs.reminder_timezone || detectTimezone();
  const days = activeReminderDays(prefs);
  const next = nextReminderAt(prefs, new Date());

  const setDay = (iso: number) => {
    const current = new Set(activeReminderDays(prefs));
    if (current.has(iso)) current.delete(iso);
    else current.add(iso);
    onChange({
      reminder_frequency: "custom_days",
      reminder_days: [...current].sort((a, b) => a - b),
    });
  };

  const setTime = (iso: number, value: string) => {
    const times = { ...(prefs.reminder_times ?? {}) };
    if (!value) delete times[String(iso)];
    else times[String(iso)] = value;
    onChange({ reminder_times: times });
  };

  return (
    <div className={cn("space-y-3", disabled && "pointer-events-none opacity-50")}>
      {/* Frequency ------------------------------------------------------- */}
      <div className="rounded-2xl border border-hairline bg-background/60 p-4">
        <div className="flex items-center gap-2">
          <Repeat className="h-3.5 w-3.5 text-primary" />
          <span className="eyebrow text-muted-foreground">Frequency</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-subtle p-1">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange({ reminder_frequency: f.value })}
              className={cn(
                "tap min-h-8 rounded-full px-2 text-xs font-semibold transition-colors",
                prefs.reminder_frequency === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-day times --------------------------------------------------- */}
      <div className="rounded-2xl border border-hairline bg-background/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="eyebrow text-muted-foreground">Time per day</span>
          </div>
          <button
            type="button"
            onClick={() => onChange({ reminder_times: {} })}
            className="tap text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Use {(prefs.reminder_time ?? "07:00").slice(0, 5)} everywhere
          </button>
        </div>

        <ul className="mt-3 space-y-1.5">
          {DAYS.map((d) => {
            const on = days.includes(d.iso);
            return (
              <li
                key={d.iso}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
                  on ? "border-primary/30 bg-primary/5" : "border-hairline",
                )}
              >
                <button
                  type="button"
                  onClick={() => setDay(d.iso)}
                  aria-pressed={on}
                  aria-label={`${on ? "Disable" : "Enable"} ${d.long} reminder`}
                  className={cn(
                    "tap grid h-5 w-5 place-items-center rounded-md border transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {on && <span className="h-2 w-2 rounded-sm bg-primary-foreground" />}
                </button>
                <span className={cn("text-sm font-medium", on ? "text-foreground" : "text-muted-foreground")}>
                  {d.long}
                </span>
                <input
                  type="time"
                  disabled={!on}
                  value={reminderTimeFor(prefs, d.iso)}
                  onChange={(e) => setTime(d.iso, e.target.value)}
                  aria-label={`${d.long} reminder time`}
                  className="numeric h-8 rounded-full border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary disabled:opacity-40"
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Timezone -------------------------------------------------------- */}
      <div className="rounded-2xl border border-hairline bg-background/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-3.5 w-3.5 text-primary" />
            <span className="eyebrow text-muted-foreground">Timezone</span>
          </div>
          <button
            type="button"
            onClick={() => onChange({ reminder_timezone: detectTimezone() })}
            className="tap text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Use my device
          </button>
        </div>
        <select
          value={zones.includes(tz) ? tz : "UTC"}
          onChange={(e) => onChange({ reminder_timezone: e.target.value })}
          aria-label="Reminder timezone"
          className="mt-3 h-9 w-full rounded-full border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">Next reminder: {formatReminderDate(next)}</p>
      </div>
    </div>
  );
}
