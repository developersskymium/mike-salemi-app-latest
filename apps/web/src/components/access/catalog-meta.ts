/**
 * Catalog merchandising the database doesn't hold yet: goal tags, the facts row and "members also took".
 * Facts are draft copy from the client notes (spec 10) and program data; Studio can replace them later
 * via programs.meta (facts/goals) — read first, these are the fallbacks.
 */
export type Goal = "strength" | "mobility" | "fat-loss" | "mindset" | "recovery";
export const GOALS: { key: Goal; label: string }[] = [
  { key: "strength", label: "Strength" },
  { key: "mobility", label: "Mobility" },
  { key: "fat-loss", label: "Fat loss" },
  { key: "mindset", label: "Mindset" },
  { key: "recovery", label: "Recovery" },
];

export type Facts = { weeks: string; minutes: string; equipment: string; level: string };

type Meta = { goals: Goal[]; facts: Facts; also?: string[] };

export const CATALOG_META: Record<string, Meta> = {
  "kettlebell-lifestyle": { goals: ["strength", "fat-loss", "mobility"], facts: { weeks: "9 wks / level", minutes: "30–45 min", equipment: "1–2 kettlebells", level: "Level I or II" }, also: ["mastering-the-kettlebell", "working-in"] },
  "mastering-the-kettlebell": { goals: ["strength", "mobility"], facts: { weeks: "Self-paced", minutes: "10–20 min", equipment: "1 kettlebell", level: "All levels" }, also: ["kettlebell-lifestyle", "athleticism-4-life"] },
  "athleticism-4-life": { goals: ["strength", "fat-loss"], facts: { weeks: "Blocks", minutes: "30–40 min", equipment: "Kettlebells", level: "Intermediate" }, also: ["mastering-the-kettlebell", "working-in"] },
  "working-in": { goals: ["recovery", "mindset"], facts: { weeks: "Short", minutes: "10–15 min", equipment: "None", level: "All levels" }, also: ["kettlebell-lifestyle", "the-path-to-inspired-action"] },
  "the-path-to-inspired-action": { goals: ["mindset"], facts: { weeks: "Self-paced", minutes: "15–20 min", equipment: "Journal", level: "All levels" }, also: ["working-in", "coaching"] },
  "kettlebell-roadmap": { goals: ["strength"], facts: { weeks: "1 quiz", minutes: "1 min", equipment: "None", level: "Start here" } },
  "what-your-kettlebell-swing-is-missing": { goals: ["strength"], facts: { weeks: "Mini series", minutes: "5–10 min", equipment: "1 kettlebell", level: "Beginner" }, also: ["kettlebell-lifestyle"] },
  "free-6-video-kettlebell-mini-series": { goals: ["strength", "mobility"], facts: { weeks: "6 videos", minutes: "5–10 min", equipment: "1 kettlebell", level: "Beginner" }, also: ["kettlebell-lifestyle"] },
  coaching: { goals: ["mindset", "strength"], facts: { weeks: "Tuesdays", minutes: "45 min", equipment: "Video call", level: "1:1" } },
  "executive-edge": { goals: ["mindset"], facts: { weeks: "8 weeks", minutes: "5 min daily", equipment: "—", level: "By application" } },
  "zen-savage": { goals: ["mindset", "strength"], facts: { weeks: "Challenge", minutes: "Live", equipment: "Kettlebell", level: "Group" } },
  "men-of-movement-retreats": { goals: ["mindset", "recovery"], facts: { weeks: "4 days", minutes: "In person", equipment: "Provided", level: "By application" } },
};

export const metaFor = (slug: string): Meta | null => CATALOG_META[slug] ?? null;
