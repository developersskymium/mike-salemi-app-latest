import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const sha = (s: string) => createHash("sha256").update(s).digest();

type Row = { id: string; provider_id: string; privacy_hash: string | null; thumbnail_url: string | null; duration_seconds: number | null; meta: Record<string, unknown> | null };

async function oembed(id: string, hash: string | null, referer?: string) {
  const video = `https://vimeo.com/${id}${hash ? `/${hash}` : ""}`;
  const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(video)}&width=1280`, { cache: "no-store", headers: referer ? { Referer: referer, Origin: new URL(referer).origin } : undefined });
  if (!res.ok) return { error: `http ${res.status}` } as const;
  const j = (await res.json()) as { thumbnail_url?: string; duration?: number; width?: number; height?: number };
  return { thumb: j.thumbnail_url ?? null, duration: typeof j.duration === "number" ? j.duration : null, w: j.width, h: j.height } as const;
}

/**
 * One-time backfill of Vimeo posters and durations (via public oEmbed, as the original app did).
 * GET ?token=<secret whose sha256 hex is site_settings.vimeo_backfill_token_sha256>&limit=150
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const referer = req.nextUrl.searchParams.get("referer") ?? undefined;
  const retryNoThumb = req.nextUrl.searchParams.get("retry") === "1";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 150) || 150, 400);
  const db = createServiceClient();
  const { data: s } = await db.from("site_settings").select("value").eq("key", "vimeo_backfill_token_sha256").maybeSingle();
  const expectedHex = typeof s?.value === "string" ? s.value : "";
  if (!expectedHex || expectedHex.length !== 64 || !token || !timingSafeEqual(sha(token), Buffer.from(expectedHex, "hex"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let q = db
    .from("videos")
    .select("id, provider_id, privacy_hash, thumbnail_url, duration_seconds, meta")
    .eq("provider", "vimeo")
    .or("thumbnail_url.is.null,duration_seconds.is.null")
    .is("meta->>oembed_error", null)
    .limit(limit);
  q = retryNoThumb ? q.eq("meta->>no_thumb", "true") : q.is("meta->>no_thumb", null);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as Row[];
  let ok = 0, failed = 0;
  const queue = [...rows];
  async function worker() {
    for (let r = queue.shift(); r; r = queue.shift()) {
      try {
        const m = await oembed(r.provider_id, r.privacy_hash, referer);
        if ("error" in m) {
          failed++;
          await db.from("videos").update({ meta: { ...(r.meta ?? {}), oembed_error: m.error } }).eq("id", r.id);
        } else {
          ok++;
          await db
            .from("videos")
            .update({
              thumbnail_url: r.thumbnail_url ?? m.thumb,
              duration_seconds: r.duration_seconds ?? m.duration,
              meta: { ...(r.meta ?? {}), aspect: m.w && m.h ? +(m.w / m.h).toFixed(4) : undefined, no_thumb: m.thumb ? undefined : true },
            })
            .eq("id", r.id);
        }
      } catch (e) {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  const { count } = await db
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("provider", "vimeo")
    .or("thumbnail_url.is.null,duration_seconds.is.null")
    .is("meta->>oembed_error", null)
    .is("meta->>no_thumb", null);
  return NextResponse.json({ processed: rows.length, ok, failed, remaining: count ?? null });
}
