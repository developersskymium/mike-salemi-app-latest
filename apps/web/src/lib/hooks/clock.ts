"use client";

import { useSyncExternalStore } from "react";

/*
 * Browser-only values read as external stores, so components never set state from an effect just to
 * learn the time or that they are mounted. The server (and hydration) see `null` / `false`; the client
 * switches to the real value right after hydration, exactly as the old mount effects did.
 */

type Clock = { now: number; listeners: Set<() => void>; timer: number | null };
const clocks = new Map<number, Clock>();

function clockFor(ms: number): Clock {
  let c = clocks.get(ms);
  if (!c) clocks.set(ms, (c = { now: 0, listeners: new Set(), timer: null }));
  return c;
}

function subscribe(ms: number, cb: () => void) {
  const c = clockFor(ms);
  c.listeners.add(cb);
  if (c.timer === null) {
    const tick = () => {
      c.now = Date.now();
      c.listeners.forEach((l) => l());
    };
    c.timer = window.setInterval(tick, ms);
    // A clock nobody watched for a while is stale: catch up as soon as someone watches it again.
    if (Date.now() - c.now >= ms) queueMicrotask(tick);
  }
  return () => {
    c.listeners.delete(cb);
    if (!c.listeners.size && c.timer !== null) {
      window.clearInterval(c.timer);
      c.timer = null;
    }
  };
}

function snapshot(ms: number) {
  const c = clockFor(ms);
  if (!c.now) c.now = Date.now();
  return c.now;
}

/** The current time in ms, refreshed every `ms` milliseconds; `null` on the server and during hydration. */
export function useNow(ms: number): number | null {
  return useSyncExternalStore(
    (cb) => subscribe(ms, cb),
    () => snapshot(ms),
    () => null,
  );
}

const noop = () => () => {};
/** True once the component renders in the browser (false on the server and during hydration). */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** A browser-only value read once per render (location, media queries…); `fallback` on the server. */
export function useBrowserValue<T extends string | number | boolean | null>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noop, read, () => fallback);
}
