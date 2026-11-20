import { myWeek, type DB, type WeekEntry } from "@ms/api";
import { addDays, isoDate } from "@ms/core";
import { fixture, MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import type { PlanRaw } from "@/lib/loaders/today-plan-you";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const day = (d: string) => d.replace(/-/g, "");

/** ICS export of the member's plan (next 13 weeks) for any calendar app. */
export async function GET(req: Request) {
  let entries: WeekEntry[];
  if (MOCK) {
    entries = (await fixture<PlanRaw>("tpy-plan")).entries;
  } else {
    const { supabase, user } = await getUser();
    if (!user) return new Response("Sign in first", { status: 401 });
    const today = isoDate(new Date());
    entries = (await myWeek(supabase as unknown as DB, today, addDays(today, 90))) ?? [];
  }
  const origin = new URL(req.url).origin;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mike Salemi//Plan//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Mike Salemi plan"];
  for (const e of entries) {
    if (e.skipped || e.item_kind === "rest") continue;
    const uid = `${e.plan_item_id ?? e.ref_id ?? `${e.on_date}-${e.title}`}@mikesalemi.app`;
    const url = e.program_slug ? `${origin}/programs/${e.program_slug}${e.lesson_id ? `/learn/${e.lesson_id}` : ""}` : `${origin}/plan`;
    lines.push("BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`);
    if (e.starts_at) {
      const s = new Date(e.starts_at).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
      lines.push(`DTSTART:${s}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${day(e.on_date)}`, `DTEND;VALUE=DATE:${day(addDays(e.on_date, 1))}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc([e.program_name, e.subtitle].filter(Boolean).join(" · "))}`, `URL:${url}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="mike-salemi-plan.ics"', "Cache-Control": "no-store" },
  });
}
