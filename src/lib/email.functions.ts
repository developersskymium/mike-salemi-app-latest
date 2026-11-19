import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMAIL_KINDS, type EmailKindId } from "@/lib/email-kinds";

const kindIds = EMAIL_KINDS.map((k) => k.id) as [EmailKindId, ...EmailKindId[]];
const kindSchema = z.enum(kindIds);

/**
 * Sends a notification email to the signed-in user through our own Resend
 * account, respecting their email-channel preference.
 */
export const sendNotificationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "test" | "training_reminder" | "weekly_summary"; message?: string }) =>
    z
      .object({
        kind: z.enum(["test", "training_reminder", "weekly_summary"]),
        message: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { sendEmail } = await import("@/lib/email.server");
    const { renderAppEmail } = await import("@/lib/email-content.server");
    const { sampleEmail } = await import("@/lib/email.catalog.server");

    const { data: prefs } = await context.supabase
      .from("notification_preferences")
      .select("channel_email")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (prefs && prefs.channel_email === false) {
      return { sent: false, reason: "email_channel_disabled" as const };
    }

    const email = context.claims?.email as string | undefined;
    if (!email) return { sent: false, reason: "no_email_on_account" as const };

    const base = sampleEmail(data.kind);
    const withMessage =
      data.message && (base.kind === "training_reminder" || base.kind === "weekly_summary")
        ? { ...base, message: data.message }
        : base;

    const rendered = renderAppEmail(withMessage);
    await sendEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      sender: rendered.sender,
    });

    return { sent: true as const };
  });

/** Renders any app email as HTML so it can be previewed in the app. */
export const renderEmailPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: EmailKindId }) => z.object({ kind: kindSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { renderAppEmail } = await import("@/lib/email-content.server");
    const { sampleEmail } = await import("@/lib/email.catalog.server");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();

    const rendered = renderAppEmail(sampleEmail(data.kind, profile?.display_name ?? undefined));
    return { subject: rendered.subject, html: rendered.html, sender: rendered.sender };
  });

/** Sends a real copy of any app email to the signed-in user's own address. */
export const sendCatalogTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: EmailKindId }) => z.object({ kind: kindSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { sendEmail } = await import("@/lib/email.server");
    const { renderAppEmail } = await import("@/lib/email-content.server");
    const { sampleEmail } = await import("@/lib/email.catalog.server");

    const email = context.claims?.email as string | undefined;
    if (!email) return { sent: false as const, reason: "no_email_on_account" as const };

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();

    const sample = sampleEmail(data.kind, profile?.display_name ?? undefined);
    const rendered = renderAppEmail(sample);

    let attachments: { filename: string; content: string }[] | undefined;
    if (sample.kind === "certificate") {
      try {
        const { certificateFileName, certificatePdfBase64 } = await import("@/lib/certificate-pdf.server");
        attachments = [
          {
            filename: certificateFileName(sample.title),
            content: await certificatePdfBase64({
              name: sample.athleteName || "Kettlebell Lifestyle Athlete",
              title: sample.title,
              issuedOn: sample.issuedOn || new Date().toLocaleDateString("en-US"),
              phases: sample.phases,
            }),
          },
        ];
      } catch (error) {
        console.error("certificate pdf generation failed:", error);
      }
    }

    await sendEmail({
      to: email,
      subject: `[Test] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
      sender: rendered.sender,
      attachments,
    });

    return { sent: true as const, to: email };
  });
