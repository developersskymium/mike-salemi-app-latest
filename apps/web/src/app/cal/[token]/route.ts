import { addDays, isoDate } from "@ms/core";
import { verifyFeedToken } from "@/lib/calendar-feed";
import { fixture, MOCK } from "@/lib/mock";
import type { PlanRaw } from "@/lib/loaders/today-plan-you";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const day = (d: string) => d.replace(/-/g, "");

type Ev = { uid: string; date: string; title: string; detail: string; url: string };

/**
 * Calendar subscribe feed (token-protected, no session): the member's one schedule for the last 2 and
 * next 13 weeks. Apple/Google/Outlook poll it, so changes on the Plan page show up by themselves.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const userId = verifyFeedToken(token);
  if (!userId) return new Response("Not found", { status: 404 });
  const origin = new URL(req.url).origin;
  const today = isoDate(new Date());
  let events: Ev[] = [];
  if (MOCK) {
    events = (await fixture<PlanRaw>("tpy-plan")).entries
      .filter((e) => e.item_kind !== "rest" && !e.skipped)
      .map((e) => ({ uid: e.plan_item_id ?? `${e.on_date}-${e.title}`, date: e.on_date, title: e.title, detail: e.program_name ?? "", url: `${origin}/plan?d=${e.on_date}` }));
  } else {
    const { createServiceClient } = await import("@/lib/supabase/admin");
    const sb = createServiceClient();
    const { data: plans } = await sb.from("member_plans").select("id").eq("user_id", userId).eq("status", "active");
    const ids = (plans ?? []).map((p) => p.id as string);
    if (ids.length) {
      const { data } = await sb
        .from("plan_items")
        .select("id, on_date, kind, title, lesson_id, skipped_at, lessons(title, programs(slug, name))")
        .in("plan_id", ids)
        .gte("on_date", addDays(today, -14))
        .lte("on_date", addDays(today, 91))
        .neq("kind", "rest")
        .is("skipped_at", null)
        .order("on_date")
        .limit(500);
      events = (data ?? []).map((i) => {
        const l = i.lessons as unknown as { title: string; programs: { slug: string; name: string } | null } | null;
        const url = l?.programs?.slug ? `${origin}/programs/${l.programs.slug}${i.lesson_id ? `/learn/${i.lesson_id}` : ""}` : `${origin}/plan`;
        return { uid: i.id as string, date: i.on_date as string, title: l?.title ?? (i.title as string) ?? "Training", detail: l?.programs?.name ?? "", url };
      });
    }
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mike Salemi//Schedule//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Mike Salemi · Training", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT", `UID:${e.uid}@mikesalemi.app`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(e.date)}`, `DTEND;VALUE=DATE:${day(addDays(e.date, 1))}`,
      `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(e.detail)}`, `URL:${e.url}`, "TRANSP:TRANSPARENT", "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900" },
  });
}
