/**
 * Vimeo metadata (poster + duration) resolved through the public oEmbed
 * endpoint.
 *
 * vumbnail.com cannot see private / unlisted videos and silently serves a black
 * "locked" placeholder for them, which is why tiles used to render a padlock.
 * oEmbed accepts the unlisted privacy hash, so it returns the real poster frame
 * and duration for every video in the catalogue.
 *
 * Results are memoised in-module and mirrored into sessionStorage so navigation
 * between days feels instant.
 */

import { splitVimeoId } from "@/lib/vimeo";

export type VimeoMeta = {
  vimeoId: string;
  thumbnail: string;
  width: number;
  height: number;
  duration: number;
  title: string;
};

const STORE_KEY = "kbl:vimeo-meta:v1";
const cache = new Map<string, VimeoMeta | null>();
const inflight = new Map<string, Promise<VimeoMeta | null>>();

let hydrated = false;
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, VimeoMeta | null>;
    for (const [key, value] of Object.entries(parsed)) cache.set(key, value);
  } catch {
    /* ignore corrupt cache */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, VimeoMeta | null> = {};
    for (const [key, value] of cache) obj[key] = value;
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(obj));
  } catch {
    /* storage full / unavailable */
  }
}

function oembedUrl(vimeoId: string) {
  const { id, hash } = splitVimeoId(vimeoId);
  const video = `https://vimeo.com/${id}${hash ? `/${hash}` : ""}`;
  return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(video)}&width=1280`;
}

/** Cached read — synchronous, returns undefined when nothing is known yet. */
export function peekVimeoMeta(vimeoId: string) {
  hydrate();
  return cache.get(vimeoId);
}

export function fetchVimeoMeta(vimeoId: string): Promise<VimeoMeta | null> {
  hydrate();
  if (!vimeoId || vimeoId === "0") return Promise.resolve(null);
  if (cache.has(vimeoId)) return Promise.resolve(cache.get(vimeoId) ?? null);
  const running = inflight.get(vimeoId);
  if (running) return running;

  const request = fetch(oembedUrl(vimeoId))
    .then(async (res) => {
      if (!res.ok) return null;
      const json = (await res.json()) as {
        thumbnail_url?: string;
        thumbnail_width?: number;
        thumbnail_height?: number;
        duration?: number;
        title?: string;
      };
      if (!json.thumbnail_url) return null;
      const meta: VimeoMeta = {
        vimeoId,
        thumbnail: json.thumbnail_url,
        width: json.thumbnail_width ?? 1280,
        height: json.thumbnail_height ?? 720,
        duration: json.duration ?? 0,
        title: json.title ?? "",
      };
      return meta;
    })
    .catch(() => null)
    .then((meta) => {
      cache.set(vimeoId, meta);
      inflight.delete(vimeoId);
      persist();
      return meta;
    });

  inflight.set(vimeoId, request);
  return request;
}

/** Resolves the first candidate that actually has a poster frame. */
export async function fetchFirstVimeoMeta(candidates: string[]): Promise<VimeoMeta | null> {
  for (const candidate of candidates) {
    const meta = await fetchVimeoMeta(candidate);
    if (meta) return meta;
  }
  return null;
}

/** Warm the cache for upcoming days so their tiles paint immediately. */
export function prefetchVimeoMeta(ids: string[], limit = 12) {
  if (typeof window === "undefined") return;
  const queue = ids.filter((id) => id && !cache.has(id)).slice(0, limit);
  for (const id of queue) void fetchVimeoMeta(id);
}

/** "12:04" from oEmbed seconds. */
export function formatVimeoDuration(seconds: number) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
