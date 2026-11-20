import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";

/** Cron routes accept only `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends it automatically). */
export function cronGuard(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET is not set" }, { status: 503 });
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  return null;
}

/** Service-role client, or a 503 explaining what's missing. */
export function serviceOr503(): { sb: SupabaseClient } | { res: Response } {
  try {
    return { sb: createServiceClient() };
  } catch (e) {
    return { res: Response.json({ ok: false, error: e instanceof Error ? e.message : "Service client unavailable" }, { status: 503 }) };
  }
}
