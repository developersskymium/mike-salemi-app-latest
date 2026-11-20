import { describe, expect, it } from "vitest";
import { recommendMtkPath } from "./mtk";

const base = { role: "Training for myself", experience: "1–3 years", knowledge: "3 — Competent", time: "2–3 hours" };

describe("recommendMtkPath", () => {
  it("routes swing/clean/snatch goals to Ballistic", () => {
    const r = recommendMtkPath({ ...base, focus: "Ballistic Movements", improve: "Swing / Clean / Snatch" });
    expect(r.path).toBe("ballistic");
    expect(r.startSection).toBe(4);
    expect(r.foundationFirst).toBe(false);
  });
  it("routes overhead goals to Overhead", () => {
    expect(recommendMtkPath({ ...base, focus: "Overhead Movements", improve: "Turkish Get Up / overhead control" }).path).toBe("overhead");
  });
  it("routes squat/lunge/row goals to Lower Body & Pulling", () => {
    expect(recommendMtkPath({ ...base, focus: "Lower Body & Pulling", improve: "Squat / Lunge / Row" }).path).toBe("lower");
  });
  it("routes coaches who want the full system to Full MTK", () => {
    const r = recommendMtkPath({ ...base, role: "Personal trainer / strength coach", focus: "All of them", improve: "Learn the full system" });
    expect(r.path).toBe("full");
  });
  it("starts very new members at the foundation without changing their path", () => {
    const r = recommendMtkPath({ ...base, experience: "Completely new", focus: "Overhead Movements" });
    expect(r.path).toBe("overhead");
    expect(r.foundationFirst).toBe(true);
    expect(r.startSection).toBe(2);
  });
});
