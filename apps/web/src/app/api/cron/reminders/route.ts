import { cronGuard, serviceOr503 } from "@/lib/email/cron";
import { runReminders } from "@/lib/email/deliver";

export const maxDuration = 120;

/**
 * Vercel Cron (hourly, minute 0): training reminders, streak nudges and Sunday summaries in each
 * member's time zone, honouring days, per-day times, quiet hours, skip today and snooze.
 */
export async function GET(req: Request) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const s = serviceOr503();
  if ("res" in s) return s.res;
  try {
    return Response.json({ ok: true, ...(await runReminders(s.sb)) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Reminder run failed" }, { status: 500 });
  }
}

export const POST = GET;
