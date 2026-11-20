import { describe, expect, it } from "vitest";
import {
  KBL_FORMS,
  daysWithForms,
  formSelections,
  isFormComplete,
  kblFormForDay,
  matchRule,
  scoreForm,
} from "@/content/kbl-forms";
import { WORKOUT_TABLES } from "@/content/readiness-table";
import { findDay } from "@/content/program";

describe("KBL form registry", () => {
  it("has the 14 workout forms from WordPress (2, 22–34)", () => {
    expect(Object.keys(KBL_FORMS).sort((a, b) => +a - +b)).toEqual(
      ["2", ...Array.from({ length: 13 }, (_, i) => String(22 + i))],
    );
  });

  it("places a form on every mapped day, and each day has a readiness step", () => {
    const days = daysWithForms();
    expect(days).toHaveLength(51);
    for (const { dayId, formId } of days) {
      const location = findDay(dayId);
      expect(location, dayId).toBeTruthy();
      expect(location!.day.lessons.some((l) => l.special === "readiness"), dayId).toBe(true);
      expect(kblFormForDay(dayId)?.id).toBe(formId);
    }
  });

  it("every band points at a table that exists", () => {
    for (const form of Object.values(KBL_FORMS)) {
      expect(WORKOUT_TABLES[form.defaultTableId], form.id).toBeTruthy();
      for (const rule of form.rules) {
        if (rule.tableId) expect(WORKOUT_TABLES[rule.tableId], `${form.id} ${rule.name}`).toBeTruthy();
      }
    }
  });

  it("merges shared question wording and options into each form", () => {
    const form = KBL_FORMS["2"];
    expect(form.questions.map((q) => q.id)).toEqual([
      "tired",
      "recovery",
      "gut",
      "stress",
      "motivation",
    ]);
    for (const q of form.questions) {
      expect(q.options.length).toBeGreaterThan(1);
      for (const option of q.options) expect(q.weights[option.value]).toBeTypeOf("number");
    }
  });

  it("scores and bands like Gravity Forms", () => {
    const form = KBL_FORMS["2"];
    const best = { tired: "no", recovery: "full", gut: "no", stress: "low", motivation: "high" };
    const worst = { tired: "yes", recovery: "none", gut: "yes", stress: "high", motivation: "low" };
    expect(isFormComplete(form, best)).toBe(true);
    expect(isFormComplete(form, { tired: "no" })).toBe(false);
    expect(scoreForm(form, best)).toBe(0);
    expect(matchRule(form, 0)?.name).toBe("Full Workout");
    expect(scoreForm(form, worst)).toBe(60);
    expect(matchRule(form, 60)?.name).toBe("Off Day");
    expect(formSelections(form, best)[0].answer).toBe("No");
  });
});
