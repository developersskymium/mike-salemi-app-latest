/**
 * Signature journeys (spec 10, client note: "give each program a unique and signature way to go
 * through it"). One shared course player; each course-type program gets a journey config that
 * decides its home page layout, categorisation, progress view, theme and planned self-guided path.
 *
 * Source of truth: `programs.meta.journey` (migration 0019_p2_journeys_covers.sql, editable in
 * Studio as JSON). The defaults below mirror that migration, so preview mode and a program whose
 * meta is missing still render the same journey. Matching is by the REAL curriculum names
 * (sections.subtitle = group, sections.title = section, lesson titles) as regular expressions.
 *
 * Pure module: safe in server and client components.
 */
import type { MoveName } from "@/components/graphics";
import type { CourseGroup, CourseLessonNode, CourseSectionNode } from "@/lib/loaders/course";

export type JourneyKind = "skills" | "blocks" | "series" | "weeks" | "pillars" | "steps" | "route";
/** Visual identity inside Summit: the accent, ground and motif of the journey. */
export type JourneyTheme = "mastery" | "athletic" | "calm" | "dusk" | "earth" | "ember";

export interface JourneyFamily {
  /** Group name (sections.subtitle) this family covers. */
  group: string;
  label: string;
  move?: MoveName;
  blurb?: string;
}
export interface JourneyTier {
  label: string;
  blurb?: string;
  families: JourneyFamily[];
}
export interface JourneyStage {
  key: string;
  label: string;
  /** Regex on the section title. The first stage without `match` takes the rest. */
  match?: string;
}
export interface JourneyBlock {
  label: string;
  kicker?: string;
  blurb?: string;
  /** Regex on section titles (or group names with `group`). */
  sections?: string;
  group?: string;
}
export interface JourneyPillar {
  key: string;
  label: string;
  blurb: string;
  move?: MoveName;
  /** Regex on lesson titles. Empty pillars show "Opening soon". */
  lessons?: string;
}
export interface JourneyNext {
  slug: string;
  href: string;
  label: string;
  reason: string;
  cta: string;
}

export interface JourneyConfig {
  kind: JourneyKind;
  theme: JourneyTheme;
  /** Hero eyebrow ("Movement mastery", "A Suples approved program"…). */
  eyebrow: string;
  /** One-line promise under the title. */
  promise: string;
  /** What one item of this journey is called. */
  unit: { one: string; many: string };
  /** Group/section names the journey treats as the main path; anything else becomes a shelf. */
  path?: { label: string; blurb?: string };
  tiers?: JourneyTier[];
  stages?: JourneyStage[];
  blocks?: JourneyBlock[];
  shelves?: JourneyBlock[];
  pillars?: JourneyPillar[];
  /** Planned self-guided pace: sessions per week (default + options) and session length. */
  pace?: { perWeek: number; options: number[]; minutes?: number; note?: string };
  /** Brand artwork shown as artwork (never as a cover), e.g. the A4L wordmark strip. */
  artwork?: { src: string; alt: string; width: number; height: number };
  /** Free programs: the clear next step (they double as lead magnets). */
  next?: JourneyNext;
  /** Short facts for the hero chips. */
  facts?: string[];
}

/* ------------------------------------------------------------------ defaults (mirror 0019) */

