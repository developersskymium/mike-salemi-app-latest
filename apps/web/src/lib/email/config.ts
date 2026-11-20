/**
 * Email configuration (server only). Every outgoing email goes through our own Resend account.
 * Env: RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_EMAIL_MIKE, APP_URL (see docs/specs/ENV.md).
 */

export type EmailSender = "brand" | "mike";

export const BRAND = "Kettlebell Lifestyle";
export const MIKE = "Mike Salemi";

/** Public app URL used in email links. APP_URL wins; Vercel's production domain is the fallback. */
export function appUrl() {
  return (
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://app.mikesalemi.com")
  ).replace(/\/+$/, "");
}

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

/**
 * Visible From address. RESEND_FROM_EMAIL accepts "Name <a@b.com>", a bare address, or just the
 * sending domain. Mike's personal sender reuses that domain unless RESEND_FROM_EMAIL_MIKE is set.
 */
export function fromAddress(sender: EmailSender = "brand") {
  const raw = (process.env.RESEND_FROM_EMAIL || "").trim();
  const brand = raw
    ? raw.includes("@")
      ? raw.includes("<") ? raw : `${BRAND} <${raw}>`
      : `${BRAND} <noreply@${raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}>`
    : `${BRAND} <onboarding@resend.dev>`;
  if (sender === "brand") return brand;
  const mikeRaw = (process.env.RESEND_FROM_EMAIL_MIKE || "").trim();
  if (mikeRaw) return mikeRaw.includes("@") ? (mikeRaw.includes("<") ? mikeRaw : `${MIKE} <${mikeRaw}>`) : `${MIKE} <mike@${mikeRaw}>`;
  const address = brand.match(/<([^>]+)>/)?.[1] ?? brand;
  return `${MIKE} <mike@${address.split("@")[1] ?? "resend.dev"}>`;
}

/** Human status of the email setup, for the Studio Email centre and Settings. */
export function emailStatus() {
  return {
    configured: emailConfigured(),
    from: fromAddress("brand"),
    fromMike: fromAddress("mike"),
    appUrl: appUrl(),
    cronSecret: Boolean(process.env.CRON_SECRET),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    push: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  };
}
