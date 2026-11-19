# KBL: WordPress handoff vs. the app (verification, 20 Nov 2026)

The WordPress migration handoff (`KBL-Migration-Handoff`, read-only export of 19–20 Nov 2026) was compared item by item against the KBL implementation already in this app (see `docs/kbl-course-parity.md`). The app was built from an earlier read-only export (1 Nov 2026). This check confirms nothing changed on WordPress since, and that nothing is missing.

**Result: the app already contains all of the KBL workout forms, logic, tables and table images. No content changes were needed.**

## What was compared

| Area | WordPress handoff | App | Result |
|---|---|---|---|
| Workout readiness forms | 14 forms (2, 22–34) | `src/content/source-readiness.json` (14 forms) | **Match**: question wording, field IDs, every answer weight, every confirmation rule (strict score ranges), routed table per result, recovery/off-day messages, default table |
| Form per training day | 50 lessons with an embedded form | 51 readiness days | **Match** in every phase of both levels (see the one documented addition below) |
| TablePress tables | 46 exported, 42 referenced by forms (+ 1 and 13 for On Ramp) | `src/content/source-workout-tables.json` (44 tables) | **Match** for all 44, cell by cell: exercise, rest, intensity, reps, sets, tempo, rest arrows, circuit/station type, "rest before next circuit" breaks, notes (26 tables) and illustrations |
| Tables not in the app | 14 and 64 ("Copy of Workout 1 – level 1") | not used | Not referenced by any form or lesson; intentionally not imported |
| Table images | 15 files | `public/kbl/source/` | **All 15 present**, byte-identical (MD5). The 3 exercise illustrations are shown as images. The 12 icons (circuit C/C1/C2/C3, station S1–S5, down arrow, loop-back arrow) are drawn by the app from the same data, which is sharper on mobile and supports dark mode |
| Kettlebell Selector | forms 19 / 36 (16 scenarios) | `src/content/kettlebell-selector.ts` | **Match**: every one of the 16 answer combinations leads to the same scenario number |
| Intake Questionnaire | form 18 | 13-step onboarding | Same questions and choices, in the same order |

## Intentional differences (approved earlier; still in place)

1. **Tired = yes scores 15** (WordPress: 0). The maximum score becomes 60, so the Off Day result (54–60) can actually happen. On WordPress it never could, which the handoff also flags.
2. **Forms 25, 26, 27 fall back to their own Full Workout tables (29, 33, 39)**, not table 15, which was a copy-paste default on WordPress. The handoff flags this too.
3. **Intermediate Phase 1, Day 15** has no form embedded on WordPress (lesson `day-8-2`, "Workout I Day"). The app uses that phase's Workout I form (23) so the day isn't missing its workout.
4. Scores 1–22 show the full workout, as WordPress's default confirmation does.
5. Form 2, field 19's displayed labels (High/Medium/Low) are kept as WordPress stores them. The app scores by weight, which is unaffected.

## Not verifiable from this handoff

- **Kettlebell Selector bell weights.** WordPress redirects to `/kettlebell-selection-tool/kettlebell-selection-tool-results/#1…#16`. That page's content is not in the export, so the app's 16 weight rows (`kettlebell-selector.ts`) could not be re-checked. To confirm, export that page or screenshot it.
- **Stretch Test scoring.** Form 17 redirects to `/strech-test/result`, where a custom plugin computes the result. The plugin code is not in the export.
- **Form 1 "Daily Readiness".** Placeholder questions ("First Choice / Second Choice"), plus a custom shortcode (`junaid_is_the_best`). It's not used by any KBL lesson and isn't needed.
- **Custom shortcodes** (`completion_video`, `reactive`, `tlpteam`, `real_boss`, `junaid_is_the_best`) are WordPress plugin code. The app replaces their behavior natively: completion steps, progress, badges and certificates.

## How to re-run

```
KBL_HANDOFF=/path/to/KBL-Migration-Handoff python3 scripts/kbl-verify/compare_tables.py
KBL_HANDOFF=/path/to/KBL-Migration-Handoff python3 scripts/kbl-verify/compare_notes.py
KBL_HANDOFF=/path/to/KBL-Migration-Handoff python3 scripts/kbl-verify/compare_forms.py
```

Expected output: tables report only 14 and 64 (unused copies); notes and forms report 0 issues.
