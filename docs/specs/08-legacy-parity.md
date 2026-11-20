# 08 — Legacy parity audit (original app vs v2)

Audit date: 2026-11-20 (DB snapshots taken 07:00–07:32 UTC, while the Vimeo backfill was running).
Original app (read-only): `/home/claude/legacy` (TanStack Start + Supabase). Paths below that start with `src/` are legacy paths; `apps/web/…`, `packages/…`, `supabase/…` are v2 paths.
In-progress branches checked: `ui/day` (`/home/claude/wt/day`, uncommitted: KBL day view, readiness, circuit tables, gates, celebrations), `ui/selfguided` (no changes yet, branch = v2 HEAD `fc1a621`), `ui/graphics` (figure/medal style study only).

Client brief (Nov 20): *"look at how self guided previously worked as well. I spent a lot of time on everything. Also library. Also rewards / emails etc. The dashboard page (home) was very rich, with current programs, progress, start new, offers etc. But we could do even better. All programs must have proper layout and data, with thumbnails coming from Vimeo."*

Status legend: **DONE** (v2 location) · **PARTIAL** (what is missing) · **MISSING** · **UI/DAY** (being restored on `ui/day`) · **UI/SG** (belongs to `ui/selfguided`).

Off-limits for the workstreams at the end of this spec (owned by `ui/day` / `ui/selfguided`): everything under `apps/web/src/components/training/**`, `apps/web/src/app/(app)/programs/[slug]/**` (existing files), `apps/web/src/lib/loaders/training.ts`, `apps/web/src/lib/actions/training.ts`, `apps/web/fixtures/training-*`, and the `training_sessions` migration.

---

## 0. Top gaps at a glance

1. **Home/Today is thin vs legacy Home**: no "Your programs" carousel (every enrolled program with %, "Up next", Resume), no "Programs you can join" (one-tap Join → open first lesson), no "Explore next" (locked, Unlock · $price), no "Retreats & gatherings" rail, no admin-featured hero for new members, no program offer/badge lines.
2. **No email at all in v2**: legacy had 11 branded Resend templates (welcome, password reset, tool result, reward, certificate + PDF, schedule created, training reminder, streak nudge, weekly summary, new content, test) with triggers and an Email centre preview page. v2 stores `notification_prefs` but nothing sends.
3. **No reminder delivery or history** (legacy: in-app/system notifications loop, snooze/skip today, reminder history page with sent/opened/failed stats).
4. **Course player is a day player**: MTK/A4L/Path/Working-In lessons render in `DayPlayer`; legacy course viewer had grouped curriculum sidebar with search, "Start here" intro (not counted), overview panel, audio cards, downloads, extra technique videos, focus mode, mobile drawer, prev/next lesson, "Complete & continue".
5. **MTK personalisation has engine but no UI**: assessment → results (level, strengths, gaps, N of M lessons) → schedule (weeks/days/minutes) → My Plan / Full Curriculum toggle, "Recommended for you" dots, plan-mode banner.
6. **Program intakes not surfaced**: `kbl-intake` and `mtk-intake` exist in DB, no member route; legacy had per-program intake, review, "Start fresh" attempts, tailored headline/priorities/caution.
7. **Self-Guided legacy surfaces** (level picker with phase chips, phase tabs + search, phase PDF downloads, "About this level" disclosures, Average Day page, AI plan creator, stacked day with completion step) → UI/SG.
8. **Library**: no level→category→tag cascade, sort, saved views, "In the program" filter, results count, Program-lessons index, inline player; no Continue watching.
9. **Saves**: no saved workout session plans ("Plans"), no tool-result detail with answers/copy, no date-range or per-tool filters, no month grouping.
10. **Program data**: 6 programs have no tagline/summary/description/highlights; 4 concept/coaching programs have no image; KBL has no `hero` role; every lesson has `estimated_minutes = null`; course "Home" sections are counted as curriculum; Vimeo durations/thumbnails were 0/748 and 99/748 before the backfill; after its first pass 270/748 have both, 28 return oEmbed 404 (unlisted, hash missing) and 450 answer without poster/duration (domain-restricted → needs Referer retry or Vimeo API).
11. **Rewards**: no badge-unlocked toast/celebration host, no XP-style progress-by-level panel, no "Past runs" history list, no certificate email/PDF attachment.
12. **Announcement bar & site copy**: `notices` table and Studio page exist, nothing renders them to members; legacy admin-edited Home/Programs copy (`site_settings` `home`, `programs_page`) not ported.
13. **Shop**: missing entirely (printable phase plans, Bulgarian Bag variants, coaching intensive, retreat deposit, order history).
14. **Referrals**: no reward tiers (500 pts → printable plan bundle, 1000 → MTK Ballistic tier), no share channels (WhatsApp/Email/X), no funnel stats (visits/signups/purchases).
15. **Studio parity**: no email centre, no readiness ("KBL form entries") browser, application status actions read-only, no Home/Programs copy editor, coaching slots empty (0 rows) so booking shows "No open times".

---

## L. Layout blueprints — every legacy page (rebuild rule)

Client (Nov 20, via lead): *"For the most part I was okay with the layouts in the previous version; just the design, form, function and technology needed to be peak and high end. The new layout breaks the rules of how the content works."* → **Every v2 member page keeps the ORIGINAL page layout** (section order, column structure, grouping of content, what lives in headers/rails/sticky bars) and changes only the visual language (Liquid tokens, glass, graphics, motion) and the technology. v2-only additions (rings, week strip, OfferSlot, medals, etc.) are allowed only where they slot into the legacy structure without reordering it. Each block below gives: **Order** (top → bottom), **Desktop / Phone** columns, **Chrome** (headers, rails, sticky bars), **Cards** (type → what it shows), **Grouping / tabs / filters**, then **v2 deviation**.

Shared legacy primitives (`src/components/page-kit.tsx`, `media.tsx`, `course.tsx`):
- `PageHead` = eyebrow (small caps, primary) + page title + lede paragraph, left-aligned in the content container; optional actions row under it.
- `ContextBar` = sticky glass bar at top of a detail page: 3 columns `[back button + label] [title + meta line (+ thin progress)] [one action]`; optional second row (chip navigation).
- `SectionHeading` = eyebrow + section title (+ description), followed by content; `Section` = vertical spacing block (`tight` variant).
- `ChipNav` = horizontal scrolling chip row inside the ContextBar, scroll-spy driven.
- `DayRow` = one row per day: left tile (day number badge, ✓ when complete, lock when locked) · title + "Current" pill · sub-line "<day type> · <focus>" · right side `done/total` (Immersion) or "N lessons" (Self-Guided); whole row links.
- `Poster` = Vimeo poster (oEmbed) with ratio (video 16:9, portrait 4:5), state (default/active/locked), fallback gradient.
- Container max width ≈ 78rem; content measure ≈ 46–50ch for text.

### L0. App shell
- **Desktop (≥ md)**: fixed **left rail 16rem**: Wordmark → **Training resume card** (current level/phase/day + progress ring; links to Immersion) → primary nav (Home, Programs, Retreats, Library, Schedule, Account) → **Unlocked** group (owned courses e.g. Mastering the Kettlebell "Technique course", booked retreat hubs with dates, owned programs) → additional nav (Tools, Coaching, Referrals) → user menu pinned at bottom. Content column: **announcement bar** (full width, top) → **status bar** (centered context line + one CTA) → page.
- **Phone**: top **site header** (wordmark/greeting + avatar/menu) → announcement bar → page → **bottom tab bar** with 3 tabs (Home, Programs, Profile) + **More** that opens a bottom sheet: Unlocked items first, then groups **Train** (Library, Tools, Program hub, Schedule), **Explore** (Programs, Coaching, Referrals), **Account** (Profile & settings, Structure for admins).
- **Immersive pages** (day player, course player, onboarding, tool flows, certificate) hide rail/tab bar and use their own top bar.
- Global overlays: celebration modal, cheer toast, toasts top-center.
- **v2 deviation**: 5-tab model (Today · Programs · Library · Plan · You) with a slim sidebar and no Training-resume card, no Unlocked group, no Retreats/Coaching/Tools/Referrals entries, no announcement bar, no status bar. Restore: sidebar = brand → resume card → primary nav → Unlocked → More destinations → user; phone tab bar may stay at 5 if the More sheet (grouped as legacy) is added and Retreats/Tools/Coaching/Referrals are reachable from it.

### L1. Home (`/home`)
- **Order**: (1) Hero banner, full width · (2) error banner (only on failure) · (3) **Your programs** rail · (4) **Upcoming activity** 3-up grid · (5) **Programs you can join** rail · (6) **Retreats & gatherings** rail · (7) **Explore next** rail (locked).
- **Desktop**: single content column; hero is a wide rounded image banner with a left-to-right gradient, copy block max ~36rem on the left; rails scroll horizontally with arrow buttons; Upcoming activity 3 columns.
- **Phone**: same order; hero full width; rails swipe with snap; Upcoming activity stacks to 1 column.
- **Chrome**: each rail has a header row: title left, "See all →" right (→ /programs or /retreats).
- **Cards**: Hero (continue) = eyebrow "Continue training", program name (large), progress meter (bar + %), progress label, "Up next · <day/lesson>", primary Start/Resume/Review. Hero (join) = eyebrow (admin), name, summary, size label, **Join program** + "Preview →". Enrolled card (17rem wide) = 16:9 artwork (+ "Completed" badge), name, meter + %, progress label, "Up next · …", verb link. Join card (15rem) = 16:10 artwork, name, "<size> · Included/Locked", button **Join program** or **Unlock · $N**. Retreat card (17rem) = 16:10 photo, name, "dates · location". Activity tile = eyebrow (kind), title, date line.
- **Grouping**: enrolled sorted by most recent activity; joinable = included/owned and not enrolled; locked = needs purchase.
- **v2 deviation** (`/today`): page is a "Today" dashboard (large title over hero photo, NowCard + side column Progress rings / This week, then Goal / Coming up / invitation / OfferSlot). Missing hero modes, all four rails, "See all" headers, Upcoming 3-up. Rebuild Home in the legacy order and keep v2 extras **inside** it: put Progress rings + This week + Goal as a compact row between (2) and (3), "Coming up" merges into (4), OfferSlot sits after (5).

### L2. Programs catalog (`/programs`)
- **Order**: PageHead (eyebrow "Beyond the program", title, intro) → search field (max ~36rem) → **Flagship** group ("Flagship program" / "Kettlebell Lifestyle") with one wide hero card → vertical groups in order **Kettlebell Mastery**, **Athletic Performance**, **Mind-Body, Longevity & Retreats** (each: eyebrow, title, one-line note, then card grid) → closing note paragraph.
- **Desktop**: card grid 3 columns (lg), 2 (sm); flagship card full width with copy left over gradient.
- **Phone**: 1 column; same groups.
- **Cards**: Flagship = full-bleed image, badge "Mike Salemi · Flagship", title, copy, chips (2 levels · 4 phases · Immersion or Self-Guided), "Enter program →". Program card (`DatabaseProgramCard`) = image (16:10) with optional admin badge, instructor line, name, summary (2 lines), offer line, highlights (ticks), "N sections · M lessons", access label (Included/Owned/Locked), CTA (admin label or "View program", lock icon when locked).
- **Grouping**: accessible first then locked inside each vertical; search filters all groups; empty groups hidden.
- **v2 deviation**: "My programs" block on top + segmented Explore tabs (Training / Experiences / Free) with tall photo cards; no search, no flagship card, no verticals. Rebuild with the legacy order; "My programs" belongs on Home (L1 rail), not here (keep at most a slim "Continue" strip above the search if desired). Free tools stay in Tools (L9) with a "Free resources" link.

### L3. Program detail for concept/experience programs (`/programs/$slug`, external programs)
- **Order**: ContextBar (back "All programs", name, kind, action Open/route) → hero image card (≈52vh, max 28rem, bottom gradient) with kind eyebrow, name, tagline, CTA pill + price pill → facts grid **Format / Commitment / Investment** (3 tiles; 2 cols phone) → description (measure) → highlight pills → content sections (heading, body, tick points in 2-col grid) → FAQ "Before you commit — Questions people ask" (accordion) → "Keep looking — Other programs" (3 compact cards) → checkout sheet.
- **Phone**: same order, single column.
- **v2 deviation**: `/programs/[slug]` uses the training ProgramView for every type and `/explore/[slug]` for sales; ensure coaching/live/challenge/concept programs render this sales layout (facts grid, sections, FAQ, other programs) instead of a curriculum page.

### L4. Kettlebell Lifestyle — Immersion home (`/immersion`)
- **Order**: Intake prompt card (if intake not done) → **course hero** (dark, image at 60% opacity, gradient left; copy max 2xl: eyebrow, "Kettlebell Lifestyle", tagline, meta caps row "4 phases · 61 days · Level I · 12 day streak", primary Resume/Start pill, "N/M days complete · %" bar) → **sticky level switch** (pill segmented Level I / Level II, sticks at top while scrolling) → two-column body.
- **Desktop body** (12-col): **left 8 cols "Curriculum"**: one collapsible panel per phase (current phase open): summary row = number/✓ tile · phase label + "You're here" pill + blurb · "d/t days" · chevron; expanded = ordered list of day rows (✓/○, "Day 8", title, "Workout I Day · 45 min · 6 steps", right "Up next"/"Resume" pill or "k/n"). **Right 4 cols sidebar**: (a) On-the-plan-today card (dark tile: "On the plan today"/"Next on your plan", weekday, day label · level · phase) or AI created-session card; (b) Pace toggle card (Free schedule / Create schedule; weekday pills + Sync to my calendar + View schedule →); (c) "Phase guides" list of PDF links (title + duration); (d) quick links panel (Self-Guided mode, Program hub, Video library, Tools — icon, label, sub-copy, arrow).
- **Phone**: hero → level switch → sidebar cards appear **after** the curriculum (single column, curriculum first).
- **Grouping**: Level → Phase → Day (→ steps inside the day page).
- **v2 deviation**: ProgramView = top bar + level tabs + glass "progress ridge" hero + **all phases as a grid of cards with day chips** + right aside (mode, pace, about, resources). Restore: phases as stacked collapsible panels with **day rows** (not chips), current phase open, sidebar order (plan card → pace → phase guides → quick links), streak in hero meta. The ridge graphic can live inside the hero.

### L5. Kettlebell Lifestyle — Level page (`/immersion/$level`)
- **Order**: ContextBar (back to Immersion, course title, meta "Level I · 42% complete", thin progress, action Resume/Start) → level tabs ("Level 1 · Beginner" / "Level 2 · Intermediate") → MilestoneCallout (when a phase/level just finished) → Restart level button (when complete) → Past runs list → **hero split**: text left (eyebrow "Level I · 4 phases · 61 training days", title, tagline, Resume Day N + "Watch intro" toggle, "k of n lessons complete" + %) and image right (16:10) — on phone the image comes first → intro video (expands under hero) → rule → **phase tabs** (pills "On Ramp 100%", "Phase 1 64%", horizontally scrolling) → selected phase block: eyebrow weeks, phase name, blurb, counts line ("N training days · M overview and preparation pages · L lessons"), then bordered list of **DayRows** (locked days show lock) → rule → "About this level": 4 disclosures (outcomes open by default, delivery, what you need, contributors) + description → rule → promo "When you're ready for more" (program cards).
- **Desktop**: hero 2 columns (1.15fr / 1fr); rest single column (measure-wide).
- **v2 deviation**: merged into ProgramView (see L4); no one-phase-at-a-time tabs, no DayRow list, no intro video, no Past runs, no promo. The rebuilt program page should be L4 (hub) with the L5 phase-tab view as the curriculum mode, or keep both routes.

