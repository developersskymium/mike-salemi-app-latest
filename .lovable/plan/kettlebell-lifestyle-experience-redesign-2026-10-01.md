# Kettlebell Lifestyle experience redesign

## Direction
Use the selected **Modern Athletics Hub** composition as the structural reference, adapted to the current Kettlebell Lifestyle system:

- Keep the existing left navigation, compact top bar, typography, warm-white surfaces, black type, and `#2d6bff` accent.
- Rearrange and refine the current widgets rather than replacing the product with a new dashboard concept.
- Use existing course photography and real member progress throughout.
- Keep screens compact, calm, and training-focused; avoid marketing-page treatments, oversized copy, and invented membership tiers.

## 1. Main dashboard
Redesign the signed-in home into a clearer training hub:

- Lead with one strong **Continue training** panel using the member’s real next lesson, program image, phase, and progress.
- Place compact progress, schedule, saved items, and readiness widgets around the primary action.
- Add **Your programs** for recently active/enrolled programs and **Explore all programs** with a direct catalog link.
- Surface Self-Guided and the AI plan creator as clear secondary actions.
- Keep the current filterable day index available below the overview, but reduce its first-screen dominance.

## 2. Program discovery and program pages
Make every imported course and editorial program consistently discoverable:

- Create one catalog presentation for all accessible courses/programs with search, useful categories, access state, progress, and resume/start actions.
- Preserve the supplied short descriptions and three highlight pointers for imported courses.
- Redesign program overview pages around cover imagery, outcomes, structure, requirements, progress, intake status, and one obvious start/resume action.
- Keep purchase/entitlement behavior intact for paid programs and clearly distinguish owned, included, and locked content.
- Ensure every card and navigation path reaches a real program overview or course experience.

## 3. Course and lesson experience
Refine the shared `/courses/$courseSlug` experience for every current and future imported course:

- Add a compact course header with progress, group/section context, intake shortcut, and resume information.
- Preserve the correct Course → Group → Section → Lesson → ordered content-block hierarchy.
- Make the curriculum easier to scan with group switching, section disclosure, completion markers, and scoped next/previous navigation.
- Improve lesson hierarchy around the player, notes, playwork/callouts, audio downloads, resources, and supporting videos.
- Keep a visible, dependable completion action without obscuring lesson content on desktop or mobile.
- Add a friendly restricted-video state when Vimeo cannot load, instead of leaving a blank player.

## 4. Intake for every program
Extend the existing intake foundation into reusable, program-specific preparation:

- Store one intake definition per program and one member response per program, with explicit database grants and member-only access rules.
- Support shared question types such as single choice, multiple choice, scale, short text, goals, constraints, equipment, schedule, and readiness.
- Let each program define its own questions, introduction, and completion summary while reusing one polished wizard.
- Show intake status on program cards and overview pages; prompt before starting but allow later review and updates.
- Use answers to produce practical program guidance, recommended starting points, and cautions without changing the underlying course content.
- Keep the existing general Kettlebell Lifestyle onboarding intact and separate from program-specific intakes.

## 5. Self-Guided for all programs
Expand Self-Guided beyond the two hard-coded Kettlebell Lifestyle levels:

- Load every accessible database-backed program plus the current core levels.
- Let members browse by program, group, section, lesson type, and completion state.
- Reuse the redesigned program and lesson patterns so Self-Guided does not become a separate visual system.
- Preserve downloadable plans, search, scheduling, and direct lesson access where available.

## 6. AI Self-Guided Creator
Add a simple guided creator that produces both a multi-week pathway and a weekly schedule:

- Ask for goal, available days, session length, experience, equipment, preferred programs, recovery needs, and constraints.
- Use only lessons the signed-in member can access; never invent unavailable exercises or content.
- Generate a structured 2–8 week plan with weekly intent, scheduled sessions, lesson links, recovery spacing, and a concise rationale.
- Let members review, regenerate, adjust duration/frequency, save the plan, and add its sessions to the existing schedule.
- Persist the prompt inputs, generated plan, selected source lessons, and active/archive state so plans survive across devices.
- Run generation securely on the server, validate inputs and AI output, and provide a deterministic fallback when generation fails.

## 7. Data and integration work
- Add program intake definitions/responses and AI-created plans/sessions with member-scoped access rules and explicit grants.
- Extend course reads with cover, highlights, intake state, access state, lesson counts, and progress needed by the new screens.
- Keep user roles separate and preserve current authentication, entitlements, progress, schedule, reminders, and imported content.
- Record structural decisions and keep the implementation roadmap current because this spans several connected areas.

## 8. Validation
- Verify the signed-in flow from dashboard → program → intake → lesson completion → next lesson.
- Verify creating, editing, saving, and scheduling an AI plan using real accessible lessons.
- Check representative content shapes: grouped A4L, standard weekly course, audio/resource lesson, and Working-In.
- Test desktop and mobile layouts, keyboard access, loading/empty/error states, restricted Vimeo behavior, and route metadata.
- Confirm the final build and live preview have no runtime, console, or network errors.
