import { describe, expect, it } from "vitest";
import expected from "./__fixtures__/kbl-readiness-cases.json";
import source from "@/content/source-readiness.json";
import { isReadinessComplete, resolveReadiness } from "@/content/readiness-table";

const keys = ["tired", "recovery", "gut", "stress", "motivation"];
const choices = [
  ["no", "yes"],
  ["full", "moderate", "none"],
  ["no", "yes"],
  ["low", "moderate", "high"],
  ["high", "medium", "low"],
];
const answers = (indices: number[]) =>
  Object.fromEntries(indices.map((index, q) => [keys[q], choices[q][index]]));

describe("source readiness rules, with the owner's approved scoring correction", () => {
  it.each(Object.entries(source.dayForms))(
    "evaluates all 108 combinations for %s",
    (dayId, formId) => {
      const cases = expected.cases.filter((entry) => entry.formId === formId);
      expect(cases).toHaveLength(108);
      for (const entry of cases) {
        const result = resolveReadiness(answers(entry.choices), dayId);
        expect(result.score).toBe(entry.score);
        expect(result.table?.sourceId ?? null, `${formId} / ${entry.choices.join("")}`).toBe(
          entry.tableId,
        );
        expect(result.outcome).toBe(entry.outcome);
        expect(result.sourceFormId).toBe(formId);
        expect(result.max).toBe(60);
      }
    },
  );
  it("makes all five source outcomes reachable, including total rest", () => {
    const variants = new Set(
      expected.cases.filter((entry) => entry.formId === "2").map((entry) => entry.variant),
    );
    expect(variants.size).toBe(5);
    const high = resolveReadiness(answers([1, 2, 1, 2, 2]), "l1-phase-1-d8");
    expect(high).toMatchObject({ score: 60, max: 60, table: null, outcome: "rest" });
    expect(high.band.summary).toContain("total and complete rest");
  });
  it("uses each Phase II workout's own full table instead of the copied Phase I fallback", () => {
    expect(resolveReadiness(answers([0, 0, 0, 0, 1]), "l1-phase-2-d21").table?.sourceId).toBe("29");
    expect(resolveReadiness(answers([0, 0, 0, 0, 1]), "l1-phase-2-d23").table?.sourceId).toBe("33");
    expect(resolveReadiness(answers([0, 0, 0, 0, 1]), "l1-phase-2-d25").table?.sourceId).toBe("39");
  });
  it("rejects incomplete, unknown or out-of-course answers", () => {
    expect(isReadinessComplete({})).toBe(false);
    expect(() => resolveReadiness({}, "l1-phase-1-d8")).toThrow();
    expect(() =>
      resolveReadiness({ ...answers([0, 0, 0, 0, 0]), tired: "maybe" }, "l1-phase-1-d8"),
    ).toThrow();
    expect(() => resolveReadiness(answers([0, 0, 0, 0, 0]), "l1-on-ramp-overview")).toThrow();
  });
});
