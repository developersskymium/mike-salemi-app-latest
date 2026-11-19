# Kettlebell Lifestyle stakeholder experience master plan

## Goal
Turn Mike’s notes and the previous redesign into one coherent, truthful stakeholder demo. The experience should lead a member from “what should I do today?” through discovery, intake, training, scheduling, coaching, and retreats without implying that unfinished payments, access rules, attendance, or partner systems are live.

Demo date: **October 1, 2026**. Unconfirmed names, dates, and prices will display **Preview** or **Draft**, never as final offers.

## What the notes change
- Build a visible product ladder: free entry experiences → core programs → retreats/group coaching → high-touch coaching.
- Make each program feel purpose-built through a tailored intake, recommendation, and next action.
- Treat Men of Movement as a retreat journey: preparation opens before the event; integration remains locked until after it.
- Present Executive Edge separately from existing bookable coaching packages.
- Add preview pathways for Zen Savage, trainer resources, KBL+, and partner offers without fake checkout or access claims.
- Distinguish Hold Your Ground and Primal Reset by focus and venue; use application-and-call language.

## Remaining work from the previous plan
- Existing intake definitions are live for all six imported programs, but their questions and recommendations are still generic.
- Program cards do not fully communicate included, owned, and locked access.
- Vimeo needs a friendly recovery state for restricted videos.
- AI-created sessions are saved but appear separately from the primary calendar and dashboard Today flow.
- The admin experience does not yet manage intakes, entitlements, or self-guided plan lifecycle.
- Checkout remains a presentation mock; no payment provider is connected.

## Build phases

### 1. Demo integrity and navigation
- Add clear Included, Owned, Locked, Preview, Draft, Past, Open, and Waitlist states.
- Organize the catalog around member goals and offer tiers instead of one flat grid.
- Keep `/programs` as discovery and `/courses` as the learning experience.
- Add a shared database-program overview before a locked member reaches lessons.
- Add a graceful Vimeo restriction message with retry and lesson-resource fallback.

### 2. Tailored program onboarding
Create distinct intake copy, questions, and post-intake guidance for:
- Athleticism 4 Life: goals, movement confidence, weekly capacity, equipment, injury context.
- The Training Room: training age, skill focus, available kettlebells, session frequency, constraints.
- Kettlebell Roadmap: current competencies, target skills, equipment, confidence, practice frequency.
- Working-In: stress, energy, recovery needs, audio preference, available daily time.
- The Path to Inspired Action: desired change, consistency blockers, reflection style, weekly rhythm.
- Men of Movement: retreat readiness, five-pillar priorities, travel/preparation needs, support context.

Recommendations remain practical and deterministic until a reviewed AI guidance layer exists.

### 3. One member schedule
- Normalize core KBL days and AI-created lesson sessions into one presentation model.
- Show both session types in month and agenda views with distinct labels.
- Surface the next eligible session on the dashboard Today area.
- Preserve current scheduling tables and progress behavior; no disruptive schema rewrite.

### 4. Program and lesson experience
- Preserve Course → Group → Section → Lesson → ordered content blocks.
- Give each program a concise overview, outcomes, structure, access state, intake CTA, and resume action.
- Keep group-scoped navigation for large programs such as Athleticism 4 Life.
- Make video, audio downloads, resources, playwork, progress, Previous, Complete, and Next predictable on mobile and desktop.

### 5. Men of Movement journey
- Present the confirmed five pillars: Rotation, Movement, Breathwork, Nature, and Storywork.
- Show six preparation videos and a visual release timeline beginning three months before a confirmed retreat.
- Show inclusion with retreat enrollment as explanatory UI only until entitlement automation exists.
- Keep post-retreat integration visibly locked and labeled “Content in development.”

### 6. Stakeholder offer previews
- Executive Edge: preview an 8-week/60-day high-touch pathway, daily five-minute work, and three-to-four direct interactions; show pricing as Draft because $4,500–$5,000 is unresolved.
- Zen Savage Challenge: preview positioning and member journey without claiming it replaces Grounded King.
- Trainer mini-series: preview the free six-video entry point and potential paid toolkit.
- Beginner Kettlebell Strength: preview as a free lead magnet.
- Nine-video mini-program: preview with price marked Draft ($50–$100 unresolved).
- Firefighter partner offer: clearly label external Thinkific fulfillment and Partner Preview; do not simulate commissions.
- KBL+: preview scope only until membership inclusions are confirmed.

### 7. Retreat truth and date handling
- Mark Primal Reset, September 3–6, 2026, as Past for the October 1 demo.
- Keep May 13–16, 2027 as the next currently stored retreat date, but do not relabel it Hold Your Ground until Mike confirms the pairing.
- Keep the current $2,700 only where it is historically confirmed.
- Display the next-event price as Draft until the $3,100 versus $3,250 conflict is resolved.
- Use “Apply” and “Book a call,” never instant enrollment.

### 8. Admin and production follow-through
- Add intake definition editing, entitlement visibility, and self-guided plan status controls.
- Connect real payments, email/drip automation, attendance, retreat access release, and partner attribution only after providers and rules are confirmed.
- Replace preview labels only when owner, content, price, date, access, and fulfillment are approved.

## Technical approach
- Reuse the existing design tokens, shell, cards, and responsive patterns.
- Extend `listCourses` with entitlement-aware presentation state.
- Introduce a UI-only unified session type over existing schedule and self-guided session records.
- Keep all member data user-scoped through existing authenticated server functions and RLS.
- Do not add schema unless a real workflow requires persistence not already available.

## Acceptance checks
- A stakeholder can understand Today, browse every program, see access status, complete a tailored intake, open a lesson, and view a unified schedule.
- Athleticism 4 Life clearly retains its five groups and “Day” remains a lesson title.
- Restricted Vimeo content fails gracefully.
- Mobile controls remain reachable and sticky where appropriate.
- Every uncertain offer fact is labeled Preview or Draft.
- No screen implies mock payment, automatic retreat access, partner payout, cohort attendance, or AI coaching is operational.
- Typecheck, production build, authenticated runtime, mobile layout, and console checks pass.
