"use server";

import { EMAIL_KINDS, sampleEmail } from "@/lib/email/catalog";
import { sendEmail } from "@/lib/email/send";
import { renderEmail, type EmailKind } from "@/lib/email/templates";
import { MOCK } from "@/lib/mock";
import { studioAdmin } from "@/lib/studio/guard";

export type TestResult = { status: "sent" | "not_configured" | "failed"; to: string; error?: string };

/** "Send me a test": a live copy of any email (sample data) to the signed-in admin, logged in the outbox. */
export async function sendCatalogTest(kind: EmailKind): Promise<TestResult> {
  const admin = await studioAdmin();
  if (!EMAIL_KINDS.some((k) => k.id === kind)) return { status: "failed", to: admin.email, error: "Unknown email" };
  const r = renderEmail(sampleEmail(kind));
  if (MOCK) return { status: "not_configured", to: admin.email, error: "Email isn't set up yet (RESEND_API_KEY is not set)." };
  const res = await sendEmail({ to: admin.email, subject: `[Test] ${r.subject}`, html: r.html, text: r.text, sender: r.sender });
  try {
    const { createServiceClient } = await import("@/lib/supabase/admin");
    await createServiceClient().from("email_outbox").insert({
      user_id: admin.id, kind, dedupe_key: `studio-test:${Date.now()}`, status: res.status === "sent" ? "sent" : res.status === "not_configured" ? "not_configured" : "failed",
      subject: `[Test] ${r.subject}`, to_email: admin.email, attempts: 1, provider_id: "id" in res ? res.id : null, last_error: "error" in res ? res.error : null,
      sent_at: res.status === "sent" ? new Date().toISOString() : null,
    });
  } catch {
    /* log is best effort */
  }
  return { status: res.status, to: admin.email, error: "error" in res ? res.error : undefined };
}
