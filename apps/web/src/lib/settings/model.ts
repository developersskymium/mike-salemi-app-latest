/** Settings + onboarding shared model (client-safe). */

export type Units = "kg" | "lb";
export type Channel = "push" | "email";

/** Notification matrix rows (spec 12 › Settings 3). `offers` can always be switched off. */
export const NOTIFY_TOPICS = [
  { id: "reminders", label: "Training reminders", detail: "Your session for the day, at your reminder time." },
  { id: "streak", label: "Streak nudges", detail: "A gentle note before a streak slips." },
  { id: "recap", label: "Weekly recap", detail: "Monday: last week in one glance + 3 suggested days." },
  { id: "new_content", label: "New from Mike", detail: "New lessons, programs and Mike's weekly note." },
  { id: "coaching", label: "Coaching & retreats", detail: "Call reminders, application updates, travel info." },
  { id: "offers", label: "Offers", detail: "The occasional program or plan suggestion. Off any time." },
] as const;
export type NotifyTopic = (typeof NOTIFY_TOPICS)[number]["id"];
export type NotifyMatrix = Record<NotifyTopic, Record<Channel, boolean>>;

export const DEFAULT_MATRIX: NotifyMatrix = {
  reminders: { push: true, email: true },
  streak: { push: true, email: false },
  recap: { push: false, email: true },
  new_content: { push: false, email: true },
  coaching: { push: true, email: true },
  offers: { push: false, email: true },
};

export function normalizeMatrix(raw: unknown): NotifyMatrix {
  const m = { ...DEFAULT_MATRIX } as NotifyMatrix;
  if (raw && typeof raw === "object") {
    for (const t of NOTIFY_TOPICS) {
      const r = (raw as Record<string, unknown>)[t.id] as Partial<Record<Channel, unknown>> | undefined;
      if (r && typeof r === "object") m[t.id] = { push: typeof r.push === "boolean" ? r.push : m[t.id].push, email: typeof r.email === "boolean" ? r.email : m[t.id].email };
    }
  }
  return m;
}

/** Kettlebell sizes offered (kg). */
export const BELL_SIZES_KG = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];
export const kgToLb = (kg: number) => Math.round(kg * 2.20462);
export const bellLabel = (kg: number, u: Units) => (u === "kg" ? `${kg} kg` : `${kgToLb(kg)} lb`);

/** The training profile (same shape as training_profiles.data, migration 0025). */
export interface TrainingProfile {
  goal_kind?: string;
  target_date?: string;
  days_per_week?: number;
  training_days?: number[];
  session_minutes?: number;
  equipment?: string[];
  bell_weights?: string;
  kb_experience?: number;
  kb_level?: "beginner" | "intermediate" | "advanced";
  focus_areas?: string[];
  limitations?: string;
}

export const GOALS = [
  { value: "strength", label: "Get stronger", description: "Real strength, built with kettlebells.", icon: "dumbbell", photo: "/media/summit/mike-press.jpg", position: "60% 12%" },
  { value: "technique", label: "Master the kettlebell", description: "Clean technique and new skills.", icon: "kettlebell", photo: "/media/summit/mike-goblet.jpg", position: "52% 10%" },
  { value: "mobility", label: "Move better", description: "Mobility and joints that feel good.", icon: "wind", photo: "/media/summit/mike-windmill.jpg", position: "70% 38%" },
  { value: "conditioning", label: "Get fit, lose fat", description: "Conditioning that fits a busy week.", icon: "flame", photo: "/media/summit/mike-squat.jpg", position: "50% 25%" },
  { value: "recovery", label: "Recover and reset", description: "Breath, calm and gentle practice.", icon: "leaf", photo: "/media/summit/working-in.jpg", position: "50% 42%" },
  { value: "mindset", label: "Mindset and purpose", description: "Lead yourself, with Mike's coaching.", icon: "compass", photo: "/media/summit/tgk.jpg", position: "50% 35%" },
] as const;

export const EXPERIENCE = [
  { value: "0", label: "Brand new", description: "Never trained with a kettlebell." },
  { value: "1", label: "A little", description: "I've tried swings or goblet squats." },
  { value: "2", label: "Regular", description: "I train with bells most weeks." },
  { value: "3", label: "Experienced", description: "Years in, or I coach others." },
] as const;

/** Values match the goal-setting intake so every intake prefills from them. */
export const EQUIPMENT = [
  { value: "One kettlebell", label: "One kettlebell" },
  { value: "Two kettlebells (a pair)", label: "A pair" },
  { value: "Several kettlebells", label: "Several bells" },
  { value: "Mat and floor space", label: "Mat and floor space" },
  { value: "Pull-up bar", label: "Pull-up bar" },
  { value: "Full gym", label: "Full gym" },
] as const;
export const SESSION_LENGTHS = [15, 30, 45, 60];
const hasBell = (eq: string[] | undefined) => (eq ?? []).some((e) => /kettlebell|gym/i.test(e));

export const GOAL_LABEL: Record<string, string> = Object.fromEntries(GOALS.map((g) => [g.value, g.label]));
export const EXPERIENCE_LABEL: Record<string, string> = Object.fromEntries(EXPERIENCE.map((g) => [g.value, g.label]));
export const EQUIPMENT_LABEL: Record<string, string> = Object.fromEntries(EQUIPMENT.map((g) => [g.value, g.label]));
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** One suggested program from onboarding: a program home (never a lesson) with a one-line reason. */
export interface Recommendation {
  slug: string;
  title: string;
  reason: string;
  facts: string[];
  href: string;
  photo: { src: string; position: string; alt: string };
}

