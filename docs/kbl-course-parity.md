# KBL source parity release

The new app restores the course gaps found in the October 31, 2026 lesson audit. WordPress was used only for authenticated reading and definition exports; no WordPress content, settings, users, forms, or course progress were changed.

## Curriculum

- Both levels retain their 61 training days, existing day URLs, and all 712 existing lesson progress identifiers.
- Eight original phase overviews and four phase transition pages are now accessible in the course sequence. These add 28 counted steps, for 740 total steps across 134 pages. Overview and transition pages are separate from the 122 training days.
- The 124 “Let's Begin” introductions remain day introductions rather than duplicate progress steps.
- Full authored lesson notes are displayed in Immersion and Self Guided, including paragraphs whose beginning matches the shortened description.
- Intermediate Day 41 and Day 52 restore the original Completion videos, including their Vimeo privacy hashes.
- Intermediate Day 26's duplicated warm-up instructions are corrected. The Intermediate On Ramp starter uses source table 13; Beginner uses table 1.
- The original On Ramp overview replaces the placeholder course intro. Source schedule illustrations, transition resources, and known Vimeo privacy hashes are retained.
- Each level starts independently. Navigation stays within that level. Certificates and phase completion require all applicable pages, while calendars and training-day counters use only training days.
- Desktop videos keep their aspect ratio above long notes and workout tables instead of collapsing to zero height.
- Printable certificates use the same account-name lookup as the rest of the app, including an existing sign-in name when no separate profile display name has been saved.
- The Average Day example preserves the alternate video used by the original WordPress Self Guided Workout III page, restores its 15 demo links and stretch recommendations, and resolves the matching Level I Phase II workout rules by course context. Selecting a demo starts it directly.

## Workout rules

`source-readiness.json` contains the 14 original Gravity Forms definitions reduced to the fields and rules needed by the app. `source-workout-tables.json` contains the 44 required TablePress prescriptions, including exercise, circuit, rest direction, intensity, reps, sets, tempo, separators, notes, and illustrations.

All 51 readiness days use their own phase, level, and workout rules. The assessment, workout lesson, session plan, saved assessment, and CSV export use the same resolver. The server recomputes a result from valid answers and day context; a client cannot supply its own exercise prescription.

Intentional corrections in the new app:

1. The owner approved **tired = yes: 15 points**, replacing the inherited zero. The maximum becomes 60 and the existing complete-rest range becomes reachable. WordPress retains its original scoring.
2. Three copied default confirmations pointed to the wrong full workout. Forms 25, 26, and 27 now fall back to their own full tables (29, 33, and 39).
3. Intermediate Day 15's original page has no embedded form. It uses the matching Phase I, Level II, Workout A definition (form 23).

Recovery and complete-rest results show their authored guidance without a fabricated exercise table.

Saved-workout CSV files retain circuit rest breaks, notes, and rest arrows as well as the exercise prescriptions. They use UTF-8 with a byte-order mark so spreadsheet applications preserve those arrows.

The existing Saved results navigation now opens the saved history page instead of redirecting to the video library. Workout reads admit only valid KBL day/course/phase contexts. Saved videos use the current access-aware KBL catalogue, and saved tools use the supported KBL tool list, so restoring history does not expose retired content. Saved results use the shared portalled dialog, preventing the mobile navigation from covering its download controls and providing keyboard focus management.

## Deliberately retained app differences

- The final old LIVE50 subscription promotion remains replaced by KBL continuation guidance.
- The final Beginner training days keep the corrected 58–61 numbering instead of the repeated source Day 57 labels.
- The empty duplicate Intermediate On Ramp Day 3 Completion remains removed. The actual Completion retains its existing app progress identifier.

## Verification

- 293 automated checks pass across ten test files, including every original page, stable lesson/day IDs, source tables, full notes, completion boundaries, independent level starts, the original Self Guided example definitions, and CSV circuit breaks/notes.
- All 108 valid answer combinations are checked for every readiness day: 5,508 day-specific evaluations against independently generated original-source fixtures plus the approved scoring correction.
- Type checking, targeted lint (zero errors), and the production build pass.
- The supplied student completed all 134 pages and 740 counted steps through the browser. All 51 readiness days saved results; their stored answers and results match independent original-source fixtures plus the approved corrections. The account received both certificates and nine appropriate badges.
- All 121 distinct curriculum video references opened with playback controls. The Average Day's four main videos and 15 demos also passed playback checks. This is a functional walkthrough, not a claim that every minute of every video was watched or that the physical workouts were performed.
- The mobile browser downloaded the full-workout CSV after correcting the overlay; its file matches the expected course data. Modified-workout notes and Off Day guidance display correctly, and CSV contents pass source-based tests. Two further browser file captures could not be confirmed. Final published-site verification is recorded separately.

The release cache marker is `2026-11-01-kbl-course-parity`. The app clears its old runtime caches once per browser while preserving authentication and stored progress. No database schema migration is required.
