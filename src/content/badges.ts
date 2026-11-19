/**
 * Gamification: badges, tiers and the rules that award them.
 * Rules are evaluated client-side from progress + tool results, then persisted.
 */

export type BadgeTier = "bronze" | "silver" | "gold";

export type Badge = {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  icon: "flame" | "target" | "trophy" | "sparkles" | "compass" | "dumbbell" | "calendar" | "heart";
};

export const badges: Badge[] = [
  { id: "first-day", name: "First Rep", description: "Complete your first day", tier: "bronze", icon: "sparkles" },
  { id: "day-7", name: "One Week In", description: "Complete 7 days", tier: "bronze", icon: "calendar" },
  { id: "day-30", name: "Thirty Deep", description: "Complete 30 days", tier: "silver", icon: "dumbbell" },
  { id: "on-ramp", name: "On Ramp Cleared", description: "Finish the On Ramp phase", tier: "bronze", icon: "compass" },
  { id: "phase-1", name: "Phase I Complete", description: "Finish Phase I", tier: "silver", icon: "target" },
  { id: "phase-2", name: "Phase II Complete", description: "Finish Phase II", tier: "silver", icon: "target" },
  { id: "phase-3", name: "Phase III Complete", description: "Finish Phase III", tier: "gold", icon: "trophy" },
  { id: "streak-3", name: "Momentum", description: "Train 3 days in a row", tier: "bronze", icon: "flame" },
  { id: "streak-7", name: "Unbroken", description: "Train 7 days in a row", tier: "silver", icon: "flame" },
  { id: "streak-30", name: "Lifestyle", description: "Train 30 days in a row", tier: "gold", icon: "flame" },
  { id: "tool-first", name: "Self-Aware", description: "Complete your first tool", tier: "bronze", icon: "heart" },
  { id: "tool-all", name: "Fully Assessed", description: "Complete every assessment tool", tier: "silver", icon: "heart" },
  { id: "level-1", name: "Beginner Graduate", description: "Complete Level I", tier: "gold", icon: "trophy" },
  { id: "level-2", name: "Intermediate Graduate", description: "Complete Level II", tier: "gold", icon: "trophy" },
];

export const badgeById = (id: string) => badges.find((b) => b.id === id);

export const tierRing: Record<BadgeTier, string> = {
  bronze: "text-[#b07b4f]",
  silver: "text-muted-foreground",
  gold: "text-primary",
};

/** XP model: every completed lesson is 10 XP, a day is 40, a phase 250. */
export const XP_PER_LESSON = 10;
export const XP_PER_DAY = 40;
export const XP_PER_PHASE = 250;

export const levels = [
  { name: "Novice", min: 0 },
  { name: "Apprentice", min: 500 },
  { name: "Practitioner", min: 1500 },
  { name: "Craftsman", min: 3500 },
  { name: "Master", min: 7000 },
];

export function levelForXp(xp: number) {
  let current = levels[0];
  let next: (typeof levels)[number] | undefined = levels[1];
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].min) {
      current = levels[i];
      next = levels[i + 1];
    }
  }
  const span = next ? next.min - current.min : 1;
  const into = xp - current.min;
  return {
    name: current.name,
    next: next?.name,
    percent: next ? Math.min(100, Math.round((into / span) * 100)) : 100,
    toNext: next ? next.min - xp : 0,
  };
}
