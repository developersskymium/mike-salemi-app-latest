"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui";
import { pushConfig } from "@/lib/actions/notifications";
import { permissionState, subscribePush } from "./push-client";

type Pending = { id: string; kind: string; channel: string; title: string; body: string | null; url: string };

const POLL_MS = 5 * 60_000;

async function ack(ids: string[], opened: boolean) {
  if (!ids.length) return;
  await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, opened }) }).catch(() => {});
}

/**
 * Mount once in the member shell (inside ToastProvider). It
 * 1. keeps this browser's push subscription fresh when notifications are already allowed, and
 * 2. shows in-app reminders ("Time to train", "Don't break the chain") the cron logged for this member,
 *    on load, when the tab comes back into view and every five minutes; tapping opens the session.
 * Renders nothing.
 */
export function NotificationsHost() {
  const toast = useToast();
  const router = useRouter();
  const shown = useRef(new Set<string>());

  useEffect(() => {
    if (permissionState() !== "granted") return;
    const k = "ms-push-synced";
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
    pushConfig()
      .then(({ publicKey }) => subscribePush(publicKey))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const { items } = (await res.json()) as { items: Pending[] };
        const fresh = items.filter((n) => n.channel === "in_app" && !shown.current.has(n.id));
        if (!alive || !fresh.length) return;
        const n = fresh[0]!;
        fresh.forEach((x) => shown.current.add(x.id));
        toast(n.body ? `${n.title} — ${n.body}` : n.title, {
          icon: n.kind === "streak_nudge" ? "flame" : "bell",
          duration: 9000,
          action: { label: "Open", onClick: () => { void ack([n.id], true); router.push(n.url); } },
        });
        void ack(fresh.map((x) => x.id), false);
      } catch {
        /* offline: try again later */
      }
    };
    void check();
    const onVis = () => void check();
    document.addEventListener("visibilitychange", onVis);
    const t = window.setInterval(check, POLL_MS);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(t);
    };
  }, [toast, router]);

  return null;
}
