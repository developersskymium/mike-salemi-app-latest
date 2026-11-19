import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";

const KEY_PREFIX = "kbl:getting-started-hidden:";
const REMIND_PREFIX = "kbl:getting-started-remind:";
const REMIND_AT_PREFIX = "kbl:getting-started-remind-at:";
const DONE_PREFIX = "kbl:getting-started-done:";
const EVENT = "kbl:getting-started-changed";

/** Twelve hours between "you still have steps left" nudges. */
export const REMINDER_GAP_MS = 12 * 60 * 60 * 1000;

function read(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the setting simply doesn't persist */
  }
}

/**
 * Whether the getting-started checklist is shown at the top of the app.
 *
 * Stored locally per user so switching it off is instant and never blocks a
 * page render; the checklist itself stays reachable from the profile either
 * way, so nothing is lost when it's hidden.
 */
export function useChecklistVisibility() {
  const { user } = useSession();
  const key = KEY_PREFIX + (user?.id ?? "anon");
  const [hidden, setHiddenState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read after hydration so server and client markup match.
    setHiddenState(read(key) === "1");
    setReady(true);
  }, [key]);

  useEffect(() => {
    const sync = () => setHiddenState(read(key) === "1");
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);

  const setHidden = useCallback(
    (next: boolean) => {
      write(key, next ? "1" : "0");
      setHiddenState(next);
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return { hidden, setHidden, ready };
}

/**
 * Opt-in reminders for the setup steps the athlete hasn't finished yet.
 * On by default so someone who drifts away still gets picked back up.
 */
export function useChecklistReminders() {
  const { user } = useSession();
  const key = REMIND_PREFIX + (user?.id ?? "anon");
  const [enabled, setEnabledState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEnabledState(read(key) !== "0");
    setReady(true);
  }, [key]);

  useEffect(() => {
    const sync = () => setEnabledState(read(key) !== "0");
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);

  const setEnabled = useCallback(
    (next: boolean) => {
      write(key, next ? "1" : "0");
      setEnabledState(next);
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  const lastRemindedAt = useCallback(() => Number(read(REMIND_AT_PREFIX + (user?.id ?? "anon")) ?? 0), [user?.id]);
  const markReminded = useCallback(() => {
    write(REMIND_AT_PREFIX + (user?.id ?? "anon"), String(Date.now()));
  }, [user?.id]);

  return { enabled, setEnabled, ready, lastRemindedAt, markReminded };
}

/**
 * Remembers which checklist steps we've already celebrated, so a step that
 * flips to done in this session gets exactly one celebration.
 */
export function useCelebratedSteps() {
  const { user } = useSession();
  const key = DONE_PREFIX + (user?.id ?? "anon");

  const load = useCallback((): string[] => {
    try {
      const raw = read(key);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }, [key]);

  const save = useCallback((ids: string[]) => write(key, JSON.stringify(ids)), [key]);

  return { load, save };
}
