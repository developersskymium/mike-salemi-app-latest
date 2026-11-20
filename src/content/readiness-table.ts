import { readinessSteps, type ReadinessBand } from "./average-day";
import {
  formSelections,
  isFormComplete,
  kblFormForDay,
  matchesRule,
  matchRule,
  pickFormAnswers,
  scoreForm,
  type KblForm,
  type KblRule,
} from "./kbl-forms";
import sourceTables from "./source-workout-tables.json";

export type RestDirection = "down" | "up";
export type CircuitRow = {
  circuit: string;
  exercise: string;
  rest: string;
  restDir: RestDirection;
  restArrow?: boolean;
  intensity: string;
  reps: string;
  sets: string;
  tempo: string;
  /** Source TablePress icon for the Type cell (C1, C2, S1 …), served from /kbl/icons. */
  circuitIcon?: string;
  /** Source TablePress arrow shown before the rest time, served from /kbl/icons. */
  restIcon?: string;
};
export type CircuitSeparator = { after: string; label: string };
export type WorkoutTable = {
  id: string;
  sourceId?: string;
  title: string;
  rows: CircuitRow[];
  separators?: CircuitSeparator[];
  notes?: string;
  images?: { url: string; alt: string }[];
};
export const WORKOUT_TABLES = sourceTables as unknown as Record<string, WorkoutTable>;

export type ReadinessResult = {
  score: number;
  max: number;
  band: ReadinessBand;
  table: WorkoutTable | null;
  outcome: "workout" | "recovery" | "rest";
  sourceFormId: string;
  reason: string;
  guidance: string[];
};

/**
 * True when the answers are complete. With a day id, checks that day's own
 * form questions; without one, checks the shared five readiness questions.
 */
export function isReadinessComplete(
  answers: Record<string, string> | null | undefined,
  dayId?: string,
): answers is Record<string, string> {
  const form = dayId ? kblFormForDay(dayId) : undefined;
  return isFormComplete(form ?? { questions: readinessSteps as KblForm["questions"] }, answers);
}

export function readinessSelections(answers: Record<string, string>, dayId?: string) {
  const form = dayId ? kblFormForDay(dayId) : undefined;
  return formSelections(form ?? { questions: readinessSteps as KblForm["questions"] }, answers);
}

export function readinessFormForDay(dayId: string): KblForm | undefined {
  return kblFormForDay(dayId);
}

/** Evaluate the source Gravity Forms conditions, in their authored order. */
export function matchesReadinessRule(rule: KblRule, score: number) {
  return matchesRule(rule, score);
}

/** Source quiz weights and authored tables; no generated exercise prescriptions. */
export function resolveReadiness(answers: Record<string, string>, dayId: string): ReadinessResult {
  const form = kblFormForDay(dayId);
  if (!form) throw new Error("This page does not have a Training Readiness Assessment.");
  if (!isFormComplete(form, answers)) throw new Error("Answer every readiness question.");
  const score = scoreForm(form, pickFormAnswers(form, answers));
  const rule = matchRule(form, score);
  // Three source forms had a copied default pointing at Phase I. Use the
  // full-workout table authored for this exact form when no modifier matches.
  const tableId = rule ? rule.tableId : form.defaultTableId;
  const table = tableId ? WORKOUT_TABLES[tableId] : null;
  if (tableId && !table) throw new Error("The programmed workout table is unavailable.");
  const title = rule?.name ?? "Full Workout";
  const outcome = table ? "workout" : /off|rest/i.test(title) ? "rest" : "recovery";
  const bandId = outcome !== "workout" ? "red" : /full/i.test(title) ? "green" : "amber";
  const summary = rule?.message || table?.title || form.title;
  return {
    score,
    max: form.maxScore,
    band: { id: bandId, title, summary, advice: [] },
    table,
    outcome,
    sourceFormId: form.id,
    reason: `${form.title} · ${title}`,
    guidance: [],
  };
}
