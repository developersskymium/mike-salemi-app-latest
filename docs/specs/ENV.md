# Environment variables (web app, Vercel)

Set in Vercel → Project → Settings → Environment Variables (Production + Preview). Never commit values.

## Already used
| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase v2 project (`ttkkuqivosiuqkbxmhbq`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Studio, Stripe webhook, **email outbox drain, reminder cron, branded password reset, welcome delivery**. |
| `STRIPE_*` | Commerce (spec 03). |

## Email, reminders and push (W3)
| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | for sending | Resend API key. **Not set yet**: every email is still queued and rendered; the final send records `not_configured` in `email_outbox` and the Studio Email centre shows "Not configured". Welcome, reward, certificate, tool result and schedule emails from the last 3 days go out automatically once it is set. |
| `RESEND_FROM_EMAIL` | yes with Resend | Brand sender. `Kettlebell Lifestyle <noreply@yourdomain.com>`, a bare address, or just the verified sending domain (`yourdomain.com` → `noreply@yourdomain.com`). |
| `RESEND_FROM_EMAIL_MIKE` | optional | Mike's personal sender for welcome, rewards and certificates. Defaults to `Mike Salemi <mike@<sending domain>>`. |
| `APP_URL` | yes | Public URL used in email links, e.g. `https://app.mikesalemi.com`. Falls back to `VERCEL_PROJECT_PRODUCTION_URL`. |
| `CRON_SECRET` | yes | Protects `/api/cron/*` (`Authorization: Bearer <CRON_SECRET>`; Vercel Cron sends it automatically). Without it the cron routes answer 503. Also sent to `/api/certificates/[id]/pdf` so the certificate email can attach the PDF (W4's route should accept it). |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | for web push | P-256 VAPID key pair, base64url (public = 65-byte uncompressed point, private = 32-byte scalar). Generate once: `npx web-push generate-vapid-keys`. **Not set yet**: members can still allow notifications; push attempts are logged as failed "Push isn't set up yet" and in-app reminders still work. |
| `VAPID_SUBJECT` | optional | `mailto:` contact for push services. Defaults to `mailto:support@mikesalemi.com`. |

Supabase Auth: keep the built-in email templates as the fallback (the app uses its own branded reset email once Resend is configured). Add `${APP_URL}/auth/confirm` to the Auth redirect allow-list.

## Vercel Cron (`apps/web/vercel.json`)
```json
{
  "crons": [
    { "path": "/api/cron/email", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/reminders", "schedule": "0 * * * *" }
  ]
}
```
Hobby plans only allow daily crons; the reminders cron must run hourly (Pro plan).

## Manual run / test
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/reminders   # decide + queue + drain
curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/email       # drain the outbox only
```
Both return JSON counts (`candidates`, `events`, `push`, `email: { sent, notConfigured, skipped, failed }`).
