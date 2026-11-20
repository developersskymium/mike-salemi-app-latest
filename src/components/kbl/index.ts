/**
 * Reusable KBL form building blocks.
 *
 *   QuestionStepper     – controlled one-question-at-a-time choice form
 *   ReadinessResultCard – score + band headline
 *   RecoveryNotice      – Recovery / Off Day message (no table)
 *   AnswerRecap         – "What you selected" list
 *   CircuitTable        – the KBL workout table (circuits, rest arrows, notes, images)
 *
 * Form content and logic live in `@/content/kbl-forms` — edit data there,
 * not in these components.
 */
export { QuestionStepper, QuestionNote } from "./question-stepper";
export type { StepperOption, StepperQuestion } from "./question-stepper";
export { ReadinessResultCard, RecoveryNotice, AnswerRecap } from "./readiness-result";
export { CircuitTable, CircuitBadge } from "./circuit-table";
export { KblFormEntriesPanel } from "./form-entries-panel";
