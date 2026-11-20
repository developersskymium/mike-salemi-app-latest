/**
 * Training Readiness Assessment: scoring and band resolution.
 *
 * Mirrors `public.submit_readiness` in supabase/migrations/0004_functions.sql:
 * the score is the sum of the chosen options' weights, the band is the first
 * (by position) whose inclusive [minScore, maxScore] contains the score, and a
 * score matching no band falls back to the form's default (full workout) table.
 */
import type { BandColour, BandOutcome, FormBand, FormQuestion, ReadinessForm, ReadinessOutcome } from "./types";

export type ReadinessAnswers = Readonly<Record<string, string | null | undefined>>;

function chosenOption(question: FormQuestion, answers: ReadinessAnswers | null | undefined) {
  const value = answers?.[question.key];
  return value == null ? undefined : question.options.find((option) => option.value === value);
}

/** True when every question has an answer that is one of its options. */
export function isFormComplete(
  form: Pick<ReadinessForm, "questions">,
  answers: ReadinessAnswers | null | undefined,
): boolean {
  return form.questions.every((q) => chosenOption(q, answers) !== undefined);
}

/**
 * Sum of the chosen answers' weights. Unanswered or unknown answers count 0, so
 * the UI can show a running score; use `assessReadiness` for the strict version.
 */
export function scoreForm(form: Pick<ReadinessForm, "questions">, answers: ReadinessAnswers | null | undefined): number {
  return form.questions.reduce((sum, q) => sum + (chosenOption(q, answers)?.weight ?? 0), 0);
}

/** The band for a score, exactly as the SQL picks it (first by position, else the default). */
export function resolveOutcome(form: Pick<ReadinessForm, "bands" | "defaultTableId">, score: number): ReadinessOutcome {
  const band = [...form.bands]
    .sort((a, b) => a.position - b.position)
    .find((b) => score >= b.minScore && score <= b.maxScore);
  if (!band) {
    return { score, name: "Full Workout", band: "green", outcome: "workout", tableId: form.defaultTableId, message: "" };
  }
  return { score, name: band.name, band: band.band, outcome: band.outcome, tableId: band.tableId, message: band.message };
}

/** Strict scoring + resolution: throws, like the SQL, on a missing or invalid answer. */
export function assessReadiness(form: ReadinessForm, answers: ReadinessAnswers): ReadinessOutcome {
  for (const q of form.questions) {
    if (!chosenOption(q, answers)) throw new Error(`missing or invalid answer for ${q.key}`);
  }
  return resolveOutcome(form, scoreForm(form, answers));
}

/** Only this form's answers, in question order (what the server stores). */
export function pickFormAnswers(form: Pick<ReadinessForm, "questions">, answers: ReadinessAnswers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of [...form.questions].sort((a, b) => a.position - b.position)) {
    const option = chosenOption(q, answers);
    if (option) out[q.key] = option.value;
  }
  return out;
}

/** Question + chosen label pairs, for recaps and exports. */
export function formSelections(form: Pick<ReadinessForm, "questions">, answers: ReadinessAnswers) {
  return [...form.questions]
    .sort((a, b) => a.position - b.position)
    .map((q) => ({ key: q.key, prompt: q.prompt, answer: chosenOption(q, answers)?.label ?? "—" }));
}

// ------------------------------------------------------------------ legacy Gravity Forms conversion

export interface GravityCondition {
  fieldId: string;
  operator: string;
  value: string | number;
}
export interface GravityRule {
  name: string;
  tableId: string | null;
  message?: string | null;
  logic: { logicType: "all" | "any" | string; rules: GravityCondition[] };
}

/** Gravity Forms condition semantics (legacy `matchesRule` in src/content/kbl-forms.ts). */
export function matchesGravityRule(rule: GravityRule, score: number): boolean {
  const results = rule.logic.rules.map((condition) => {
    if (condition.fieldId !== "gquiz_score") throw new Error(`Unsupported form condition field: ${condition.fieldId}`);
    const value = Number(condition.value);
    switch (condition.operator) {
      case "is":
        return score === value;
      case "isnot":
        return score !== value;
      case ">":
      case "greater_than":
        return score > value;
      case "<":
      case "less_than":
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

/** Legacy band colour / outcome derived from the rule name and whether it shows a table. */
export function classifyGravityRule(rule: Pick<GravityRule, "name" | "tableId">): { band: BandColour; outcome: BandOutcome } {
  const outcome: BandOutcome = rule.tableId ? "workout" : /off|rest/i.test(rule.name) ? "rest" : "recovery";
  const band: BandColour = outcome !== "workout" ? "red" : /full/i.test(rule.name) ? "green" : "amber";
  return { band, outcome };
}

/**
 * Convert authored Gravity Forms rules into contiguous inclusive score ranges.
 * Every integer score 0..maxScore is evaluated with first-match semantics; runs
 * of consecutive scores won by the same rule collapse into one band, so a rule
 * covering non-contiguous scores becomes several bands with the same name.
 * Scores no rule matches produce no band (the default table applies).
 */
export function bandsFromGravityRules(rules: readonly GravityRule[], maxScore: number): FormBand[] {
  const runs: { rule: number; min: number; max: number }[] = [];
  for (let score = 0; score <= maxScore; score++) {
    const rule = rules.findIndex((r) => matchesGravityRule(r, score));
    if (rule < 0) continue;
    const last = runs[runs.length - 1];
    if (last && last.rule === rule && last.max === score - 1) last.max = score;
    else runs.push({ rule, min: score, max: score });
  }
  return runs.map((run, index) => {
    const rule = rules[run.rule]!;
    return {
      name: rule.name,
      ...classifyGravityRule(rule),
      tableId: rule.tableId,
      message: rule.message ?? "",
      minScore: run.min,
      maxScore: run.max,
      position: index + 1,
    };
  });
}

export interface GravityFormSource {
  id: string;
  title: string;
  maxScore: number;
  defaultTableId: string | null;
  questions: {
    id: string;
    question?: string;
    options?: { value: string; label: string }[];
    note?: { title?: string; body: string } | null;
    weights: Record<string, number>;
  }[];
  rules: GravityRule[];
}

/**
 * Build a v2 `ReadinessForm` from a legacy `source-readiness.json` form. Shared
 * wording/labels (legacy `readinessSteps`) can be supplied per question key.
 */
export function formFromGravity(
  source: GravityFormSource,
  shared: Record<string, { prompt?: string; options?: { value: string; label: string }[]; note?: FormQuestion["note"] }> = {},
): ReadinessForm {
  return {
    id: source.id,
    title: source.title,
    maxScore: source.maxScore,
    defaultTableId: source.defaultTableId,
    questions: source.questions.map((q, index) => {
      const common = shared[q.id];
      const labelled = q.options ?? common?.options ?? Object.keys(q.weights).map((value) => ({ value, label: value }));
      return {
        key: q.id,
        position: index + 1,
        prompt: q.question ?? common?.prompt ?? q.id,
        note: q.note ?? common?.note ?? null,
        options: labelled.map((o) => ({ value: o.value, label: o.label, weight: q.weights[o.value] ?? 0 })),
      };
    }),
    bands: bandsFromGravityRules(source.rules, source.maxScore),
  };
}