/** Cookie that keeps onboarding suggestions in local preview (MOCK_DATA), where nothing is written to the database. */
export const MOCK_SUGGEST_COOKIE = "ms_onb_suggest";

type PhotoFn = (slug: string) => { src: string; position: string; alt: string };

/** Program names, short facts and one-line reasons per goal, used by `suggest`. */
export const SUGGESTABLE: Record<string, { title: string; facts: (p: TrainingProfile) => string[] }> = {
  "kettlebell-lifestyle": { title: "Kettlebell Lifestyle", facts: (p) => [`${p.days_per_week ?? 3} days a week`, `${p.session_minutes ?? 30} min`, "Guided days"] },
  "working-in": { title: "Working In", facts: () => ["10 to 20 min", "No equipment", "Any level"] },
  "mastering-the-kettlebell": { title: "Mastering the Kettlebell", facts: () => ["Skill by stage", "Self-paced", "All levels"] },
  "athleticism-4-life": { title: "Athleticism 4 Life", facts: (p) => ["Strength blocks", `${p.days_per_week ?? 3} days a week`, "Some experience"] },
  "the-path-to-inspired-action": { title: "The Path to Inspired Action", facts: () => ["Self-paced chapters", "No equipment", "Any level"] },
  "free-6-video-kettlebell-mini-series": { title: "Free Kettlebell Mini Series", facts: () => ["6 short videos", "Free", "Beginner"] },
};

/**
 * Onboarding suggestions (spec 12 › Sign in & onboarding 5): two or three programs that fit the answers,
 * best fit first, each with a one-line reason. Every link is the program's home page, where its own
 * intake and schedule happen (prefilled from the training profile).
 */
export function suggest(p: TrainingProfile, photo: PhotoFn): Recommendation[] {
  const exp = p.kb_experience ?? 0;
  const days = p.days_per_week ?? 3;
  const noBell = !hasBell(p.equipment);
  const goal = p.goal_kind ?? "strength";
  const picks: [string, string][] = [];
  const add = (slug: string, reason: string) => {
    if (!picks.some(([s]) => s === slug)) picks.push([slug, reason]);
  };
  const newcomer = noBell && exp === 0;
  if (goal === "recovery") {
    add("working-in", "Short daily practices to recover and reset.");
    add("the-path-to-inspired-action", "Calm, self-paced chapters for the mind side of recovery.");
    add("kettlebell-lifestyle", `Gentle guided days, ${days} a week, when you want to move more.`);
  } else if (goal === "mindset") {
    add("the-path-to-inspired-action", "Where Mike starts the work on mindset and purpose.");
    add("working-in", "Short daily practices that keep you steady.");
    add("kettlebell-lifestyle", `Pair the mindset work with ${days} guided training days a week.`);
  } else {
    if (newcomer) add("free-6-video-kettlebell-mini-series", "New and no bell yet: six free videos on what to buy and how to start.");
    if (goal === "technique" || goal === "mobility") {
      add("mastering-the-kettlebell", goal === "technique" ? "Clean technique, taught one stage at a time." : "Builds skill and mobility one stage at a time.");
      if (goal === "mobility") add("working-in", "Short daily practices for joints that feel good.");
      add("kettlebell-lifestyle", `${days} guided days a week, matched to your level.`);
    } else if (goal === "strength" && exp >= 2) {
      add("athleticism-4-life", "You already train with bells, so strength blocks are the next step.");
      add("kettlebell-lifestyle", `${days} guided days a week, matched to your level.`);
      add("mastering-the-kettlebell", "Sharpen your technique as the weights go up.");
    } else {
      add("kettlebell-lifestyle", `${days} guided days a week, matched to your level.`);
      if (exp >= 2) add("athleticism-4-life", "Strength blocks for when you want more challenge.");
      add("mastering-the-kettlebell", "Learn clean technique one stage at a time.");
      if (!newcomer && exp === 0) add("free-6-video-kettlebell-mini-series", "Six free videos to get the basics right first.");
    }
  }
  return picks.slice(0, 3).map(([slug, reason]) => {
    const meta = SUGGESTABLE[slug]!;
    return { slug, title: meta.title, reason, facts: meta.facts(p), href: `/programs/${slug}`, photo: photo(slug) };
  });
}

/** The best fit only (kept for older callers). */
export function recommend(p: TrainingProfile, photo: PhotoFn): Recommendation {
  return suggest(p, photo)[0]!;
}

export interface SettingsHub {
  account: { name: string; firstName: string; email: string; createdAt: string | null; autoplay: boolean; avatarUrl: string | null };
  profile: TrainingProfile;
  profileSources: Record<string, string>;
  settings: { units: Units; ownedBells: number[]; matrix: NotifyMatrix; reducedMotion: boolean };
  reminders: { time: string | null; quietStart: string | null; quietEnd: string | null; timezone: string };
  billing: {
    plan: { id: string; name: string; rank: number } | null;
    status: string | null;
    interval: "month" | "year" | null;
    amountCents: number | null;
    currency: string;
    renewsOn: string | null;
    ending: boolean;
    provider: string | null;
    paymentsLive: boolean;
    plans: { id: string; name: string; rank: number; monthCents: number | null; yearCents: number | null }[];
    invoices: { id: string; reference: string; date: string; totalCents: number; currency: string; status: string; label: string }[];
  };
  requests: { id: string; kind: string; status: string; createdAt: string }[];
}

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };
