import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { importProgram, LEGACY_PROGRAMS } from "@/lib/import/legacy";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const digest = (s: string) => createHash("sha256").update(s).digest();

/** One-time legacy import. GET ?token=<site_settings.import_token>&program=<slug | tr-qa>. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const program = req.nextUrl.searchParams.get("program") ?? "";
  const db = createServiceClient();
  const { data } = await db.from("site_settings").select("value").eq("key", "import_token").maybeSingle();
  const expected = typeof data?.value === "string" ? data.value : (data?.value as { token?: string } | null)?.token;
  if (!expected || !token || !timingSafeEqual(digest(token), digest(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (program !== "tr-qa" && !(program in LEGACY_PROGRAMS)) {
    return NextResponse.json({ error: "unknown program", allowed: [...Object.keys(LEGACY_PROGRAMS), "tr-qa"] }, { status: 400 });
  }
  try {
    return NextResponse.json(await importProgram(db, program));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
