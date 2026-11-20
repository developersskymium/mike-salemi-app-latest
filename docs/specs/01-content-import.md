# Spec 01 — Apply the v2 schema and import all content

Owner: content agent (Sonnet). Lead: reviews and merges.

## Projects
- **v2 (target)**: Supabase project `ttkkuqivosiuqkbxmhbq` ("Mike App v2"). Empty.
- **Old (source, read-only)**: Supabase project `xdhuyzuxutrsexjjtggp` ("MIKE APP"). Never write to it.
- The sandbox shell cannot reach Supabase over HTTP. Use only the Supabase MCP tools (`apply_migration`, `execute_sql`).
- Legacy app source (read-only copy): `/home/claude/legacy/` (TanStack app). KBL content lives in `/home/claude/legacy/src/content/`.

## Step 1 — apply migrations
Apply `supabase/migrations/0001_core.sql` … `0005_policies.sql` in order with `apply_migration` (names `0001_core`, `0002_commerce_orgs`, `0003_member_experiences`, `0004_functions`, `0005_policies`). If one fails: fix the SQL **in the file first**, then apply the fixed file, so the repo always equals the database. Keep fixes minimal and note each in your report.
Then run `get_advisors` (security and performance) on v2 and report findings (do not fix design-level ones; fix only clear mistakes and note them).

## Step 2 — KBL (Kettlebell Lifestyle)
Goal: KBL exactly as the legacy app shows it, as rows in v2, keeping every legacy id as `key`.

