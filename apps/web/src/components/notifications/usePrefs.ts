"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui";
import { saveReminderPrefs } from "@/lib/actions/notifications";
import type { PrefPatch, ReminderPrefs } from "@/lib/email/prefs";

export const PREVIEW_MSG = "Preview mode can't save settings. They work on the live app.";

/** Optimistic reminder preferences: apply locally, save, revert and explain on failure. */
export function usePrefs(initial: ReminderPrefs, initialTz: string) {
  const [prefs, setPrefs] = useState(initial);
  const [tz, setTz] = useState(initialTz);
  const [pending, start] = useTransition();
  const toast = useToast();
  const save = (patch: PrefPatch & { timezone?: string }, ok = "Saved") => {
    const prev = prefs;
    const prevTz = tz;
    const { timezone, ...rest } = patch;
    setPrefs({ ...prefs, ...rest });
    if (timezone) setTz(timezone);
    start(async () => {
      const r = await saveReminderPrefs(patch);
      if (r.ok) return toast(ok, { tone: "success", icon: "check" });
      setPrefs(prev);
      setTz(prevTz);
      toast(r.error === "offline" ? PREVIEW_MSG : r.error, { icon: "close" });
    });
  };
  return { prefs, tz, save, pending };
}

export { DAY_NAMES, WEEK_ORDER, time12, detectTimezone, timezoneList, describeNext } from "./format";
