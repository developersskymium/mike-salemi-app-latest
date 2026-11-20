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