### L6. KBL day player (`/immersion/day/$id`) — owned by `ui/day`
- Full-screen (100dvh), no shell. **Top bar** (h 56): Exit (X) · centre "Level I · Phase 1 · Day 8" eyebrow + day title · right: step dots (one per step; done green wide, active primary wide, others short; locked dimmed; desktop only), Autoplay toggle, **Session plan** button (workout days), "k/n", mini ring %.
- **Desktop body**: 2 columns `[stage 1fr | rail 21.5rem]`. Stage column scrolls: 16:9 black video stage (resume pill, Up-next overlays) → readiness strip (only on the readiness step: sentence + Start/Review assessment) → step meta bar ("Step 3 of 7 · 6 min", title, one-line description; right: ‹ prev, **Mark complete / Completed / Start assessment**, next ›) → lesson details (notes, images, links, then "In this lesson · N clips" horizontal poster strip with "Back to lesson" / "Plays through automatically") → completion block (completion step) → "Today's workout table" block (workout step). Rail: header "Today's sequence — Complete each step to unlock the next." → numbered step list (number/✓/lock circle, title, clock + duration; per-row complete toggle) → day footer (Day complete / Next day locked, Start Day 9, Back to Day 7).
- **Phone**: stage → readiness strip → step meta (no buttons) → details → blocks → step list → day footer → **fixed thumb bar** (Mark complete + dashed next-day button).
- Overlays: start-of-day gate, end-of-day gate, readiness dialog, session-plan sheet, cheer toast, confetti, level celebration.
- **v2 deviation** (current v2 `DayPlayer`): being restored on `ui/day`; check against this block.

### L7. Self-Guided home (`/self-guided`) — `ui/selfguided`
- **Order**: hero text block (measure; eyebrow, "Train it your way.", lede, 3 buttons: Build a schedule [primary], Browse the library, Create my plan) → "Choose a level" (2-col grid on lg: level cards) → "Every program — Browse your full library" (heading left, search right; compact program cards 3-col xl / 2 sm) → "How self-guided works" (3 tiles) → promo.
- **Level card**: 16:9 image with scrim and level eyebrow + title on the image; body: tagline, stats row (phases, days, lessons with icons), 4-up phase chips (label + weeks), full-width outline button "Open Level I →".
- **v2 deviation**: no Self-Guided home; Self-Guided is a mode switch on the program page. Rebuild this page (or a Self-Guided view of the program page with the same order).

### L8. Self-Guided level (`/self-guided/$level`) — `ui/selfguided`
- **Order**: ContextBar (back, title, meta "4 phases · 61 training days · overviews and preparation included", action = L1/L2 segmented) → hero split (text + "Schedule this level" / image) → **sticky glass sub-bar** under the ContextBar: phase pills with day counts (scroll) + search field (18rem on desktop, full width on phone) → phase block (weeks eyebrow, phase name, blurb, bordered DayRow list (no progress), "Download <phase> plan · PDF · size" pill button) — when searching, all matching phases are listed in sequence → "About this level" disclosures → "Go deeper" promo.
- **v2 deviation**: none of this exists as a page; the program page shows all phases at once.

