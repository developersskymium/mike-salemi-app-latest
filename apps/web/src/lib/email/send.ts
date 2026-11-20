import "server-only";
import { emailConfigured, fromAddress, type EmailSender } from "./config";

export type SendResult =
  | { status: "sent"; id: string }
  | { status: "not_configured"; error: string }
  | { status: "failed"; error: string };

export interface SendInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  sender?: EmailSender;
  replyTo?: string;
  /** Base64 content. */
  attachments?: { filename: string; content: string }[];
  /** Resend idempotency key, so a retried cron never sends twice. */
  idempotencyKey?: string;
}

export const NOT_CONFIGURED = "Email isn't set up yet (RESEND_API_KEY is not set).";

/** Sends through Resend. Never throws: the caller records the result. */
export async function sendEmail(input: SendInput): Promise<SendResult> {
  if (!emailConfigured()) return { status: "not_configured", error: NOT_CONFIGURED };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: fromAddress(input.sender ?? "brand"),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      }),
    });
    if (!res.ok) return { status: "failed", error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    const body = (await res.json()) as { id?: string };
    return { status: "sent", id: body.id ?? "" };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "Network error" };
  }
}
