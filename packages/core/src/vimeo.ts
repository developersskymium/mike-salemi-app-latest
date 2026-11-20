/**
 * Vimeo references: parse the forms found in legacy data and admin input, and
 * build player embed URLs. Port of the relevant parts of legacy src/lib/vimeo.ts.
 */
import type { VideoRef } from "./types";

export interface ParsedVimeo {
  providerId: string;
  privacyHash: string | null;
}

/**
 * Accepts:
 * - `"400475380"` and the unlisted `"400475380/bd283c1aa1"` form
 * - `https://vimeo.com/400475380`, `https://vimeo.com/400475380/bd283c1aa1`
 * - `https://player.vimeo.com/video/400475380?h=bd283c1aa1&…`
 * - channel / group / showcase URLs ending in the numeric id
 * Returns null when no numeric id can be found.
 */
export function parseVimeo(input: string | number | null | undefined): ParsedVimeo | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const bare = /^(\d+)(?:[/:]([0-9a-f]+))?$/i.exec(raw);
  if (bare) return { providerId: bare[1]!, privacyHash: bare[2] ?? null };

  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!/(^|\.)vimeo\.com$/i.test(url.hostname)) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const afterVideo = segments.findIndex((s, i) => /^videos?$/i.test(segments[i - 1] ?? "") && /^\d+$/.test(s));
  const idIndex = afterVideo >= 0 ? afterVideo : segments.findIndex((s) => /^\d+$/.test(s));
  if (idIndex < 0) return null;
  const providerId = segments[idIndex]!;
  const pathHash = segments[idIndex + 1];
  const privacyHash = url.searchParams.get("h") ?? (pathHash && /^[0-9a-f]+$/i.test(pathHash) ? pathHash : null);
  return { providerId, privacyHash };
}

/** `"123/abc"` legacy string form of a reference (hash kept when present). */
export function vimeoKey(ref: Pick<VideoRef, "providerId" | "privacyHash">): string {
  return ref.privacyHash ? `${ref.providerId}/${ref.privacyHash}` : ref.providerId;
}

export interface EmbedOptions {
  autoplay?: boolean;
  /** Hide Vimeo's own controls (the app draws its own and drives playback over postMessage). */
  bare?: boolean;
  muted?: boolean;
  loop?: boolean;
  /** Start position in seconds (`#t=`). */
  startAt?: number;
}

/** Player URL with `api=1` (postMessage API for resume points) and `dnt=1`. */
export function embedUrl(ref: Pick<VideoRef, "providerId" | "privacyHash">, opts: EmbedOptions = {}): string {
  const params = new URLSearchParams({ api: "1", dnt: "1" });
  if (opts.bare) params.set("controls", "0");
  params.set("title", "0");
  params.set("byline", "0");
  params.set("portrait", "0");
  if (opts.bare) {
    params.set("playsinline", "1");
    params.set("transparent", "0");
  }
  if (ref.privacyHash) params.set("h", ref.privacyHash);
  if (opts.autoplay) params.set("autoplay", "1");
  if (opts.muted !== undefined) params.set("muted", opts.muted ? "1" : "0");
  else if (opts.autoplay && opts.bare) params.set("muted", "0");
  if (opts.loop) params.set("loop", "1");
  const hash = opts.startAt && opts.startAt > 0 ? `#t=${Math.floor(opts.startAt)}s` : "";
  return `https://player.vimeo.com/video/${ref.providerId}?${params.toString()}${hash}`;
}

/** Public page URL (keeps the unlisted hash path). */
export function watchUrl(ref: Pick<VideoRef, "providerId" | "privacyHash">): string {
  return `https://vimeo.com/${ref.providerId}${ref.privacyHash ? `/${ref.privacyHash}` : ""}`;
}

/** Vimeo oEmbed lookup URL (title, duration, thumbnail), which works for unlisted videos with their hash. */
export function oembedUrl(ref: Pick<VideoRef, "providerId" | "privacyHash">): string {
  return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(watchUrl(ref))}`;
}

/** Stable 0–360 hue per id, for the no-poster fallback block. */
export function idHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
