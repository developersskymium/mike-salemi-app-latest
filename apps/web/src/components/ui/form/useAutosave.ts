"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Draft<T> = { answers: T; step: number; savedAt: string };

const KEY = (k: string) => `ms-draft:${k}`;

/** Read a saved draft (client only). */
export function readDraft<T>(key: string): Draft<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY(key));
    return raw ? (JSON.parse(raw) as Draft<T>) : null;
  } catch {
    return null;
  }
}

/** Every form draft on this device (for "Pick up where you left off"). */
export function listDrafts(): { key: string; savedAt: string; step: number }[] {
  if (typeof window === "undefined") return [];
  const out: { key: string; savedAt: string; step: number }[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k?.startsWith("ms-draft:")) continue;
    try {
      const d = JSON.parse(window.localStorage.getItem(k) ?? "") as Draft<unknown>;
      out.push({ key: k.slice(9), savedAt: d.savedAt, step: d.step });
    } catch {}
  }
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function clearDraft(key: string) {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY(key));
}

/**
 * Autosave + resume for multi-step forms. Saves to this device at once and (debounced) to the server
 * through `remote` when given. Returns the restored draft (once), a `save` and a `clear`.
 *
 *   const { restored, save, clear, status } = useAutosave("kbl-intake", { remote: saveFormDraft });
 */
export function useAutosave<T>(key: string, opts: { remote?: (key: string, draft: Draft<T> | null) => Promise<unknown>; delay?: number } = {}) {
  const [restored, setRestored] = useState<Draft<T> | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<number | undefined>(undefined);
  const remote = useRef(opts.remote);
  remote.current = opts.remote;

  useEffect(() => {
    // Restore after mount (localStorage is client-only); setState here is the intended one-time sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestored(readDraft<T>(key));
  }, [key]);

  const save = useCallback(
    (answers: T, step: number) => {
      const d: Draft<T> = { answers, step, savedAt: new Date().toISOString() };
      try {
        window.localStorage.setItem(KEY(key), JSON.stringify(d));
      } catch {}
      setStatus("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        if (remote.current) await remote.current(key, d).catch(() => undefined);
        setStatus("saved");
      }, opts.delay ?? 800);
    },
    [key, opts.delay],
  );

  const clear = useCallback(() => {
    clearDraft(key);
    window.clearTimeout(timer.current);
    if (remote.current) void remote.current(key, null).catch(() => undefined);
    setStatus("idle");
  }, [key]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { restored, save, clear, status };
}
