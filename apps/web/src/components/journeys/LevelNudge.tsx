"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "ms-level-nudge";
const listeners = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/**
 * After a retaken Kettlebell Lifestyle intake recommends the other level: one quiet line with a link to that
 * level. Nothing changes on its own. "Not now" hides it until the next intake attempt (keyed by attempt id).
 */
export function LevelNudge({ attemptId, level, href }: { attemptId: string; level: string; href: string }) {
  const dismissed = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read() === attemptId,
    () => false,
  );
  if (dismissed) return null;
  const hide = () => {
    try {
      localStorage.setItem(KEY, attemptId);
    } catch {
      /* private mode: hide for this view only */
    }
    listeners.forEach((l) => l());
  };
  return (
    <p className="jh-nudge" role="status">
      <span>Your new answers suggest {level}. Switch level?</span>
      <span className="jh-nudge-acts">
        <Link href={href} className="lq-link">See {level}</Link>
        <button type="button" className="jh-nudge-x" onClick={hide}>Not now</button>
      </span>
    </p>
  );
}
