import { readinessSteps, type ReadinessBand } from "./average-day";
import sourceRules from "./source-readiness.json";
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
type SourceRule = {
  name: string;
  tableId: string | null;
  message: string;
  logic: {
    logicType: "all" | "any";
    rules: { fieldId: string; operator: string; value: string }[];
  };
};
type SourceForm = {
  id: string;
  title: string;
  questions: { id: string; weights: Record<string, number> }[];
  maxScore: number;
  defaultTableId: string;
  rules: SourceRule[];
};
const forms = sourceRules.forms as unknown as Record<string, SourceForm>;
const dayForms = sourceRules.dayForms as Record<string, string>;
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

export function isReadinessComplete(
  answers: Record<string, string> | null | undefined,
): answers is Record<string, string> {
  return Boolean(
    answers &&
    readinessSteps.every((step) =>
      step.options.some((option) => option.value === answers[step.id]),
    ),
  );
}

export function readinessSelections(answers: Record<string, string>) {
  return readinessSteps.map((step) => ({
    id: step.id,
    question: step.question,
    answer: step.options.find((option) => option.value === answers[step.id])?.label ?? "—",
  }));
}

export function readinessFormForDay(dayId: string) {
  return forms[dayForms[dayId]];
}

/** Evaluate the source Gravity Forms conditions, in their authored order. */
export function matchesReadinessRule(rule: SourceRule, score: number) {
  const results = rule.logic.rules.map((condition) => {
    if (condition.fieldId !== "gquiz_score")
      throw new Error("Unsupported source readiness condition.");
    const value = Number(condition.value);
    if (condition.operator === "is") return score === value;
    if (condition.operator === ">") return score > value;
    if (condition.operator === "<") return score < value;
    throw new Error("Unsupported source readiness operator.");
  });
  return rule.logic.logicType === "any" ? results.some(Boolean) : results.every(Boolean);
}

/** Source quiz weights and authored tables; no generated exercise prescriptions. */
export function resolveReadiness(answers: Record<string, string>, dayId: string): ReadinessResult {
  if (!isReadinessComplete(answers)) throw new Error("Answer all five readiness questions.");
  const form = readinessFormForDay(dayId);
  if (!form) throw new Error("This page does not have a Training Readiness Assessment.");
  const score = form.questions.reduce(
    (sum, question) => sum + question.weights[answers[question.id]],
    0,
  );
  const rule = form.rules.find((candidate) => matchesReadinessRule(candidate, score));
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
