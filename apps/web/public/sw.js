/* Mike Salemi — service worker for training reminders (web push).
 * Pushes arrive without a payload (VAPID only). On each push we fetch the member's unseen
 * notifications from /api/notifications and show them; a tap opens the right page and marks it opened.
 */
const FALLBACK = { title: "Time to train", body: "Your session is ready when you are.", url: "/today" };
const ICON = "/favicon.ico";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function pending() {
  try {
    const res = await fetch("/api/notifications", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

async function ack(ids, opened) {
  if (!ids.length) return;
  try {
    await fetch("/api/notifications", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, opened }),
    });
  } catch {
    /* best effort */
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const items = (await pending()).filter((n) => n.channel === "push");
      // Browsers require a visible notification for every push: fall back to a generic one.
      const list = items.length ? items.slice(0, 2) : [{ id: null, kind: "training_reminder", ...FALLBACK }];
      await Promise.all(
        list.map((n) =>
          self.registration.showNotification(n.title, {
            body: n.body || "",
            tag: n.kind || "reminder",
            renotify: true,
            icon: ICON,
            badge: ICON,
            data: { id: n.id, url: n.url || "/today" },
          }),
        ),
      );
      await ack(items.map((n) => n.id), false);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { id, url } = event.notification.data || {};
  event.waitUntil(
    (async () => {
      if (id) await ack([id], true);
      const target = new URL(url || "/today", self.location.origin).href;
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of windows) {
        if ("focus" in w) {
          await w.focus();
          if ("navigate" in w) return w.navigate(target);
          return;
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
