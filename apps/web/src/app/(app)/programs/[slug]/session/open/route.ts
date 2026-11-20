import { type NextRequest, NextResponse } from "next/server";
import { enroll, startSession } from "@ms/api";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/**
 * Open a day in Self-Guided and start (or resume) its training session, then go to the day.
 * `?lesson=<uuid>&key=<lesson key>` (the key keeps the day URL readable). Members without an
 * enrollment are enrolled in Self-Guided so progress and "Continue" work everywhere.
 * Every Self-Guided board link goes through here, so sessions log automatically.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = request.nextUrl;
  const lesson = url.searchParams.get("lesson") ?? "";
  const key = url.searchParams.get("key") || lesson;
  const dest = new URL(`/programs/${slug}/guide/${encodeURIComponent(key)}`, url.origin);
  if (MOCK || !/^[0-9a-f-]{36}$/i.test(lesson)) return NextResponse.redirect(dest);
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.redirect(new URL(`/signin?next=${encodeURIComponent(dest.pathname)}`, url.origin));
    const { data: l } = await supabase.from("lessons").select("program_id, path_id").eq("id", lesson).maybeSingle();
    if (l) {
      const { count } = await supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("program_id", l.program_id);
      if (!count) await enroll(supabase, l.program_id, l.path_id, "self_guided").catch(() => null);
      await startSession(supabase, lesson).catch(() => null);
    }
  } catch {
    // Logging must never block training: the day opens regardless.
  }
  return NextResponse.redirect(dest);
}
