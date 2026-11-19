import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { defaultPrefs, getNotificationPrefs, type NotificationPrefs } from "@/lib/notifications.functions";
import { dayKey, inQuietHours, shouldRemind } from "@/lib/reminders";
import { useProgress, summarise } from "@/hooks/use-progress";
import { useSession } from "@/hooks/use-session";
import { computeStreakFromRows } from "@/lib/achievements";
import { remindersMuted } from "@/lib/reminder-controls";
import { logReminderEvent } from "@/lib/reminder-log.functions";

const SENT_KEY = "kbl:reminder-sent";
const NUDGE_KEY = "kbl:streak-nudge-sent";
const CHECK_INTERVAL_MS = 60_000;

function readKey(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — reminder simply repeats next session */
  }
}

/** Browser-level notification, when the user has granted permission. */
function pushSystemNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, tag: "kbl-reminder", icon: "/favicon.ico" });
    return true;
  } catch {
    return false;
  }
}

export function useNotificationPrefs() {
  const { user } = useSession();
  const fetchPrefs = useServerFn(getNotificationPrefs);
  const query = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: () => fetchPrefs(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const prefs: NotificationPrefs = { ...defaultPrefs, ...((query.data ?? {}) as Partial<NotificationPrefs>) };
  return { prefs, query };
}

/**
 * Local delivery for the notification preferences the user has already set.
 *
 * Runs while the app is open: fires the daily training reminder and the streak
 * nudge as a system notification when permission is granted, otherwise as an
 * in-app toast. Quiet hours and channel toggles are respected.
 */
export function useReminders() {
  const { user } = useSession();
  const { prefs } = useNotificationPrefs();
  const { data: rows } = useProgress(Boolean(user));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const log = useServerFn(logReminderEvent);

  const summary = summarise(rows);
  const nextDayTitle = summary.currentDay?.day.title ?? "your next session";
  const streak = computeStreakFromRows(rows);

  useEffect(() => {
    if (!user) return;

    function tick() {
      const now = new Date();

      const decision = shouldRemind(prefs, now, readKey(SENT_KEY));
      if (decision.fire && !remindersMuted(now)) {
        writeKey(SENT_KEY, dayKey(now));
        const body = `${nextDayTitle} is up next. Ten minutes is enough to keep the chain alive.`;
        const delivered = prefs.channel_in_app ? pushSystemNotification("Time to train", body) : false;
        if (!delivered && prefs.channel_in_app) {
          toast("Time to train", { description: body, duration: 8000 });
        }
        const status = prefs.channel_in_app ? "sent" : "failed";
        const detail = !prefs.channel_in_app
          ? "In-app channel is switched off"
          : delivered
            ? "System notification"
            : "In-app toast (browser notifications not granted)";
        log({
          data: {
            kind: "training",
            channel: delivered ? "system" : "in_app",
            title: "Time to train",
            body,
            detail,
            status,
            scheduledFor: now.toISOString(),
          },
        }).catch(() => {
          /* history is best-effort */
        });
      }

      // Streak nudge: fires late in the day when nothing has been logged yet.
      if (prefs.streak_nudges && streak > 0 && !remindersMuted(now) && !inQuietHours(prefs, now) && now.getHours() >= 18) {
        const todayKey = dayKey(now);
        const loggedToday = (rows ?? []).some((r) => dayKey(new Date(r.completed_at)) === todayKey);
        if (!loggedToday && readKey(NUDGE_KEY) !== todayKey) {
          writeKey(NUDGE_KEY, todayKey);
          const body = `You're on a ${streak}-day streak. One lesson keeps it going.`;
          const pushed = pushSystemNotification("Don't break the chain", body);
          if (!pushed) {
            toast("Don't break the chain", { description: body, duration: 8000 });
          }
          log({
            data: {
              kind: "streak",
              channel: pushed ? "system" : "in_app",
              title: "Don't break the chain",
              body,
              detail: pushed ? "System notification" : "In-app toast",
              status: "sent",
              scheduledFor: now.toISOString(),
            },
          }).catch(() => {
            /* history is best-effort */
          });
        }
      }
    }

    tick();
    timer.current = setInterval(tick, CHECK_INTERVAL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [user, prefs, rows, nextDayTitle, streak, log]);
}

export type PermissionState = "unsupported" | "default" | "granted" | "denied";

export function notificationPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const result = await Notification.requestPermission();
  return result as PermissionState;
}
