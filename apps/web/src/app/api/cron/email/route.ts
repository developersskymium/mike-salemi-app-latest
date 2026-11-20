import { emailConfigured } from "@/lib/email/config";
import { cronGuard, serviceOr503 } from "@/lib/email/cron";
import { drainOutbox } from "@/lib/email/outbox";

export const maxDuration = 60;

/** Vercel Cron (every 5 minutes): sends queued emails from public.email_outbox. */
export async function GET(req: Request) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const s = serviceOr503();
  if ("res" in s) return s.res;
  try {
    const summary = await drainOutbox(s.sb, { limit: 100 });
    return Response.json({ ok: true, configured: emailConfigured(), ...summary });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Drain failed" }, { status: 500 });
  }
}

export const POST = GET;
