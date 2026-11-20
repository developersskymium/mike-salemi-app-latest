# Spec 05 — Screens (starts after Ahmed picks a design direction)

**Approved direction: "Liquid"** (Apple Liquid Glass inspired) with Ahmed's changes: accent **glacier blue** only for the primary action and "now" states; otherwise near-monochrome glass where colour comes from photography; almost NO drop shadows (depth from blur, 1px specular rim, hairlines, layering); rich signature micro-interactions and custom graphics everywhere (from `apps/web/src/components/graphics/` — movement figures, day-type glyphs, phase landscape ridge, readiness dial, rings, completion moments, streak flame, medals, empty states). Primitives live in `apps/web/src/components/ui/`; see `docs/design/system.md` and the hidden gallery route. Never re-style primitives locally.

**Data and screenshots.** The build sandbox cannot reach Supabase over HTTP, so a local dev server cannot load real data. Use the local preview mode:
- Put every page's data fetching in a loader in `apps/web/src/lib/loaders/<workstream>.ts`, wrapped with `mockable("<fixture-name>", realLoader)` from `@/lib/mock`. Real loaders use `createClient()` + `@ms/api`.
- Create the fixture JSON in `apps/web/fixtures/<fixture-name>.json` from REAL rows: query the v2 database with the Supabase MCP `execute_sql` (project `ttkkuqivosiuqkbxmhbq`), using the test member `member.test@example.com` (Max membership; KBL Level I done through Day 23, next Day 24 Workout II) and shape it to the loader's exact return type. Never invent content.
- Run `MOCK_DATA=1 pnpm --filter web dev`; auth is bypassed and `getUser()` returns the test member. Screenshot with the installed Chrome (`/usr/bin/google-chrome`, puppeteer-core; Playwright's browser download is blocked).
- Server actions that write (complete step, submit readiness, checkout) cannot reach the database locally: make them return a typed error the UI handles gracefully, and test the optimistic UI states locally. The lead verifies real writes on the Vercel deployment.


All screens follow the approved design system: tokens in `packages/tokens`, primitives in `apps/web/src/components/ui`, rules in `docs/design/system.md`, reference artboards in `/home/claude/design/directions/<chosen>/`. Never invent new colours, type sizes, radii or shadows; if a primitive is missing, build it in your own folder following the system and tell the lead.

## Shared rules
- Next.js 16 App Router (read `apps/web/AGENTS.md`, `apps/web/node_modules/next/dist/docs`). Server Components fetch with `createClient()` from `@/lib/supabase/server` and the `@ms/api` functions; Client Components only where interaction needs it. Mutations: Server Actions that call `@ms/api` (never trust client input for prices or access).
- Rules come from `@ms/core` (locks, playlist, readiness, schedules, pricing). Never re-implement them in components.
- Everything important above the fold on a 390×844 phone. Compact, warm, minimal text. Real imagery only (program media, video posters), never placeholders.
- Every screen: loading skeleton, empty state, error state; light + dark; keyboard + focus; `prefers-reduced-motion`; 44px tap targets.
- Before you report done: screenshot every screen you built at 390×844 and 1440×900 in light and dark with Playwright against `pnpm --filter web dev` (sign in with the test member the lead gives you), view them, fix what isn't excellent. Save to `docs/screenshots/<workstream>/`.
- Own only your routes and `apps/web/src/components/<workstream>/`. Shared files (`components/ui`, app shell, `lib/supabase`) belong to the lead — ask instead of editing.

## Route map (who owns what)
| Route | Owner |
| --- | --- |
| `(app)/layout.tsx` shell, 5 tabs: Today · Programs · Library · Plan · You | Lead |
| `(app)/today` | B Today+Plan+You |
| `(app)/programs` (My programs + Explore: Training / Experiences / Free tools) | C Discover |
| `(app)/programs/[slug]` program page (course, day program, challenge, live) | A Training |
| `(app)/programs/[slug]/learn/[lesson]` Immersion day player and course lesson player | A Training |
| `(app)/programs/[slug]/guide/[lesson]` Self-Guided day page (all steps stacked, sticky step chips) | A Training |
| `(app)/you/certificates/[id]`, `verify/[code]` (public) | A Training |
| `(app)/library`, `(app)/library/[video]` | C Discover |
| `(app)/tools/[tool]` | C Discover |
| `(app)/plan`, `(app)/plan/new`, `(app)/plan/[plan]` | B Today+Plan+You |
| `(app)/you`, `/you/rewards`, `/you/saves`, `/you/settings`, `/you/referrals` | B Today+Plan+You |
| `(app)/you/billing`, `(app)/checkout/*`, `components/commerce/OfferSlot` | D Commerce+Experiences+Orgs |
| `(app)/experiences/[run]` (retreat hub: countdown, prerequisites, packing, itinerary, travel, gallery, documents), `(app)/experiences/[run]/apply` | D |
| `(app)/coaching` (packages, credits, booking calendar, past sessions + notes) | D |
| `(app)/you/organization`, `(app)/org/[slug]` (coach view), `join/[token]` (public) | D |
| `/` landing, `/explore`, `/explore/[slug]` sales pages, `/pricing`, `/signin`, `/signup`, `/auth/*` | C Discover |
| `/studio/**` admin studio | E Studio |

## A — Training (the most important workstream)
Program page: hero (program media), Level tabs when the program has level paths (KBL: Level I / Level II, clear distinction), mode choice (Immersion / Self-Guided) with one-line explanations, Immersion pace choice (Free / Scheduled → opens schedule sheet that calls `schedule_immersion`), phase map (sections with day chips coloured by day type, done ticks, lock icons from `curriculum_progress`), progress, resources (phase PDFs), the one primary CTA (Start / Continue Day N / Locked: buy or upgrade via OfferSlot).
Immersion day player (`learn/[lesson]`): the KBL experience, better than legacy (`/home/claude/legacy/src/routes/_authenticated/immersion.day.$dayId.tsx` is the behaviour reference — read it): step rail with lock/complete states; video stage (Vimeo via `@vimeo/player`, privacy hash support, resume position saved with `savePosition`, auto-complete at 95% → `completeStep(…,'watched')`); playlist of clips with 5-second "Up next" overlay (works in fullscreen); autoplay-next switch (stored in profile preferences); readiness sheet (5 questions one at a time, server `submitReadiness`, result card, then the workout table appears in the Workout step: circuits, stations, rest arrows, intensity, reps, sets, tempo, notes, images; CSV export via `@ms/core` workout-export); notes (`body`) and attachments; start-of-day and end-of-day screens shown once per lesson across devices (`markSeenOnce`); end-of-day "what's next" from `@ms/core/next`; celebrations for day / phase / level (once, server markers), certificate on level complete; restart level with a two-column "Resets / Remembered" confirmation → `restartPath`. Keyboard: ←/→ steps, C complete. Locked day route → friendly locked screen with "Go to current day" and "Open in Self-Guided".
Course lesson player (MTK, A4L, Path, …): same player shell; for MTK show "Recommended for you" marks from the member's MTK intake path.
Self-Guided day page: all steps stacked, sticky step chips with scroll-spy, readiness + table available, prev/next day, no locks, optional "Mark done" only when the day is on a plan.

## B — Today, Plan, You
Today: greeting; the ONE next action (from `myEnrollments` + plan items for today + upcoming run/coaching); this week strip (`my_week`); goal progress; invitations and upcoming events; one `OfferSlot placement="today"`; nothing else above the fold. First visit with no goal → goal-setting onboarding (global intake `goal-setting` via `submit_intake`), ending in a plan suggestion.
Plan: week and month views of `my_week`; goals; start from template (`start_plan_from_template`), build my own (drag lessons from any accessible program onto days; create via plan items), AI draft (server route later; button hidden if not configured); missed-day banner with "Fix my plan" (`apply_missed_day_rule`); reminders settings link; ICS export.
You: profile, progress across programs, rewards (`my_rewards`: points, level, streak, medals by tier with detail sheet), certificates list, saves (videos, tool results, readiness history with CSV), settings (notification prefs, autoplay, theme), referrals (code, share, ledger).

## C — Discover
Programs tab: My programs (progress, continue) and Explore with segmented Training / Experiences / Free tools; cards show outcome line, who it's for, format, access state chip (Free · Included · Owned · Locked · Draft), one action. Library: search, filters (program, level, category, movement, equipment, length), saved, collections, video page with "Also in" program links (access-aware via `library_videos`). Tools: 4 tools, each a fluid one-question-per-screen flow with a visual result (Kettlebell Selector shows the bell weights on a drawn kettlebell), saved to You → Saves, `OfferSlot placement="tool_result"`. Public: landing (hero with real photography, programs, retreats, coach story, pricing teaser, sign up), explore + sales pages per program (outline from public sections/lessons, highlights, FAQ, price via `quote`, CTA → sign up / checkout), pricing page (plans grid from `listPlans`), sign in / sign up / magic link / reset (Supabase Auth; referral code captured from `?ref=` and claimed after sign-up).

## D — Commerce UI, Experiences, Organizations
OfferSlot (`components/commerce/OfferSlot.tsx`, server component taking `placement` and `context`; logs view/click/dismiss) — build this FIRST (within 30 minutes) because A, B and C import it. Checkout buttons → `/api/stripe/checkout`, success/cancel pages, billing page (subscription, orders, portal link). Experiences: retreat sales page content lives on the program page (A) but the run hub, apply form and booked state are yours. Coaching booking. Organizations: member view, admin seats/invites, coach view (`org_overview`), join page.

## E — Studio (admin)
`/studio`: guarded by `requireAdmin()`; writes through server actions with the service-role client. Programs (create with a guided flow: name, type, modes, labels, imagery, status, benefits per plan, prices), curriculum tree editor (sections → lessons → steps, drag to reorder, video picker by Vimeo id/URL with preview, notes editor, clips, attachments), readiness forms and tables editor (questions, weights, bands with score ranges preview, table grid editor), Library (videos, tags, missing-key report), Commerce (plans, prices, benefits grid, coupons), Offers (rules editor + performance), Experiences (runs, itinerary, applications pipeline, coaching slots and bookings), Members (search, progress, grant/revoke access, view as member), Organizations, Notices, Site settings. Every write logged to `audit_log`.
