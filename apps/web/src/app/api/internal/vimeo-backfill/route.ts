import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const sha = (s: string) => createHash("sha256").update(s).digest();

type Row = { id: string; provider_id: string; privacy_hash: string | null; thumbnail_url: string | null; duration_seconds: number | null; meta: Record<string, unknown> | null };
type Meta = { thumb: string | null; duration: number | null; w?: number; h?: number };
type Got = Meta | { error: string };

/** Public oEmbed, exactly as the original app did (no Referer: domain-restricted embeds answer without a poster). */
async function oembed(id: string, hash: string | null): Promise<Got> {
  const video = `https://vimeo.com/${id}${hash ? `/${hash}` : ""}`;
  const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(video)}&width=1280`, { cache: "no-store" });
  if (!res.ok) return { error: `http ${res.status}` };
  const j = (await res.json()) as { thumbnail_url?: string; duration?: number; width?: number; height?: number };
  return { thumb: j.thumbnail_url ?? null, duration: typeof j.duration === "number" ? j.duration : null, w: j.width, h: j.height };
}

type Picture = { width: number; height: number; link: string };
/** Official Vimeo API with the account owner's token: works for private, unlisted and domain-restricted videos. */
async function api(id: string, hash: string | null, token: string): Promise<Got> {
  const res = await fetch(`https://api.vimeo.com/videos/${id}${hash ? `:${hash}` : ""}?fields=pictures.sizes,duration,width,height`, {
    cache: "no-store",
    headers: { Authorization: `bearer ${token}`, Accept: "application/vnd.vimeo.*+json;version=3.4" },
  });
  if (res.status === 429) return { error: "rate_limited" };
  if (!res.ok) return { error: `api ${res.status}` };
  const j = (await res.json()) as { duration?: number; width?: number; height?: number; pictures?: { sizes?: Picture[] } };
  const sizes = (j.pictures?.sizes ?? []).filter((p) => p.link).sort((a, b) => a.width - b.width);
  // The 1280 rendition (or the closest larger, else the largest) — the same size oEmbed returned.
  const pic = sizes.find((p) => p.width >= 1280) ?? sizes[sizes.length - 1] ?? null;
  return { thumb: pic?.link ?? null, duration: typeof j.duration === "number" ? j.duration : null, w: j.width, h: j.height };
}

/** Drop keys whose value is undefined so they are removed from the JSON meta. */
function clean(m: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined));
}

/**
 * Backfill Vimeo posters and durations, then refresh lesson/step estimated minutes.
 *
 * GET ?token=<secret whose sha256 hex is site_settings.vimeo_backfill_token_sha256>&limit=150
 * - Without VIMEO_ACCESS_TOKEN: public oEmbed for videos never tried (the first pass; done Nov 20).
 * - With VIMEO_ACCESS_TOKEN (server env, see docs/specs/ENV.md): the official API for the videos oEmbed
 *   could not serve — domain-restricted (`meta.no_thumb`) and unlisted without a hash (`meta.oembed_error`).
 *   `&source=oembed` forces the public pass even when the token is set.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 150) || 150, 400);
  const vimeoToken = process.env.VIMEO_ACCESS_TOKEN?.trim() || "";
  const useApi = Boolean(vimeoToken) && req.nextUrl.searchParams.get("source") !== "oembed";
  const db = createServiceClient();
  const { data: s } = await db.from("site_settings").select("value").eq("key", "vimeo_backfill_token_sha256").maybeSingle();
  const expectedHex = typeof s?.value === "string" ? s.value : "";
  if (!expectedHex || expectedHex.length !== 64 || !token || !timingSafeEqual(sha(token), Buffer.from(expectedHex, "hex"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const base = (head = false) =>
    db.from("videos").select(head ? "id" : "id, provider_id, privacy_hash, thumbnail_url, duration_seconds, meta", head ? { count: "exact", head: true } : undefined).eq("provider", "vimeo").or("thumbnail_url.is.null,duration_seconds.is.null").is("meta->>superseded_by", null);
  // API pass: what oEmbed could not answer, and not already failed on the API.
  const q = useApi
    ? base().or("meta->>no_thumb.eq.true,meta->>oembed_error.not.is.null").is("meta->>api_error", null).limit(limit)
    : base().is("meta->>oembed_error", null).is("meta->>no_thumb", null).limit(limit);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as unknown as Row[];
  let ok = 0, failed = 0, rateLimited = false;
  const queue = [...rows];
  async function worker() {
    for (let r = queue.shift(); r && !rateLimited; r = queue.shift()) {
      try {
        const m = useApi ? await api(r.provider_id, r.privacy_hash, vimeoToken) : await oembed(r.provider_id, r.privacy_hash);
        const meta = r.meta ?? {};
        if ("error" in m) {
          if (m.error === "rate_limited") { rateLimited = true; break; }
          failed++;
          await db.from("videos").update({ meta: { ...meta, ...(useApi ? { api_error: m.error } : { oembed_error: m.error }) } }).eq("id", r.id);
        } else {
          ok++;
          const thumb = r.thumbnail_url ?? m.thumb;
          await db
            .from("videos")
            .update({
              thumbnail_url: thumb,
              duration_seconds: r.duration_seconds ?? m.duration,
              meta: clean({
                ...meta,
                aspect: m.w && m.h ? +(m.w / m.h).toFixed(4) : meta.aspect,
                no_thumb: thumb ? undefined : true,
                oembed_error: useApi && thumb ? undefined : meta.oembed_error,
                needs_api: useApi && thumb ? undefined : meta.needs_api,
                meta_source: useApi ? "vimeo_api" : "oembed",
              }),
            })
            .eq("id", r.id);
        }
      } catch {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: useApi ? 4 : 8 }, worker));
  const minutes = ok > 0 ? (await db.rpc("refresh_estimated_minutes")).data : null;

  const { count } = await (useApi
    ? base(true).or("meta->>no_thumb.eq.true,meta->>oembed_error.not.is.null").is("meta->>api_error", null)
    : base(true).is("meta->>oembed_error", null).is("meta->>no_thumb", null));
  return NextResponse.json({ source: useApi ? "vimeo_api" : "oembed", processed: rows.length, ok, failed, rateLimited, remaining: count ?? null, minutes });
}
