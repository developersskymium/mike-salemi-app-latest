# 14 — Kettlebell Roadmap Coach (v1)

Source plan: `14-roadmap-coach-source-plan.md` (written without our codebase; the client said "adjust according to your liking"). This file is what we built and why.

## Decided (lead, Nov 21; Mike can override any of these)
- **v1 = no camera, no AI.** Test → map → practise → re-test. Benchmarks are counted and timed by the app (tap-to-count, set/side tracking, rest timers) and confirmed by the member ("I kept the standard", "I breathed through my nose"). Fixed rules decide phase moves. Camera rep checks (reusing the Swing Set-Up engine) and the AI coach are v2.
- **Unnamed Phase 3 benchmark** "4 × 8 each arm, 30 s rest" = **Single Arm Swing**.
- **"Moderate weight (for you)"** = one bell size up from the Kettlebell Selector suggestion (else the lightest bell in the training profile, else 12 kg), one size down per recent "too hard". "Light" (and the carry's "low to medium") = the suggestion itself.
- **Passing a movement** = every one of its benchmarks met on **2 separate days** (member's local date), with nasal breathing self-confirmed in Phases 1 and 3. **Passing a phase** = every movement passed; the PDF fallbacks (Halo for the Half Kneeling Overhead Press, staggered stance for the Row With Reciprocity, walking lunge for the overhead lunge) count.
- **Phase 4** is open-ended (no benchmarks); it opens after Phase 3 and shows its movements as "Mastery" practice.
- **Level I / II pairs**: the workout video's five pairs (Two Hand Deadlift ↔ Two Hand Swing; Split Squat (goblet) ↔ Static Split Squat – Overhead Press; Floor Press ↔ Elbow Post Raises; Lunge Row supported ↔ unsupported; Glute Bridge ↔ Single Leg Glute Bridge) plus sensible pairs for the rest (Goblet Squat ↔ with pause, Deadlift ↔ Single Leg Deadlift (supported), Halo ↔ Half Kneeling Press, HK Press ↔ Standing Press, Suitcase Deadlift ↔ Farmer's Carry, Dead Stop Clean ↔ Clean, Strict ↔ Push Press, 2-Hand ↔ Single Arm Swing, Rack ↔ Overhead Reverse Lunge, Staggered ↔ Reciprocal Row, Phase 4 pairs). Editable in `roadmap_movements.pair_easier/pair_harder`.
- **Lunge clip mislabel**: the existing clip (Vimeo 730403243) shows under Phase 3 "Overhead Reverse Lunge"; Phase 2 "Reverse Lunge in Rack Position" shows "Clip coming".
- **Access**: placement test + map are free for every signed-in member (lead magnet). Re-tests and phase sessions need any plan or purchased program (`owned`/`included` in `access_states`, or admin); others see them locked with "Unlock" → the KBL sales sheet.
- **Safety**: no placement test with reported pain/injury (the member is started in Phase 1 bodyweight work instead); bodyweight benchmarks run before light, light before moderate; when in doubt place lower (testing starts one phase below the guess, Phase 1 for anyone new, max Phase 2 start for under a year, and failing the very first test of a start above Phase 1 drops the run a phase); "Pain or dizziness? Stop" is on every benchmark and session screen and never counts as a pass. No under-18 restriction (no camera).

## Further choices made while building (v1)
- **Body Integrity** is a Phase 1 node of its own for the three bodyweight benchmarks (20 roll-ups, 30 bridges, 30 squats); the four lifts are the other Phase 1 nodes.
- **Placement credits**: every movement below the placed phase counts as passed ("Credited by your placement test"); benchmarks met during the test count as day 1 of 2.
- **Movement-by-movement unlocks** (`unlock_after`): 2-hand swing ← deadlift; standing press ← HK press; farmer's carry ← single arm row; rack lunge ← goblet squat; clean and single arm swing ← 2-hand swing; push press and half get-up ← standing press; overhead lunge ← rack lunge; row with reciprocity ← farmer's carry. The whole placed phase is open.
- **Draft benchmarks where the PDF has none**: rack lunge 8 each side (light), row with reciprocity 3 × 8 each side (moderate). Draft quality lines throughout — Mike to replace.
- **Overhead check** is a wall self-check (thumbs to the wall without rib flare), not a camera measure. It suggests Halo; the member can switch on the benchmark card.
- **Sessions**: warm-up (KBL phase warm-up video) → breath (Breathe Light) → 2–4 movement blocks (teaching set 45 s, 4 × 20 s work / 10 s rest, 30 s change-over) → decompression (Spinal Roll Down with Chest Opener). Learning → Level I, practising/passed → Level II. Today's KBL readiness = Recovery (or rest) → breath + decompression + spine only. Every session passes the rule checks shown on its intro (open movements only, warm-up first, breath, decompression last, 2–4 blocks).
- **MTK lessons** per node come from the MTK lesson tags (`mtk_tag` → 2 technique + 2 common-fault lessons) unless `mtk_lesson_ids` is set.

## What's where
- Rules: `packages/core/src/roadmap.ts` (+ tests). The catalog there is the source of the 0038 seed (`roadmapSeedSql`).
- Data: `supabase/migrations/0038_roadmap_coach.sql` — `roadmap_movements`, `roadmap_benchmarks` (read: signed-in; write: admins), `roadmap_placements`, `roadmap_node_states` (cache for Admin Studio), `benchmark_attempts` (`rep_check` = v2 camera seam), `phase_sessions` (own rows; admins read all). API: `packages/api/src/roadmap.ts`.
- Web: `/tools/roadmap` (intro or map + node sheet `?node=`), `/tools/roadmap/test`, `/tools/roadmap/retest/[movement]`, `/tools/roadmap/session`. Loader `lib/loaders/roadmap.ts` (preview store per mock persona), actions `lib/actions/roadmap.ts`, components `components/roadmap/*`.
- Entry points: Tools index card (first listed tool), "Find my phase" on the Kettlebell Roadmap program page, a hand-off on the catalog "Find Your Kettlebell Phase" quiz result.

## v2 seams
- Camera: `RoadmapAttempt.check` / `benchmark_attempts.rep_check`; `attemptMeets` already refuses "close" and "can't judge". The Swing Set-Up Coach's engine (`packages/core/src/swing-setup.ts`, ui/swing) plugs in per movement.
- AI coach: `buildPhaseSession` + `sessionChecks` are the rules any AI proposal must pass; `phase_sessions.checks` records them.

## Not done in v1
- Home "Continue" showing the phase + next node: the Continue logic (`lib/continue.ts`) deliberately excludes tools/lead magnets; adding a Roadmap card there is a separate small change.
- Admin Studio Roadmap tab (phase spread, stuck nodes, editing standards and pairs).
- Per-step timestamps of the full workout video; HD originals; the 11 missing clips.

## Mike must provide
Written quality standards per movement (the draft lines are placeholders); confirm the Single Arm Swing benchmark, the rack-lunge and reciprocal-row benchmarks, the "moderate" rule and the pairs; the Phase 2 rack lunge clip; clips for Deadlift, Halo, Single Arm Row, Standing Press, Farmer's Carry and Phase 4; HD originals of the 9 clips.
