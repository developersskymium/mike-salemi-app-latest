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

/** Instant recommendation (spec 12 › Sign in & onboarding 5): one program with a reason. */
export interface Recommendation {
  slug: string;
  title: string;
  reason: string;
  facts: string[];
  href: string;
  photo: { src: string; position: string; alt: string };
}

export function recommend(p: TrainingProfile, photo: (slug: string) => { src: string; position: string; alt: string }): Recommendation {
  const exp = p.kb_experience ?? 0;
  const days = p.days_per_week ?? 3;
  const noBell = !hasBell(p.equipment);
  const goal = p.goal_kind ?? "strength";
  const mk = (slug: string, title: string, reason: string, facts: string[]): Recommendation => ({ slug, title, reason, facts, href: `/programs/${slug}`, photo: photo(slug) });
  if (goal === "recovery") return mk("working-in", "Working In", "Because you want to recover and reset, start with Mike's short daily practices.", ["10–20 min", "No equipment", "Any level"]);
  if (goal === "mindset") return mk("the-path-to-inspired-action", "The Path to Inspired Action", "Because you chose mindset and purpose, The Path is where Mike starts this work.", ["Self-paced chapters", "No equipment", "Any level"]);
  if (noBell && exp === 0) return mk("free-6-video-kettlebell-mini-series", "Free Kettlebell Mini Series", "You're new and don't have a bell yet: six free videos show you what to buy and how to start.", ["6 short videos", "Free", "Beginner"]);
  if (goal === "mobility" || goal === "technique") return mk("mastering-the-kettlebell", "Mastering the Kettlebell", goal === "technique" ? "Because you want to master the kettlebell, MTK teaches skill one stage at a time." : "Because you want to move better, MTK builds skill and mobility one stage at a time.", ["Stages", `${days} days a week`, exp >= 2 ? "Intermediate" : "All levels"]);
  if (exp >= 2 && goal === "strength") return mk("athleticism-4-life", "Athleticism 4 Life", "You already train with bells, so A4L's strength blocks are the right next step.", ["Strength blocks", `${days} days a week`, "Intermediate+"]);
  return mk("kettlebell-lifestyle", exp >= 2 ? "Kettlebell Lifestyle · Level 2" : "Kettlebell Lifestyle · Level 1", `${exp >= 2 ? "With your experience" : "New or returning to bells"}, KBL ${exp >= 2 ? "Level 2" : "Level 1"} gives you ${days} guided days a week.`, [`${days} days a week`, `${p.session_minutes ?? 30} min`, exp >= 2 ? "Level 2" : "Level 1"]);
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
