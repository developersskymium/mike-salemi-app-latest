import { describe, expect, it } from "vitest";
import source from "./__fixtures__/source-readiness.json";
import expected from "./__fixtures__/kbl-readiness-cases.json";
import {
  assessReadiness,
  bandsFromGravityRules,
  formFromGravity,
  formSelections,
  isFormComplete,
  matchesGravityRule,
  resolveOutcome,
  scoreForm,
  type GravityFormSource,
  type GravityRule,
} from "./readiness";
import type { ReadinessForm } from "./types";

const keys = ["tired", "recovery", "gut", "stress", "motivation"];
const choices = [
  ["no", "yes"],
  ["full", "moderate", "none"],
  ["no", "yes"],
  ["low", "moderate", "high"],
  ["high", "medium", "low"],
];
const answers = (indices: number[]) => Object.fromEntries(indices.map((index, q) => [keys[q], choices[q]![index]!]));
const allCombinations = (() => {
  const out: number[][] = [[]];
  for (const c of choices) {
    const next: number[][] = [];
    for (const prefix of out) for (let i = 0; i < c.length; i++) next.push([...prefix, i]);
    out.splice(0, out.length, ...next);
  }
  return out;
})();

const rawForms = source.forms as unknown as Record<string, GravityFormSource>;
const forms: Record<string, ReadinessForm> = Object.fromEntries(
  Object.entries(rawForms).map(([id, raw]) => [id, formFromGravity(raw)]),
);

/** Independent legacy resolver (legacy content/readiness-table.ts + kbl-forms.ts). */
function legacyResolve(raw: GravityFormSource, a: Record<string, string>) {
  const score = raw.questions.reduce((sum, q) => sum + (q.weights[a[q.id]!] ?? 0), 0);
  const rule = raw.rules.find((r) => matchesGravityRule(r, score));
  return { score, name: rule?.name ?? "Full Workout", tableId: rule ? rule.tableId : raw.defaultTableId };
}

describe("readiness parity with the legacy Gravity Forms resolver", () => {
  it("has 108 combinations and all 14 forms", () => {
    expect(allCombinations).toHaveLength(108);
    expect(Object.keys(forms)).toHaveLength(14);
  });

  it.each(Object.keys(rawForms))("form %s: every one of the 108 combinations matches (0 mismatches)", (formId) => {
    const form = forms[formId]!;
    const cases = expected.cases.filter((c) => c.formId === formId);
    expect(cases).toHaveLength(108);
    let mismatches = 0;
    for (const combo of allCombinations) {
      const a = answers(combo);
      const result = resolveOutcome(form, scoreForm(form, a));
      const legacy = legacyResolve(rawForms[formId]!, a);
      const fixture = cases.find((c) => c.choices.join() === combo.join())!;
      if (
        result.score !== legacy.score ||
        result.name !== legacy.name ||
        result.tableId !== legacy.tableId ||
        result.score !== fixture.score ||
        result.name !== fixture.variant ||
        result.tableId !== fixture.tableId ||
        result.outcome !== fixture.outcome
      )
        mismatches++;
    }
    expect(mismatches).toBe(0);
  });

  it("every day-mapped form resolves its fixtures (51 days)", () => {
    const dayForms = source.dayForms as Record<string, string>;
    expect(Object.keys(dayForms)).toHaveLength(51);
    for (const formId of Object.values(dayForms)) expect(forms[formId]).toBeTruthy();
  });

  it("applies the approved corrections: tired=yes is 15 points, max 60 reachable as total rest", () => {
    const form = forms["2"]!;
    expect(form.questions[0]!.options.find((o) => o.value === "yes")!.weight).toBe(15);
    const worst = assessReadiness(form, answers([1, 2, 1, 2, 2]));
    expect(worst).toMatchObject({ score: 60, name: "Off Day", band: "red", outcome: "rest", tableId: null });
    expect(worst.message).toContain("total and complete rest");
  });

  it("forms 25/26/27 fall back to their own full tables 29/33/39", () => {
    const a = answers([0, 0, 0, 0, 1]); // score 3: no band → default
    expect(assessReadiness(forms["25"]!, a)).toMatchObject({ name: "Full Workout", band: "green", tableId: "29" });
    expect(assessReadiness(forms["26"]!, a).tableId).toBe("33");
    expect(assessReadiness(forms["27"]!, a).tableId).toBe("39");
  });

  it("maps bands to colour and outcome like the legacy app", () => {
    const byName = Object.fromEntries(forms["2"]!.bands.map((b) => [b.name, b]));
    expect(byName["Full Workout"]).toMatchObject({ band: "green", outcome: "workout", minScore: 0, maxScore: 0 });
    expect(byName["Chart 2 Modification"]).toMatchObject({ band: "amber", outcome: "workout", minScore: 23, maxScore: 32 });
    expect(byName["Chart 3 Modification"]).toMatchObject({ band: "amber", minScore: 33, maxScore: 39 });
    expect(byName["Recovery Day"]).toMatchObject({ band: "red", outcome: "recovery", minScore: 40, maxScore: 53 });
    expect(byName["Off Day"]).toMatchObject({ band: "red", outcome: "rest", minScore: 54, maxScore: 60 });
  });
});

describe("readiness scoring helpers", () => {
  const form = forms["2"]!;
  it("checks completeness and rejects unknown answers", () => {
    expect(isFormComplete(form, answers([0, 0, 0, 0, 0]))).toBe(true);
    expect(isFormComplete(form, { tired: "no" })).toBe(false);
    expect(isFormComplete(form, { ...answers([0, 0, 0, 0, 0]), tired: "maybe" })).toBe(false);
    expect(() => assessReadiness(form, {})).toThrow(/tired/);
    expect(() => assessReadiness(form, { ...answers([0, 0, 0, 0, 0]), tired: "maybe" })).toThrow();
  });
  it("scores partial answers for a live total", () => {
    expect(scoreForm(form, { tired: "yes" })).toBe(15);
    expect(formSelections(form, { tired: "no" })[0]!.answer).toBe("no");
    expect(formSelections(form, {})[0]!.answer).toBe("—");
  });
  it("picks the first band by position when ranges overlap", () => {
    const f = { defaultTableId: "d", bands: [
      { name: "B", band: "amber", outcome: "workout", tableId: "b", message: "", minScore: 0, maxScore: 10, position: 2 },
      { name: "A", band: "green", outcome: "workout", tableId: "a", message: "", minScore: 5, maxScore: 10, position: 1 },
    ] } as const;
    expect(resolveOutcome({ ...f, bands: [...f.bands] }, 7).name).toBe("A");
    expect(resolveOutcome({ ...f, bands: [...f.bands] }, 2).name).toBe("B");
    expect(resolveOutcome({ ...f, bands: [...f.bands] }, 11)).toMatchObject({ name: "Full Workout", tableId: "d", band: "green" });
  });
});

describe("bandsFromGravityRules", () => {
  const rule = (name: string, logicType: "all" | "any", conds: [string, number][], tableId: string | null = "t"): GravityRule => ({
    name,
    tableId,
    message: "",
    logic: { logicType, rules: conds.map(([operator, value]) => ({ fieldId: "gquiz_score", operator, value: String(value) })) },
  });
  it("splits a non-contiguous rule into several bands", () => {
    const bands = bandsFromGravityRules([rule("Edges", "any", [["<", 3], [">", 7]])], 10);
    expect(bands.map((b) => [b.name, b.minScore, b.maxScore])).toEqual([["Edges", 0, 2], ["Edges", 8, 10]]);
  });
  it("supports every operator and first-match order", () => {
    const bands = bandsFromGravityRules(
      [
        rule("Zero", "all", [["is", 0]]),
        rule("Low", "all", [["greater_than", 0], ["less_than", 4]]),
        rule("Mid", "all", [[">=", 4], ["<=", 6]]),
        rule("NotNine", "all", [["isnot", 9], [">", 6]], null),
      ],
      10,
    );
    expect(bands.map((b) => [b.name, b.minScore, b.maxScore])).toEqual([
      ["Zero", 0, 0], ["Low", 1, 3], ["Mid", 4, 6], ["NotNine", 7, 8], ["NotNine", 10, 10],
    ]);
    expect(bands[3]).toMatchObject({ band: "red", outcome: "recovery" });
  });
  it("rejects unsupported conditions", () => {
    expect(() => bandsFromGravityRules([rule("X", "all", [["contains", 1]])], 2)).toThrow(/operator/);
  });
});