const MTK: JourneyConfig = {
  kind: "skills",
  theme: "mastery",
  eyebrow: "Movement mastery · skill tree",
  promise: "Every kettlebell lift as a skill you unlock: pre-check, technique, common errors, then variations.",
  unit: { one: "movement", many: "movements" },
  stages: [
    { key: "precheck", label: "Pre-check", match: "pre-?check|choosing" },
    { key: "errors", label: "Common errors", match: "common errors" },
    { key: "variations", label: "Variations", match: "variations" },
    { key: "technique", label: "Technique" },
  ],
  tiers: [
    { label: "Foundations", blurb: "Bells, grips and the positions every lift is built on.", families: [{ group: "Getting Started", label: "Grips & set-up", move: "halo", blurb: "Weights, grips, rack and lockout." }] },
    {
      label: "Grinds",
      blurb: "Slow strength: hinge, squat, lunge and pull.",
      families: [
        { group: "Deadlift", label: "Deadlift", move: "deadlift", blurb: "The hinge every ballistic lift grows from." },
        { group: "Squat", label: "Squat", move: "squat", blurb: "Racked, goblet and box squats." },
        { group: "Lunge", label: "Lunge", move: "lunge", blurb: "Forward, reverse and lateral." },
        { group: "Row", label: "Row", move: "row", blurb: "Bent-over and supported rows." },
      ],
    },
    {
      label: "Ballistics",
      blurb: "Power from the hips: the swing, then the clean.",
      families: [
        { group: "Swing", label: "Swing", move: "swing", blurb: "Russian and pendulum technique." },
        { group: "Clean", label: "Clean", move: "clean", blurb: "Into the rack without the forearm bang." },
      ],
    },
    {
      label: "Overhead",
      blurb: "Pressing strength and the get-up's full-body control.",
      families: [
        { group: "Presses and Jerks", label: "Press & jerk", move: "press", blurb: "Strict press, then the jerk." },
        { group: "Get Up", label: "Get-up & windmill", move: "getup", blurb: "Turkish get-up, windmill and styles." },
      ],
    },
    { label: "Peak", blurb: "The snatch: everything above, in one lift.", families: [{ group: "Snatch", label: "Snatch", move: "snatch", blurb: "The king of kettlebell lifts." }] },
  ],
  shelves: [{ label: "Bonus library", blurb: "Expert talks, program design, posture and benchmarks.", group: "Bonus" }],
  pace: { perWeek: 3, options: [2, 3, 4, 5], minutes: 20, note: "Short technique sessions between your training days." },
  facts: ["10 movement families", "4 stages each", "A plan from your assessment"],
};

const A4L: JourneyConfig = {
  kind: "blocks",
  theme: "athletic",
  eyebrow: "A Suples Training Systems approved program",
  promise: "Thirty days of Bulgarian bag and kettlebell training in two blocks: build the foundations, then integrate them into performance.",
  unit: { one: "day", many: "days" },
  path: { label: "The 30-day program", blurb: "Two training blocks, one day at a time." },
  blocks: [
    { label: "Get ready", kicker: "Before Day 1", blurb: "Philosophy, schedule, the BOLT test and choosing your bag.", sections: "^getting started$" },
    { label: "Block 1 · Foundations", kicker: "Weeks 1–2", blurb: "Learn the spin, arm throw, clean and snatch patterns at a sustainable pace.", sections: "foundations" },
    { label: "Block 2 · Performance integration", kicker: "Weeks 3–4 + final days", blurb: "Combine the patterns into complexes and push the work capacity.", sections: "performance integration|final days" },
  ],
  shelves: [
    { label: "Workout library", blurb: "All seven workouts with level-up and level-down options.", group: "Workout Library" },
    { label: "Exercise library", blurb: "Spin, arm throw, clean, snatch and swing squat, move by move.", group: "Exercise Library" },
    { label: "Preparation & recovery", blurb: "Mobility, breathing, stretching, Working In and warm-ups.", group: "Preparation & Recovery Series" },
    { label: "What's next", blurb: "Certification, coaching and the Suples system.", group: "What's Next" },
    { label: "Q&A archives", blurb: "Monthly calls from 2025.", group: "2025 Archives" },
  ],
  pace: { perWeek: 6, options: [3, 4, 5, 6], minutes: 40, note: "The program runs six days a week; train fewer and it simply takes longer." },
  artwork: { src: "/media/covers/a4l-wordmark.png", alt: "A4L Athleticism 4 Life, a Suples Training Systems approved program", width: 2000, height: 353 },
  facts: ["30 days", "2 training blocks", "Bulgarian bag + kettlebell"],
};

const WORKING_IN: JourneyConfig = {
  kind: "series",
  theme: "calm",
  eyebrow: "With Paul Chek & Mike Salemi",
  promise: "Short, energising sessions that put energy back in instead of draining it. Watch one, then practise it on a recovery day.",
  unit: { one: "episode", many: "episodes" },
  pace: { perWeek: 2, options: [1, 2, 3], minutes: 12, note: "Pairs with every Recovery Day in Kettlebell Lifestyle." },
  facts: ["Short video series", "Calm, low-intensity practice", "Pairs with recovery days"],
};

