/**
 * Server-only helper that turns app events into branded emails.
 *
 * Every email goes out through our own Resend account. Routine emails come
 * from "Kettlebell Lifestyle"; important milestones (rewards, certificates)
 * come from Mike Salemi personally. The copy itself lives in
 * `email-content.server.ts` so the preview screen renders the real thing.
 */
import { sendEmail } from "@/lib/email.server";
import { renderAppEmail, type AppEmail } from "@/lib/email-content.server";

type AnySupabase = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => { maybeSingle: () => Promise<{ data: unknown }> };
    };
  };
};

export type NotificationEvent = Extract<
  AppEmail,
  { kind: "tool_result" } | { kind: "reward" } | { kind: "certificate" } | { kind: "schedule_created" }
>;

/**
 * Sends a branded event email, honouring the user's notification preferences.
 * Never throws — a failed email must not fail the action that triggered it.
 */
export async function notifyByEmail(args: {
  supabase: unknown;
  userId: string;
  email?: string;
  event: NotificationEvent;
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!args.email) return { sent: false, reason: "no_email_on_account" };
    if (!process.env.RESEND_API_KEY) return { sent: false, reason: "email_not_configured" };

    const db = args.supabase as AnySupabase;
    const { data } = await db
      .from("notification_preferences")
      .select("channel_email")
      .eq("user_id", args.userId)
      .maybeSingle();
    const prefs = (data ?? null) as { channel_email: boolean } | null;

    if (prefs && prefs.channel_email === false) return { sent: false, reason: "email_channel_disabled" };

    const rendered = renderAppEmail(args.event);

    // Certificates ride along as a printable PDF attachment.
    let attachments: { filename: string; content: string }[] | undefined;
    if (args.event.kind === "certificate") {
      try {
        const { certificateFileName, certificatePdfBase64 } = await import("@/lib/certificate-pdf.server");
        attachments = [
          {
            filename: certificateFileName(args.event.title),
            content: await certificatePdfBase64({
              name: args.event.athleteName || "Kettlebell Lifestyle Athlete",
              title: args.event.title,
              issuedOn:
                args.event.issuedOn ||
                new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
              phases: args.event.phases,
            }),
          },
        ];
      } catch (error) {
        // A PDF failure must never block the congratulations email.
        console.error("certificate pdf generation failed:", error);
      }
    }

    await sendEmail({
      to: args.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      sender: rendered.sender,
      attachments,
    });
    return { sent: true };
  } catch (error) {
    console.error("notifyByEmail failed:", error);
    return { sent: false, reason: "send_failed" };
  }
}
