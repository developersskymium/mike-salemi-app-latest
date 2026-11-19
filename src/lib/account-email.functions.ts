import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Account emails (password reset, welcome) are generated and sent by us
 * through Resend — the backend's built-in mailer is never used, so nothing
 * arrives from a third-party sender.
 */

const originSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), "Invalid origin");

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; origin: string }) =>
    z.object({ email: z.string().email().max(320), origin: originSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail, APP_URL } = await import("@/lib/email.server");
    const { renderAppEmail } = await import("@/lib/email-content.server");

    // Recovery links always return to the published app, never a caller's host.
    const redirectTo = `${APP_URL}/reset-password`;
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo },
    });

    // Never reveal whether an account exists.
    if (error || !link?.properties?.action_link) {
      if (error) console.error(`[account-email] recovery link failed: ${error.message}`);
      return { ok: true as const };
    }

    const rendered = renderAppEmail({ kind: "password_reset", actionUrl: link.properties.action_link });
    await sendEmail({
      to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      sender: rendered.sender,
      text: `Reset your Kettlebell Lifestyle password: ${link.properties.action_link}`,
    });

    return { ok: true as const };
  });

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; name?: string }) =>
    z.object({ email: z.string().email().max(320), name: z.string().max(120).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { sendEmail } = await import("@/lib/email.server");
    const { renderAppEmail } = await import("@/lib/email-content.server");
    const rendered = renderAppEmail({ kind: "welcome", name: data.name });

    await sendEmail({
      to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      sender: rendered.sender,
    });

    return { ok: true as const };
  });