const PATH: JourneyConfig = {
  kind: "weeks",
  theme: "dusk",
  eyebrow: "Ten weeks of inner work",
  promise: "One week at a time: the call recording, the playwork and the practice. The journey that became The Grounded King.",
  unit: { one: "week", many: "weeks" },
  pace: { perWeek: 1, options: [1, 2], minutes: 60, note: "One week of the program per calendar week, like the live cohort." },
  next: { slug: "the-grounded-king", href: "/programs/the-grounded-king", label: "The Grounded King", reason: "The Path became The Grounded King: the live group that carries this work forward.", cta: "See The Grounded King" },
  facts: ["10 weeks", "Call recordings + playwork", "Breath and values practices"],
};

const MOM: JourneyConfig = {
  kind: "pillars",
  theme: "earth",
  eyebrow: "Men of Movement · retreat preparation",
  promise: "Arrive grounded. Six foundational practices across the five pillars of the retreat, open from about three months before you travel.",
  unit: { one: "practice", many: "practices" },
  pillars: [
    { key: "rotation", label: "Rotation", blurb: "The rotational work you'll share on the mountain.", move: "halo" },
    { key: "movement", label: "Movement", blurb: "Prepare the body: organ prep and the wall squat.", move: "squat", lessons: "abdominal|wall squat" },
    { key: "breathwork", label: "Breathwork", blurb: "Piston breathing and Breathe Light.", move: "breathing", lessons: "breath" },
    { key: "nature", label: "Nature", blurb: "Listening practice to slow down before you arrive.", move: "walking", lessons: "meditation" },
    { key: "storywork", label: "Storywork", blurb: "The books and music that set the tone.", move: "walking", lessons: "book|playlist" },
  ],
  pace: { perWeek: 2, options: [1, 2, 3], minutes: 20, note: "Spread the practices across the weeks before the retreat." },
  next: { slug: "men-of-movement-retreats", href: "/experiences", label: "Men of Movement Retreats", reason: "Preparation opens with your retreat place. Hold Your Ground and Primal Reset are by application.", cta: "See the retreats" },
  facts: ["5 pillars", "Included with your retreat", "Post-retreat module after the retreat"],
};

const SWING: JourneyConfig = {
  kind: "steps",
  theme: "ember",
  eyebrow: "Free · the 7-step swing set-up",
  promise: "The short course Mike sends every new swinger: seven checkpoints from the feet to the grip, three bonuses and a two-week swing program.",
  unit: { one: "step", many: "steps" },
  pace: { perWeek: 3, options: [2, 3, 4], minutes: 10, note: "One step per session, then the two-week program." },
  next: { slug: "mastering-the-kettlebell", href: "/programs/mastering-the-kettlebell/course", label: "Mastering the Kettlebell", reason: "MTK's Swing chapter picks up where the set-up ends: Russian and pendulum technique, breathing, and a fix for every common error.", cta: "See the Swing chapter" },
  facts: ["7 steps", "3 bonuses", "Free ebook"],
};

const SIX: JourneyConfig = {
  kind: "steps",
  theme: "ember",
  eyebrow: "Free · six videos for trainers",
  promise: "Six coaching videos that sharpen your eye: the swing's big mistake, reaction training, bottoms-up pressing, safe snatches and integrated tension.",
  unit: { one: "video", many: "videos" },
  pace: { perWeek: 3, options: [2, 3, 6], minutes: 8, note: "Watch one before each coaching session this week." },
  next: { slug: "mastering-the-kettlebell", href: "/programs/mastering-the-kettlebell/course", label: "Mastering the Kettlebell", reason: "For coaches: 300+ lessons with pre-checks and common-error fixes you can point clients at.", cta: "See what's inside" },
  facts: ["6 videos", "For trainers and coaches", "Free"],
};

const ROADMAP: JourneyConfig = {
  kind: "route",
  theme: "ember",
  eyebrow: "Free · find your phase of training",
  promise: "Four phases from the foundation to mastery. Find where you are today and train according to your phase.",
  unit: { one: "phase", many: "phases" },
  next: { slug: "kettlebell-lifestyle", href: "/programs/kettlebell-lifestyle", label: "Kettlebell Lifestyle", reason: "Know your phase? Kettlebell Lifestyle turns it into a day-by-day plan from the On Ramp to the summit.", cta: "Enter Kettlebell Lifestyle" },
  facts: ["4 phases", "Free"],
};

