# Environment variables (apps/web)

Set in Vercel (Production + Preview) and in `apps/web/.env.local` for local work. Never commit values.

| Variable | Where | Required | What it is for |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | yes | v2 Supabase project URL (`ttkkuqivosiuqkbxmhbq`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | yes | Supabase publishable (anon) key. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | yes | Service client for webhooks, Studio and internal routes. |
| `NEXT_PUBLIC_SITE_URL` | client + server | yes | Canonical site origin (auth redirects, emails, Stripe return URLs). |
| `STRIPE_SECRET_KEY` | server only | for checkout | Stripe API key. |
| `STRIPE_WEBHOOK_SECRET` | server only | for checkout | Verifies `/api/stripe/webhook`. |
| `VIMEO_ACCESS_TOKEN` | server only | optional | Vimeo API personal access token (see below). |
| `MOCK_DATA` | local only | no | `1` serves the JSON fixtures in `apps/web/fixtures` instead of Supabase (sandbox preview). |

## `VIMEO_ACCESS_TOKEN`

Used only by `GET /api/internal/vimeo-backfill` to fill `videos.thumbnail_url`, `videos.duration_seconds` and `meta.aspect` for the videos the public oEmbed endpoint cannot serve:

- **domain-restricted embeds** (`videos.meta.no_thumb = true`, 450 on Nov 20): oEmbed answers without a poster or duration unless the request comes from an allowed domain. We do not fake the Referer; the API is the supported way.
- **unlisted videos without a privacy hash** (`videos.meta.oembed_error`, 27 after the Thruster fix in 0015): oEmbed returns 404. With the owner's token the API reads them by id.

How to create it (Mike's Vimeo account, the one that owns the videos): vimeo.com → Settings → Developer apps (developer.vimeo.com/apps) → create an app → Authentication → *Generate an access token*, **Authenticated (you)**, scopes **Public** and **Private** (read only; no Edit/Upload/Delete). Copy it into Vercel as `VIMEO_ACCESS_TOKEN` (server only, not `NEXT_PUBLIC_`).

Run it (after deploy): set a one-time secret's SHA-256 hex in `site_settings.vimeo_backfill_token_sha256` (via SQL), then call

```
GET /api/internal/vimeo-backfill?token=<secret>&limit=150
```

repeatedly until `remaining` is 0 (the API allows about 1,000 calls per 15 minutes; the route stops early on HTTP 429 and reports `rateLimited: true`). Each call ends with `refresh_estimated_minutes()` so step `duration_label` ("N min") and `lessons.estimated_minutes` follow the new durations. Videos the API also refuses get `meta.api_error` and are listed in Studio › Library. `&source=oembed` forces the public pass instead (only useful for videos added later without a token). Afterwards set the secret back to `"revoked"`.

Without the variable the route behaves as before (public oEmbed for videos never tried).


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
