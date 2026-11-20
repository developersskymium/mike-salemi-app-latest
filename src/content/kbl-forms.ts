/**
 * KBL workout-day forms: the single registry to edit.
 *
 * WordPress source: Gravity Forms 2 and 22–34 (one per workout), each embedded
 * on specific Immersion workout days. A member answers five questions, the
 * weighted answers add up to a fatigue score, and the score picks what the
 * day shows: Full Workout, Chart 2, Chart 3, Recovery Day or Off Day.
 *
 * Where to change what:
 *   - Question wording, answer labels, help notes → `readinessSteps` in ./average-day.ts
 *   - Answer weights, score bands, which table each band shows → `forms` in ./source-readiness.json
 *   - Which form appears on which day → `dayForms` in ./source-readiness.json
 *   - Table rows, notes and images → ./source-workout-tables.json
 *
 * A form can override any shared question by listing it in its own
 * `questions` array with `question` / `options` / `note`, so two forms can
 * ask different things without touching the components.
 */
import { readinessSteps, type ReadinessOption, type ReadinessStep } from "./average-day";
import sourceRules from "./source-readiness.json";

export type KblCondition = { fieldId: string; operator: string; value: string };

export type KblRule = {
  /** Band name shown to the member, e.g. "Chart 2 Modification". */
  name: string;
  /** Workout table shown for this band; null = no table (recovery / off day). */
  tableId: string | null;
  /** Message shown instead of / above the table. */
  message: string;
  logic: { logicType: "all" | "any"; rules: KblCondition[] };
};

export type KblQuestion = ReadinessStep & {
  /** Points per answer value. Higher = more fatigued. */
  weights: Record<string, number>;
};

export type KblForm = {
  id: string;
  title: string;
  questions: KblQuestion[];
  maxScore: number;
  /** Table shown when the score matches no band (Gravity Forms default confirmation). */
  defaultTableId: string;
  rules: KblRule[];
};

type RawQuestion = {
  id: string;
  question?: string;
  options?: ReadinessOption[];
  note?: ReadinessStep["note"];
  weights: Record<string, number>;
};
type RawForm = Omit<KblForm, "questions"> & { questions: RawQuestion[] };

const rawForms = sourceRules.forms as unknown as Record<string, RawForm>;
const dayForms = sourceRules.dayForms as Record<string, string>;
const sharedSteps = new Map(readinessSteps.map((step) => [step.id, step]));

function buildQuestion(raw: RawQuestion): KblQuestion {
  const shared = sharedSteps.get(raw.id);
  const options =
    raw.options ??
    shared?.options ??
    Object.keys(raw.weights).map((value) => ({ value, label: value }));
  return {
    id: raw.id,
    question: raw.question ?? shared?.question ?? raw.id,
    options,
    note: raw.note ?? shared?.note,
    weights: raw.weights,
  };
}

function buildForm(raw: RawForm): KblForm {
  return { ...raw, questions: raw.questions.map(buildQuestion) };
}

/** Every workout form, keyed by its source Gravity Forms id. */
export const KBL_FORMS: Record<string, KblForm> = Object.fromEntries(
  Object.entries(rawForms).map(([id, raw]) => [id, buildForm(raw)]),
);

export function getKblForm(formId: string | null | undefined): KblForm | undefined {
  return formId ? KBL_FORMS[formId] : undefined;
}

/** The form id placed on a program day, if that day has one. */
export function formIdForDay(dayId: string): string | undefined {
  return dayForms[dayId];
}

/** The form placed on a program day, if that day has one. */
export function kblFormForDay(dayId: string): KblForm | undefined {
  return getKblForm(formIdForDay(dayId));
}

/** Every day that carries a form, with its form id. */
export function daysWithForms(): { dayId: string; formId: string }[] {
  return Object.entries(dayForms).map(([dayId, formId]) => ({ dayId, formId }));
}

/** True when every question of the form has a valid answer. */
export function isFormComplete(
  form: Pick<KblForm, "questions">,
  answers: Record<string, string> | null | undefined,
): answers is Record<string, string> {
  return Boolean(
    answers &&
    form.questions.every((q) => q.options.some((option) => option.value === answers[q.id])),
  );
}

/** Keep only this form's answers, dropping anything unknown. */
export function pickFormAnswers(form: KblForm, answers: Record<string, string>) {
  return Object.fromEntries(form.questions.map((q) => [q.id, answers[q.id]]));
}

/** Sum of answer weights. */
export function scoreForm(form: KblForm, answers: Record<string, string>): number {
  return form.questions.reduce((sum, q) => sum + (q.weights[answers[q.id]] ?? 0), 0);
}

/** Evaluate one band's conditions against a score (Gravity Forms semantics). */
export function matchesRule(rule: KblRule, score: number): boolean {
  const results = rule.logic.rules.map((condition) => {
    if (condition.fieldId !== "gquiz_score")
      throw new Error(`Unsupported form condition field: ${condition.fieldId}`);
    const value = Number(condition.value);
    switch (condition.operator) {
      case "is":
        return score === value;
      case "isnot":
        return score !== value;
      case ">":
        return score > value;
      case "<":
        return score < value;
      case ">=":
        return score >= value;
      case "<=":
        return score <= value;
      default:
        throw new Error(`Unsupported form operator: ${condition.operator}`);
    }
  });
  return rule.logic.logicType === "any" ? results.some(Boolean) : results.every(Boolean);
}

/** First band that matches, in authored order (as Gravity Forms does). */
export function matchRule(form: KblForm, score: number): KblRule | undefined {
  return form.rules.find((rule) => matchesRule(rule, score));
}

/** Question + chosen label pairs, for recaps and exports. */
export function formSelections(form: Pick<KblForm, "questions">, answers: Record<string, string>) {
  return form.questions.map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.options.find((option) => option.value === answers[q.id])?.label ?? "—",
  }));
}
