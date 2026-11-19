import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, BellRing, CalendarClock, History, MoonStar, SkipForward, Undo2 } from "lucide-react";
import { Reveal } from "@/components/motion-kit";
import { buttonStyles } from "@/components/ui-kit";
import { logReminderEvent } from "@/lib/reminder-log.functions";
import { clearSkip, clearSnooze, isSkipped, skipToday, snoozeFor, snoozeUntil } from "@/lib/reminder-controls";
import { cn } from "@/lib/utils";

export type NextSessionPreview = {
  label: string;
  phaseName?: string;
  dayId: string;
  /** ISO date, e.g. 2026-08-03 */
  date: string;
  /** Wall-clock reminder time, HH:MM */
  reminderTime: string;
  timezone: string;
  remindersEnabled: boolean;
};

const SNOOZE_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "1 hour", minutes: 60 },
  { label: "3 hours", minutes: 180 },
];

function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function prettyTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 7, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function countdown(iso: string, hhmm: string) {
  const [y, mo, d] = iso.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const target = new Date(y, (mo ?? 1) - 1, d ?? 1, h ?? 7, mi ?? 0, 0, 0);
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "now";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return `in ${Math.max(1, Math.round(diff / 60_000))} min`;
  if (hours < 24) return `in ${hours} hr`;
  return `in ${Math.round(hours / 24)} days`;
}

/**
 * Preview of the next scheduled workout with the exact reminder time, plus
 * snooze / skip controls that mute the nudge without touching the schedule.
 */
export function NextSessionCard({ session }: { session: NextSessionPreview | null }) {
  const log = useServerFn(logReminderEvent);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSnoozedUntil(snoozeUntil());
      setSkipped(isSkipped());
    };
    sync();
    window.addEventListener("kbl:reminder-controls", sync);
    const id = window.setInterval(sync, 30_000);
    return () => {
      window.removeEventListener("kbl:reminder-controls", sync);
      window.clearInterval(id);
    };
  }, []);

  if (!session) return null;

  const record = (status: "snoozed" | "skipped", detail: string) => {
    log({
      data: {
        kind: "training",
        channel: "in_app",
        title: session.label,
        body: detail,
        detail,
        status,
        scheduledFor: new Date(`${session.date}T${session.reminderTime}:00`).toISOString(),
      },
    }).catch(() => {
      /* history is best-effort */
    });
  };

  const handleSnooze = (minutes: number, label: string) => {
    const until = snoozeFor(minutes);
    setSnoozedUntil(until.getTime());
    record("snoozed", `Snoozed ${label}`);
    toast.success(`Reminders paused until ${until.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`);
  };

  const handleSkip = () => {
    skipToday();
    setSkipped(true);
    record("skipped", "Skipped today's reminder");
    toast("Today's reminder skipped", { description: "Your schedule is untouched — reminders resume tomorrow." });
  };

  const resume = () => {
    clearSnooze();
    clearSkip();
    setSnoozedUntil(null);
    setSkipped(false);
    toast.success("Reminders back on");
  };

  const muted = skipped || snoozedUntil != null;

  return (
    <Reveal>
      <div className="overflow-hidden rounded-3xl border border-hairline bg-surface raise-soft">
        <div className="flex items-center justify-between gap-3 border-b border-hairline bg-primary/5 px-5 py-3">
          <p className="eyebrow inline-flex items-center gap-1.5 text-primary">
            <CalendarClock className="h-3.5 w-3.5" /> Next session
          </p>
          <Link
            to="/reminders/history"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <History className="h-3.5 w-3.5" /> History
          </Link>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{session.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.phaseName ? `${session.phaseName} · ` : ""}
              {prettyDate(session.date)}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                  session.remindersEnabled && !muted
                    ? "bg-primary/10 text-primary"
                    : "bg-subtle text-muted-foreground",
                )}
              >
                <BellRing className="h-3.5 w-3.5" />
                {session.remindersEnabled
                  ? `Reminder at ${prettyTime(session.reminderTime)}`
                  : "Reminders are off"}
              </span>
              <span className="rounded-full bg-subtle px-3 py-1.5 text-xs text-muted-foreground">
                {session.timezone.replace(/_/g, " ")}
              </span>
              {session.remindersEnabled ? (
                <span className="rounded-full bg-subtle px-3 py-1.5 text-xs text-muted-foreground">
                  {countdown(session.date, session.reminderTime)}
                </span>
              ) : null}
            </div>

            {muted ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700">
                <MoonStar className="h-3.5 w-3.5" />
                {skipped
                  ? "Today's reminder is skipped."
                  : `Snoozed until ${new Date(snoozedUntil!).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`}
              </p>
            ) : null}
          </div>

          <Link
            to="/self-guided/day/$dayId"
            params={{ dayId: session.dayId }}
            className={cn(buttonStyles.primary, "w-full sm:w-auto")}
          >
            Open session <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-5 py-3.5">
          {muted ? (
            <button type="button" onClick={resume} className="tap inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary">
              <Undo2 className="h-3.5 w-3.5" /> Resume reminders
            </button>
          ) : (
            <>
              <span className="text-xs font-medium text-muted-foreground">Snooze</span>
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => handleSnooze(opt.minutes, opt.label)}
                  className="tap inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
                >
                  <MoonStar className="h-3.5 w-3.5 text-primary" /> {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleSkip}
                className="tap ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              >
                <SkipForward className="h-3.5 w-3.5" /> Skip today
              </button>
            </>
          )}
        </div>
      </div>
    </Reveal>
  );
}