1. Produce the final legacy structure by executing the legacy code, not by re-implementing it. Bundle `/home/claude/legacy/src/content/program.ts` with esbuild (`npx esbuild … --bundle --platform=node --format=esm`, alias `@` → `/home/claude/legacy/src`, `.json` loader, treat `*.asset.json` as json) into a temp script that prints `JSON.stringify(courses)` (and `dayOrder` if useful). Save as `packages/content/kbl/courses.json` (committed).
2. Write `packages/content/kbl/build-sql.py` (or `.mjs`) that turns it into SQL for v2:
   - `programs`: one row `slug='kettlebell-lifestyle'`, name "Kettlebell Lifestyle", type `day_program`, status `published`, `section_label='Phase'`, `lesson_label='Day'`, `catalog_group='training'`, tagline/summary/description from the legacy course descriptions, highlights 3 short lines. `program_modes`: immersion (default), self_guided, library.
   - `program_paths`: kind `level`, keys = legacy course ids (e.g. `kbl-level-1`… use whatever the legacy `course.id` is), names "Level I · Beginner" / "Level II · Intermediate", short names "Level I"/"Level II".
   - `sections`: one per phase per level, `key` = legacy phase id prefixed by level if not unique, `path_id` set, `title` = phase title, `description` = phase intro/overview text, `intro_video_id` when the phase has an intro video. Position in order.
   - `lessons`: every day AND every overview/transition page (`page_type` 'overview'/'transition', null for training days), `key` = legacy day id, `title`, `day_number`, `day_type`, `intro` (Let's Begin text), `focus`, `position` in legacy order (overview first, transition last within its phase). `form_id` from `source-readiness.json` `dayForms` (+ any fallback/corrections that legacy `kbl-forms.ts` applies; match the legacy resolver exactly). `starter_table_id` for On Ramp Days 1/3/5: '1' for Level I, '13' for Level II (verify against legacy `starter-workout-tables.json` / `workout-table.ts`).
   - `steps`: every legacy lesson (sublesson) with `key` = legacy lesson id, `title`, `kind`, `description`, `body` = full notes, `duration_label`, `special` = `readiness` for the Training Readiness Assessment, `workout` for the step that shows the table (legacy marks via `special`/`tableOrFormId`; mirror legacy), `completion` for Completion, else `none`. `video_id` → `videos` row. `attachments` for images/downloads in notes if legacy holds them separately. `position` in order. `is_required = true` (legacy counts every step).
   - `step_videos`: associated videos, in order.
   - `videos`: one row per distinct Vimeo id (`provider_id` numeric part, `privacy_hash` = part after `/` when present). Dedupe across the whole import (KBL + courses + library). Mark `needs_key` true if legacy marks it restricted / unknown hash. Title = best known title.
   - `program_videos`: KBL program ↔ every video it uses, `in_library=true`.
   - `resources`: Self-Guided phase plan PDFs from legacy `src/content/plans.ts` / `src/assets/plans` (map to the self-hosted file path under `/media/...` that the web app will serve; copy the PDF files into `apps/web/public/media/plans/` and use `/media/plans/<file>`). Attach to path + section.
3. Readiness + tables from `source-readiness.json`, `source-workout-tables.json`, `starter-workout-tables.json`, `average-day.ts` (shared question wording/options) and the legacy resolver `kbl-forms.ts`:
   - `workout_tables` (id = source table id, rows/notes/images as stored; image paths → `/kbl/source/...` copy those files into `apps/web/public/kbl/source/` and icons into `apps/web/public/kbl/icons/` if referenced).
   - `forms`, `form_questions` (options = `[{value,label,weight}]` using the resolved wording/labels the legacy UI shows), `form_bands`: convert each Gravity-Forms rule to an inclusive `[min_score, max_score]` range over 0..max_score (enumerate all integer scores 0..60 through the legacy `matchesRule` semantics and collapse to ranges; a rule that maps to non-contiguous scores becomes several band rows with the same name). `band` colour + `outcome` as legacy (`green` full/default, `amber` chart 2/3, `red` recovery/rest; outcome `workout`/`recovery`/`rest`). Apply the approved corrections already in the legacy data (tired=yes 15; forms 25/26/27 default tables 29/33/39). Scores matching no band fall back to `forms.default_table_id` (the SQL function does this) — verify that equals legacy behaviour (legacy: 1–22 → full table).
   - **Verification (required):** write `packages/content/kbl/verify-readiness.mjs` that, for every form and every one of the 108 answer combinations, compares legacy resolver output (bundle legacy `kbl-forms.ts` + `readiness` resolver with esbuild) against the band chosen by your v2 rows using the same min/max logic the SQL uses. Must be 0 mismatches. Then spot-check 5 combinations live by calling the SQL logic: `select … from form_bands where form_id=… and <score> between min_score and max_score`.
4. Tools: insert `tools` rows for `kettlebell-selector` (config = legacy `src/content/kettlebell-selector.ts` scenarios + questions, exactly), `stretch-test` (legacy tools.ts definition, `config.beta=true`), `readiness-check` (config `{ "form_id": "2" }`), `kettlebell-roadmap` (config: the 4 Roadmap phases from the course below; can be filled later). Archive the other legacy tools (do not insert).
5. Badges: insert legacy badges from `src/content/badges.ts` into `badges` (map rules into `{kind,...}` JSON; keep names/descriptions).

## Step 3 — the 10 imported courses (from the old project)
Read from old project tables `programs`, `program_sections`, `program_lessons`, `program_sublessons`, `sublesson_videos` (and `program_intake_definitions` if any rows). Page with `execute_sql` (e.g. 150 rows per query); large outputs are saved to files automatically — read those files with a shell and process locally. Map:
- `programs` → v2 `programs` (keep the **same uuid**), `type`: 'course' except Athleticism 4 Life → 'day_program'? **No — keep 'course' for all 10 now**; set `section_label` sensibly ('Week' for Path, 'Section' default, 'Lift' not needed). `status`: Essential Kettlebell → `draft`; The Training Room → `archived`; others `published`. `is_free=true` for: free-6-video-kettlebell-mini-series, what-your-kettlebell-swing-is-missing, kettlebell-roadmap. Men of Movement → name "Men of Movement: Preparation", `is_listed=false` (reached via retreat inclusion). Kettlebell Roadmap → `type='tool'`, `catalog_group='free'`. The Path to Inspired Action → `catalog_group='training'`, `draft_note='Predecessor to The Grounded King'`.
- `program_sections` → `sections` (same uuid; `subtitle` = old subtitle (group); position = sequence).
- `program_lessons` → `lessons` (same uuid — MTK plan features rely on stable lesson ids). `day_type`/`day_number` copied.
- `program_sublessons` → `steps` (same uuid; `body` = content HTML as-is; `video_id` → videos; `kind` copied). Extract `<audio>`/download links into `attachments` as well (keep body intact).
- `sublesson_videos` → `step_videos` + `videos`.
- `program_videos` for each course.
- The Training Room's "Q & A / 2025 Archives" section: also copy (new uuids) into Athleticism 4 Life as a last section "Q & A Archives".
- Program imagery: `hero_image_url`/`thumbnail_url` → `program_media` (role hero/card). Copy the referenced files from `/home/claude/legacy/public/media/` into `apps/web/public/media/` (same relative paths) if they exist there.

## Step 4 — Library seed
Insert the 100 legacy library videos (`/home/claude/legacy/src/content/library.ts` + `src/lib/kbl-library.ts`) into `videos` (dedupe by Vimeo id; keep title, featured image as `thumbnail_url` copied into `apps/web/public/media/library/`). Tag them with `tags` rows: namespaces `level` (beginner/intermediate), `category`, `topic` from the legacy level → category → tag fields. Link to KBL via `program_videos`.

## Step 5 — seed settings and commerce placeholders (all marked Draft)
- `plans`: free (rank 0), pro (rank 1), max (rank 2) with `draft_note='Names and prices awaiting Mike'`.
- `prices`: pro $29/month, $290/year; max $59/month, $590/year (draft); per-program one-time prices: MTK $297, A4L $249, Path $197 (draft notes). Others none.
- `plan_program_benefits`: free → included for the 3 free programs; pro → KBL included, Working-In included, MTK discount 20, A4L discount 20; max → everything included except Path (discount 25). Coaching none.
- `site_settings`: key `brand` = `{"name":"Mike Salemi","app_name":"Mike Salemi App"}`.
- `program_inclusions`: Men of Movement retreat program (create it: slug `men-of-movement-retreats`, type `retreat`, status `published`, draft_note) includes Men of Movement: Preparation.

## Output and report
- Commit nothing to git yourself; leave files in the working tree (`packages/content/**`, `apps/web/public/**`, edited migrations). The lead commits.
- Report: counts per table in v2 vs source (KBL: 2 paths, 8 sections, 122 training days + 12 pages = 134 lessons, 740 steps; courses: 665 lessons/steps, 912 clips), readiness verification result, files copied, any data you could not map, advisor findings, any SQL you had to fix.
