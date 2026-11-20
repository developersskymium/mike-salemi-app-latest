/**
 * Badges & rewards — client-side presentation of the families defined in the database
 * (supabase/migrations/0023_badges_rewards.sql). The database owns definitions and awards;
 * this file only knows how to show them (family order, labels, program enamel colours, perks).
 */

export type BadgeFamily = "consistency" | "program" | "mastery" | "explorer" | "mike";
export type MedalTier = "bronze" | "silver" | "gold" | "platinum";

export interface BadgePerk {
  kind: "bonus_video" | "discount" | "free_month" | "coaching_credit";
  label: string;
  detail?: string | null;
  percent?: number | null;
  href?: string | null;
}

/** One badge definition as the app shows it (a row of public.badges). */
export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  tier: MedalTier;
  icon: string | null;
  points: number;
  family?: BadgeFamily | null;
  program_slug?: string | null;
  medal_color?: string | null;
  perk?: BadgePerk | null;
  position?: number;
}

export const FAMILIES: { id: BadgeFamily; title: string; lede: string }[] = [
  { id: "consistency", title: "Consistency", lede: "Show up. Streaks and active weeks, in any program." },
  { id: "program", title: "Program milestones", lede: "First day to finish line — six to twelve medals in each program, in its own colour." },
  { id: "mastery", title: "Mastery", lede: "Skills unlocked, blocks finished, readiness and mobility improved." },
  { id: "explorer", title: "Explorer", lede: "Try programs, use the tools, watch the library." },
];

/** Older badges (0003 seeds) have no family column yet: infer it from the id. */
export function familyOf(b: Pick<BadgeDef, "id" | "family">): BadgeFamily {
  if (b.family) return b.family;
  const id = b.id;
  if (id.startsWith("mike-")) return "mike";
  if (id.startsWith("prog-") || id.startsWith("level-") || id.startsWith("phase-") || id === "on-ramp") return "program";
  if (id.startsWith("mastery-")) return "mastery";
  if (id.startsWith("tool") || id.startsWith("explore-")) return "explorer";
  return "consistency";
}

/** Enamel colour per program (matches badges.medal_color seeded in 0023). */
export const PROGRAM_MEDAL: Record<string, { color: string; short: string }> = {
  "kettlebell-lifestyle": { color: "#E2551F", short: "Kettlebell Lifestyle" },
  "mastering-the-kettlebell": { color: "#1A85D6", short: "Mastering the Kettlebell" },
  "athleticism-4-life": { color: "#1F9D6A", short: "Athleticism 4 Life" },
  "working-in": { color: "#7A5BC7", short: "Working-In" },
  "the-path-to-inspired-action": { color: "#C2410C", short: "The Path" },
  "men-of-movement": { color: "#2F4B72", short: "Men of Movement" },
  "what-your-kettlebell-swing-is-missing": { color: "#B8860B", short: "Swing series" },
  "free-6-video-kettlebell-mini-series": { color: "#0E7490", short: "Mini series" },
  "kettlebell-roadmap": { color: "#64748B", short: "Roadmap" },
  "essential-kettlebell-training-strength": { color: "#9F1239", short: "Essential Strength" },
};

export const medalColorOf = (b: Pick<BadgeDef, "medal_color" | "program_slug">) =>
  b.medal_color ?? (b.program_slug ? PROGRAM_MEDAL[b.program_slug]?.color : undefined) ?? null;

/** Moments with Mike: a collection, earned in any order. Never a ladder. */
export const MOMENTS: { id: string; title: string; how: string; icon: string; href: string; cta: string }[] = [
  { id: "mike-book-1on1", title: "Book a 1:1", how: "Book a 45-minute call with Mike.", icon: "calendar", href: "/coaching", cta: "Book a call" },
  { id: "mike-live-call", title: "Join a live call", how: "Be on a call with Mike — a 1:1 or your retreat call.", icon: "video", href: "/coaching", cta: "See calls" },
  { id: "mike-note", title: "A note from Mike", how: "Mike writes you a note or homework after a call.", icon: "file", href: "/coaching", cta: "Book a call" },
  { id: "mike-finish-program", title: "Finish a program", how: "Complete any program or level.", icon: "trophy", href: "/programs", cta: "Your programs" },
  { id: "mike-retreat-apply", title: "Apply to a retreat", how: "Apply any time — there's no level to reach first.", icon: "mountain", href: "/experiences", cta: "See retreats" },
  { id: "mike-retreat-attend", title: "Train on the mountain", how: "Attend a retreat with Mike in person.", icon: "flag", href: "/experiences", cta: "See retreats" },
  { id: "mike-refer", title: "Bring a friend", how: "A friend you invited joins. You get a free month.", icon: "gift", href: "/you/referrals", cta: "Invite a friend" },
];

/** Label for a badge shown inside its program ("Started · A4L" → "Started"). */
export const shortName = (b: Pick<BadgeDef, "name" | "id">) => (b.name || "").split(" · ")[0]?.trim() || titleFromId(b.id);

/** A readable name from an id, for any legacy row that arrives without one ("streak-7" → "Streak 7"). */
export const titleFromId = (id: string) => id.replace(/^prog-/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Never show a blank description. */
export const descOf = (b: Pick<BadgeDef, "description" | "name" | "id" | "program_slug">) =>
  b.description?.trim() || (b.program_slug && PROGRAM_MEDAL[b.program_slug] ? `A ${PROGRAM_MEDAL[b.program_slug]!.short} milestone.` : `${b.name || titleFromId(b.id)}.`);

/** "3 of 7" style progress for a badge, or null when it is a simple yes/no. Program % stages read as percent. */
export function progressText(p: { current: number; target: number } | undefined, id: string) {
  if (!p || p.target <= 1) return null;
  if (id.startsWith("prog-") && (id.endsWith("-halfway") || id.endsWith("-complete"))) return `${p.current}%`;
  return `${p.current} of ${p.target}`;
}
