/**
 * Shared form primitives (spec 12 › Forms 2–10). Calm, accessible (visible labels, 48px targets,
 * keyboard, screen-reader errors) and dependency-free. Import from "@/components/ui/form".
 */
import "./form.css";
export { Field, FieldError, Why, FromProfile, validate, type FieldIds } from "./Field";
export { ChoiceRows, ChipChoice, Slider, Stepper, type ChoiceOption } from "./Choice";
export { FormProgress, timeLeft } from "./Progress";
export { useAutosave, readDraft, listDrafts, clearDraft, type Draft } from "./useAutosave";
export { StepFlow, type StepFlowStep } from "./StepFlow";
