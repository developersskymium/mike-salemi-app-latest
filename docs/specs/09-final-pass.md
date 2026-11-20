# 09 — Final pass: Trace on every page, signature per page, QA

Everything is merged on `v2`: original layouts restored (spec 08 §L), Self-Guided, courses, MTK, intakes, plan/emails/reminders, You/rewards/saves/certificates/referrals/shop, data + studio, graphics, and the Trace design system (tokens, primitives, `components/signature/**`, shell). The client wants it finished before he reviews: "richer pages, each page having a signature something — design, functionality, usefulness", "peak, high-end", and the ORIGINAL layouts kept.

## Rules for every final-pass agent
1. Layout = legacy (spec 08 §L). Do not reorder sections or invent new layouts.
2. Visual language = Trace (docs/design/system.md, docs/design/trace/concept/*, docs/design/trace/b-*.png). Use the signature components (`TraceLine`, `SwingRibbon`, `WeekTrace`, `MovementTrace`, `StarTrails`/`SnowContours`/`LivingBackdrop`, `OrbitLoader`, `Flare`, `StretchNumber`, `PhotoGrade`, `LightPill`, `TraceRule`) and the graphics set (`components/graphics`) instead of ad-hoc styling. Glacier light only for the primary action / "now" / done traces. No pink, no grey drop shadows (glow only), matte film surfaces.
3. Each page gets its signature element + useful function from spec 07's table, if missing.
4. Remove leftovers of the old look: hard-coded colours, Liquid-glass blur panels that should be film, Inter references, emoji, inconsistent radii; replace `StreakFlame` usages sized for the old flame (it is now a pill).
5. Fix layout bugs: horizontal overflow (grid children need `min-width: 0`), tab bar/rail overlap, sticky bars covering content, text truncation, empty boxes where a poster/image is missing (use the designed poster fallback / movement figure / day glyph).
6. Every page: loading, empty, error and locked states designed; light + dark; 390×844 and 1440×900.
7. Data honesty: never invent prices, dates, testimonials or stats; unconfirmed facts keep the quiet Draft chip.
8. Verify with screenshots (MOCK_DATA=1, fixtures from real data via the Supabase MCP when a fixture is missing) and look at every one before moving on.
9. Database: additive only, migration numbers 0018+ (F1 0018, F2 0019, F3 0020). Never delete/drop/truncate.

## Ownership
- F1 Training: Today, Programs tab, program page (KBL + courses' Self-Guided board), day player, Self-Guided day/session/home/average-day/plan creator, course player, intakes, MTK. Files: components/{today,training,selfguided,course,intake,mtk,discover/programs*}/**, app/(app)/{today,programs,intake,mtk,onboarding}/**, their loaders/actions.
- F2 Member: Library, Tools, Plan, You (passport, rewards, saves, certificates list, referrals, notifications, settings, billing, organization), Coaching, Experiences/retreats, Org, Shop, checkout. Files: components/{discover (library/tools), plan, you, notifications, commerce, experiences, orgs, shop}/**, app/(app)/{library,tools,plan,you,coaching,experiences,org,shop,checkout}/**, their loaders/actions.
- F3 Public + shell + studio: landing, explore/sales, pricing, signin/signup/reset, verify, join, legal; the shell L0 items (sidebar resume card, Unlocked group, More sheet/tab, mobile header) in components/shell/** and app/(app)/layout.tsx; Studio (app/studio/**, components/studio/**); email templates visual check (lib/email/**) to match Trace; remove preview routes `/gallery` and `/graphics-preview` from PUBLIC_PREFIXES (keep the pages for admins only, or move them under /studio/design).
- Shared primitives (components/ui, components/signature, packages/tokens): F3 may fix bugs there; F1/F2 report needed primitive changes to the lead instead of editing.
