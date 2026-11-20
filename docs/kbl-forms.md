# KBL workout-day forms

How the Training Readiness Assessment works, where it appears, and how to change it.

## What happens

1. On a workout day, the member opens the **Training Readiness Assessment** step.
2. They answer five questions. Each answer carries points: higher means more fatigued.
3. The total score picks a band, using the same rules as the WordPress Gravity Forms:

| Score | Band | What the day shows |
| --- | --- | --- |
| 0 | Full Workout | Full table |
| 1–22 | (no band, so the default is used) | Full table |
| 23–32 | Chart 2 Modification | Chart 2 table |
| 33–39 | Chart 3 Modification | Chart 3 table |
| 40–53 | Recovery Day | Recovery message, no table |
| 54–60 | Off Day | Rest message, no table |

4. The answers are saved, and the table appears under the day's Workout step. The member can retake the assessment, and every attempt is kept.

On Ramp Days 1, 3 and 5 have no form. They show a fixed starter table: Table 1 for Level I and Table 13 for Level II.

## Where to change things

| To change… | Edit |
| --- | --- |
| Question wording, answer labels, help notes | `readinessSteps` in `src/content/average-day.ts` |
| Points per answer, score bands, which table each band shows | `forms` in `src/content/source-readiness.json` |
| Which form is on which day | `dayForms` in `src/content/source-readiness.json` |
| Table rows, notes, images | `src/content/source-workout-tables.json` |

A single form can use its own wording. Add `question`, `options` or `note` to that form's question in `source-readiness.json`; whatever it leaves out comes from the shared wording.

All of this is read through one module, `src/content/kbl-forms.ts`. Components never hardcode questions or bands.

## Reusable components (`src/components/kbl`)

| Component | Use |
| --- | --- |
| `QuestionStepper` | Shows a choice form one question at a time. It is controlled (the parent owns answers and step), so any form can reuse it. |
| `ReadinessResultCard` | Score and band headline |
| `RecoveryNotice` | Recovery Day / Off Day message |
| `AnswerRecap` | "What you selected" list |
| `CircuitTable` | The KBL workout table |
| `KblFormEntriesPanel` | Admin list of every member's entries, with a CSV export |

`src/components/readiness.tsx` builds the member-facing assessment (`ReadinessAssessment`, `WorkoutCircuitPanel`) out of these components.

## Stored entries

Table: `public.workout_tables`. There is one row per submission, and earlier attempts are kept.

| Column | Meaning |
| --- | --- |
| `user_id`, `course_id`, `phase_id`, `day_id`, `lesson_id` | Who submitted, and where |
| `answers` | The raw choices, e.g. `{ "tired": "no", ... }` |
| `form_id` | Source Gravity Form id (2, 22–34) |
| `score` | Total points, from 0 to 60 |
| `band`, `band_name` | green / amber / red, and the band name, e.g. "Chart 2 Modification" |
| `table_id` | Table shown, or null for recovery/rest |
| `outcome` | `workout`, `recovery` or `rest` |

The server recomputes the score; it never trusts a score sent by the browser. Members can only read and write their own rows. Admins can read every row in Admin Studio → **KBL form entries**.

## Checks

- `src/lib/kbl-readiness.test.ts` runs all 108 answer combinations for each of the 51 form days against the WordPress fixture.
- `src/lib/kbl-forms.test.ts` checks the registry: 14 forms, 51 placed days, valid tables, and the bands.
