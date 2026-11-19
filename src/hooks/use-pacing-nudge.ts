import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getNotificationPrefs, saveNotificationPrefs } from "@/lib/notifications.functions";
import { useSession } from "@/hooks/use-session";

/** How many days finished inside the window before we suggest slowing down. */
const MAX_DAYS_IN_WINDOW = 3;
const WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
const STORE_KEY = "kbl.pacing.completions";
const LAST_SHOWN_KEY = "kbl.pacing.lastShown";

function readStamps(): number[] {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as number[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Watches how fast Immersion days are being finished and, if someone is
 * sprinting through, shows one gentle nudge with a "Never show again" action
 * that persists to the notification preferences row.
 */
export function usePacingNudge() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const fetchPrefs = useServerFn(getNotificationPrefs);
  const savePrefs = useServerFn(saveNotificationPrefs);

  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: () => fetchPrefs(),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });

  const disable = useMutation({
    mutationFn: () => savePrefs({ data: { prefs: { streak_nudges: false } } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });

  /** Call once whenever a day is finished. */
  const recordDayComplete = useCallback(() => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    const stamps = [...readStamps(), now].filter((t) => now - t < WINDOW_MS);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(stamps));

    if (prefs && prefs.streak_nudges === false) return;
    if (stamps.length < MAX_DAYS_IN_WINDOW) return;

    const last = Number(window.localStorage.getItem(LAST_SHOWN_KEY) ?? 0);
    if (now - last < 12 * 60 * 60 * 1000) return;
    window.localStorage.setItem(LAST_SHOWN_KEY, String(now));

    toast("Maybe ease off the gas", {
      description:
        "That's three days finished in one sitting. The program is built to be trained, not watched — let the work land before moving on.",
      duration: 9000,
      action: {
        label: "Never show again",
        onClick: () => disable.mutate(),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs?.streak_nudges]);

  return { recordDayComplete };
}
