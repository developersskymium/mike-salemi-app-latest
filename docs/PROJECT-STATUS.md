# Mike Salemi App: project status

_Last updated: 20 Nov 2026_

**Live app:** https://mike-salemi-app.vercel.app
**Repo:** `developersskymium/mike-salemi-app-latest` (branch `main`; every push redeploys)
**Database:** Supabase project **MIKE APP** (`xdhuyzuxutrsexjjtggp`, US West)
**Hosting:** Vercel project `mike-salemi-app` (team `dev-3c95`)

## What has been done

1. **Merged the two apps into one.** The base is the All Programs app (`kettlebell-flow-hub`). The latest Kettlebell Lifestyle (KBL) work from the KBL-only app (`live-mike-app-kbl-only`, Oct 30 to Nov 9) was brought in on top: course parity, lesson structure fixes, progress validation, the day player fix and cache purging. The KBL-only restrictions that hid every other program were **not** carried over.
2. **Renamed the app** to "Mike Salemi App".
3. **New Supabase:** all 42 tables, 84 row-level security policies, the sign-up trigger and the default site settings.
4. **Imported 10 courses from the JSON exports:**
   - Mastering the Kettlebell, The Training Room, Athleticism 4 Life, The Path to Inspired Action, Working-In, Men of Movement, Kettlebell Roadmap, What Your Kettlebell Swing Is Missing and Free 6 Video Mini Series are published.
   - Essential Kettlebell Training: Strength is a draft.
   - The original MTK lesson IDs were kept, so the personalized MTK plan feature works.
5. **Every image and PDF is self-hosted** in `public/media/`: 488 files, 165 MB. They were downloaded by the `Download media into the repo` GitHub Action. Old `/__l5e/` links redirect to the local copies, so nothing depends on Lovable any more.
6. **Deployed on Vercel.** The production URL is public; preview builds require a Vercel login.
7. **Admin test account** `hamza@aiecosystem.io` has the admin role.

## Verification (20 Nov)

| Check | Result |
|---|---|
| Course structure (sections, groups, lessons, order) vs JSON | **All 10 courses match exactly** (fingerprint of every section and lesson title in order) |
| Images placed in lessons vs JSON | **All match** (MTK 42, Training Room 19, A4L 19, Path 17, Roadmap 5, Swing 3, Working-In 1, Mini Series 1, Essential 4) |
| Media on GitHub | **488 / 488** files in `public/media`, all real images and PDFs, all served live |
| Pages loaded while signed in | Home, Profile, Admin, Content Admin, Coaching, Emails, Hub, Library, Programs and program pages, all courses, Self-Guided, KBL days, Tools, Saves, Schedule: **no errors, no broken images** |
| Member actions | KBL intake, Immersion step completion, course progress, tool result and badge, saving a video, Saves page: **all work and are saved in the database** |
| Vercel runtime errors | None |
| Vimeo videos in imported courses | **641 / 669 play.** 28 need private keys (see below) |

## Known issues

1. **28 videos won't play** ("Video access is being updated") because the exports didn't include their Vimeo private keys:
   - The Path to Inspired Action: 22 videos (weekly call recordings, Eagle Breath, Chi Generator, Values I–IV, DRC I–II, GAILS, Designing Your Lifestyle, guest call)
   - Men of Movement: 5 videos (welcome, Piston Breathing, Breathe Light 1, Abdominal Prep, Wall Squat)
   - Training Room / A4L: 1 video ("Thruster" in Completion Workout 7, Vimeo 97940376)
   - **Fix:** in Vimeo, open each video's share link and copy the code after the ID (`vimeo.com/123456/abcdef1234`). Then enter it in Admin → Content, or send the list for a bulk update.
2. **Essential Kettlebell (draft):** 3 lessons have no video in the export (Intro, Lesson 3, Lesson 10), and its videos are hosted on GoHighLevel's servers, not Vimeo.
3. **Download links** in some lessons (PDFs, audio) still point to `programs.mikesalemi.io` (Kartra), which may require logging in there.
4. **Console noise:** `sw.js` (offline cache) returns 404, and there's a React warning about server-rendered HTML not matching the browser (#418). No visible effect.

## Suggestions

**Before real members join**
- **Change the test admin password** (it currently equals the email) or remove that account's admin role.
- **Make the GitHub repo private.** It contains all course content and private Vimeo keys. Vercel keeps deploying.
- **Delete the leftover `seed-tmp` branch** on GitHub (it's empty).
- **Decide on access/pricing.** Every course is currently "Included for all members". Paid programs (MTK, Training Room, A4L, Path) can be set per course in Admin → Pricing & access.
- **Sign-up is invite-only** (no "Create account" on the sign-in page). Members are created in Supabase → Authentication → Users → Invite. If self sign-up is wanted, it can be re-enabled. The empty second tab on the sign-in card should be removed either way.
- **Email setup:** add `RESEND_API_KEY` (and optionally `SUPABASE_SERVICE_ROLE_KEY`) in Vercel so app emails and "Forgot password" work. Also set up a custom sender (SMTP) in Supabase, because its built-in mailer is rate-limited to a few emails per hour.
- **Turn on leaked-password protection** in Supabase → Authentication (Supabase security advisor warning).

**Speed**
- **Move Vercel functions to San Francisco (`sfo1`).** They run in Washington DC today while the database is in Northern California, so each server call takes about 430 ms. Moving them would cut this to roughly 50–100 ms, making every page noticeably faster. It's a one-setting change plus a redeploy.
- **Database tuning** (Supabase performance advisor): add the 9 missing foreign-key indexes, and wrap `auth.uid()` in `(select auth.uid())` in the security policies. Both are safe and help as member numbers grow.

**Polish**
- Fix the service worker build so `sw.js` exists (faster repeat visits) or remove the registration.
- Add a custom domain (e.g. `app.mikesalemi.com`) in Vercel.
- Fill in the missing Vimeo keys and Essential Kettlebell videos, then publish Essential Kettlebell.
- Replace the old Kartra download links with files hosted in the repo (same approach as the images).

## How to re-import courses

1. Put the JSON exports in `course-exports/` (ignored by git).
2. Run `python3 scripts/build-course-seed.py` to produce `course-seed.sql` (also ignored by git).
3. Run the SQL in the Supabase SQL editor. It replaces those courses by slug and keeps MTK lesson IDs stable.
4. New image URLs must be added to `scripts/media-manifest.json`; pushing that file runs the download workflow.