const GENERIC: JourneyConfig = {
  kind: "steps",
  theme: "ember",
  eyebrow: "With Mike Salemi",
  promise: "Work through it in order, at your own pace.",
  unit: { one: "lesson", many: "lessons" },
  pace: { perWeek: 3, options: [2, 3, 4, 5], minutes: 20 },
};

export const JOURNEYS: Record<string, JourneyConfig> = {
  "mastering-the-kettlebell": MTK,
  "athleticism-4-life": A4L,
  "working-in": WORKING_IN,
  "the-path-to-inspired-action": PATH,
  "men-of-movement": MOM,
  "what-your-kettlebell-swing-is-missing": SWING,
  "free-6-video-kettlebell-mini-series": SIX,
  "kettlebell-roadmap": ROADMAP,
};

const KINDS: JourneyKind[] = ["skills", "blocks", "series", "weeks", "pillars", "steps", "route"];
const THEMES: JourneyTheme[] = ["mastery", "athletic", "calm", "dusk", "earth", "ember"];

/** programs.meta.journey merged over the defaults (Studio can override any field). */
export function resolveJourney(slug: string, meta?: unknown): JourneyConfig {
  const base = JOURNEYS[slug] ?? GENERIC;
  if (!meta || typeof meta !== "object") return base;
  const m = meta as Partial<JourneyConfig>;
  return {
    ...base,
    ...m,
    kind: m.kind && KINDS.includes(m.kind) ? m.kind : base.kind,
    theme: m.theme && THEMES.includes(m.theme) ? m.theme : base.theme,
    unit: m.unit?.one && m.unit?.many ? m.unit : base.unit,
  };
}

/* ------------------------------------------------------------------ curriculum helpers */

const rx = (s?: string) => (s ? new RegExp(s, "i") : null);

export const allLessons = (groups: CourseGroup[]) => groups.flatMap((g) => g.sections.flatMap((s) => s.lessons));

export function sectionsMatching(groups: CourseGroup[], b: Pick<JourneyBlock, "group" | "sections">): CourseSectionNode[] {
  const g = rx(b.group ? `^${b.group.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$` : undefined);
  const s = rx(b.sections);
  return groups
    .filter((x) => !g || g.test(x.name.trim()))
    .flatMap((x) => x.sections)
    .filter((x) => !s || s.test(x.title.trim()));
}

export function stageOf(stages: JourneyStage[], sectionTitle: string): string {
  for (const st of stages) if (st.match && new RegExp(st.match, "i").test(sectionTitle)) return st.key;
  return stages.find((s) => !s.match)?.key ?? stages[0]?.key ?? "technique";
}

export type Progress = { done: number; total: number; pct: number; next: CourseLessonNode | null };

export function progressOf(lessons: CourseLessonNode[], done: Set<string> | ((l: CourseLessonNode) => boolean)): Progress {
  const isDone = typeof done === "function" ? done : (l: CourseLessonNode) => done.has(l.id);
  const d = lessons.filter(isDone).length;
  return { done: d, total: lessons.length, pct: lessons.length ? d / lessons.length : 0, next: lessons.find((l) => !isDone(l)) ?? null };
}

/** Mastery label from a family's stage progress (skill tree). */
export function masteryLabel(stagePct: Record<string, number>, pct: number): { label: string; level: 0 | 1 | 2 | 3 | 4 } {
  if (pct >= 1) return { label: "Mastered", level: 4 };
  if ((stagePct.errors ?? 0) > 0 || (stagePct.variations ?? 0) > 0) return { label: "Refining", level: 3 };
  if ((stagePct.technique ?? 0) > 0) return { label: "Learning the technique", level: 2 };
  if ((stagePct.precheck ?? 0) > 0) return { label: "Pre-check", level: 1 };
  return { label: pct > 0 ? "Started" : "Not started", level: 0 };
}

/** "Day 12" → 12 (A4L day lessons). */
export const dayNumber = (title: string) => {
  const m = /^day\s+(\d+)\b/i.exec(title.trim());
  return m ? Number(m[1]) : null;
};
