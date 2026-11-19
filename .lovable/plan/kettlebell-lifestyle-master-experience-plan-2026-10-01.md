# Kettlebell Lifestyle Master Experience Plan

## Objective
Turn the app into one coherent Mike Salemi ecosystem for the stakeholder demo: members should understand what to do today, discover the right next experience, enter through a useful assessment, and move naturally from free tools into programs, retreats, challenges, or coaching.

The demo narrative will be:

```text
Discover → Assess → Start a program → Follow today's work → Track progress
         → Build a self-guided plan → Choose the next best offer
         → Prepare for a retreat or work directly with Mike
```

Use the existing Kettlebell Lifestyle visual system, shell, typography, and blue accent. New or unconfirmed commercial details will appear as “Preview” or “Draft details,” never as finalized live promises.

## What remains from the previous approved plan
The main dashboard, database course catalog, shared course viewer, server-backed lesson progress, intake framework, all-program Self-Guided catalog, AI plan creator, saved plans, and schedule summary are built.

Finish these outstanding items before expanding the ecosystem:

1. Add accurate access states for database programs: Included, Owned, Application required, Preview, or Locked. Opening a locked program must lead to the appropriate intake, application, or offer page.
2. Add a branded Vimeo failure state with retry, “video access is being updated,” and a path to continue through notes/resources. Existing videos with bare IDs still require valid Vimeo privacy settings or full hashed URLs.
3. Tailor the existing published intake definitions. All six imported courses have an intake today, but each currently uses the same generic question set.
4. Merge AI-created sessions into the primary schedule/calendar experience instead of showing them only in a separate summary section.
5. Complete the dashboard handoff between core KBL sessions and database-program sessions so “Today” can recommend the actual next lesson from either system.
6. Add demo-safe empty, locked, loading, completed, and unavailable states across dashboard, program, intake, video, plan, and schedule views.
7. Validate the full member flow on desktop and mobile; keep real payment, retreat attendance, affiliate tracking, and cohort automation explicitly out of the demo promise.

## 1. Dashboard: one clear command center
Redesign the signed-in home around three questions: “What do I do today?”, “Where am I going?”, and “What else is available?”

- Keep one dominant **Today** card. It chooses the next scheduled or incomplete lesson across KBL, imported courses, and saved self-guided plans.
- Add a compact **My Journey** row: active programs, progress, next lesson, and intake status.
- Add **Recommended for you**, driven in the demo by intake answers and current program state. Recommendations can be deterministic UI logic.
- Add goal shortcuts: Build strength, Improve technique, Move and recover, Prepare for retreat, Coach athletes.
- Add a small **From Mike** editorial card for the flagship podcast/content channel.
- Keep schedule, tools, library, and all-program access visible without competing with Today.

## 2. Programs and offer discovery
Create one easy-to-scan ecosystem rather than a flat course grid.

- Add filters by goal, audience, format, commitment, and access.
- Organize the catalog into:
  - **Start free:** interactive Kettlebell Roadmap, fundamental lifts starter, swing diagnostic, beginner Kettlebell Strength, and six-video trainer series.
  - **Build a practice:** Working-In, The Training Room, The Path to Inspired Action, and the proposed KBL+ strength/myofascial follow-up.
  - **Go deeper:** Athleticism 4 Life at the confirmed $249 position and paid mini-series shown as a draft $50–$100 tier.
  - **Live and guided:** Men of Movement, Zen Savage Challenge, Grounded King transition, and Executive Edge.
- Every card shows outcome, audience, time commitment, access state, and a single clear action.
- Use benefit-led working titles, with “Preview” labels until Mike approves final naming:
  - Kettlebell Roadmap → **Your Kettlebell Training Path**
  - 4 Fundamental Lifts → **Build Your Kettlebell Foundation**
  - Kettlebell Strength → **Your First Kettlebell Strength Plan**
  - Swing diagnostic → **What Is Your Kettlebell Swing Missing?**
- Keep Working-In live and feature its real imported lessons rather than presenting it as missing.

