import { describe, expect, it } from "vitest";
import { MTK_LESSON_META, groupIntoDays, selectMtkLessons, weeksNeeded, type MtkAnswers } from "./mtk-plan";

const db = MTK_LESSON_META.map((m) => ({ id: m.id, sectionSeq: m.s, lessonSeq: m.q }));
const realIds = new Set(db.map((l) => l.id));

export const PROFILES: Record<string, MtkAnswers> = {
  beginner: { role: "Training for myself", experience: "Completely new", confident: ["Still learning fundamentals"], struggle: ["None in particular"], improve: "Strong kettlebell fundamentals", focus: "Not sure", challenge: "Not sure where to start", knowledge: "1 — New", time: "1–2 hours", guidance: "Show me exactly where to start" },
  intermediate: { role: "Training for myself", experience: "1–3 years", confident: ["Deadlift", "Swing", "Squat"], struggle: ["Clean", "Snatch"], improve: "Swing / Clean / Snatch", focus: "Ballistic Movements", challenge: "Technique", knowledge: "3 — Competent", time: "2–3 hours", guidance: "Recommend a path but let me explore" },
  experienced: { role: "Athlete", experience: "More than 3 years", confident: ["Deadlift", "Swing", "Clean", "Snatch", "Press", "Squat", "Row"], struggle: ["Turkish Get Up"], improve: "Turkish Get Up / overhead control", focus: "Overhead Movements", challenge: "Advanced progressions", knowledge: "4 — Experienced", time: "3–4 hours", guidance: "I already know what I want to work on" },
  coach: { role: "Personal trainer / strength coach", experience: "I regularly coach kettlebells", confident: ["Deadlift", "Swing", "Clean", "Press", "Squat", "Lunge", "Row"], struggle: ["Snatch", "Windmill"], improve: "Become a better kettlebell coach", focus: "All of them", challenge: "Programming for clients", knowledge: "5 — Coach / Advanced", time: "4+ hours", guidance: "Recommend a path but let me explore" },
  oneMovement: { role: "Training for myself", experience: "Less than 1 year", confident: ["Deadlift", "Swing"], struggle: ["Squat"], improve: "Squat / Lunge / Row", focus: "Lower Body & Pulling", challenge: "Mobility", knowledge: "2 — Developing", time: "1–2 hours", guidance: "Show me exactly where to start" },
};

const select = (a: MtkAnswers) => selectMtkLessons(a, db);

describe("MTK lesson selection", () => {
  it("only ever returns real lesson ids, in curriculum order", () => {
    for (const a of Object.values(PROFILES)) {
      const s = select(a);
      expect(s.lessonIds.every((id) => realIds.has(id))).toBe(true);
      const order = db.map((l) => l.id).filter((id) => s.lessonIds.includes(id));
      expect(s.lessonIds).toEqual(order);
      expect(s.total).toBe(303);
    }
  });

  it("gives meaningfully different curricula per learner", () => {
    const counts = Object.values(PROFILES).map((a) => select(a).lessonIds.length);
    expect(new Set(counts).size).toBe(counts.length);
  });

  it("drops lesson ids missing from the live curriculum", () => {
    const s = selectMtkLessons(PROFILES.coach, db.slice(0, 50));
    expect(s.lessonIds.every((id) => db.slice(0, 50).some((l) => l.id === id))).toBe(true);
  });

  it("includes the deadlift foundation before clean work for someone struggling with the clean", () => {
    const s = select({ ...PROFILES.intermediate, confident: [] });
    const movements = s.lessonIds.map((id) => MTK_LESSON_META.find((m) => m.id === id)!.movement);
    expect(movements).toContain("deadlift");
    expect(movements.indexOf("deadlift")).toBeLessThan(movements.indexOf("clean"));
  });

  it("gives coaches the programming lecture and beginners the set-up lessons", () => {
    const coach = select(PROFILES.coach).lessonIds.map((id) => MTK_LESSON_META.find((m) => m.id === id)!.type);
    expect(coach).toContain("programming");
    const beginner = select(PROFILES.beginner).lessonIds.map((id) => MTK_LESSON_META.find((m) => m.id === id)!.type);
    expect(beginner.filter((t) => t === "setup").length).toBe(5);
  });
});

describe("MTK schedule grouping", () => {
  it("keeps every selected lesson, in order, within the session length where possible", () => {
    const s = select(PROFILES.intermediate);
    const days = groupIntoDays(s.lessonIds, 20, 3);
    expect(days.flatMap((d) => d.lessonIds)).toEqual(s.lessonIds);
    expect(days.filter((d) => d.lessonIds.length > 1).every((d) => d.minutes <= 20)).toBe(true);
  });
  it("reports the minimum weeks for an unrealistic timeframe", () => {
    const days = groupIntoDays(select(PROFILES.coach).lessonIds, 15, 2);
    expect(weeksNeeded(days.length, 2)).toBeGreaterThan(2);
  });
});
