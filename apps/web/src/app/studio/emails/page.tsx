import { PageHead } from "@/components/studio/ui";
import { EMAIL_GROUPS, EMAIL_KINDS, sampleEmail } from "@/lib/email/catalog";
import { emailStatus } from "@/lib/email/config";
import { renderEmail } from "@/lib/email/templates";
import { fixture, MOCK } from "@/lib/mock";
import { studioAdmin } from "@/lib/studio/guard";
import { EmailCentre, type OutboxRow } from "./EmailCentre";
import "./emails.css";

export const metadata = { title: "Email centre" };

async function outbox(): Promise<OutboxRow[]> {
  if (MOCK) return fixture<OutboxRow[]>("email-outbox");
  try {
    const { createServiceClient } = await import("@/lib/supabase/admin");
    const { data } = await createServiceClient()
      .from("email_outbox")
      .select("id, kind, status, subject, to_email, last_error, attempts, created_at, sent_at")
      .order("created_at", { ascending: false })
      .limit(40);
    return (data ?? []) as OutboxRow[];
  } catch {
    return [];
  }
}

/** L32 Email centre: every email we send, grouped, with a live preview, plain text and "Send me a test". */
export default async function EmailsPage() {
  const admin = await studioAdmin();
  const previews = Object.fromEntries(
    EMAIL_KINDS.map((k) => {
      const r = renderEmail(sampleEmail(k.id));
      return [k.id, { subject: r.subject, html: r.html, text: r.text, preheader: r.preheader }];
    }),
  );
  const status = emailStatus();
  return (
    <>
      <PageHead
        eyebrow={[{ label: "Site" }]}
        title="Every email we send"
        sub={`Pick any email to see exactly what lands in an inbox, then send yourself a live copy. ${EMAIL_KINDS.length} emails · from your own domain.`}
      />
      <EmailCentre kinds={EMAIL_KINDS} groups={EMAIL_GROUPS} previews={previews} status={status} adminEmail={admin.email} log={await outbox()} />
    </>
  );
}
