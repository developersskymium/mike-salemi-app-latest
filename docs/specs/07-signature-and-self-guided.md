# 07 — Signature pages and advanced Self-Guided

Client direction (Nov 20): "Finish first, without missing anything. Richer pages, each page having a signature something — design, functionality, usefulness. Self-Guided much more advanced and automatic: more ways to continue, start, track progress." Earlier: the app felt lifeless, plain glass, non-signature; the KBL day view and tables must follow the ORIGINAL layout (restored on `ui/day`), in the new design.

Every page must have (1) real content density — no thin pages, (2) one signature element that is ownable and memorable, (3) at least one genuinely useful function beyond display, (4) crafted micro-interactions, (5) light + dark, phone + desktop.

## Signature per page

| Page | Signature element | Useful function |
|---|---|---|
| Landing `/` | Cinematic hero (photo/video loop) with the brand motif animating in | Program finder: 3 taps → recommended program |
| Explore / sales `/explore/[slug]` | Curriculum explorer: phases as a journey, preview the first lesson free | Sticky buy bar with live price (quote), plan vs à-la-carte comparison |
| Pricing | Value meter: what each plan unlocks vs buying separately | Monthly/yearly toggle, plan recommender |
| Today | Living header: time-of-day sky + your position on the journey | ONE smart next action; quick session (10/20/30 min); readiness trend chip |
| Programs tab | Journey arcs on every card (your progress) | Continue rail, "recommended next" with the reason |
| Program page | Phase ridge landscape with your marker | Mode switch Immersion / Self-Guided, Self-Guided board (below) |
| Day view (original layout) | Workout mode: a set/rest timer that follows the 7-column table (circuits, rounds, rest arrows, separators) | Session plan sheet, readiness, notes per day, auto-advance |
| Readiness | Dial + 14-day trend sparkline | Explains the band and the table chosen |
| Library | Movement index: browse by movement with the animated figures | Continue watching, smart search, collections, "Also in" |
| Tools | Animated result graphic + shareable result card | Save result, follow-up offer |
| Plan | Week canvas with drag and drop, auto-plan from goal | Missed-day auto-fix, ICS export, reminders |
| You | Training passport: minutes, sessions, streaks, movements, readiness trend, calendar heatmap | Export history CSV |
| Rewards | Medal cabinet with tilt/sheen | Next medal progress |
| Certificates | Engraved certificate, verify QR | Share/download |
| Retreat hub | Countdown + landscape, checklist progress ring | Packing checklist, itinerary, travel |
| Coaching | Credits ring + calendar | Book/cancel, prep checklist |
| Org coach | Team heat map of training days | Nudge/assign |
| Studio | Overview with live metrics charts | All editors |

## Advanced Self-Guided (every program, not only KBL)

Self-Guided = every day/lesson open, any order, but the app does the thinking.

Ways to START
- Start at Day 1 / start anywhere (jump to any day or lesson from a phase grid)
- Quick session: choose 10 / 20 / 30 / 45 min → assembled from the program's steps (warm-up + main + stretch), saved as a session
- By intent: Workout, Recovery, Skill, Mobility filters (day types)
- From Library: any video → "Do this as a session"
- Repeat a favourite or a past session

Ways to CONTINUE
- Continue exactly where you left off (lesson + step + video position, cross-device)
- "Up next" auto-suggestion with a one-line reason
- Today card, Programs continue rail, Library "Continue watching", program page hero, reminder/deep link

AUTO behaviour
- Auto-complete a step at 95% watched; auto-advance steps and clips (toggle)
- Auto-mark a day complete when its required steps are done; days can be repeated (count each completion)
- Smart next: rotation of day types (workout → recovery → skill), and last readiness band (low readiness → suggest recovery/mobility)
- Auto-resume positions; auto-log a session (start, end, minutes, readiness, notes)
- Optional auto-plan into the calendar (training days per week)

TRACK
- Per step / day / phase / program %, minutes trained, sessions, streak, calendar heatmap, history log (date, what, minutes, readiness score), times each day was completed, notes per day, readiness trend
- Progress visible on the program page, Today, You (passport) and Programs cards

Data: add a `training_sessions` log (user, program, path, lesson, started_at, ended_at, minutes, readiness_result_id, source: day|quick|library|repeat, notes) and any functions needed, as an additive migration. Members write only through server functions.
