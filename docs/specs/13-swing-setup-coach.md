# 13 · Swing Set-Up Coach (v1)

Source plan: `13-swing-setup-coach-source-plan.md` (written outside the codebase). This is the simplified v1 we build, adjusted to our structure. Not deployed before the Nov 21 demo; merges after.

**Goal.** "What Your Kettlebell Swing Is Missing" becomes a tool: the member films their set-up side-on, the app measures it against Mike's 7 steps, and gives ONE fix at a time in Mike's own words, with the moment in his video that shows it. Plus three guided modes.

## What ships in v1
| Part | v1 |
| --- | --- |
| Route | `/tools/swing-setup` (static route beside `/tools/[tool]`); `tools` row `swing-setup`; listed in Tools (`LISTED_TOOLS`); "Check my set-up" card on the program page after the steps |
| Profile | 3 questions, one per screen (intake `QuestionShell`): neck history, bell (type + kg, prefilled from the training profile / Kettlebell Selector), goal. Stored in `setup_profiles` |
| Set-Up Check | Camera, on device. MediaPipe PoseLandmarker (lite) lazy-loaded; WASM from jsDelivr, model from Google's model CDN. Placement guide → stand tall 2 s (calibration) → hold set-up 3 s → steadiest frames → scorecard. Video never leaves the device; only numbers are saved |
| Measured (pure geometry, `packages/core/src/swing-setup.ts`, unit-tested) | Step 2 hip height between knee and shoulder; Step 2 shin angle (<10 good, 10–20 adjust, >20 squat pattern); Step 3 back line head–mid-back–hip (medium confidence); Step 4 shoulder–ear gap ≥ 90 % of standing; Step 5 head angle vs torso (0–15 ok, 15–25 adjust, >25 broken neck; neck history → neutral only) |
| Self-checks | Step 1 Feet (bell 0.5–1.5 ft from toes, tripod), Step 6 Grip, Step 7 Breath — guided prompts |
| Can't see it | Any check whose landmarks are below the visibility bar, or a pose that is not side-on → "Can't see it" + how to film it. Never a guess |
| Scorecard | 7 steps in Mike's order (good / adjust / self-check / can't see), a 4-line overlay (stick, shin, hip band, head), ONE fix by priority: back rounding → broken neck → bell too far → squat pattern → shoulders hiked → others |
| Fix | Mike's cue as an exact quote from the source plan + his lesson video at the draft timestamp (Vimeo embed `#t=`) and a link to the lesson |
| Guided modes | Approach ritual (step-through, timers, optional speech); Feet activation drill timer; 2-Week Swing Program (6 EMOM sessions, minute timer, Approach before each set, log reps/sets/feel) |
| Data | `0034_swing_setup.sql`: `setup_profiles`, `setup_checks`, `swing_program_runs`, `swing_program_sets`; own-row read/insert(/update where needed), admins read all; a summary row in `tool_results` per check (Saves) |
| Consistency | Last checks' step scores over time on the tool home |
| Safety | Disclaimer accepted once before the first check; pain / dizziness → stop; neck history → never "lift the head" |
| AI seam | `Coach` interface in core (`ruleCoach` today). An AI coach later needs `ANTHROPIC_API_KEY` on Vercel |

## Not in v1 (from the source plan)
Bell tracking (toe-to-bell distance, tail in the backswing), front view / stance width, swings analysis and tip-back, grip photo, hamstrings / hand size / footwear questions, keyframe uploads, coach chat, clip index table and admin tab, Mike's reference poses, rep counting, Mike's voice audio. Program extras (goblet squats, reverse hypers, side plank raises) are listed as text only.

## Decisions for Mike
Pass ranges (draft, from the plan); feet wording (we use the video version: toes flat, 10–20 % press); draft video timestamps; who gets the camera check (v1: every signed-in member); under-18s.
