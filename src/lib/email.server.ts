/**
 * Server-only email sending through our own Resend account.
 * Every outgoing app email goes through here so the sender is always ours.
 */

export type EmailSender = "brand" | "mike";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** "brand" = Kettlebell Lifestyle (default). "mike" = Mike Salemi, for important emails. */
  sender?: EmailSender;
  /** File attachments; `content` is base64-encoded. */
  attachments?: { filename: string; content: string }[];
};

/** Public app URL used in email links. Set APP_URL on the host; Vercel's production domain is the fallback. */
export const APP_URL = (
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://kettlebell-pathway-studio.lovable.app")
).replace(/\/+$/, "");

/**
 * Resolves the visible From address. Accepts a full "Name <a@b.com>" value, a
 * bare address, or just a sending domain (in which case we build the address).
 */
export function emailFromAddress(sender: EmailSender = "brand") {
  const raw = (process.env.RESEND_FROM_EMAIL || "").trim();
  const configured = raw
    ? raw.includes("@")
      ? raw
      : `Kettlebell Lifestyle <noreply@${raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}>`
    : "Kettlebell Lifestyle <onboarding@resend.dev>";

  if (sender === "brand") return configured;

  const match = configured.match(/<([^>]+)>/);
  const address = match ? match[1] : configured;
  const domain = address.split("@")[1] ?? "resend.dev";
  const mikeRaw = (process.env.RESEND_FROM_EMAIL_MIKE || "").trim();
  if (mikeRaw) return mikeRaw.includes("@") ? mikeRaw : `Mike Salemi <mike@${mikeRaw}>`;
  return `Mike Salemi <mike@${domain}>`;
}