### L9. Self-Guided day (`/self-guided/day/$id`) — `ui/selfguided`
- **Order**: ContextBar (back, day title, meta "Level I · Phase 1", action "N lessons") with **ChipNav row** (one chip per step, scroll-spy) → day intro (measure: eyebrow "Level I · Phase 1 · Day 8", title, focus lede, Let's Begin card = image 56px + HTML) → **one section per step**, separated by rules: desktop 2 columns `[18rem sticky step header | content]`: header = "i of n · duration", step title, description (when no notes); content = notes → video → readiness assessment (inline) → workout circuit panel → completion card → "Exercise demos" 2-col grid of videos. Phone: header above content → bottom: prev/next day cards (2 columns on sm).
- **v2 deviation** (`SelfGuidedDay`): close (stacked steps + chips); check the sticky left step header column on desktop, Let's Begin card, Exercise demos grid, completion card CTA, prev/next day cards.

### L10. Average Day (`/self-guided/average-day`) — `ui/selfguided`
- Top band: back link → hero panel (pills, title, two paragraphs, jump chips per block). Readiness panel: heading, progress bar + "k/5", question card (options list, "Consider this" note box), Next/Previous; result = ring left + band pill/title/summary/advice 2-col list + Start the day/Retake; example circuit table below. Day blocks in order, each: heading (eyebrow/title/blurb) then desktop 2 columns `[video + notes | 20rem "Associated videos" list (poster 6rem + title + "Play clip"/"Video coming soon")]`, phone stacked, rule between blocks.
- **v2 deviation**: missing.

### L11. Plan creator (`/self-guided/creator`)
- PageHead → desktop 2 columns `[22rem sticky form | results]`; phone form first. Form fields stacked (goal, 3-up Weeks/Days per week/Minutes, Experience, Programs checklist box, Equipment, Recovery needs, Constraints, Start date, Create/Regenerate). Results: dashed placeholder card → after generation: overview card (eyebrow, goal title, overview, Save and schedule) + week accordions (first open; rows: day tile, lesson title, "program · rationale", minutes) → "Saved plans" 2-col cards (name, "N scheduled sessions").
- **v2 deviation**: `/plan/new` template gallery; no creator form/result layout.

### L12. Course viewer (`/courses/$slug`, MTK/A4L/Path/Working-In/MoM/free series)
- Immersive (no shell rail). **Sticky top bar** (h 48, glass): back (Programs / My Plan) · centred course name · "%" · About (i) · Lessons (phone) · Focus (desktop) — with a 1px progress line under it.
- **Desktop**: 2 columns `[300px sticky sidebar, full height, own scroll | main]`; Focus hides the sidebar. Sidebar: Progress row (% · done/total) + bar → search → MTK block (My Plan / Full Curriculum segmented + "N lessons recommended for you" or create-plan link) → "Start here" row → **groups** (numbered "01", name, d/n, collapsible) → **sections** (chevron, title, on-path dot, d/n) → **lesson rows** (✓/▶/📄, title, recommended dot). Single-group courses skip the group level.
- **Main** (max 760px, centred): plan-mode banner / create-plan banner → overview panel (when open: instructor, title, summary, stats "chapters · sessions · % complete", intake link, highlights) → breadcrumb line (group · section · "i of n" · Done) → lesson title (large) → video → audio list (rows: headphone circle, title, "Audio session", download) → markdown body → "Technique breakdowns · N" (2-col video grid, numbered) → "Downloads" list → bottom bar: Previous (left) · primary Complete & continue / Next (right); on phone the bar is sticky above the tab area as a pill.
- **Phone**: Lessons button opens a left drawer (90% width) with the same sidebar.
- **Grouping**: Group (`sections.subtitle`) → Section → Lesson; "Home" section = Start here (not counted).
- **v2 deviation**: lessons open in the KBL-style DayPlayer (steps rail, step chips) and the course page is the phase-map ProgramView; no sidebar curriculum, no groups, no search, no Start here, no overview, no reading layout. Rebuild per this block (W2).

### L13. Program intake (`/programs/$slug/intake`)
- Step scene: **sticky header** (centered column ≈36rem: back circle · program name · "k/n") + step rail (segmented progress) → step title (eyebrow "Program intake", question, help) → options (stacked full-width option rows with radio/check) or textarea → **footer** full-width Continue / Save my intake. Review page: centered column (max 2xl): eyebrow program, "Your program approach", headline, priorities (bordered tick rows), "Keep in mind" box, buttons Open program / Review answers / Start fresh.
- **v2 deviation**: missing (OnboardingFlow uses a similar one-question pattern for goals — reuse the pattern, keep this structure).

### L14. Onboarding intake (`/onboarding`)
- Same step scene as L13 (sticky header with back/"Intake"/count, rail, title + note box, options with bullet sub-text or descriptions, footer "Continue" / "See my plan"). Result screen: centred card with course pill, headline, summary, priorities list, primary "Start Level I →".
- **v2 deviation**: v2 onboarding is a 5-question goal flow on Today; KBL 13-step intake and result screen missing.

### L15. MTK results (`/mtk-plan/results`) and My Plan (`/mtk-plan`)
- Results: centered column (max ~3xl): eyebrow, big "N of M lessons recommended", summary → 3-up cards (Your MTK level, Your strengths, Focus areas / gaps) → "Your personalized curriculum" (movement groups with lesson lists) → schedule card (three choice rows: weeks / days per week / minutes, each a segmented chip set) + live preview ("k learning days · about w weeks") + Create my plan / Browse full curriculum → retake link.
- My Plan: centered column (max 3xl): My Plan / Full Curriculum segmented at top → eyebrow + title + summary → progress card (Overall progress + bar; Next lesson row + Resume plan) → "Upcoming learning" list (toggle "All learning days"): divided rows (Day n, title, k/n done, lesson titles) → actions (Results & schedule, Retake) → archived versions note.
- **v2 deviation**: missing.

### L16. Library (`/library`)
- **Sticky compact toolbar** (no hero): "Library" + count · search (pill, grows) · Filters button (badge count, chevron). Filters open as an **inline drawer under the toolbar** (not a modal): Saved views (chips + name field + Save view) → level chips row (+ Saved chip) → Categories chips → Tags chips (scroll box, "match all") → row: "In the program" chip · thumbnail source toggle · Clear.
- **Body**: source segmented (Everything / Technique videos / Program lessons) → **inline player panel** (when a video is chosen; desktop 2 columns `[player 1.6fr | info 1fr]` with level pills, title, categories, tag chips, Save, Close; phone stacked) → active filter chips + Clear all → results line ("N of M videos matching …") + Sort select (right) → **grid** 2 / 3 (sm) / 4 (lg) / 5 (2xl) columns of portrait cards (poster 4:5 with level pill top-right, hover bookmark top-left, category eyebrow, title) → "From every program" section (program chips, 3-col lesson tiles: title + "program · section").
- **v2 deviation**: search field + chip toolbar (All / Saved / Filters) + **filter sheet (modal)**; landscape cards; clicking opens a **separate video page**; Collections shown under Saved; no sort/count/source tabs/inline player/lessons section. Rebuild with the inline toolbar drawer, inline player panel and portrait grid; the video page can remain for deep links/"Also in".

### L17. Saves (`/saves`)
- SectionHeading ("Your history" / "Saves") → **sticky toolbar** (desktop 2 columns: kind segmented pill with counts left; per-tool select + date-range select right; phone: segmented on one line, selects below) → month groups (month heading + 3-col xl / 2-col sm card grid of SaveCards) → detail sheet.
- **SaveCard**: kind icon tile, title, source/tool, date, "View result"/"Open".
- **v2 deviation**: Segmented Videos / Tools / Readiness with simple lists, no month grouping, no filters, no detail sheet.

### L18. Schedule (`/schedule`)
- **Order**: PageHead ("Self-guided" / "Build your schedule") → "Created for you — Self-guided plans" (2-col cards) → if no schedule: EmptyState + level choice → else: schedule selector row (desktop 2 columns: schedule pills + level/schedule controls + delete | right: "Guided schedule" pattern buttons 3/4/5/Every day) → **NextSessionCard** (next session, reminder state, Skip today / Snooze) → **Plan overview** card (ring "Days placed" + Placed / Missed stats; sm 2 columns) → "Behind the plan" banner with fix → **calendar area**: desktop 2 columns `[month calendar 1fr | 20rem "Days to place" tray]`, phone tray first (order) then calendar; calendar card = header (‹ month ›), weekday header row (Mon–Sun), 6×7 grid of date cells with day chips (remove ×) → under calendar: "Upcoming" list rows → **Reminders** + **If you miss a day** (2 columns lg) → **Calendar sync** (Apple .ics, Google link, help text).
- **v2 deviation** (`/plan`): large title + week grid (7 day blocks) / month toggle + lesson picker aside + Goals and plans list + "Stay on track" links; reminders moved to Settings; no NextSession card, no overview card, no fallback chooser, no calendar sync section. Rebuild with the legacy order (keep drag-and-drop and goal list inside it).

### L19. Reminder history (`/reminders/history`)
- PageHead (eyebrow "Troubleshooting") → stats grid (2 cols phone / 4 desktop: Sent, Opened, Snoozed/skipped, Failed) → event list (bordered, rows: status icon · title + time + channel · status pill) → Clear history.
- **v2 deviation**: missing.

### L20. Account / Profile (`/account`)
- **Header**: desktop 2 columns `[identity: avatar 64 + eyebrow "Your profile" + name + email | progress ring 112]`; below: 4 MiniStats (2×2 on phone, 4 across sm) → XP bar.
- **Sticky tab bar** (glass): Overview · Achievements · History · Notifications · Organization.
- **Overview**: 2 columns lg — Details card (name edit, program level) | Progress by level (per level: title, %, bar, phase chips, "Go to Immersion") → Past runs → Getting-started checklist → Orders.
- **Achievements**: Badges grid (medal, name, earned date / "Not earned yet") → Certificates (2-col cards).
- **History**: Training insights (stat tiles + weekly volume + load charts) → 2 columns lg: Saved assessments list | Workout tables list.
- **Notifications**: 2 columns lg: Training reminders card | What we send + Channels + test email; Quiet hours; browser permission row.
- **Organization**: org card + members table.
- **v2 deviation** (`/you`): iOS-settings-style list (rewards summary card, Progress rows, Certificates rows, "Your things", Account rows) with sub-pages (rewards, saves, settings, referrals, billing, organization). Restore the header (identity + ring + stats + XP) and tabbed structure, or keep sub-pages but present them as the same five tabs in the same order.

### L21. Certificate (`/certificate/$courseId`)
- Standalone page (no shell): top row (back · Print / Save as PDF) → landscape certificate sheet (border frame, crest, "Certificate of completion", name, course title, phases, date, signatures in 2 columns at the bottom). Print stylesheet hides chrome.
- **v2 deviation**: `CertificateView` glass card with crest, name, level, date, verify code, Share/Save as PDF — layout close; keep landscape sheet proportions and signature row.

### L22. Tools index (`/tools`) and tool flow (`/tools/$slug`)
- Index: PageHead ("Coaching tools") → tool cards grid (3 xl / 2 sm, equal heights; motif graphic, title, one-liner, "Start") → "Free resources — Kettlebell Roadmap" row card → "Your results — Recent saves" (3-col compact SaveCards / empty state).
- Flow: intro screen (centred ≈46rem: motif, title, 3 bullet points, start button with "Run it again" when a previous result exists) → question scenes with **sticky header** (back · tool name · "k/n") + rail, options list, answered-rows recap below → result page (centred ≈46rem: pills, headline, motif graphic, 3-up result cards (bells), "How to use this set"/"What to do next" section, "Follow along" videos, AnswerRecap, Save button).
- **v2 deviation**: tools live under Programs › Free tab; flow is a one-question sheet without intro or recap; result graphic + Save + Retake + OfferSlot. Restore the index page order and intro/result sections.

### L23. Referrals (`/referrals`)
- PageHead → code card (eyebrow "Your code", big code, link, Share link button, channel buttons WhatsApp/Email/X) with points + next-tier line → 3-up stats (Link visits, Signups, Purchases) → "Rewards — What points unlock" tier list (points, reward, unlocked state) → "Invite tracking" event list.
- **v2 deviation**: code card + "How it works" 3 steps + Friends list; no channel buttons, stats row or tiers.

### L24. Retreats index (`/retreats`)
- PageHead ("Men of Movement" / "Retreats" / lede) → 2-column grid (lg) of large retreat cards (image with dark overlay: season eyebrow + name; body: status pill, tagline, location + "20 men maximum", actions View retreat / Your hub when booked) → "What it is not — No performance, no forcing" section.
- **v2 deviation**: no retreats index; retreats appear as one Experiences card and a Today invitation. Add the index (or an Experiences tab that keeps this layout).

### L25. Retreat page (`/retreats/$slug`)
- ContextBar (back to retreats, name) → photo grid hero (mosaic) → body desktop 2 columns `[content 1fr | 22rem sticky aside]` (aside first on phone): content = facts strip (4 cells: capacity, location, fixed dates, by application) → What this retreat is → What you walk away with (2-col tick list) → How the four days unfold (day list) → More from the mountain (gallery); aside = status card (status, dates, Apply/Waitlist CTA, bullet notes, "How it comes together" 3 numbered steps). Then full-width sections: Preparation → Facilitators (4-col cards) → After the retreat → Documents (2-col) → FAQ (accordion) → closing CTA band ("Twenty places. That's it.").
- **v2 deviation**: `RunSales` on the program page — verify the two-column sticky-aside structure and section order; add facts strip, facilitators grid, closing band if absent.

### L26. Retreat application (`/retreats/$slug/apply`)
- Step scene: header (eyebrow Fixed cohort/Waitlist, retreat name, dates, location) + rail (Intention · Readiness · Commitment · Review) → step content (multi-choice chips, textareas, 2-col phone/emergency fields) → footer Back / Continue / Submit. Review = definition list (8rem label column). Success = centred card.
- **v2 deviation**: `ApplyForm` — confirm 4-step rail and review table.

### L27. Retreat hub (`/retreats/$slug/hub`)
- ContextBar ("<name> — your hub") → hero card (image; desktop 2 columns `[phase eyebrow Countdown/Happening now/Integration + big number + dates | Preparation progress card]`) → **sticky section tabs** (Checklists · Gallery · Itinerary · Guides · Travel · Documents, anchor links) → Checklists (2 columns: Prerequisites | Packing list) → Gallery (4-col grid + lightbox with ←/→) → Location and travel → Itinerary (2-col day cards) → Guides (3-col) → Downloads (3-col) → Integration support.
- **v2 deviation**: `RunHubView` uses SectionNav + sections Prepare, Live calls, Itinerary, Travel & stay, Gallery, Documents, Help, After — order differs (Gallery after Travel in v2 vs before Itinerary in legacy) and Guides merged into Help. Reorder to legacy.

### L28. Coaching (`/coaching`)
- PageHead → 3 stat tiles (Upcoming, Sessions done, Minutes per session) → "Coming up — Your next session" cards → "Step one — Choose a package" (3-col package cards) → "Step two — Pick a time" (day selector + time grid 3/4/7 columns) → "Step three — What do you want to work on?" (textarea) + summary card (Package / Time / Total, Book this session, terms) → "History — Previous sessions" (rows with notes) → footer note.
- **v2 deviation**: `CoachingBoard` credits card + day strip + time list + confirm sheet; restore the 3-step stacked order with summary card and history.

### L29. Shop (`/shop`, `/shop/$slug`)
- Index: PageHead ("Shop" / "Tools for the practice") → filter segmented (Everything / Digital / Equipment) → "Pick your next tool" 3-col grid of product cards (image, type pill, name, price/"By application", short line) → trust row (3 tiles) → "Your orders" (count + total spent tiles + list).
- Product: ContextBar (back, name, price) → desktop 2 columns `[1.1fr gallery | 0.9fr buy panel: name, price, bullets, size grid (2–3 cols), Buy now, trust chips (3)]` → "Also in the shop" 3-col → phone: fixed bottom buy bar.
- **v2 deviation**: missing.

### L30. Hub (`/hub`)
- Header (eyebrow "Program hub", "Every level, phase and day.") → progress card (current level · phase · day, bar, Days k/n, Lessons k/n, Resume + level buttons) → **sticky filter bar** (search · level select · phase select · status select · reset) → result count → 3-col (lg) / 2-col (sm) grid of day cards → empty state.
- **v2 deviation**: missing (P2; can be the program page's "search all days" mode).

### L31. Auth (`/auth`) and reset (`/reset-password`)
- Desktop 2 columns: left brand panel (dark, wordmark "MIKE SALEMI", headline, 3 feature tiles: Structured daily training · Video library & smart tools · Progress that follows you) | right form panel (48%): mode segmented Sign in / Create account, title ("Welcome back" / "Create your account" / "Reset your password"), sub-copy, fields (name, email, password with show/hide), primary button, forgot link, trust lines. Phone: brand header compressed on top, form below. Reset: single centred card.
- **v2 deviation**: `/signin`, `/signup`, `/auth/reset` with `AuthShell` — check the two-panel structure and the three feature tiles.

### L32. Email centre (`/emails`, admin)
- PageHead → desktop 2 columns `[300px grouped list (Account, Tools, Milestones, Reminders, Updates; each row label + sender + trigger) | preview: subject line, iframe render, Send test]`.
- **v2 deviation**: missing (W3, Studio).

### L33. Admin studio (`/admin`, `/admin/content`, `/structure`)
- `/admin`: PageHead ("Admin studio" / "Run the academy") → link card to content admin → tab row (Pricing, offers & placement · Announcement bar · Main copy · Retreats & applications · KBL form entries) → per tab: grouped form cards ("Main copy", "Pricing & access", "Offer & badge", "Placement") beside a **live card preview**; announcement with live bar preview; retreat cohorts list; entries table (filter by form; Submitted / Member / Day / Score / Result).
- `/admin/content`: entity tree + field forms (generic). `/structure`: tree editor courses → phases → days → lessons with capability toggles, Save/Saved, reseed.
- **v2 deviation**: Studio has its own sidebar app with list/detail pages (acceptable for admin); add the missing panels (merch fields with live card preview, Home/Programs copy, entries table, application actions, email centre).

---

## 1. Home / dashboard

Legacy: `src/routes/_authenticated/home.tsx`, `src/components/home/program-cards.tsx`, `src/hooks/use-home-programs.ts`, `src/lib/home.functions.ts`, `src/lib/site-settings.functions.ts`, `src/components/carousel.tsx`. v2: `apps/web/src/app/(app)/today/page.tsx`, `components/today/{TodayScreen,buildToday,model,WeekStrip,OnboardingFlow}.tsx`, `lib/loaders/today-plan-you.ts`.

| Legacy feature | v2 status |
|---|---|
| Hero, mode "continue": most recently active enrolled program (KBL level or DB course); eyebrow "Continue training"; name; progress meter (thin bar + %); progress label "8 of 60 days" / "12 of 302 lessons"; "Up next · Day 8 · Workout I Day"; button Start / Resume / Review (complete) | **PARTIAL** — `NowCard` shows ONE next action (day title, "Day N of M", steps, level, Start/Continue Day N, hint "Next: <step>, step k of n"). No % meter in the card, no "Review" state for completed programs. |
| Hero, mode "join" (no enrollment): featured program = `site_settings.home.featuredSlug` → `programs.meta.featured` → first joinable; eyebrow from `home.heroEyebrow` or "Featured program"; summary; size label ("302 lessons"/"61 training days"); **Join program** (spinner) + **Preview →** | **PARTIAL** — empty state "Nothing planned yet / Choose where to start" with Explore programs / Start a plan. No featured program, no Join, no Preview. |
| Row "Your programs" (title admin-editable `home.enrolledTitle`), horizontal carousel of every enrolled program: 16:9 artwork (fallback initials tile), "Completed" badge, name, progress meter + %, progress label, "Up next · …", verb Start/Resume/Review. Sorted by last activity (latest of last completed lesson, resume position, last opened, enrolled). Empty: "You haven't joined a program yet. Pick one below — your progress shows up here." | **MISSING on Today** (Programs tab has "My programs" with bar + Continue — `components/discover/ProgramsTab.tsx`). |
| Error banner "Your programs couldn't load right now. Refresh to try again." (never stuck on skeleton) | **DONE** (`today/error.tsx`, `ScreenError`). |
| "Upcoming activity" 3 tiles: Live call · Preview "Monthly Q&A with Mike"; Invitation · Preview "Community workout drop"; Retreat name · dates · location | **PARTIAL** — "Coming up" lists real booked runs, coaching bookings, run sessions; retreat invitation card. No live-call/community placeholders (those were previews; only add when real). |
| Row "Programs you can join" (not enrolled, included): card 16:10 artwork, name, "302 lessons · Included", **Join program** → `program_enrollments` upsert → toast "You've joined X" → open first lesson/day | **MISSING** (v2 `enroll()` RPC exists; Programs tab only links to the program page). |
| Row "Retreats & gatherings" (See all → /retreats): carousel of every retreat, 16:10 image with hover zoom, name, dates · location | **MISSING** (only one invitation card). |
| Row "Explore next" (locked programs): artwork, "Locked", **Unlock · $297** | **MISSING** on Today (Programs tab shows Locked chips; OfferSlot shows one offer). |
| Every row: title + "See all →" link | **MISSING**. |
| Loading skeleton (hero + 3 cards) | **DONE** (`today/loading.tsx`, `Skeletons.tsx`). |
| — (v2 extras, keep) | Progress rings (program/today/streak), This week strip + missed sessions "Fix my plan", Goal card, retreat invitation, `OfferSlot placement="today"`, onboarding redirect. |

Also from legacy dashboards elsewhere (fold into the new Home, client wants "even better"):
- Account overview header: avatar, email, program progress ring, MiniStats (days, lessons, streak, badges), **XP bar** ("N XP to Practitioner") — `src/routes/_authenticated/account.tsx` L84–140, `src/components/gamification.tsx` → **PARTIAL** (You screen shows level/points/streak/medals).
- Getting-started checklist (`src/components/getting-started.tsx`): Finish onboarding and get your level · Complete the intake questionnaire · Add your name · Complete your first lesson · Finish a full training day · Build your training schedule · Set your reminders — each with a done state ("You've got your level", "Intake done", "Your name is on the wall", "You started", "A complete training day", "Your plan has dates") → **MISSING**.
- Immersion "On the plan today / Next on your plan" card and "Created for today / Next created session" (AI plan) card → **DONE** via plan entries in `NowCard`/week strip.
- Program promo slot "dashboard" (`src/components/program-promo.tsx`, `programsFor("dashboard")`: The Grounded King, Men of Movement, Executive Edge, Zen Savage, KBL+) → **PARTIAL** (OfferSlot is rule-driven; concept programs need cards).

Porting notes:
- New loader `apps/web/src/lib/loaders/home.ts` returning `{ enrolled: HomeItem[], joinable, locked, retreats, featured }` built from `listCatalog`/`program_access_states` + `my_enrollments` + `curriculum_progress` (per program `lessons_done/lessons_total`, current lesson) — mirror `HomeItem` in `src/hooks/use-home-programs.ts` (fields: name, image, access, priceCents, percent, complete, progressLabel, sizeLabel, nextLabel, lastActivityAt, resume, start).
- Join: server action calling `enroll(program, path, mode)` then `redirect` to first lesson (`learn/` for immersion, `guide/` for self-guided, course player for courses).
- Rails: reuse `components/discover/ProgramCard` (compact height ~220) and a horizontal scroller primitive (add to `components/ui` via lead if missing; legacy `src/components/carousel.tsx` had arrow buttons + snap).
- Featured: add `site_settings` key `home` `{heroEyebrow, featuredSlug, enrolledTitle}` (Studio settings already edits `site_settings`).
- Retreats rail: `program_runs` where status open/waitlist joined with `programs` media (`listOpenRuns` already used for invitation).

---

## 2. Programs list (catalog)

Legacy: `src/routes/_authenticated/programs.index.tsx`, `src/components/database-program-card.tsx`, `src/components/program-promo.tsx`, `src/content/programs.ts`. v2: `app/(app)/programs/page.tsx`, `components/discover/{ProgramsTab,ProgramCard,ExploreTabs,access}.tsx`.

| Legacy | v2 |
|---|---|
| Page head eyebrow "Beyond the program", title/intro admin-editable (`programs_page.title`, `.intro`; defaults "Choose your next program" / "Every course, guided experience and deeper practice in one place. Start with what supports you now.") | **PARTIAL** — large title "Programs", no intro, not editable. |
| Search "Search programs, skills or outcomes" over name, summary, highlights | **MISSING**. |
| Flagship hero block "Kettlebell Lifestyle" (badge "Mike Salemi · Flagship", copy `programs_page.kblCopy`, chips "2 levels · 4 phases · Immersion or Self-Guided", **Enter program →**) | **MISSING** (KBL is just one card). |
| Three verticals with eyebrow + title + note: *Technique & progressions — Kettlebell Mastery* (MTK, Roadmap, Swing, 6-video), *Strength & conditioning — Athletic Performance* (A4L, Training Room), *Recovery & inner work — Mind-Body, Longevity & Retreats* (Working-In, Men of Movement, Path). Admin override `programs.meta.catalogGroup` | **PARTIAL** — tabs Training / Experiences / Free; no verticals. |
| Hidden from catalog: kettlebell-roadmap (lives in Tools/Free resources), the-training-room (duplicate of A4L) | **DONE** (training-room archived; roadmap under Free). |
| Program card: image, admin badge ("New", "Most popular"), instructor, name, summary, **offer line** (e.g. "Founding members save 20% — Preview"), up to N highlights with ticks, "N sections · M lessons", access label Owned/Locked/Included, CTA label admin-editable (`ctaLabel`) or "View program" with lock icon | **PARTIAL** — `ProgramCard`: photo, name, outcome line, access chip, meta line, action. No badge, offer line, highlights, section/lesson counts, instructor. |
| Footer copy "Everything here lives inside your account…" | not needed. |
| "My programs" | **DONE** (v2 extra). |
| Concept/partner programs (`src/content/programs.ts`: The Grounded King $197, Men of Movement Retreats, 1:1 Coaching, FIRE (Partner Preview), Executive Edge (Preview, $4,500–$5,000 Draft), Zen Savage (Draft), Trainer Mini-Series (Preview), Build Your First Four Kettlebell Lifts (Preview), Nine-Video Skill Intensive (Draft), KBL+ (Preview)) | **PARTIAL** — DB has coaching, executive-edge, the-grounded-king (draft), zen-savage. FIRE, Trainer Mini-Series, First Four Lifts, Nine-Video, KBL+ not in DB (legacy hid that group with `{false && …}`; keep hidden unless client asks). |

Porting notes: add search + vertical grouping inside `ProgramsTab` (group key = `programs.meta.vertical` with the legacy `VERTICAL_OF` map as default); extend `CatalogProgram` (`packages/api/src/catalog.ts`) with `badge`, `offer`, `ctaLabel` (from `programs.meta`), `sectionCount`, `lessonCount`, `instructor` (`meta.instructor`).

---

## 3. Program pages by type

### 3a. Kettlebell Lifestyle program page (Immersion hub + level page + hub + path chooser)

Legacy: `src/routes/_authenticated/immersion.index.tsx`, `immersion.$courseSlug.tsx`, `hub.index.tsx`, `program.tsx`, `src/components/{course,milestones,weekly-recap}.tsx`, `src/content/{program,plans,day-cues}.ts`. v2: `components/training/ProgramView.tsx` (+ `RestartSheet`, `ScheduleSheet`), owned by training/ui-sg.

| Legacy | v2 |
|---|---|
| Onboarding gate: `/immersion*` redirects to `/onboarding` until the 13-step intake is done | **MISSING** (v2 onboarding is goal setting and optional). Decide with client; at least recommend Level from KBL intake. |
| Intake prompt card "Complete your intake questionnaire — 13 quick steps to place you in the right level and personalise your lifestyle work. Start →" | **MISSING** (see §13). |
| Dark course hero: eyebrow "Flagship program · with Mike Salemi", title, level tagline, meta "4 phases · 61 days · Level I · 12 day streak", CTA "Resume Day 8 · Workout I Day" / "Start Day 1", "N/M days complete · %" bar | **PARTIAL** — hero + level tabs + primary CTA + rings; no streak chip in hero. |
| Level switch (Level I / Level II) | **DONE** (path tabs). |
| Curriculum: phases as `<details>` (current open), phase badge (done count / ✓), "You're here", blurb, "d/t days"; day rows with ✓/○, "Day 8", title, "Workout I Day · 45 min · 6 steps", "Up next"/"Resume" pill, "k/n" partial | **DONE** — phase map with day chips by type, ticks, locks (`ProgramView`). Check: per-day minutes ("45 min") requires `lessons.estimated_minutes` (all null — see §20). |
| Sidebar: ScheduledToday card, Pace toggle "Free schedule / Create schedule" (weekday pills, "Sync to my calendar", "View schedule →", copy "Train the next day whenever you're ready — no dates." / "Pick your training days and the next 4 weeks land on your calendar.") | **DONE** — mode + pace (Free/Scheduled) → `schedule_immersion`. |
| "Phase guides" PDF downloads (On Ramp / Phase I–III plan, duration) | **DONE** (`resources`, 8 rows). |
| Quick links: Self-Guided mode, Program hub, Video library, Tools | **PARTIAL** — mode switch exists; no hub/tools links. |
| Level page: context bar "Level I · 42% complete" + Resume; level tabs "Level 1 · Beginner"; MilestoneCallout (phase/level/program complete copy, CTA "Start Phase II"/"Get your certificate"); RestartLevelButton (dialog listing Resets: day completion, lesson completion, current position, streak / Kept: certificates, badges & XP, saved tool results & workout plans, this run archived in Past runs); **AttemptHistory** ("Past runs") | **PARTIAL** — Restart sheet with Resets/Remembered (`RestartSheet`), certificate CTA. Missing: milestone callout on page, **Past runs list** (`run_archive` exists). |
| "Watch intro" toggle → Vimeo hero video (`course.heroVimeoId`) | **MISSING** in UI; data present: `program_paths.meta.hero_video = "398409642/f4e1f0e247"`. |
| Phase tabs with % per phase; phase header (weeks, name, blurb, "N training days · M overview and preparation pages · L lessons") | **PARTIAL** — counts not shown. |
| About this level disclosures: What you'll be able to do / How it's delivered / What you need / Expert contributors (name — credential) + long description | **PARTIAL** — "About" with what you need; data in `program_paths.meta.{outcomes,format,whats_needed,contributors}`; ensure all four render. |
| Promo "When you're ready for more" (`ProgramPromo slot="phase-complete"`: MTK, Grounded King, Coaching) | **PARTIAL** (OfferSlot on day complete only). |
| Program hub `/hub`: "Every level, phase and day." progress header, search days by name/number/phase, filters level/phase/status (All, In progress, Not started, Completed), empty "No days match those filters" | **MISSING** (P2; fold into program page search). |
| Path chooser `/program`: "Kettlebell Lifestyle — Pick how you want to train": Guided **Immersion** ("Follow the program day by day. Daily progress, readiness…") vs **Self-Guided** ("Open reference to every lesson. Choose your level:") | **DONE** (mode cards in ProgramView). |
| Session cues toggle (Breathe / Open up / Mindset from `src/content/day-cues.ts`, pre-session checklist chips "k/n ready", post-session prompt) | **MISSING** (P2; data file `src/content/day-cues.ts`). |
| Pacing nudge toast "Maybe ease off the gas — That's three days finished in one sitting…" with "Never show again" → `streak_nudges=false` | **MISSING** (P2, belongs to day player completion; `src/hooks/use-pacing-nudge.ts`). |

### 3b. KBL day (Immersion day player) — **UI/DAY**

Legacy `src/routes/_authenticated/immersion.day.$dayId.tsx` + `src/components/{day-gates,auto-advance,celebrate,readiness,workout-table,lesson-notes,VimeoPlayer}.tsx`, `src/lib/{whats-next,stage-playlist}.ts`. Checklist for `ui/day` to confirm (do not duplicate in other workstreams):
- Locked day screen: "Day N is locked — Immersion runs in order…", **Go to Day k**, **Open in Self-Guided** (v2 `LockedDay` DONE).
- Start-of-day gate once per day across devices: context "Level I · Phase 1 · Day 8", "It's a new day, Ahmed.", Let's Begin text (minus heading), Steps count, Time ("Flexible" when unknown), "Press Esc any time to jump straight in." (ui/day DayGates).
- Video waits until gate closed; resume pill ("Resume at 2:31"); auto-complete at watched; clip playlist with 5-s "Up next" overlay that also works in fullscreen; Autoplay-next switch (steps only).
- Readiness step: "Start assessment" (primary button text when next step is readiness), dialog "Training Readiness Assessment — Five honest questions about how you woke up today…", answers saved per day across devices, auto-complete step on save, pause/resume video under dialog; "Review assessment".
- Workout step: "Today's workout table — Built from the Training Readiness Assessment you completed at the start of today." / "Today's starter table from the program."; Session plan sheet (header button) with save; CSV export.
- Completion step: "You've Crushed Another Day" + "Mark this step finished to complete today."
- Cheers on step complete (cycle "Nice work." / "Logged. Keep moving." / "That's one down." / "Strong. Next up." / "Locked in."), confetti burst from the click point (22 / 60 on last), haptics, "Day complete." cheer.
- End-of-day gate: "Day 8 complete", "Congratulations, Ahmed!", recommendation from readiness band (red → "Recover before you load up again" + stretch test; amber → assess again; green → "N days left in this phase…"), Start Day 9.
- Level complete celebration "Level I is done — Every phase, every day, every lesson. Your certificate is ready to claim." → Get your certificate.
- Desktop rail "Today's sequence — Complete each step to unlock the next." with per-step toggle; header step dots, k/n, mini ring; mobile thumb bar (Mark complete + dashed next-day button, locked until done); day footer "Next day locked — Finish every step to unlock Day 9" / "That's the end of the program. Outstanding."; keyboard ←/→/C.

### 3c. Courses (MTK, Athleticism 4 Life, The Path to Inspired Action, Working-In, Men of Movement prep, Essential KB Strength)

Legacy `src/routes/_authenticated/courses.$courseSlug.tsx` ("Template 2 premium layout"), `src/lib/courses.functions.ts`. v2: program page = `ProgramView`; lesson = `DayPlayer` via `learn/[lesson]`.

| Legacy | v2 |
|---|---|
| Sticky top bar: back (Programs / My Plan), course name, %, About (overview toggle), Lessons drawer (mobile), Focus mode (hide sidebar, desktop); 1px progress line under the bar | **MISSING**. |
| Left sidebar 300 px: Progress % · done/total + bar; search ("Search", results show "Group · Section", "Nothing matches “x”"); MTK block (My Plan / Full Curriculum segmented, "N lessons recommended for you" or "Create my personalized plan →"); **Start here** (intro, not counted); groups ("01 Deadlift  3/12", collapsible) → sections (chevron, title, on-path dot, d/n, green when complete) → lessons (✓ / ▶ / 📄 icon, title, recommended dot) | **MISSING** (ProgramView shows sections as a phase map; MTK has 52 sections in 11 groups — needs grouped nav). |
| First visit (no progress): overview panel open, intro lesson shown ("Start here"); returning: last lesson (URL `?lesson=` → localStorage `course-last-lesson:<slug>` → first incomplete) | **PARTIAL** — resume via `my_enrollments.current_lesson`; intro not distinguished. |
| Overview: "With Mike Salemi", name, summary, "11 chapters · 302 sessions · 4% complete", Take/Review intake link, highlights ticks | **PARTIAL** (hero + about; no intake link). |
| Lesson stage: breadcrumb "Group · Section · 3 of 12 · ✓ Done", title, video (Vimeo or direct mp4), **audio cards** (Headphones, "Audio session", download), markdown body (rich typography, links open in new tab, bold-only paragraphs as sub-heads), **Technique breakdowns · N** (extra Vimeo clips grid, numbered), **Downloads** list (pdf/doc/zip, ExternalLink for links) | **PARTIAL** — DayPlayer shows video, clip row ("Demo clips"), notes, attachments. No audio card styling, no markdown renderer parity, no lesson breadcrumb. |
| Bottom bar: Previous; primary **Complete & continue** / Next / Mark complete / All done / "Start training"/"Resume" on intro; desktop card variant shows next lesson title ("Next lesson", "Course finished", "Finish Deadlift") | **PARTIAL** (step-level complete; no lesson-level prev/next card). |
| Locked course: overview + "Preview the program, then choose access — Your intake is available now…" | **DONE** (LockedDay reason access → explore/buy). |
| Men of Movement prep: "Retreat preparation — Arrive grounded through five pillars" (Rotation, Movement, Breathwork, Nature, Storywork), "Six foundational practices are included with retreat enrollment…", locked "Post-retreat integration — Content in development…" | **MISSING**. |
| MTK plan mode: banner "My Plan · Day 3 — Lesson 2 of 4 · <day title> · View plan"; next follows plan order; finishing → My Plan | **MISSING** (§14). |
| MTK no-plan banner "Get a plan built around your strengths and gaps — about 2 minutes. Create my personalized plan / Finish my plan" | **MISSING**. |

Porting notes (new workstream W2, no edits to training files):
- New `apps/web/src/components/course/{CoursePlayer,CourseNav,CourseOverview,LessonBody,AudioCard,Downloads}.tsx` + `lib/loaders/course.ts` (reuse `packages/api/src/curriculum.ts` — sections have `subtitle` = group) + `lib/actions/course.ts` (complete all required steps of a lesson via `complete_step`; position via `lesson_positions`).
- Route: new folder `apps/web/src/app/(app)/programs/[slug]/course/[lesson]/page.tsx` (new files only). Lead switches the course links in `ProgramView`/Today/Programs to `/course/` for `type = 'course'` at merge.
- Markdown: legacy `parseContent()` (extract Vimeo links as clips, download links as resources, strip duplicates) — port into `packages/core` as `parseLessonBody()` so the importer and UI agree; v2 already split into `steps.body` + `steps.attachments` + `step_videos`, so mainly a renderer (`react-markdown` or the existing sanitized-HTML path).
- Intro section: flag `sections.meta.intro = true` on the "Home" section of the 8 courses (A4L, Training Room, MTK, MoM, 6-video, Swing, Working-In) and exclude it from counts in `curriculum_progress` / `my_enrollments` (DB function change, W5 migration).

### 3d. Free series (What Your Kettlebell Swing Is Missing, Free 6-Video Mini Series)

Legacy: same course viewer; free for every member. v2: `is_free = true`, catalog group Free, lessons in DayPlayer. **PARTIAL** — gets the course player from 3c. Data: both have hero, summary, description, 3 highlights; no tagline; 11 and 7 videos, all without privacy hash (public) — durations/posters from backfill.

### 3e. Tools (Kettlebell Selector, Stretch Test, Readiness Check, Kettlebell Roadmap)

Legacy `src/routes/_authenticated/tools.index.tsx`, `tools.$toolSlug.tsx`, `src/components/{tool-kit,tool-motifs}.tsx`, `src/content/tools.ts`. v2 `app/(app)/tools/[tool]`, `components/discover/tools/{ToolFlow,Results,defs}.tsx`.

| Legacy | v2 |
|---|---|
| Tools index: eyebrow "Coaching tools", lede "Short flows that ask only what matters, then return a specific recommendation you can act on…"; tool cards with motifs; "Free resources — Kettlebell Roadmap: Four training phases with skills and videos"; **Your results — Recent saves** list; empty "No saved results yet — Finish any tool above and the recommendation is stored here." | **PARTIAL** — tools live under Programs › Free; `/tools` index page exists; no recent saves on it. |
| Intro screen per tool with 3 "how it works" bullets ("Four questions about your size, background and goal." / "You get three bells — where to start, your working bell, and heavy work." / "Save it and the full set list lands in your inbox."; assessment: "One question at a time — you can go back and change any answer." / "You get a scored result…" / "Save it and we email you a copy plus the follow-along videos."); start label "Find my bells" / "Run it again" / "Start the assessment" / "Take it again" when a previous result exists | **PARTIAL** — one-question flow; no intro bullets, no "previous result" awareness. |
| Answer recap rows while stepping; back to change any answer | **PARTIAL** (back works). |
| Selector result: "Bell 1 · start here", "Bell 2 · working bell", "Bell 3 · heavy work"; "How to use this set"; **Save my kettlebell set** → toast "Your kettlebell set is saved" + celebration "Assessment complete — …saved to your account and on its way to your inbox." → "See all your results" | **PARTIAL** — visual result, auto-save "Saved to You", Retake, OfferSlot. No email copy, no celebration. |
| Assessment result: score, "What to do next", **Follow along** (videos), Save to my account (+ email) | **PARTIAL** — no follow-along videos section. |
| Tool result email (see §11) | **MISSING**. |
| Points for tools | **DONE** (+25 per tool result trigger), badges tool-first / tool-all **DONE**. |

### 3f. Experiences, coaching and concept programs (program pages)

Legacy `src/routes/_authenticated/programs.$programSlug.tsx` (for `externalPrograms`): context bar with Open/route action; full-bleed hero (kind eyebrow, name, tagline, CTA: "Open the course"/"See the retreats"/"Book a session", "Enrol · $197" checkout, "Talk to Mike about it", or "<Status> only"), price pill; facts grid Format / Commitment / Investment; description; highlight pills; sections (heading, body, tick points); FAQ "Before you commit — Questions people ask"; "Keep looking — Other programs" (3 cards). v2: `ProgramView`/`RunSales` + `/explore/[slug]` sales page. **PARTIAL** — v2 program page for `coaching`/`live`/`challenge` types: verify Format/Commitment/Investment facts and FAQ render (data: `format_label`, `duration_label`, `meta.price_label`; FAQ not in DB — add `programs.meta.faq` from `src/content/programs.ts`), and "Other programs" rail.

---

## 4. Self-Guided — **UI/SG** (everything here is for `ui/selfguided`; listed so nothing is lost)

Legacy: `src/routes/_authenticated/self-guided.index.tsx`, `self-guided.$courseSlug.tsx`, `self-guided.day.$dayId.tsx`, `self-guided.average-day.tsx`, `self-guided.creator.tsx`, `src/lib/self-guided-plan.functions.ts`, `src/components/course.tsx` (DayRow), `src/content/{plans,average-day,readiness-table}.ts`, `src/hooks/use-scroll-spy.ts`.

Self-Guided home (`/self-guided`):
- Hero eyebrow "Self-guided", title **"Train it your way."**, lede "The same program as Immersion, without the fixed order. Open a level, go straight to any phase or day, and build a schedule that fits your week." Buttons **Build a schedule** (→ schedule), **Browse the library**, **Create my plan** (AI creator). → **MISSING** (v2 has mode switch only).
- "Choose a level" cards: 16:9 image + scrim, level eyebrow, title, tagline, stats "4 phases · 61 days · 302 lessons", 4 phase chips (label + weeks), "Open Level I →". → **PARTIAL** (path tabs).
- "Every program — Browse your full library" with search over all DB programs (compact cards). → **MISSING**.
- "How self-guided works": *Nothing is locked* ("Every phase and day is open from the start. Train what suits your body today."), *Plans to download* ("Each phase ships with a printable PDF plan you can take to the gym."), *Your own calendar* ("Drop days onto a schedule, set reminders and choose what happens if you miss one."). → **MISSING**.
- ProgramPromo "dashboard". → OfferSlot.

Self-Guided level (`/self-guided/$level`):
- Context bar: back, title, meta "4 phases · 61 training days · overviews and preparation included", L1/L2 segmented. Hero with "Schedule this level". → **PARTIAL**.
- Sticky phase tabs (name + day count) + "Search all days" (title, focus, type, intro); empty "No days match “x”" + Clear search. → **MISSING**.
- Phase block: weeks eyebrow, name, blurb; DayRow list (mode self-guided, no progress); **Download <Phase> plan · PDF · 1.2 MB**. → **PARTIAL** (resources exist; no file size; no per-phase download button).
- About this level (4 disclosures), "Go deeper" promo. → **PARTIAL**.

Self-Guided day (`/self-guided/day/$id`): **DONE (mostly)** in `components/training/SelfGuidedDay.tsx` — stacked steps, sticky chips with scroll-spy, readiness + table, prev/next day, completion text. Missing vs legacy: per-device **reading position restore** (scrolls back to the sub-lesson you were on; legacy key `sg-pos:<course>:<day>`; v2 can use `lesson_positions.active_step_id`), focus heading on new day, **Let's Begin** card (intro HTML + image), "i of n · duration" per step header, step description when no notes, "Exercise demos" grid, completion CTA "Finish day · go to <next day>" / "Finish level · back to Self-Guided".

Average Day (`/self-guided/average-day`) → **MISSING**: hero "An average day in KBL." pills (Average day · N blocks · Readiness assessment included), copy "This example follows Level I, Phase II, Workout III. Try the assessment to see how your answers adapt that workout."; jump chips per block; readiness walkthrough (progress bar, 1/5, option cards, "Consider this" notes, "See my readiness", result ring "score/max · Fatigue · lower is better", band pill Green light / Scale it back / Recover today, advice list, Start the day / Retake, example CircuitTable); day blocks (eyebrow, title, blurb, video, Notes + numbered recommendation, "Associated videos" list with posters, "Video coming soon"). Data: `src/content/average-day.ts` (move into a `lessons.meta` showcase or a `tools` config).

Plan creator (`/self-guided/creator`) → **MISSING** (also see §8): form (Primary goal, Weeks 2–8, Days/week 2–6, Minutes 10–120, Experience, Programs checklist (defaults to 2 included), Equipment, Recovery needs, Constraints, Start date), **Create my plan / Regenerate plan**, placeholder "Your pathway will appear here — It will include a weekly intention, real lesson links, session spacing and the reason each lesson belongs.", result "Your 4-week pathway", overview, **Save and schedule**, weeks accordion with day number, lesson, program · rationale, minutes; "Saved plans" grid. Server: deterministic fallback + optional AI that may only pick real accessible lesson IDs; save → plan with dates spread across the week. v2 data: `member_plans(source='ai')` + `plan_items` fit.

Spec 07 advanced Self-Guided (quick sessions, intents, training_sessions log, passport) stays with `ui/selfguided`.

---

## 5. Immersion

Covered by §3a (program page) and §3b (day player). Remaining legacy-only behaviours: onboarding gate + intake prompt (§13), weekly recap chart component (unused in legacy routes — skip), resume card (unused — skip), streak shown in hero (**MISSING**, trivial from `my_rewards.streak_current`).

---

## 6. Library

Legacy `src/routes/_authenticated/library.index.tsx`, `src/lib/library.functions.ts`, `src/content/library.ts`, `src/hooks/{use-saved-videos,use-library-presets}.ts`, `src/lib/kbl-library.ts`. v2 `app/(app)/library/{page,[video]/page}.tsx`, `components/discover/{LibraryBrowser,VideoCard,VideoView,filter}.tsx`, `packages/api/src/library.ts`, RPC `library_videos`.

| Legacy | v2 |
|---|---|
| Sticky compact toolbar: "Library", count `results/total`, search "Search videos" (multi-token over title, tags, categories, levels: "on ramp swing") | **DONE** (search + server `?q`). Count **MISSING**. |
| Filters drawer with badge count | **DONE** (sheet; program + facet chips). |
| **Saved views** (presets): name + Save view, chips with delete, empty hint "Set your filters, name them below, and they'll be one tap away." (localStorage) | **MISSING** (v2 has Collections — different; keep both, store presets in `profiles.preferences.library_views`). |
| Level chips (All levels, On Ramp, Phase 1–3, …) with **cascade**: level → categories for that level → tags for that level+category; "Tags — match all selected" | **PARTIAL** — flat facets (Phase, Movement) and program; no cascade, tags are OR? (check `filter.ts`). |
| Saved chip with count "Saved (12)" | **DONE** ("Saved" chip). |
| "In the program" filter (videos used in a KBL day) | **MISSING**. |
| Thumbnail source toggle Featured / Vimeo | **MISSING** (P2; v2 uses `videos.thumbnail_url` = featured images first; backfill fills the rest). |
| Active filter chips with × and "Clear all" | **DONE**. |
| Sort: Program order, Title A–Z, Title Z–A, In the program first, By level | **MISSING**. |
| Source tabs: Everything / Technique videos / Program lessons; "From every program" lessons index (program filter chips, 60 rows, links into course) | **MISSING** (P1: add a "Lessons" segment using `ordered_lessons` across accessible programs). |
| Inline player panel at top: autoplay, level pills, categories, tag buttons (tap adds tag filter), Save video / Saved, Close player | **PARTIAL** — separate video page `/library/[video]` with player, Save, Collections, **Also in** program links, related ("more like this"). Tag-to-filter from the video page **MISSING**. |
| Grid 2–5 cols, portrait poster with level pill, category eyebrow, title, hover bookmark (compact) | **DONE** (VideoCard + save toggle). |
| Empty states: "Nothing saved yet — Tap the bookmark on any video…" + Browse all videos; "No videos match “x”" / "No videos match those filters — Try a different level, drop a tag…" + Clear filters | **DONE** (equivalents). |
| Access rule: program-tagged videos only for members with access | **DONE** (`library_videos`, `can_view_video`). |
| Continue watching (spec 07) | **MISSING** (positions exist in `lesson_positions.video_seconds`; library videos have no position store → add `video_positions` or reuse `lesson_positions` with null lesson). |

---

## 7. Saves

Legacy `src/routes/_authenticated/saves.index.tsx`, `src/components/{save-card,save-detail}.tsx`, `src/lib/use-saves.ts`. v2 `app/(app)/you/saves`, `components/you/SavesView.tsx`.

| Legacy | v2 |
|---|---|
| Kinds segmented with counts: All · Tools · **Plans** (saved workout session plans/tables) · Videos | **PARTIAL** — Videos · Tools · Readiness (v2 extra, with CSV). No "Plans", no "All". |
| Per-tool filter "Every tool / <tool>" when Tools selected | **MISSING**. |
| Date range: All time / Last 7 / 30 / 90 days | **MISSING**. |
| Grouped by month ("November 2026") | **MISSING**. |
| Card: kind icon, title, source, date, "View result"/"Open" | **PARTIAL**. |
| Detail sheet: tool result ("Your result", title, summary, score, "Your answers" list, Recommended bells), **Copy/share as text**; workout plan (phase label, the circuit table, or "Retake this session's assessment to view its current KBL workout."); video (player or "This video is no longer in the library.") | **MISSING** (no detail view). |
| Empty state per kind | **DONE**. |

Porting notes: "Plans" = readiness-generated session tables. v2 `readiness_results` snapshots the prescription (table) per lesson — show them as "Session plans" (title = lesson title, phase, band, table) instead of a new table. Detail sheet: `components/you/SaveDetail.tsx` using the `CircuitTable` from `ui/day` once merged (import only, no edit).

---

## 8. Plan / schedule / reminders

Legacy `src/routes/_authenticated/schedule.index.tsx` (1,243 lines), `src/components/{next-session-card,reminder-timing}.tsx`, `src/lib/{schedule.functions,schedule-sync,calendar,reminders,reminder-controls,reminder-log.functions,notifications.functions}.ts`, `src/hooks/use-reminders.tsx`, `src/routes/_authenticated/reminders.history.tsx`. v2 `app/(app)/plan/**`, `components/plan/**`, `app/(app)/plan/calendar.ics/route.ts`, `components/you/SettingsView.tsx`.

| Legacy | v2 |
|---|---|
| Page "Build your schedule — Drop training days onto the calendar in whatever rhythm fits your week. Set reminders and decide what happens when life gets in the way." | **DONE** (Plan screen, week/month). |
| "Created for you — Self-guided plans" (AI plans list) | **DONE** ("Goals and plans" list with progress). |
| No-schedule empty: "No schedule yet — Pick a level and we'll create a blank calendar…" + create per level; delete schedule | **DONE** (templates / build my own / end plan). |
| **Guided schedule** one-tap patterns: 3 days/week (M W F), 4 (M T Th F), 5 (M–F), Every day → autofill | **PARTIAL** (template start with day picker; Immersion schedule). |
| Plan overview: "Days placed" ring, Placed, Missed, "Behind the plan" with fix | **DONE** (plan detail stats, missed banner "Fix my plan"). |
| Month calendar (Monday-first, prev/next), drag days onto dates, tap-to-pick then tap-date, remove from date, "Days to place" tray | **DONE** (drag from LessonPicker, add sheet, move/skip/remove). |
| **If you miss a day**: Shift everything forward / Skip the missed day / Catch up on the weekend (with hints) | **PARTIAL** — `enrollments.missed_day_rule` + `apply_missed_day_rule` exist; no UI to choose the rule. |
| **Calendar sync**: Add to Apple Calendar (.ics), Google Calendar link for next session, Outlook note | **PARTIAL** — `.ics` export; no Google quick-add link. |
| NextSessionCard: next session label, reminder state, **Skip today's reminder** ("Today's reminder skipped — Your schedule is untouched — reminders resume tomorrow."), **Snooze**, "Reminders back on" | **MISSING**. |
| Reminders block: on/off, Reminder time + custom time, frequency (Every day / Weekdays / Chosen days), **time per day** (per-weekday overrides), timezone select, browser notifications permission row | **PARTIAL** — Settings: push/email toggles, days, time, quiet hours. Missing: frequency presets, per-day times, timezone (profile has `timezone`), permission prompt. |
| Delivery loop: in-app toast + system Notification "Time to train" / "Don't break the chain" (streak), honouring quiet hours, once per day, logged | **MISSING** (no sender; see §11). |
| Reminder history `/reminders/history`: "Troubleshooting — Reminder history — Every nudge this app tried to deliver…", stats (sent, opened, snoozed/skipped, failed), event list with channel (System notification / Email / In-app), Clear history; empty "No reminders yet…" | **MISSING**. |
| Schedule-created email | **MISSING** (§11). |

DB: add `notification_events` (user_id, kind, channel, status sent|opened|failed|skipped|snoozed, payload, error, created_at, opened_at) and extend `notification_prefs` with `reminder_times jsonb`, `frequency text`, `new_content bool`, `announcements bool`, `in_app_enabled bool`, `snoozed_until timestamptz`, `skip_date date`.

---

## 9. Rewards, points, badges, certificates

Legacy `src/content/badges.ts`, `src/lib/achievements{,.functions}.ts`, `src/hooks/{use-achievements,use-milestone-watch}.tsx`, `src/components/{gamification,milestones,celebrate}.tsx`, `src/routes/_authenticated/certificate.$courseId.tsx`, `src/lib/certificate-pdf.server.ts`. v2 `app/(app)/you/rewards`, `components/you/{RewardsScreen,MedalCase,MedalArt,YouScreen}.tsx`, `components/training/CertificateView.tsx`, `app/verify/[code]`, DB `badges`, `member_badges`, `points_ledger`, `certificates`, `my_rewards()`, `evaluate_badges`.

| Legacy | v2 |
|---|---|
| 14 badges (First Rep, One Week In, Thirty Deep, On Ramp Cleared, Phase I/II/III Complete, Momentum, Unbroken, Lifestyle, Self-Aware, Fully Assessed, Beginner Graduate, Intermediate Graduate) with tiers bronze/silver/gold | **DONE** (same 14 rows, rules in `badges.rule`). |
| XP derived from progress (10/lesson, 40/day, 250/phase); levels Novice 0 · Apprentice 500 · Practitioner 1,500 · Craftsman 3,500 · Master 7,000; XpBar "N XP to <next>" / "Top level reached" | **DONE (different)** — points ledger (5/step, 50/day, 250/section, 1,000/path, 25/tool, 500/referral), numbered levels with names (`level_name`). Copy on Rewards "Points arrive when friends you invite join, and with some medals" is outdated → update. |
| Badge grid with earned date / "Not earned yet", tier ring | **DONE** (MedalCase). |
| **Badge-unlocked toast** "Badge unlocked — <name>" (mounted globally, syncs earned badges after progress) | **MISSING** — `complete_step` returns new badges? surface them in a global host (shell, lead). |
| Global **CelebrationHost** (full-screen card, confetti 70, haptics, "Keep training", action) for level/program/certificate ("Certificate awarded — You finished every phase, day and lesson of this level. The certificate is yours to view, print or save." → View certificate) | **UI/DAY** for in-player; global host for non-player triggers (tools "Assessment complete") **MISSING**. |
| Milestone watch: Program complete "You finished Kettlebell Lifestyle — Every level, every phase, every day. Claim your certificates, or restart a level to run it again." | **PARTIAL** (path complete → certificate; program-complete message missing). |
| Certificate page: "Print / Save as PDF", certificate sheet (name, title, phases, Mike Salemi signature, date) | **DONE** — CertificateView with crest, verify code, Share, Save as PDF (print). |
| Certificate **PDF attachment emailed** on completion (`pdf-lib`, `certificateFileName`) | **MISSING** (§11). |
| Account › Achievements tab: Badges ("Keep training to unlock the rest."), Certificates (empty "No certificates yet — Finish a full level to earn a certificate of completion.") | **DONE** (You → Certificates row with "Your first certificate — Finish Level I to earn it. N days to go"). |
| "Past runs" (AttemptHistory per level) | **MISSING** (`run_archive`). |
| Reward email "You just earned: <badge>" with streak and total badges | **MISSING** (§11). |

---

## 10. Referrals

Legacy `src/routes/_authenticated/referrals.index.tsx`, `src/lib/referrals.functions.ts` (`referrals`, `referral_events`). v2 `app/(app)/you/referrals`, `components/you/ReferralsView.tsx`, `referral_codes`, `referrals`, `claim_referral`, `reward_referrer`.

| Legacy | v2 |
|---|---|
| Head "Bring someone with you — Training holds better when someone else is doing it too. Share your code — you earn points when a friend joins, and more when they commit." | **PARTIAL** (code + How it works). |
| Code card + full link ("Generating your link…"), Share link / Copied (Web Share or clipboard) | **DONE**. |
| Share channels: WhatsApp, Email, X (logged as visit events) | **MISSING**. |
| Points + next tier "N pts to <reward>" / "Every reward unlocked" | **MISSING**. |
| Funnel stats: Link visits, Signups, Purchases | **PARTIAL** (friends list with status Joined/Became a member/Rewarded). |
| "Rewards — What points unlock": 500 → Printable plan bundle; 1,000 → Mastering the Kettlebell — Ballistic tier | **MISSING** (v2 reward = 30 days Pro + 500 pts; confirm with client which applies; keep v2 commercial rule, show tiers as points milestones if client confirms). |
| "Invite tracking" event list (Link visited, Friend signed up, Friend purchased) | **PARTIAL**. |

---

## 11. Emails & notifications (every template and trigger)

Legacy: `src/lib/email.server.ts` (Resend sender, `APP_URL`, From "Kettlebell Lifestyle <noreply@…>" and "Mike Salemi <mike@…>" via `RESEND_FROM_EMAIL[_MIKE]`), `src/lib/email-content.server.ts` (layout: preheader, heading, subheading, body blocks `p`, `sectionTitle`, `scoreBlock`, list, CTA button + note; accent `#2d6bff`, paper `#f4f7ff`; plain-text alternative), `src/lib/email-kinds.ts` (catalogue), `src/lib/email.catalog.server.ts` (sample data), `src/lib/notify.server.ts` (`notifyByEmail`: respects `notification_preferences.channel_email`, never throws, attaches certificate PDF), `src/lib/email.functions.ts` (`sendNotificationEmail`, `renderEmailPreview`, `sendCatalogTestEmail`), `src/lib/account-email.functions.ts` (`requestPasswordReset` via `auth.admin.generateLink` + branded email, `sendWelcomeEmail`), `src/routes/_authenticated/emails.index.tsx` ("Email centre — Every email we send — Pick any email to see exactly what lands in an inbox, then send yourself a live copy…": grouped list, iframe preview, Send test). **v2: nothing sends email** except Supabase Auth's built-in confirmation/magic-link/reset emails. → **MISSING (P0)**.

| Template | Sender | Trigger (legacy) | Subject / heading / CTA | v2 trigger point |
|---|---|---|---|---|
| welcome | Mike | right after sign-up (`sendWelcomeEmail` from `/auth`) | "Welcome to Kettlebell Lifestyle — start here" / "Welcome, <name>" / "Four short steps and you're training today." / **Finish setup** → /onboarding | `lib/auth/actions.ts signUp` and `auth/callback` first login (send once; marker in `seen_markers` `email:welcome`) |
| password_reset | brand | reset request on sign-in screen | "Reset your Kettlebell Lifestyle password" / "Reset your password" / "This link is single-use and expires shortly." / **Choose a new password** / "If you didn't ask for this, you can safely ignore this email." | `requestPasswordReset` → `auth.admin.generateLink({type:'recovery'})` + branded email (or Supabase SMTP via Resend with a custom template) |
| tool_result | brand | every saved tool result (`progress.functions.ts saveToolResult`) | "Your <tool> results — 62" / "<tool>: <result title>" / "Saved to your account so you can compare it against your next check-in." / score block, "Your answers" table, "What to do next" list / **View the full breakdown** → /tools | `lib/actions/discover.ts saveToolRun` |
| reward | Mike | one or more badges earned (`achievements.functions.ts syncAchievements`) | "You just earned: <badge>" or "You just earned new rewards" / "Reward unlocked" / "Earned the hard way — by showing up." / badges, total badges, streak / **See your rewards** | after `complete_step` / `submit_readiness` / tool insert when `member_badges` gains rows (DB trigger → outbox, or server action checks returned `new_badges`) |
| certificate (+PDF) | Mike | level/course completion (`issueCertificate`) | "Your certificate: <title>" / "You earned your certificate" / "Congratulations — that's a real milestone." / phases list / **View your certificate**; PDF `certificateFileName(title)` | insert into `certificates` (in `after_lesson_complete`) |
| schedule_created | brand | schedule generated (`schedule.functions.ts createSchedule`) | "Your training schedule starts <date>" / "<name> is live" / "First session: <date>." / reminder time, days/week, first 3 days / **Open your schedule** | `start_plan_from_template`, `schedule_immersion`, custom plan save |
| training_reminder | brand | daily at reminder time on chosen days (prefs) | "Today: <day label>" or "Time to train" / "Your session is ready" / phase, minutes, streak, lesson list / **Start today's session** | cron (see below) |
| streak_nudge | brand | after a few quiet days (streak at risk) | "Keep your <n>-day streak alive" / "One session gets you back" / "A short session counts. Start there." / **Train now** | cron |
| weekly_summary | brand | weekly (Sunday) | "Your week: <d> days, <l> lessons" / "Here's how your week went" / "<n>-day streak and counting." / days, lessons, minutes, wins, next up / **Open your progress** | cron (Sunday, user timezone) |
| new_content | brand | new material lands in the library | "New in your library: <title>" / "New content just landed" / items list / **Open the library** | Studio action "Announce" on program/videos publish |
| test | brand | Notifications tab "Send me a test email" | "Your Kettlebell Lifestyle emails are working" / "Email notifications are live" / "Delivery confirmed to this address." / **Manage notifications** | Settings button |

In-app/system notifications (legacy `use-reminders.tsx`): "Time to train" (training reminder), "Don't break the chain" (streak), all logged to `reminder_events`. v2 has `push_tokens` but no web-push.

Porting notes (W3):
- `apps/web/src/lib/email/{send.ts,layout.ts,templates.ts,catalog.ts,notify.ts}` — port `email.server.ts` + `email-content.server.ts` verbatim (swap colours to v2 tokens: glacier-blue accent, light paper), `notify.ts` = `notifyByEmail` reading `notification_prefs.email_enabled` and the per-kind toggles (`streak_nudge`, `weekly_recap`, `offers_email` for new_content/announcements).
- Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_EMAIL_MIKE`, `APP_URL` (Vercel). Ask Ahmed to connect the client's Resend account / sending domain.
- Event emails: an **outbox** table `email_outbox(id, user_id, kind, payload jsonb, status, attempts, sent_at, error, created_at, unique(user_id, kind, dedupe_key))` filled by DB triggers on `member_badges`, `certificates`, `tool_results`, `member_plans` (keeps "members never write rewards" — triggers run as definer), drained by `app/api/cron/email/route.ts` (Vercel Cron every 5 min, service role). Never fail the member action.
- Scheduled emails: `app/api/cron/reminders/route.ts` hourly: for each user whose local time (profile `timezone`) matches `reminder_time` on an active day, outside quiet hours, not skipped/snoozed → training_reminder (today's plan item or current lesson); streak nudge when `streak_current>0` and last activity ≥2 days; weekly summary Sundays. Log every attempt to `notification_events`.
- Certificate PDF: `app/api/certificates/[id]/pdf/route.ts` with `pdf-lib` (port `src/lib/certificate-pdf.server.ts`), used for the email attachment and a "Download PDF" button.
- Studio **Email centre** `app/studio/emails/page.tsx`: list by group (Account, Tools, Milestones, Reminders, Updates), sender, trigger text, iframe preview from `catalog.ts` sample data, "Send me a test".
- `vercel.json` crons (lead adds).

---

## 12. Account / settings

Legacy `src/routes/_authenticated/account.tsx` (tabs Overview, Achievements, History, Notifications, Organization), `src/components/{identity,training-insights,getting-started}.tsx`. v2 `app/(app)/you/**`, `components/you/{YouScreen,SettingsView}.tsx`.

| Legacy | v2 |
|---|---|
| Header: avatar (upload), name, email, program ring, MiniStats, XP bar | **PARTIAL** (You: rewards summary, progress list). Avatar upload **MISSING**. |
| Overview › Details: display name edit, program level "Level 1 — Beginner" / "Not set — complete onboarding" | **PARTIAL** (name edit in Settings). |
| Progress by level: each level %, bar, phase chips "Phase 1 64%", Go to Immersion | **PARTIAL** (per-program ring rows). |
| Past runs | **MISSING** (§9). |
| Getting-started checklist | **MISSING** (§1). |
| Orders ("Everything you've bought or unlocked") | **DONE** (`/you/billing` orders). |
| History › Training insights: Sessions logged, Time trained (h), Avg session (min), Heaviest bell, "Trending heavier/Backing off/Holding steady", Weekly volume (8 weeks), Load progression; empty "No training data yet — Save a workout day's session plan…" | **MISSING** → spec 07 passport (UI/SG `training_sessions`); W4 renders it on You once the log exists. |
| History › Saved assessments, Workout tables | **PARTIAL** (Saves). |
| Notifications tab: Training reminders (Remind me to train "On the days you've scheduled", Reminder time, Reminder days), What we send (Streak nudges, Weekly summary "every Sunday", New content, Announcements), Channels (Email, In-app), **Send me a test email**, Quiet hours ("Pause notifications overnight"), Browser notifications permission | **PARTIAL** — Settings covers reminders/quiet hours/streak/weekly/offers; missing New content vs Announcements split, In-app channel, test email, browser permission. |
| Organization tab (seats, members table with level and last active; preview) | **DONE** (`/you/organization`, org coach view). |
| Theme toggle | **DONE**. |

---

## 13. Onboarding / intake

Legacy `src/routes/_authenticated/onboarding.tsx`, `src/content/onboarding.ts` (13 steps), `src/lib/onboarding.functions.ts`, `src/routes/_authenticated/programs.$programSlug_.intake.tsx`, `src/lib/program-intake.functions.ts`, `src/components/form-kit.tsx`. v2 `app/(app)/onboarding`, `components/today/OnboardingFlow.tsx` (goal-setting), `packages/api/src/intake.ts`, DB `intake_forms` (goal-setting, kbl-intake, mtk-intake), `submit_intake`.

| Legacy | v2 |
|---|---|
| KBL intake, 13 steps one per screen (StepRail, back, "Please answer this question to continue."): kettlebell history, level, fitness baseline + consistency, joint mobility (shoulders/hips), goals (focus areas multi), hydration, sleep (+ "Questions to consider on sleep quality"), nutrition & digestion, stress & balance (level, management, work-life), time with yourself, flexibility, posture ("Not sure?" note), coordination ("baby giraffe… cheetah") | **MISSING in UI** (form seeded as `kbl-intake`). |
| Result "See my plan": course label pill, headline, summary, priorities list, **Start Level I →**; saves `program_level` | **MISSING** (`intake_result` RPC exists). |
| v2 goal setting (5 questions → plan suggestion) | **DONE** (v2 extra). |
| Per-program intake `/programs/$slug/intake` for every DB program: questions single/multi/text (≤1000 chars), progress `k/n`, **Save my intake**; review page "Your program approach": headline, priorities ticks, "Keep in mind: <caution>", **Open program**, Review answers, **Start fresh** (confirm "Clear your answers and start this intake from scratch?", toast "Starting a new attempt — earlier answers are kept") | **MISSING**. Tailored guidance per program in `program-intake.functions.ts` L68–75 (A4L, Training Room, MTK, Roadmap, Working-In, Path, MoM). |
| Course page links "Take program intake" / "Review intake" | **MISSING**. |

Porting notes (W2): route `app/(app)/intake/[program]/page.tsx` + `components/intake/{IntakeFlow,IntakeReview}.tsx` reusing the OnboardingFlow step UI pattern (copy, don't import from `components/today`); per-program guidance templates into `intake_forms.result` config so `intake_result` returns headline/priorities/caution; history = `intake_responses` rows (attempts are rows, so "Start fresh" = new row).

---

## 14. MTK plan

Legacy `src/routes/_authenticated/mtk-plan.{index,results,schedule}.tsx`, `src/lib/{mtk-plan,mtk-paths}.ts`, `src/lib/mtk-plan.functions.ts`, `src/content/mtk-lesson-meta.json`; legacy course viewer MTK hooks (§3c). Older code-defined `mtk.index.tsx` / `mtk.$moduleSlug.tsx` (tiers, module pages) were superseded by the DB course — **skip**. v2: engine ported (`packages/core/src/mtk.ts`: `recommendMtkPath`, `profileFromAnswers`, `selectMtkLessons`, `groupIntoDays`, `weeksNeeded`, `mtkLessonsFromCurriculum`, `MTK_LESSON_META`), `program_paths` focus paths (ballistic, overhead, lower, full) with section ids, `mtk-intake` form. UI → **MISSING**.

Legacy flow to port:
1. Assessment = MTK program intake (§13).
2. Results `/mtk-plan/results`: eyebrow "Mastering the Kettlebell · Your results", **"<N> of <M> lessons recommended"**, cards Your MTK level (Foundation/Developing/Proficient/Advanced), Your strengths, Focus areas / gaps; summary (AI once per attempt, factual fallback "…That is N of M lessons; the rest of MTK stays open in Full Curriculum."); "Your personalized curriculum" (movement groups with lesson lists); **Your schedule**: "How quickly would you like to finish?" (weeks), "Learning days per week", "Time per learning session" → preview "<k> learning days · about <w> weeks"; **Create my plan** → toast "Your MTK plan is active"; "Browse the full curriculum"; "Want different results? Retake the assessment".
3. My Plan `/mtk-plan`: My Plan / Full Curriculum segmented; Overall progress; **Next lesson** card + Play (opens course in plan mode); "Plan complete — every recommended lesson is done."; "Upcoming learning" / "All learning days" toggle (day cards: Day n, title, k/n done, lessons); Results & schedule; Retake ("Your completed lessons are kept and this plan is archived"); "N earlier plan versions archived".
4. Course integration: "Recommended for you" dots, on-path section dots (intake path), plan-mode banner and order, opening MTK with a plan lands on My Plan.

DB (W2 migration): `member_plans.source` add `'mtk'`; MTK days are unscheduled → either allow `plan_items.on_date` null with a `seq int` + `day_index int`, or store days in `member_plans.inputs.days` (lesson id arrays) and create dated items only if the member schedules. Recommended: second option (no change to `my_week` semantics), plus `source='mtk'` and `status='archived'` for old versions.

---

## 15. Retreats

Legacy `src/routes/_authenticated/retreats.{index,$retreatSlug.index,$retreatSlug.apply,$retreatSlug.hub}.tsx`, `src/content/{retreats,retreat-gallery}.ts`, `src/components/retreat-photos.tsx`, `src/lib/retreat-applications.functions.ts`, `src/hooks/{use-retreats,use-checklist}.ts`. v2 program page (`RunSales` in `components/experiences`), `/experiences/[run]` hub, `/experiences/[run]/apply`, `program_runs`, `itinerary_items`, `run_applications`, `run_checklist`, `my_experiences`.

| Legacy | v2 |
|---|---|
| Retreats index: "Men of Movement — Retreats — Four days in Mount Shasta with nineteen other men…"; cohort cards with status pill (Applications open / Past cohort / Waitlist), dates, location; "What it is not — No performance, no forcing" | **PARTIAL** — runs on the program page; "What it is not" block **MISSING**. Nav "Retreats" tab **MISSING** (reachable via Programs › Experiences). |
| Retreat page: hero, chips "20 men max · Mount Shasta, CA · Fixed cohort dates · By application", What this retreat is, What you walk away with, How the four days unfold, More from the mountain (gallery), side card status + CTA (Apply for your place / Join the waitlist / Retreat finished) with "Dates and itinerary set by Mike's team", "Payment details shared after acceptance", "How it comes together" 3 steps; Preparation, Facilitators (Mike Salemi, Dr. Jonny Suarez, Greg Schmaus, Tim Corcoran, Lauren Salemi), After the retreat, Documents, FAQ "Questions men ask", closing "Twenty places. That's it." / "The room is full for now." | **PARTIAL** — RunSales; verify facilitators, FAQ, closing CTA copy, "How it comes together" steps exist in run/program data. |
| Apply: 4 steps Intention ("What are you coming to the mountain for?" multi: Break through patterns…, Reconnect with my body…, Find clarity through a life transition, Build real brotherhood; "What's calling you to this work right now?"), Readiness (experience 3 options; health/injuries/medication; dietary needs for Lauren's kitchen), Commitment (phone, emergency contact + phone), Review ("Ready to send? Nothing is charged…"); success "Application received" / "You're on the waitlist"; closed state | **DONE** (`ApplyForm`); confirm all fields map. |
| Hub: phase Countdown / Happening now / Integration, "You're on the land"/"Welcome home", Preparation progress, tabs, checklists Prerequisites + Packing (persisted), On the land gallery with lightbox (←/→), Location and travel, Itinerary, Your guides, Downloads, Integration support | **DONE** (`RunHubView`: countdown ring/journey bar, checklists, live calls, itinerary, travel, gallery, documents, help, after). |
| Admin cohort editor (dates, status, capacity, "Dates not announced yet (show as TBD)") + applications list with status | **PARTIAL** (Studio experiences: runs, applications read-only → add status actions). |

---

## 16. Coaching

Legacy `src/routes/_authenticated/coaching.index.tsx`, `src/content/coaching.ts`, `src/lib/coaching.functions.ts`. v2 `app/(app)/coaching`, `components/experiences/CoachingBoard.tsx`, `coaching_packages` (5), `coaching_credits`, `coaching_slots` (**0 rows**), `book_coaching`, `cancel_coaching`.

| Legacy | v2 |
|---|---|
| Head "Work directly with Mike — Bring your footage and your sticking point. Every session ends with a written plan you can train tomorrow."; stats Upcoming / Sessions done / Minutes per session | **PARTIAL** (credits ring "Sessions left"). |
| "Coming up — Your next session" with status Awaiting confirmation / Confirmed | **DONE** (bookings, cancel → "session returned"). |
| Step one "Choose a package" | **DONE** (packages, checkout). |
| Step two "Pick a time — Mike coaches Tuesday to Saturday. Times show in your local timezone." | **PARTIAL** — day strip + times, but **no slots exist**; `programs.meta.schedule` (weekdays 2–6, 07:00–14:00 America/Los_Angeles) should generate `coaching_slots` (cron or Studio "Open next 4 weeks"). |
| Step three "What do you want to work on?" placeholder "My snatch loses the arm lockout past rep 15…" | **DONE** (note in confirm sheet). |
| Summary Package / Time / Total, Book this session, terms "Cancel or move your session up to 48 hours before it starts." | **PARTIAL** (copy check). |
| History "Previous sessions" with notes; empty "No sessions yet — Once you've trained with Mike, every session and its notes live here." | **PARTIAL** — verify coach notes render. |

---

## 17. Shop — **MISSING**

Legacy `src/routes/_authenticated/shop.index.tsx`, `shop.$productSlug.tsx`, `src/content/shop.ts`, `src/components/checkout.tsx`, `shop_orders`.
- Shop index: "Shop — Tools for the practice"; filters Everything / Digital / Equipment; "Pick your next tool" grid; trust row (Secure checkout — "Card details never touch our servers."; Shipping updates — "Emailed the moment your order moves."; Built to last — "Leather goods made in Bulgaria."); "Your orders" with count and Total spent.
- Products: printable phase plans (free, from `src/content/plans.ts`), **Suples Bulgarian Bag® — Original Leather** ($136, size variants), **5-Minute Downshift Workshop**, 1-on-1 Coaching Intensive (by application), Retreat Deposit (by application, "Holds your place", "Applied to the full retreat price").
- Product page: images, "Choose a size", Buy now / Order placed, trust chips (Secure checkout, Ships from the US / Instant access, Yours for life), "Also in the shop", copy "We'll email shipping details once your order is confirmed." / "One-time payment · lifetime access."
- Porting (P2, W4): v2 commerce has `bundles`, `prices`, `orders`; add `program_type 'product'` or a `products` table with `variants` + shipping address capture in Stripe Checkout (`shipping_address_collection`); images `src/assets/shop-*.jpg` → `apps/web/public/media/shop/`.

---

## 18. Admin

Legacy `src/routes/_authenticated/admin.index.tsx` (tabs: Pricing, offers & placement · Announcement bar · Main copy · Retreats & applications · KBL form entries), `admin.content.tsx` (generic content graph editor: programs/sections/lessons/sublessons/videos/tags with drip, readiness/table flags), `structure.index.tsx` (KBL hierarchy editor: courses → phases → days → lessons with content-block capabilities, duplicate/delete day, reseed), `emails.index.tsx`, `src/components/kbl/form-entries-panel.tsx`, `src/lib/{admin-content,site-settings,kbl-entries,retreat-applications}.functions.ts`. v2 Studio `app/studio/**`.

| Legacy | v2 |
|---|---|
| Program merch editor: name, card summary, button label, price, visibility, "Included for all members", Badge, Offer line, Programs page section, Order, "Feature on Home (when member has no progress)", live card preview | **PARTIAL** — Studio programs (details, curriculum, pricing & access, intake). Badge/offer/CTA/featured/vertical fields **MISSING** (store in `programs.meta`). |
| Announcement bar: enabled, badge, text, link; preview | **PARTIAL** — Studio `notices` editor; **member render MISSING** (shell banner + `placement` today/program/library). |
| Main copy: Home page (hero label, featured slug, enrolled row title), Programs page (title, intro, flagship label/title/description) | **MISSING** (site_settings keys `home`, `programs_page`). |
| Retreat cohorts (dates, status, capacity, TBD) + applications (status update) | **PARTIAL** (runs editor; applications read-only). |
| KBL form entries: filter by form, table Submitted / Member / Day / Score / Result | **MISSING** (`readiness_results`; add `app/studio/readiness/entries/page.tsx`). |
| Content graph editor / Structure editor | **DONE** (Studio curriculum tree, readiness forms/tables editors, library). |
| Email centre | **MISSING** (§11). |
| Members (search, progress, grant/revoke) | **DONE** (v2 extra). |

---

## 19. Global shell touches

| Legacy (`src/components/app-shell.tsx` and friends) | v2 |
|---|---|
| Nav: Home, Programs, Retreats, Library, Schedule, Account (+ Tools, Coaching, Referrals; MTK shortcut when owned; admin Structure) | **PARTIAL** — 5 tabs Today · Programs · Library · Plan · You. Retreats/Coaching/Tools reachable but not in nav; consider a "More" group in the desktop sidebar. |
| AnnouncementBar (admin) | **MISSING** render (§18). |
| CelebrationHost + badge toast + milestone watch (global) | **MISSING** (§9). |
| StatusBar (per-section contextual line + CTA, `src/lib/status-context.ts`) | Skip (v2 large titles). |
| Route prefetch, pending bar | **DONE** (RouteProgress). |
| Theme toggle | **DONE**. |

---

## 20. Programs data quality

Query used (re-run after the backfill finishes):

```sql
-- structure and copy
select p.slug, p.type, p.status, p.is_free, p.is_listed, p.catalog_group,
  p.tagline is not null tagline, coalesce(p.summary,'')<>'' summary, coalesce(p.description,'')<>'' descr,
  cardinality(p.highlights) hl, p.format_label, p.level,
  (select string_agg(distinct role, ',') from program_media m where m.program_id=p.id) media,
  (select count(*) from sections s where s.program_id=p.id) sections,
  (select count(*) from lessons l where l.program_id=p.id) lessons,
  (select count(*) from steps st where st.program_id=p.id) steps,
  (select count(*) from steps st where st.program_id=p.id and st.video_id is not null) steps_video,
  (select count(*) from lessons l where l.program_id=p.id and l.estimated_minutes is null) no_minutes
from programs p order by p.position;
-- video metadata per program
with pv as (select st.program_id, st.video_id from steps st where st.video_id is not null
  union select st.program_id, sv.video_id from step_videos sv join steps st on st.id=sv.step_id
  union select program_id, video_id from program_videos)
select p.slug, count(distinct v.id) videos,
  count(distinct v.id) filter (where v.duration_seconds is null) no_duration,
  count(distinct v.id) filter (where v.thumbnail_url is null) no_thumb,
  count(distinct v.id) filter (where v.privacy_hash is null) no_hash,
  count(distinct v.id) filter (where v.meta ? 'oembed_error') oembed_err,
  count(distinct v.id) filter (where v.meta ? 'no_thumb') no_poster
from programs p join pv on pv.program_id=p.id join videos v on v.id=pv.video_id group by p.slug;
```

### Layout readiness per program (snapshot 07:05Z)

| Program | Type · status | Image (program_media roles) | Tagline | Summary | Description | Highlights | Sections · lessons · steps | Steps with video | Clips (step_videos) | Lessons with minutes | Other gaps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| kettlebell-lifestyle | day_program · published | card, gallery (**no hero**; level images in `program_paths.meta.image`) | ✓ | ✓ | ✓ (569) | 3 | 8 · 134 · 740 (2 levels) | 566 | 1,591 | **0/134** (all 740 steps have `duration_label` → compute) | `meta` empty; hero video only in path meta; 8 phase PDFs ✓; 8 section intro videos ✓ |
| mastering-the-kettlebell | course · published | hero | **✗** | ✓ | ✓ (155, thin) | 3 | 52 · 303 · 303 (11 groups, 4 focus paths) | 279 | 285 | 0/303 | `format_label`, `level` null; "Home" intro section counted; 19 lessons with attachments |
| athleticism-4-life | course · published | hero | **✗** | **✗** | **✗** | **0** | 28 · 135 · 135 (6 groups) | 122 | 289 | 0/135 | 4 empty steps (no video, no body); "Home" counted |
| the-path-to-inspired-action | course · published | hero | **✗** | **✗** | **✗** | **0** | 10 · 47 · 47 | 30 | 0 | 0/47 | `draft_note = "Predecessor to The Grounded King"` makes the card show **Draft** — move to `meta.note` |
| working-in | course · published | hero | **✗** | ✓ | ✓ | 3 | 4 · 4 · 4 | 3 | 16 | 0/4 | "Home" counted (1 of 4 lessons!) |
| men-of-movement (prep) | course · published · unlisted | hero | **✗** | **✗** | **✗** | **0** | 2 · 8 · 8 | 5 | 0 | 0/8 | five-pillars intro + locked integration module copy (§3c) not in data |
| what-your-kettlebell-swing-is-missing | course · free | hero | **✗** | ✓ | ✓ | 3 | 6 · 12 · 12 | 11 | 0 | 0/12 | "Home" counted |
| free-6-video-kettlebell-mini-series | course · free | hero | **✗** | ✓ | ✓ | 3 | 2 · 8 · 8 | 7 | 0 | 0/8 | "Home" counted |
| kettlebell-roadmap | tool · free | hero | **✗** | **✗** | **✗** | **0** | 6 · 6 · 6 | **0** | 10 | 0/6 | no `program_modes` row; legacy shows it under Tools › Free resources |
| essential-kettlebell-training-strength | course · **draft** | **none** | **✗** | **✗** | **✗** | **0** | 1 · 11 · 11 | **0** | 26 | 0/11 | 5 empty steps; keep draft until content confirmed |
| the-training-room | course · archived | hero | ✗ | ✗ | ✗ | 0 | 28 · 135 · 135 | 122 | 286 | – | duplicate of A4L (hidden in legacy too) — leave archived |
| men-of-movement-retreats | retreat · published | hero, card, 18 gallery | ✓ | ✓ | ✓ | 3 | – | – | – | – | 3 runs; draft note on dates/pricing |
| coaching | coaching · published | **none** | ✓ | ✓ | ✓ | 3 | – | – | – | – | **0 coaching_slots**; legacy image `coach.jpg` |
| executive-edge | coaching · published | **none** | ✓ | ✓ | ✓ | 3 | – | – | – | – | Draft label ✓; legacy image `coach.jpg` |
| the-grounded-king | live · **draft** | **none** | ✓ | ✓ | ✓ | 3 | – | – | – | – | legacy image `tgk.jpg` |
| zen-savage | challenge · published | **none** | ✓ | ✓ | ✓ | 3 | – | – | – | – | legacy image `working-in.png` reuse; draft note ✓ |

### Video metadata per program (snapshot 07:05Z, before most of the backfill)

| Program | Unique videos | No duration | No thumbnail | No privacy hash* |
|---|---|---|---|---|
| kettlebell-lifestyle | 121 | 121 | 29 | 2 (both `needs_key`) |
| mastering-the-kettlebell | 419 | 419 | 419 | 419 |
| athleticism-4-life | 117 | 117 | 117 | 19 |
| the-training-room | 117 | 117 | 117 | 19 |
| the-path-to-inspired-action | 23 | 23 | 23 | 22 |
| working-in | 19 | 19 | 19 | 19 |
| essential-kettlebell-training-strength | 26 | 26 | 26 | 0 |
| what-your-kettlebell-swing-is-missing | 11 | 11 | 11 | 11 |
| kettlebell-roadmap | 10 | 10 | 10 | 0 |
| free-6-video-kettlebell-mini-series | 7 | 7 | 7 | 7 |
| men-of-movement | 5 | 5 | 5 | 5 |
| coaching, executive-edge, the-grounded-king, zen-savage, men-of-movement-retreats | 0 | – | – | – |

\* `privacy_hash` null means "public or unknown". It only matters for unlisted videos: those return 404 from oEmbed without the hash.

Whole table (748 videos): 07:05Z → duration 0, thumbnail 99, hash 261, `needs_key` 2. 07:30Z (backfill running) → duration 270, thumbnail 270, `http 404` 28, `no_thumb` 102, untouched 348. **~07:45Z (first pass finished, `remaining` 0): duration 270, thumbnail 270, oEmbed `http 404` 28, oEmbed answered without poster/duration (`meta.no_thumb`, i.e. domain-restricted embeds) 450.** So 478/748 videos still have no poster and no duration. The 99 pre-existing thumbnails are the legacy "featured images" in `apps/web/public/media/library/` (keep them — legacy Library defaulted to "Featured" artwork).

### How legacy got Vimeo thumbnails and durations

- `src/lib/vimeo-meta.ts`: `fetchVimeoMeta(id or "id/hash")` → `https://vimeo.com/api/oembed.json?url=https://vimeo.com/<id>/<hash>&width=1280`, reading `thumbnail_url`, `thumbnail_width/height`, `duration`, `title`. Memoised per id, in-flight de-duplicated, mirrored to `sessionStorage` (`kbl:vimeo-meta:v1`); `fetchFirstVimeoMeta(candidates)` picks the first id with a poster (day tiles use the first 3 step videos of a day — `dayVimeoCandidates`); `prefetchVimeoMeta` warms the next 4 days; `formatVimeoDuration` → "12:04".
- It ran **in the browser on the app's own domain**, so domain-restricted videos answered. vumbnail.com was disabled (`REMOTE_POSTERS_ENABLED = false`) because it returns a black padlock for private videos. No poster → deterministic gradient from `idHue(vimeoId)`.
- v2 has the server-side equivalent `apps/web/src/app/api/internal/vimeo-backfill/route.ts` (commit `c6c8189`, `?token=…&limit=150&referer=…&retry=1`) writing `videos.thumbnail_url`, `duration_seconds`, `meta.aspect`, `meta.no_thumb`, `meta.oembed_error`.

### Fixes (W5)

1. First pass is done; re-run with `retry=1&referer=https://<legacy or production domain>` for the 450 `no_thumb` (domain-restricted embeds answer only with an allowed Referer). For the 28 `http 404`: these are unlisted without a hash — get hashes from the old project (`xdhuyzuxutrsexjjtggp`, `program_lessons.vimeo_id` / `sublesson_videos` / `library_videos.vimeo_id` hold `id/hash`) or the Vimeo API (`GET /videos/{id}?fields=duration,pictures.base_link,link` with a token from the client's Vimeo account), then null `meta.oembed_error` and re-run.
2. UI fallback for any remaining poster gap: ClipRow/VideoCard should use a lesson/program image or the `idHue` gradient (legacy `ClipCard`), never an empty box.
3. `lessons.estimated_minutes`: KBL = sum of step `duration_label` minutes (legacy `dayMinutes` parsed `parseInt(duration)`); courses = round(sum of step video `duration_seconds`/60) after the backfill. One SQL update; keep it in a data migration.
4. Copy: fill tagline/summary/description/highlights for A4L, Path to Inspired Action, Men of Movement prep, Kettlebell Roadmap, MTK tagline/format_label/level, Working-In/6-video/Swing taglines, from the old project `programs.summary/description/meta.highlights` and legacy `src/content/programs.ts` (MTK: "400+ videos of kettlebell technique", description, highlights "400+ technique videos · Lift-by-lift progressions · Lifetime access"). No invented copy — mark Draft where unknown.
5. Images: download legacy assets `coach.jpg`, `tgk.jpg`, `fire.jpg`, `mom.jpg`, `mtk.jpg` (Lovable storage `/media/l5e/<asset_id>/<file>` per `src/assets/programs/*.asset.json`, served from the legacy deployment) into `apps/web/public/media/l5e/<asset_id>/`, insert `program_media` (hero + card) for coaching, executive-edge (coach.jpg), the-grounded-king (tgk.jpg), zen-savage (working-in.png); add a `hero` row for kettlebell-lifestyle (level images or a wide photo).
6. Intro sections: `sections.meta.intro = true` for the "Home" section of the 7 courses; exclude from counts (DB functions) and render as "Start here".
7. `the-path-to-inspired-action.draft_note` → `meta.note`.
8. `kettlebell-roadmap`: add a `program_modes` row (`self_guided`) or render it as a tool page with the roadmap lessons.
9. KBL hero video: expose `program_paths.meta.hero_video` ("398409642/f4e1f0e247") as "Watch intro" (program page belongs to training — note for `ui/selfguided`/lead).
10. Coaching: generate `coaching_slots` from `programs.meta.schedule` for the next 4 weeks (Studio action + weekly cron).

### Re-check after W5 (Nov 20, 13:30Z, migration `0015_content_quality`)

Same two queries as above (published programs unless noted; `the-training-room` stays archived and is left as is).

| Check | Before W5 (12:45Z) | After W5 | Notes |
|---|---|---|---|
| Published programs without tagline | 8 | **0** | A4L, Path, MoM prep, Roadmap, MTK, Working-In, 6-video, Swing from lesson text / legacy `programs.ts` / old project summaries (`meta.copy_source` on each). |
| Published programs without summary / description / highlights | 4 / 4 / 4 | **0 / 0 / 0** | Only `essential-kettlebell-training-strength` (draft) has none — no source anywhere; `draft_note` says so. |
| Programs without any image | 5 (coaching, executive-edge, the-grounded-king, zen-savage, EKTS) | **1** (EKTS, draft) | `coach.jpg`, `tgk.jpg` copied from legacy to `public/media/l5e/<asset>/`; zen-savage reuses `working-in.png` as legacy did. hero + card rows. |
| Kettlebell Lifestyle `hero` | missing | **Vimeo poster of the intro video** (398409642) | Level art is 360px wide (too small for a hero). |
| Lessons with `estimated_minutes` | 0 / 803 | **386 / 803** | KBL 134/134 (authored step labels), A4L 122/135, Roadmap 4/6, EKTS 3/11, Path 1/47. MTK, Working-In, Swing, 6-video, MoM prep wait for durations (Vimeo API). 245 course steps got a `"N min"` label from Vimeo. `refresh_estimated_minutes()` re-runs after every backfill call. |
| Intro ("Home") sections flagged | 0 / 8 | **8 / 8** | `sections.meta.intro = true`, `label = "Start here"`; `my_enrollments` counts and program completion (`after_lesson_complete`) skip them. |
| Path to Inspired Action shows "Draft" | yes (`draft_note`) | **no** | moved to `meta.note`. |
| Kettlebell Roadmap `program_modes` | 0 | **2** (self_guided default, library) | |
| Concept pages (L3) data: `meta.price_label`, `meta.sections`, `meta.faq` | 1 / 0 / 0 programs | **6 / 5 / 4** | coaching, TGK, MoM retreats, executive-edge, zen-savage (price), MTK — copy from legacy `programs.ts`. |
| Catalog vertical (`meta.vertical`) | 0 | **14** | legacy `VERTICAL_OF` mapping. |
| Open coaching slots | 0 | **140** (next 4 weeks, Tue–Sat 07:00–14:00 Pacific) | from `programs.meta.schedule`; Studio › Experiences › Coaching slots "Open next N weeks". |
| `site_settings` `home`, `programs_page` | missing | **ported** from the old project | edited in Studio › Site copy. |
| Videos without duration / poster | 478 / 478 | 478 / 478 | Needs `VIMEO_ACCESS_TOKEN` (docs/specs/ENV.md); the route now uses the official API for these. Designed poster fallback: `components/poster/PosterFallback`. |
| oEmbed 404 (unlisted, no hash) | 28 | **27** | "Thruster" 97940376 was a typo for 897940376/8ea774c873 (old `program_sublessons`): clips and library link repointed. The other 27 (Path calls ×22, MoM prep ×5) have no hash in the old project or legacy code → API (`meta.needs_api`). |
| Domain-restricted (`meta.no_thumb`) | 450 | 450 | API pass; we do not spoof the Referer. |

Video metadata per program (after): KBL 2 of 128 missing · MTK 419/419 · A4L 10/117 · Path 22/23 · Working-In 19/19 · Swing 11/11 · 6-video 7/7 · MoM prep 5/5 · Roadmap 0/10 · EKTS 0/26.

**Lead follow-ups (files W5 does not own):** route `/programs/<slug>` for `coaching | live | challenge | retreat` types to `/experiences/programs/<slug>` (L3, `ConceptView`); catalog/program-page counts should skip `sections.meta.intro` (`curriculum_progress` still returns intro lessons so their state shows); use `PosterFallback` in `ClipRow`, `VideoCard`, `SavesView`, `VideoView` where `thumbnail_url` is null; merch keys in `programs.meta`: `badge`, `offer`, `cta_label`, `featured`, `vertical`; notices placements `banner | today | program_page | you` (Studio › Notices explains each).

---

## 21. Prioritised build list and workstreams

P0 = the client asked explicitly or it is core to "proper layout and data"; P1 = legacy feature members used; P2 = nice to have / preview-era features.

**Layout rule (P0 for every workstream):** each page is rebuilt to its legacy layout block in §L (section order, columns, sticky bars, card contents, grouping) in the new visual style; v2 additions slot in without reordering. Layout ownership: L0 shell → Lead · L1, L2, L16, L22 → W1 · L12–L15 → W2 · L11 (creator), L18, L19, L32, L20 Notifications tab → W3 · L17, L20 (other tabs), L21 (PDF only), L23, L29 → W4 · L3, L24–L28, L30, L33 → W5 · L6 → `ui/day` · L4, L5, L7–L10 → `ui/selfguided` (program page is training-owned; the lead decides whether L4/L5 land in `ProgramView` or as restored routes).

Migration numbers are reserved to avoid clashes: `0011` → `ui/selfguided` (training_sessions), `0012` → W2, `0013` → W3, `0014` → W4, `0015` → W5. Lead merges; shared files (`components/ui`, shell, `apps/web/src/app/(app)/layout.tsx`, `vercel.json`) are changed only by the lead.

### W1 — Home dashboard & Discover (Programs catalog, Library, Tools)
Owns: `apps/web/src/components/today/**`, `app/(app)/today/**`, new `lib/loaders/home.ts`, new `lib/actions/home.ts`, `components/discover/**`, `app/(app)/programs/page.tsx`, `app/(app)/library/**`, `app/(app)/tools/**`, `lib/loaders/discover.ts`, `lib/actions/discover.ts`, `packages/api/src/{catalog,library,tools}.ts`, fixtures `today-*`, `discover-*`.
- P0 Home: Continue hero with % + Review state; **Your programs** rail (all enrollments, %, progress label, Up next, Start/Resume/Review); **Start something new** rail with one-tap Join (enroll → open first lesson); **Explore next** (locked, Unlock · price → explore/checkout); **Retreats & gatherings** rail; featured hero for members with no enrollment (`site_settings.home`); keep rings, week, goal, events, OfferSlot; streak in hero.
- P0 Library: results count, sort (program order, A–Z, Z–A, in the program first, by level), level → category → tag cascade with "match all", "In the program" filter, Lessons segment ("From every program"), tag chips on video page that apply a filter; Continue watching rail (needs position store — coordinate with W4/lead if a table is needed).
- P1 Programs catalog: search, flagship KBL hero, verticals grouping (Kettlebell Mastery / Athletic Performance / Mind-Body, Longevity & Retreats), card badge/offer/highlights/counts/instructor, Retreats shortcut.
- P1 Tools: intro bullets, previous-result awareness ("Run it again"), follow-along videos in results, recent saves on `/tools`, completion celebration.
- P2 Library saved views (preferences), artwork toggle; getting-started checklist card on Home.

### W2 — Courses, program intakes and MTK plan
Owns: new `components/course/**`, new `app/(app)/programs/[slug]/course/[lesson]/**` (new files only), new `app/(app)/intake/[program]/**`, new `components/intake/**`, new `app/(app)/mtk/**` (`/mtk` My Plan, `/mtk/results`), new `lib/loaders/{course,mtk}.ts`, `lib/actions/{course,intake,mtk}.ts`, `packages/api/src/intake.ts`, new `packages/api/src/mtk.ts`, `packages/core/src/mtk.ts` (+ new `packages/core/src/lesson-body.ts`), migration `0012_mtk_plans.sql`.
- P0 Course player (legacy Template 2): sticky bar (back, %, About, Lessons drawer, Focus), grouped curriculum nav with search and counts, Start here intro (not counted), overview panel, lesson breadcrumb, video, audio cards, markdown body, technique breakdown clips, downloads, Previous / Complete & continue / Next with next-lesson title, last-lesson memory, mobile drawer; Men of Movement prep panel. Lead swaps course links to `/course/` at merge.
- P1 Program intakes: flow, save, review ("Your program approach": headline, priorities, caution), review answers, Start fresh (new attempt), links from course overview; KBL 13-step intake with level recommendation and "Start Level I/II" (decide with client whether it gates Immersion).
- P1 MTK: results page (level, strengths, gaps, N of M, summary, personalised curriculum, schedule chooser, Create my plan), My Plan page (progress, next lesson, upcoming/all days, retake with archive, version count), plan mode in the course player (banner, plan order, recommended dots, on-path section dots, My Plan/Full Curriculum toggle).

### W3 — Plan, reminders, emails and notifications
Owns: `components/plan/**`, `app/(app)/plan/**`, `components/you/SettingsView.tsx`, `app/(app)/you/settings/**`, `lib/auth/actions.ts` (welcome + branded reset only), new `lib/email/**`, new `app/api/cron/{email,reminders}/route.ts`, new `app/studio/emails/**`, new `app/(app)/you/notifications/**` (reminder history), `packages/api/src/plans.ts`, migration `0013_notifications_email.sql` (`email_outbox`, `notification_events`, `notification_prefs` additions, outbox triggers on `member_badges`, `certificates`, `tool_results`, `member_plans`).
- P0 Email system: Resend sender, branded layout, all 11 templates with plain-text alternatives, outbox + triggers for tool_result, reward, certificate (+PDF via W4's route), schedule_created; welcome on first sign-in; branded password reset; test email in Settings; Studio Email centre (preview + send test).
- P1 Reminder delivery: hourly cron for training reminder, streak nudge, weekly summary (timezone, days, per-day times, quiet hours, skip today, snooze), web-push for `push_enabled` (service worker by lead), reminder history page with stats and Clear; NextSession card in Plan with Skip today / Snooze.
- P1 Plan: missed-day rule chooser (Shift forward / Skip / Catch up on the weekend), guided patterns (3/4/5/every day), Google Calendar quick-add for next session, AI-or-deterministic "Create my plan" (legacy creator form, real lesson ids only) → `member_plans(source='ai')`.
- P2 New-content emails (Studio "Announce" action), Settings split New content / Announcements / In-app.

### W4 — You: rewards, saves, certificates, referrals, shop
Owns: `components/you/**` except `SettingsView.tsx`, `app/(app)/you/{page,rewards,saves,referrals}/**`, new `app/api/certificates/[id]/pdf/route.ts`, `packages/api/src/rewards.ts`, new `app/(app)/shop/**` + `components/shop/**`, migration `0014_you_shop.sql` (shop products/variants if built; library `video_positions` if W1 needs it).
- P0 Rewards: global celebration + badge-unlocked toast host component (`components/you/CelebrationHost.tsx`, mounted by lead in the shell), program-complete milestone, Rewards copy update, progress-by-level panel with phase %, Past runs list (`run_archive`).
- P1 Saves: All tab, Session plans (from `readiness_results` snapshots, rendered with the `ui/day` `CircuitTable`), per-tool filter, date range, month grouping, detail sheet (answers, recommended bells, copy/share text, video player).
- P1 Certificates: PDF route (`pdf-lib`, port `src/lib/certificate-pdf.server.ts`) for email attachment and download.
- P1 Referrals: share channels (WhatsApp, Email, X), points tiers display (confirm reward rule with client), funnel counts.
- P1 Training insights on You once `training_sessions` exists (sessions, time trained, avg session, heaviest bell, weekly volume, load trend).
- P2 Shop (products, variants, shipping via Stripe Checkout, order history), avatar upload.

### W5 — Data quality, Studio parity, experiences
Owns: `app/studio/**` (except `studio/emails` → W3), `components/studio/**`, `lib/studio/**`, `packages/content/**`, `apps/web/public/media/**` (new assets), `components/experiences/**`, `app/(app)/experiences/**`, `app/(app)/coaching/**`, migration `0015_content_quality.sql` (data only: media rows, copy, intro flags, estimated minutes, draft_note fix, roadmap mode, coaching slots).
- P0 Vimeo: finish backfill, referer retry, resolve the 28 404s (hashes from old project or Vimeo API), poster fallback guidance; durations into `estimated_minutes`.
- P0 Program data: copy for 6 programs, images for 4 programs + KBL hero, intro sections flagged and excluded from counts (DB function change reviewed with lead), Path draft note fix, Roadmap mode.
- P1 Studio: program merch fields (badge, offer line, CTA label, featured, vertical), Home/Programs copy editor (`site_settings` `home`, `programs_page`), readiness entries browser, application status actions (accept/decline/waitlist + note), coaching slot generator; notices placements documented for the lead's announcement bar.
- P1 Experiences/coaching copy parity: "What it is not", facilitators, FAQ, "How it comes together" steps, coaching head/stats/terms copy, previous sessions with notes.

### Lead (shared files, small)
- Mount W4's `CelebrationHost` and an announcement bar (reads `notices` placement `banner`) in `app/(app)/layout.tsx`/shell; nav "More" (Retreats, Coaching, Tools, Referrals) on desktop sidebar.
- Switch course links to W2's `/course/` route in `ProgramView` and loaders after `ui/day`/`ui/selfguided` merge.
- `vercel.json` crons for W3; env vars for Resend.

### Single ordered P0 list
0. Lead: shell per L0 (resume card, Unlocked group, More sheet, announcement bar); every workstream rebuilds its pages to §L.
1. W5 Vimeo backfill completion + poster fallbacks + `estimated_minutes`.
2. W5 program copy/images/intro-section fixes.
3. W1 Home dashboard (programs rail, start new, explore/unlock, retreats, featured).
4. W2 Course player for all `course` programs.
5. W3 Email system + event emails (+ W4 certificate PDF).
6. W1 Library parity (sort, cascade, in-program, lessons, count, continue watching).
7. W4 Celebration/badge toast host + rewards panels.
8. `ui/selfguided`: §4 legacy Self-Guided surfaces (level picker, phase tabs + search, phase PDFs, About disclosures, Average Day, creator, day position restore, Let's Begin, completion CTA).
9. `ui/day`: §3b checklist.