## 3. Shared program overview pages
Give every program the same intuitive pre-start page before entering lessons.

- Hero: outcome, format, commitment, coach, access state, and primary action.
- “Is this for me?” audience and prerequisites.
- Three concrete results/pointers.
- Program path showing groups/modules without overwhelming lesson detail.
- Intake result and personalized recommendation when completed.
- What is included, equipment, schedule, FAQs, and the next logical offer.
- Lifecycle states: Not started, Continue, Completed, Locked, Application required, Coming soon.
- For demo-only offers, use real-looking content with a visible “Preview” badge and disable transactional claims.

## 4. Course and lesson experience
Preserve the required Course → Group → Section → Lesson → ordered content-block hierarchy while reducing navigation complexity.

- Add a simple course landing state with “Continue where you left off,” overall progress, group choices, and recommended starting point.
- Keep the current group tabs, but explain optional libraries versus the primary path, especially for Athleticism 4 Life.
- Show only the active section expanded on mobile; retain sticky curriculum on desktop.
- Render content blocks in authored order: video, rich text, audio download, file, external link, image, exercise/playwork.
- Add lesson purpose, estimated time, equipment, previous/next, completion, and “what comes next.”
- Add the branded restricted-video fallback and make downloads unmistakable buttons/cards.
- Show a completion reflection and a contextual next-program recommendation after the final lesson.

## 5. Program-specific intake and recommendations
Reuse the functioning intake framework, but tailor the questions and result screen.

- **Training courses:** goal, training age, available days, session length, equipment, injuries/constraints, technique priorities.
- **Working-In / recovery:** stress, energy, sleep, recovery needs, preferred practice length.
- **Men of Movement:** retreat intent, movement background, readiness, travel, health considerations, preparation capacity.
- **Trainer mini-series:** profession, clients served, coaching experience, desired coaching result.
- **Executive Edge:** leadership pressure, primary outcome, availability for Tuesday sessions, readiness for daily five-minute work, application fit.
- **MTK:** replace generic questions with the requested MTK placement questionnaire.

The result screen should produce a useful starting recommendation, suggested weekly rhythm, relevant lessons, and a saved “why this path” summary. For the demo, recommendation logic can be deterministic while still using real lessons.

## 6. Self-Guided and AI creator
Make Self-Guided the place where members combine everything they can access.

- Display every accessible program with progress, next lesson, and “Add to a plan.”
- Turn the creator into a guided conversation: outcome → availability → equipment → recovery/constraints → source programs → preview.
- Keep generation limited to real accessible lessons, with deterministic fallback.
- Present a calendar preview before saving, with exact dates and rest spacing.
- After saving, merge sessions into the primary calendar, dashboard Today card, reminders, and calendar export.
- Add edit, pause, regenerate, move session, and resume controls at the UI level; only persistence-critical actions need backend work before public launch.

## 7. Men of Movement journey
Build the clearest high-value stakeholder story from the notes.

- Create **Men of Movement: Preparation**, included with the retreat, with six videos organized around five pillars: Rotation, Movement, Breathwork, Nature, and Storywork.
- Show a retreat-relative release timeline beginning three months before attendance.
- Add a locked **Post-Retreat Integration** module with “Unlocks after your retreat.”
- Present the two confirmed experience names:
  - **The Primal Reset** — September 3–6, 2026, shown as completed/past in the October 1, 2026 demo.
  - **Hold Your Ground** — May 13–16, 2027, waitlist; this replaces the current “The Breakthrough” working label and remains marked Draft until Mike confirms the name/date pairing.
- Make the funnel Application → Intro call → Accepted → Preparation → Retreat → Integration visible as a progress journey.
- Do not claim retreat attendance gating is live; the visual state is a prototype until purchase/attendance data is connected.

## 8. Coaching and challenge evolution
Reflect Mike’s intended offer evolution without prematurely finalizing it.