export async function sendEmail({ to, subject, html, text, replyTo, sender = "brand", attachments }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: emailFromAddress(sender),
      to: [to],
      subject,
      html,
      ...(text ? { text } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(attachments?.length ? { attachments } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Resend request failed [${response.status}]: ${body}`);
    throw new Error(`Email send failed [${response.status}]: ${body}`);
  }

  return (await response.json()) as { id: string };
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

const INK = "#141414";
const MUTED = "#6b6b6b";
const LINE = "#e6e2da";
const PAPER = "#f4f7ff";
/** App primary — used everywhere so emails read as part of the product. */
const ACCENT = "#2d6bff";
const ACCENT_SOFT = "#e8efff";


export function esc(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A normal paragraph. */
export function p(text: string) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3d3d3d">${text}</p>`;
}

/** Small uppercase section label. */
export function sectionTitle(text: string) {
  return `<p style="margin:26px 0 10px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${MUTED};font-weight:700">${esc(
    text,
  )}</p>`;
}

/** A big highlighted number/verdict block — used for tool scores. */
export function scoreBlock({ value, label, caption }: { value: string; label: string; caption?: string }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 6px;border-radius:16px;background:${ACCENT}">
    <tr><td style="padding:24px 22px;text-align:center">
      <p style="margin:0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#cfdeff;font-weight:700">${esc(label)}</p>
      <p style="margin:8px 0 0;font-size:44px;line-height:1;font-weight:800;color:#ffffff">${esc(value)}</p>
      ${caption ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:#e4ecff">${esc(caption)}</p>` : ""}
    </td></tr>
  </table>`;
}

/** Horizontal progress bar in the brand colour. */
export function progressBar(percent: number, label?: string) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 16px">
    ${
      label
        ? `<tr><td style="padding:0 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};font-weight:700">${esc(label)} · ${pct}%</td></tr>`
        : ""
    }
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ACCENT_SOFT};border-radius:99px">
        <tr><td width="${pct}%" style="height:10px;background:${ACCENT};border-radius:99px;font-size:0;line-height:0">&nbsp;</td><td style="font-size:0;line-height:0">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>`;
}

/** Large emoji/glyph badge for the top of celebratory emails. */
export function badge(glyph: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px">
    <tr><td style="width:62px;height:62px;border-radius:20px;background:${ACCENT_SOFT};text-align:center;font-size:30px;line-height:62px">${esc(glyph)}</td></tr>
  </table>`;
}


/** Label/value rows — the detail table of an assessment or schedule. */
export function detailRows(rows: { label: string; value: string }[]) {
  if (!rows.length) return "";
  const body = rows
    .map(
      (r, i) =>
        `<tr><td style="padding:11px 0;${i ? `border-top:1px solid ${LINE};` : ""}font-size:14px;color:${MUTED};width:45%">${esc(
          r.label,
        )}</td><td style="padding:11px 0;${i ? `border-top:1px solid ${LINE};` : ""}font-size:14px;color:${INK};font-weight:600;text-align:right">${esc(
          r.value,
        )}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px">${body}</table>`;
}

/** Numbered "do this next" steps. */
export function steps(items: string[]) {
  if (!items.length) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px">${items
    .map(
      (item, i) =>
        `<tr>
          <td valign="top" style="padding:6px 12px 6px 0;width:28px">
            <div style="width:24px;height:24px;border-radius:12px;background:${ACCENT};color:#ffffff;font-size:12px;font-weight:700;text-align:center;line-height:24px">${i + 1}</div>
          </td>
          <td valign="top" style="padding:8px 0;font-size:15px;line-height:1.6;color:#3d3d3d">${esc(item)}</td>
        </tr>`,
    )
    .join("")}</table>`;
}

/** Checklist-style list with brand-coloured ticks. */
export function bullets(items: string[]) {
  if (!items.length) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px">${items
    .map(
      (i) =>
        `<tr>
          <td valign="top" style="padding:5px 10px 5px 0;width:22px">
            <div style="width:18px;height:18px;border-radius:9px;background:${ACCENT_SOFT};color:${ACCENT};font-size:11px;font-weight:800;text-align:center;line-height:18px">&#10003;</div>
          </td>
          <td valign="top" style="padding:5px 0;font-size:15px;line-height:1.55;color:#3d3d3d">${esc(i)}</td>
        </tr>`,
    )
    .join("")}</table>`;
}

/** Soft highlighted note — coaching tip, reminder of a rule, etc. */
export function callout(title: string, text: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:${ACCENT_SOFT};border-radius:14px">
    <tr><td style="padding:16px 18px;border-left:4px solid ${ACCENT};border-radius:14px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:${ACCENT}">${esc(title)}</p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#33405c">${esc(text)}</p>
    </td></tr>
  </table>`;
}

/** Up to three compact stat tiles side by side. */
export function statTiles(tiles: { value: string; label: string }[]) {
  if (!tiles.length) return "";
  const width = Math.floor(100 / tiles.length);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 12px"><tr>${tiles
    .map(
      (t) =>
        `<td width="${width}%" valign="top" style="padding:0 6px 0 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;background:${ACCENT_SOFT}">
            <tr><td style="padding:16px 12px;text-align:center">
              <p style="margin:0;font-size:26px;font-weight:800;color:${ACCENT}">${esc(t.value)}</p>
              <p style="margin:4px 0 0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5b6b8c;font-weight:700">${esc(t.label)}</p>
            </td></tr>
          </table>
        </td>`,
    )
    .join("")}</tr></table>`;
}


/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export type EmailLayoutInput = {
  heading: string;
  /** Raw HTML body — compose with the block helpers above. */
  body: string;
  /** One-line lead directly under the heading. */
  subheading?: string;
  eyebrow?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
  preheader?: string;
  /** Short reassurance line under the CTA. */
  ctaNote?: string;
  sender?: EmailSender;
  /** Extra links in the footer, e.g. notification settings. */
  footerLinks?: { label: string; url: string }[];
};

/** Shared brand shell so every email looks like it came from us. */
export function emailLayout({
  heading,
  body,
  subheading,
  eyebrow = "Kettlebell Lifestyle",
  ctaLabel,
  ctaUrl,
  secondaryLabel,
  secondaryUrl,
  preheader,
  ctaNote,
  sender = "brand",
  footerLinks,
}: EmailLayoutInput) {
  const primary =
    ctaLabel && ctaUrl
      ? `<a href="${ctaUrl}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:14px;font-weight:800;font-size:15px">${esc(
          ctaLabel,
        )}</a>`
      : "";
  const secondary =
    secondaryLabel && secondaryUrl
      ? `<a href="${secondaryUrl}" style="display:inline-block;margin-left:10px;color:${ACCENT};text-decoration:none;padding:15px 22px;border:1px solid ${ACCENT_SOFT};background:${ACCENT_SOFT};border-radius:14px;font-weight:700;font-size:15px">${esc(
          secondaryLabel,
        )}</a>`
      : "";
  const cta = primary ? `<p style="margin:26px 0 0">${primary}${secondary}</p>` : "";

  const links = [
    { label: "Open the app", url: APP_URL },
    { label: "Notification settings", url: `${APP_URL}/account` },
    ...(footerLinks ?? []),
  ]
    .map(
      (l) =>
        `<a href="${l.url}" style="color:${ACCENT};text-decoration:none;font-weight:600;margin-right:14px">${esc(l.label)}</a>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;padding:0;background:#eef2fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK}">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2fb">
    <tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #dfe6f7">
        <tr><td style="background:${ACCENT};background-image:linear-gradient(135deg,${ACCENT},#1b4bd6);padding:22px 28px">
          <p style="margin:0;font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#ffffff;font-weight:800">${esc(
            eyebrow,
          )}</p>
        </td></tr>
        <tr><td style="padding:30px 28px 8px">
          <h1 style="margin:0 0 ${subheading ? "8px" : "16px"};font-size:27px;line-height:1.2;font-weight:800;color:${INK}">${esc(heading)}</h1>
          ${
            subheading
              ? `<p style="margin:0 0 18px;font-size:16px;line-height:1.5;color:${MUTED}">${esc(subheading)}</p>`
              : ""
          }
          ${body}
          ${cta}
          ${ctaNote ? `<p style="margin:12px 0 0;font-size:13px;color:${MUTED}">${esc(ctaNote)}</p>` : ""}
          ${
            sender === "mike"
              ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 0;border-top:1px solid ${LINE}">
                  <tr><td style="padding:18px 0 0">
                    <p style="margin:0;font-size:15px;line-height:1.6;color:#3d3d3d">— Mike Salemi</p>
                    <p style="margin:2px 0 0;font-size:13px;color:${MUTED}">Founder, Kettlebell Lifestyle</p>
                  </td></tr>
                </table>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:24px 28px 26px">
          <div style="border-top:1px solid ${LINE};padding-top:16px">
            <p style="margin:0 0 8px;font-size:12px;line-height:1.6">${links}</p>
            <p style="margin:0;font-size:11px;line-height:1.6;color:#9a9a9a">Sent because of your notification settings.</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>

      </table>
    </td></tr>
  </table>
</body></html>`;
}
