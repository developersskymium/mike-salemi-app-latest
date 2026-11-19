const CACHE_RELEASE = "2026-11-01-kbl-course-parity";
const RELEASE_KEY = "kbl:cache-release";
const APP_CACHES = ["kbl-pages", "kbl-assets", "kbl-images", "kbl-vimeo-thumbs"] as const;

/** Purge only this app's old runtime caches, once per browser for this release. */
export async function purgeAppCaches(
  cacheStore: Pick<CacheStorage, "delete">,
  storage?: Pick<Storage, "getItem" | "setItem">,
): Promise<boolean> {
  try {
    if (storage?.getItem(RELEASE_KEY) === CACHE_RELEASE) return false;
  } catch {
    /* Storage restrictions must not prevent clearing stale pages. */
  }

  try {
    await Promise.all(APP_CACHES.map((name) => cacheStore.delete(name)));
  } catch {
    return false; // Retry on the next load if a cache could not be deleted.
  }

  try {
    storage?.setItem(RELEASE_KEY, CACHE_RELEASE);
  } catch {
    /* Cache purge succeeded. */
  }
  return true;
}
