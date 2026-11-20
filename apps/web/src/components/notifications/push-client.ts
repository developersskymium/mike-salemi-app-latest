"use client";

import { savePushSubscription } from "@/lib/actions/notifications";

export type PermissionState = "unsupported" | "default" | "granted" | "denied";

export function permissionState(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission as PermissionState;
}

function keyBytes(b64url: string) {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob((b64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Registers /sw.js (scope "/"). */
export async function registerWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

/** Subscribes this browser to push (when a VAPID key exists) and stores it. Returns the outcome. */
export async function subscribePush(pushKey: string | null): Promise<"subscribed" | "no-key" | "failed"> {
  const reg = await registerWorker();
  if (!reg) return "failed";
  if (!pushKey) return "no-key";
  try {
    await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(pushKey) }));
    const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
    const r = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
    return r.ok ? "subscribed" : "failed";
  } catch {
    return "failed";
  }
}