- Reframe Grounded King as a legacy/transition offer with **Final cohort — November 2026**.
- Add a **Zen Savage Challenge** preview positioned as the scalable successor. Use a draft January 11–February 7, 2027 cohort window, clearly labeled Draft.
- Create an **Executive Edge** overview/application page:
  - 8-week / 60-day personalized engagement
  - 45-minute Tuesday main session
  - 3–4 direct interactions
  - daily five-minute focus work
  - mental focus, energy, antifragility, and a personalized central outcome
  - “By application” as the customer-facing price; internal draft range $4,500–$5,000
- Keep the current single-session coaching booking experience as a separate lighter offer rather than conflating it with Executive Edge.

## 9. Trainers, partners, and growth paths
- Add a “For Trainers” landing surface with the free six-video mini-series and a next-step mini-premium program.
- Add a Partner Program preview for the firefighter relationship, with 50/50 commission described as draft terms and “Partner applications opening soon.”
- Show FIRE / First In Wellness as the partner example, but do not imply Thinkific tracking or payouts are connected.
- Add post-completion upgrade cards to free tools and mini-programs so each entry path has an intentional next step.

## 10. Dates, prices, and demo integrity
Use October 1, 2026 as the demo’s current date.

- Past events display as completed; future events use full dates and status.
- Confirmed position: Athleticism 4 Life is $249.
- Draft position: paid nine-video mini-program is $50–$100.
- Executive Edge displays “By application”; the $4,500–$5,000 range remains internal/draft unless approved.
- Retreat pricing remains “By application” because Mike’s notes conflict between $3,100 and $3,250; $2,700 can be retained only as a historical cohort figure.
- Existing unconfirmed prices do not appear as final checkout values.
- Preview CTAs open an informative modal or waitlist/application mock, never a fake successful purchase.

## 11. Demo-first implementation order
### Phase A — Stabilize the prior plan
Access badges and locked routes; tailored intakes; Vimeo fallback; unified AI-plan calendar; cross-system Today logic; responsive validation.

### Phase B — Build the ecosystem story
Dashboard journey modules; goal/audience catalog; shared program overview; free-to-premium recommendation ladder; benefit-led naming.

### Phase C — Add high-value stakeholder previews
Men of Movement lifecycle; Hold Your Ground/Primal Reset views; Executive Edge; Grounded King transition; Zen Savage Challenge; trainer mini-series; swing diagnostic; KBL+ card; partner page.

### Phase D — Presentation polish
Seed a stakeholder demo member with realistic progress, completed intakes, a four-week plan beginning October 5, 2026, an upcoming lesson, a retreat waitlist state, and coherent recommendations. Validate desktop/mobile and remove every dead end.

## 12. Post-demo backend work
These cannot honestly be completed as presentation-only UI:

- Real payment provider, refunds, taxes, receipts, and payment-webhook entitlements.
- Retreat purchase/attendance records and retreat-relative drip unlocks.
- Cohort engine for Zen Savage dates, daily unlocks, check-ins, and accountability.
- Thinkific affiliate attribution, commission ledger, reconciliation, and payouts.
- GoHighLevel lead capture and CRM automation.
- Real Executive Edge application review, booking, homework delivery, and coach operations.
- Admin tools for intake definitions, access grants, plan visibility, cohort assignment, retreat status, and preview publishing.
- Vimeo privacy/domain configuration and replacement of every bare video ID with a playable full URL/hash where required.

## Acceptance checks
- A stakeholder can move from dashboard to assessment, program overview, lesson, completion, recommendation, AI plan, and dated calendar without a dead end.
- Athleticism 4 Life clearly communicates primary 30-Day Program versus optional libraries.
- Every imported course has a tailored intake and usable result.
- Locked, included, owned, application, preview, and unavailable states are visually distinct.
- The Men of Movement pre/post-retreat journey is understandable in under one minute.
- All dates are correct relative to October 1, 2026, and every assumption is labeled Draft or Preview.
- No screen implies mock checkout, affiliate payouts, attendance gating, or cohort automation is live.
- Desktop and mobile layouts, console, server logs, restricted Vimeo behavior, and production build are clean.
