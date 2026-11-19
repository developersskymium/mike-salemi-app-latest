/**
 * Guarded service-worker registration.
 *
 * The worker caches public static assets only. It must never run inside the
 * Lovable editor preview, an iframe, or dev — stale HTML there is worse than
 * a slow load.
 */
const SW_URL = "/sw.js";
import { purgeAppCaches } from "@/lib/app-cache";

function isBlockedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.top !== window.self) return true;

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (
    new URLSearchParams(window.location.search).has("sw") &&
    new URLSearchParams(window.location.search).get("sw") === "off"
  )
    return true;

  return false;
}

async function unregisterOurWorkers() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
        .map((r) => r.unregister()),
    );
  } catch {
    /* nothing we can do */
  }
}

export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  void (async () => {
    if ("caches" in window) {
      let storage: Storage | undefined;
      try {
        storage = window.localStorage;
      } catch {
        /* Restricted browser storage. */
      }
      await purgeAppCaches(caches, storage);
    }

    if (isBlockedContext()) {
      await unregisterOurWorkers();
      return;
    }

    const register = () => {
      void navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => undefined);
    };
    // Root effects can run after window.load, especially during fast navigation.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  })();
}
