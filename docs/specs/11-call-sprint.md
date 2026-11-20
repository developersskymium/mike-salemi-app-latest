# 11 — Call sprint (Fri 20 Nov 2026)

Ahmed presents the **member side** to stakeholders tonight. Everything below ships before the call.
Admin/Studio can wait. Design system = Summit v4 (docs/design/summit-v4, docs/design/system.md).
Keep the ORIGINAL app's content model and layouts where they work; make them calm, premium, useful.

## Client feedback (verbatim summary)
1. Too many schedules: one main schedule + one per program, conflicting. Every program has its own intake even though most answers already exist in the profile / earlier intakes — prefill at least.
2. Lesson navigation for MTK, A4L, KBL and all programs is hard, weird, complicated. Redo per program. Idea: weeks/days across the top, a grid of small cards below for workouts, bonuses, etc.
3. Every page is busy, too many buttons. Peak, high-end: show what's needed without overwhelming.
4. KBL lesson view: too much shadow, table too big and weird. Additional videos, when clicked, don't scroll to the player; want an easy playlist in/next to the player.
5. KBL Level 1 and Level 2 are NOT a linear path. It's a choice; we recommend one from the intake; user may jump between them freely.
6. "Achievements with Mike" levels put Retreat as level 4 — wrong; people join the retreat whenever. Redo as non-linear.
7. Each new lesson load flashes the homepage for a split second, then the lesson. Jumpy, jerky, glitchy.
8. Sidebar and body need distinct background colours.
9. Library: program names at the top as filters, filters across all programs. The long video list (which links into program pages) becomes a separate page: "All lessons".
10. Access guards: not everyone has everything. Subscription tiers cover most (by level); people also buy à la carte or own one program. Enrolling in something new requires buying it or the right plan.
11. Offers and interconnectivity across programs: thorough, smart, valuable, useful (strategy below).
12. Home is too busy; the mountain (Climb) is confusing — remove it.
13. Each course/program main page is too busy; lacks visuals, thumbnails, proper program look & feel.
14. Logo reads just "Mike Salemi" (no "Kettlebell & Movement").
15. Hide past retreats. Tools: keep only Kettlebell Selector and Stretch Test.
16. Better, varied photos of Mike from his own sites; current ones repeat and look odd.
17. More badges and rewards across ALL programs, properly thought out.

## Calm-design rules (apply everywhere you touch)
- One primary action per view. At most 2–3 secondary actions visible; the rest go in a "More" (⋯) menu or disappear.
- Fewer sections: if a section isn't useful today, don't render it. Prefer one strong hero + one list/grid.
- Visuals over chrome: real thumbnails/photos (Vimeo thumbs, Mike photos) on cards; no text baked into images; no cut-off faces (object-position tuned, aspect ratios that fit).
- No resting shadows; hairline borders (8% ink), radius 20, whitespace. Glass only on overlays.
- Instrument Sans; numbers tabular; labels short.
- Motion: no layout jumps, reserve space for media (aspect-ratio), skeletons match final layout, transitions ≤ 200ms, respect reduced motion.
- Phone first-class: check 390px and 1440px.

## Access model (for guards and CTAs)
States for (user, program): `owned` (bought à la carte / enrolled with access) · `included` (current plan covers it) · `upgrade` (a higher plan covers it) · `buy` (one-off purchase available) · `free` · `apply` (coaching/retreat/Executive Edge: application or booking).
- Server-side enforcement on lesson/day/session routes: no access → program sales sheet (first lesson / marked previews stay watchable as a taste).
- Enroll/start actions re-check access on the server. `can_access(p_program)` exists in the DB — build on it.
- CTA label follows state: Start / Continue · Included in your plan — Start · Upgrade to <Plan> · Buy — $X · Free — Start · Apply.
- Locked content is visible (thumbnail + lock), never hidden, never a dead end.

## Offers & interconnectivity strategy
Principles: value first; right moment; one offer per screen max; always a reason ("Because you…"); dismissible with frequency caps (same offer ≤3 views / 14 days; dismissed → hidden 30 days); never block the task.
Ladder: Free (Roadmap quiz → recommended phase, free series, 4 Fundamental Lifts, Kettlebell Strength beginner, tools) → Core (KBL subscription; A4L $249; MTK; Working-In) → Guidance (Zen Savage group, The Path → Grounded King, 1:1 Tuesday 45-min, Executive Edge by application) → Experience (Hold Your Ground retreat by application; Men of Movement pre-retreat program included).
Moments → offer:
- Finish a free series / Roadmap result → the KBL level it recommends (taste: first day open).
- KBL milestone/certificate → choose next: A4L (strength block) or MTK (mobility/skill) — two cards, not a wall.
- Low readiness 2+ times in a week → Working-In (recovery) or a lighter day; no hard sell.
- 4-week streak or program complete → 1:1 call with Mike ("review your progress").
- Bought 2+ programs à la carte → show plan math: "Your plan would include these + N more"; purchases credited toward the plan within 30 days.
- Any program page → one "Pairs well with" card.
- Coaching/1:1 → retreat application when a retreat is open (retreat is available any time, not a level).
- Retreat applicants/attendees → pre-retreat program auto-unlocked; post-retreat → Grounded King / coaching.
- Referral: "Give a month, get a month" in You.
Surfaces: Home (one slot), program page (Pairs well with), completion screens (next step), Library (locked thumbnails with Buy/Upgrade), You (plan & savings).

## Badges & rewards (all programs)
Families: Consistency (first session, 3/7/30-day streaks, 4/12 active weeks) · Program milestones (start, halfway, complete — per program, each with its own enamel medal colour) · Mastery (MTK skill unlocks, A4L block PRs, KBL readiness improved, Stretch Test improved) · Explorer (try 3 programs, use both tools, watch 25 library videos) · With Mike (book a 1:1, join a live call, get a note from Mike, apply to a retreat, attend a retreat, refer a friend).
"Moments with Mike" is a collection grid earned in any order — never a ladder. Rewards: medals + certificates; some unlock perks (e.g. a bonus video, discount on the next program, free month via referral).

## Ownership (one agent per area; don't edit others' areas — note needs in your report)
| Agent | Owns |
|---|---|
| nav | jump/flash fix (template, loading, redirects, links), shell (sidebar bg, logo), hide past retreats, tools trimmed to 2 |
| kbl | KBL day/lesson view (DayPlayer & friends, CircuitTable compact, video playlist), KBL Level 1/2 choice |
| journeys-a | lesson navigation + main page for KBL program page, MTK, A4L |
| journeys-b | lesson navigation + main page for Working-In, The Path/Grounded King, courses, free series, Men of Movement prep |
| home | Home declutter (remove Climb), badges & rewards system, Moments with Mike (non-linear) |
| access | access guards, CTA states, offers engine & placements, programs catalog page |
| schedule | one schedule + intake prefill/unified profile |
| library | Library filters + All lessons page |
| imagery | Mike photo sourcing/curation + cover/photo mapping |
Migrations: home=0023, access=0024, schedule=0025 (prefix numbers; never delete/drop/truncate).
