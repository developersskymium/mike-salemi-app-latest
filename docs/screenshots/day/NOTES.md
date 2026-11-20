# KBL day view: restored original layout (new design system)

Source of truth: legacy `src/routes/_authenticated/immersion.day.$dayId.tsx`, `self-guided.day.$dayId.tsx`,
`components/kbl/circuit-table.tsx`, `components/readiness.tsx`, `workout-table.tsx`, `auto-advance.tsx`, `day-gates.tsx`,
`VimeoPlayer.tsx` (ResumePill), `celebrate.tsx`, `lesson-notes.tsx`. Captured with `MOCK_DATA=1` on port 3107, 390×844 (2x) and 1440×900, light + dark.
Fixtures are real v2 rows (`training-lesson-l1-phase-2-d24`, `-d25`, `-d25-ready` (score 25, Chart 2 Modification, table 41), `-l1-on-ramp-d1` (starter table 1)).

| Screenshot | Original layout it reproduces |
| --- | --- |
| `d24-recovery-*` | Full-screen day (no sidebar / tab bar, 100dvh, own scroll areas). Top bar: exit X → program page, eyebrow "Level · Phase · Day", day title, step pills (done / active / upcoming, locked dimmed; md+), Autoplay next switch, "done/total" (sm+), mini progress ring. No "Session plan" because Day 24 has no workout. Body: stage column (edge-to-edge 16:9 video on black, then the meta bar "Step n of N · duration", title, one-line summary, desktop prev / Mark complete / next), then LessonDetails ("In this lesson · N clips", "Plays through automatically", poster clip cards with index, duration and play badge). Right rail 21.5rem "Today's sequence" + "Complete each step to unlock the next.", numbered list with duration, clip count, lock and per-row complete toggle, and the day footer ("Next day locked · Finish every step to unlock Day 25", "Back to Day 23"). Phone: single column, the sequence + footer under the content, thumb-zone bar (prev / Mark complete / next). |
| `d24-start-*` | Start-of-day popup (bottom sheet on phone, centred card on desktop): context eyebrow, "It's a new day, {name}.", the Let's Begin text, Steps and Time tiles, "Start Day 24", "Press Esc any time to jump straight in." Shown once (server seen-marker, device fallback). |
| `d25-readiness-*` | Day 25 before readiness. Step 1 has no video, so the stage is omitted (as in the original). The Training Readiness Assessment is inline on its step: progress rail, "Question n of N", the question, options, the "consider this" note, Back and "Your workout table unlocks when this is done". The meta bar button reads "Start assessment" and scrolls to the form. "Session plan" appears in the top bar. |
| `d25-readiness-result-*` | The same step after the assessment: "Readiness result" card (band dot, band title, summary, score/max, "Fatigue score", "Lower is better"), "What you selected" recap, "Retake today's assessment". Step 1 row shows "Score 25 · Chart 2 Modification". |
| `d25-after-readiness-*` | Workout step: video, meta bar, then "Today's workout table" + "Built from the Training Readiness Assessment you completed at the start of today." and the CircuitTable for the prescribed table (Chart 2 → table 41). Locked notice ("Your workout table is locked" / "Go to the assessment") before readiness; recovery / off-day notice (band message + "Open recovery and stretching videos") when the band has no table. |
| `d25-session-plan-*` | "Session plan · Day 25" sheet, "Level I · Phase 2 · The workout from your KBL program.": readiness assessment (result + recap here) and the same CircuitTable. Desktop sheet widened to 840px so the table fits. |
| `onramp-d1-*` | On Ramp day with a direct table (no assessment): notes as paragraphs, 4 clip cards, then "Today's workout table" + "Today's starter table from the program." and table 1 with its notes ("*Arrows indicate exercises done consecutively…", whitespace pre-line). Footer shows "Next · Day 2" because Day 2 is already open. |
| `selfguided-d25-*` | Self-Guided (inside the app shell, as in the original): sticky context bar (back, title, "Level · Phase", "N lessons") with a chip per lesson (scroll-spy), intro (eyebrow, title, focus, Let's Begin box with its image), every lesson stacked (left: "n of N · duration", title, description when no notes; right: notes, video, readiness form, workout table, completion, "Exercise demos" grid with their own players), previous / next day cards. |

## Workout table (CircuitTable), identical to the original
- One table, columns Type | Exercise | Rest | Intensity | Reps | Sets | Tempo, header hints as `title` tooltips.
- Type = original TablePress badge image `row.circuitIcon` (/kbl/icons c, c1–c3, s1–s5); Rest = `row.restIcon` arrow image + `row.rest`.
- Circuit breaks exactly from the data: `row.separator` (string label after that row, the v2 shape; all 54 in `workout_tables` are this), separator-only rows, or legacy `table.separators` ({after, label}). Label shown verbatim, centred across all 7 columns.
- Alternating row tint, `notes` (pre-line) and `images` under the table. CSV export is a small secondary link.
- Phone: same table, horizontal scroll (min-width 44rem), Type + Exercise pinned; break labels stay centred in the visible width. No cards, no regrouping, no invented text.
- Dark mode: only the dark-grey `rest-down` arrow is inverted so it stays visible; the coloured badges and blue up arrows are untouched.
- Verified against `workout_tables` (44 tables; row keys circuit, circuitIcon, exercise, intensity, reps, rest, restArrow, restDir, restIcon, separator, sets, tempo; 9 tables with images): every field the original showed is shown.

## Deliberate differences
- Styling only: Liquid tokens, hairline separators, glass top bar and phone bar, Glacier for the primary action and the active step. Done states are neutral (label colour), not green.
- Readiness form is inline under its step (per brief) instead of the original's popup dialog; the same component is in the Session plan.
- Video stays poster-first on first load (no Vimeo load until play); moving between steps starts playback, as the original did.
- Motion: spring title change between steps, the check draws itself on Complete, mini ring fills with a soft spring, confetti + cheer on completion; all off under reduced motion.
