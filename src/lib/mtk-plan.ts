/**
 * MTK personalized plan engine (pure, deterministic).
 * Inputs: intake answers + stored lesson classification (src/content/mtk-lesson-meta.json,
 * generated once) + the live lesson list from the database. Output: an ordered subset of real
 * lesson IDs (original curriculum order) and a day-by-day grouping. No AI here.
 */
import metaJson from "@/content/mtk-lesson-meta.json";

export type MtkMovement =
  | "general" | "deadlift" | "single-leg-deadlift" | "swing" | "clean" | "snatch"
  | "press" | "jerk" | "turkish-get-up" | "windmill" | "squat" | "lunge" | "row" | "expert";
export type MtkLessonType =
  | "orientation" | "setup" | "grips" | "precheck" | "technique" | "fault" | "variation"
  | "choice" | "expert" | "programming" | "assessment";
export type MtkLessonMeta = {
  id: string; s: number; q: number; title: string; movement: MtkMovement; type: MtkLessonType;
  level: "foundation" | "core" | "advanced"; coach: 0 | 1 | 2; essential: boolean; minutes: number; style?: "russian" | "pendulum";
};
export const MTK_LESSON_META = metaJson as MtkLessonMeta[];

export const MOVEMENT_LABEL: Record<MtkMovement, string> = {
  general: "Foundations", deadlift: "Deadlift", "single-leg-deadlift": "Single-Leg Deadlift", swing: "Swing",
  clean: "Clean", snatch: "Snatch", press: "Press", jerk: "Jerk", "turkish-get-up": "Turkish Get Up",
  windmill: "Windmill", squat: "Squat", lunge: "Lunge", row: "Row", expert: "Expert & programming",
};
const LIFTS: MtkMovement[] = ["deadlift", "single-leg-deadlift", "swing", "clean", "snatch", "press", "jerk", "turkish-get-up", "windmill", "squat", "lunge", "row"];
const OPTION_TO_MOVEMENT: Record<string, MtkMovement> = {
  Deadlift: "deadlift", "Single-Leg Deadlift": "single-leg-deadlift", Swing: "swing", Clean: "clean", Snatch: "snatch",
  Press: "press", Jerk: "jerk", "Turkish Get Up": "turkish-get-up", Windmill: "windmill", Squat: "squat", Lunge: "lunge", Row: "row",
};
/** A lift's prerequisite lifts (curriculum order already respects these). */
export const MTK_PREREQS: Partial<Record<MtkMovement, MtkMovement[]>> = {
  "single-leg-deadlift": ["deadlift"], swing: ["deadlift"], clean: ["swing"], snatch: ["clean"], jerk: ["press"], windmill: ["press"],
};
const FAMILY: Record<string, MtkMovement[]> = {
  "Ballistic Movements": ["deadlift", "single-leg-deadlift", "swing", "clean", "snatch"],
  "Overhead Movements": ["press", "jerk", "turkish-get-up", "windmill"],
  "Lower Body & Pulling": ["squat", "lunge", "row"],
  "All of them": LIFTS,
};
const IMPROVE: Record<string, MtkMovement[]> = {
  "Strong kettlebell fundamentals": ["deadlift", "swing", "squat", "press"],
  "Swing / Clean / Snatch": ["swing", "clean", "snatch"],
  "Power and conditioning": ["swing", "clean", "snatch"],
  "Overhead strength and technique": ["press", "jerk"],
  "Turkish Get Up / overhead control": ["turkish-get-up", "windmill"],
  "Squat / Lunge / Row": ["squat", "lunge", "row"],
  "Overall strength and movement quality": ["deadlift", "squat", "lunge", "row", "press"],
  "Become a better kettlebell coach": LIFTS,
  "Learn the full system": LIFTS,
};

export type MtkAnswers = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");
const toMovements = (v: string | string[] | undefined) => list(v).map((o) => OPTION_TO_MOVEMENT[o]).filter(Boolean) as MtkMovement[];

export type MtkLevel = "Foundation" | "Developing" | "Proficient" | "Advanced";
export type Depth = "learn" | "fix" | "refine" | "prereq";

export type MtkProfile = {
  level: MtkLevel; coach: boolean; foundationFirst: boolean; confident: MtkMovement[]; struggles: MtkMovement[];
  focus: MtkMovement[]; depth: Partial<Record<MtkMovement, Depth>>; wantsProgramming: boolean; wantsExpert: boolean; mobility: boolean;
};

export function profileFromAnswers(a: MtkAnswers): MtkProfile {
  const role = one(a.role), experience = one(a.experience), improve = one(a.improve), focusAns = one(a.focus), challenge = one(a.challenge);
  const knowledge = Number.parseInt(one(a.knowledge), 10) || 0;
  const confidentRaw = list(a.confident);
  const coach = ["Personal trainer / strength coach", "Movement / rehab professional", "I train myself and coach others"].includes(role) || experience === "I regularly coach kettlebells";
  const foundationFirst = ["Completely new", "Used kettlebells a few times"].includes(experience) || confidentRaw.includes("Still learning fundamentals") || knowledge === 1 || improve === "Strong kettlebell fundamentals";
  let score = { "Completely new": 0, "Used kettlebells a few times": 1, "Less than 1 year": 1, "1–3 years": 2, "More than 3 years": 3, "I regularly coach kettlebells": 3 }[experience] ?? 1;
  score = Math.round((score + Math.max(0, knowledge - 1) * 0.75) / (knowledge ? 2 : 1));
  if (foundationFirst) score = 0;
  const level: MtkLevel = (["Foundation", "Developing", "Proficient", "Advanced"] as const)[Math.min(3, Math.max(0, score))];
  const confident = confidentRaw.includes("Unsure about my technique") ? [] : toMovements(confidentRaw);
  const struggles = toMovements(a.struggle);

  const focusSet = new Set<MtkMovement>([...(FAMILY[focusAns] ?? []), ...(IMPROVE[improve] ?? []), ...struggles]);
  if (challenge === "Complete system understanding" || (coach && focusAns === "All of them")) LIFTS.forEach((m) => focusSet.add(m));
  if (!focusSet.size) ["deadlift", "swing", "squat", "press"].forEach((m) => focusSet.add(m as MtkMovement));

  const depth: Partial<Record<MtkMovement, Depth>> = {};
  for (const m of LIFTS) {
    if (!focusSet.has(m)) continue;
    depth[m] = struggles.includes(m) ? "fix" : confident.includes(m) ? "refine" : "learn";
  }
  // Pull in prerequisites (transitively) the member is not already confident in.
  const pull = (m: MtkMovement) => {
    for (const p of MTK_PREREQS[m] ?? []) {
      if (!depth[p] && (!confident.includes(p) || foundationFirst)) depth[p] = "prereq";
      pull(p);
    }
  };
  Object.keys(depth).forEach((m) => pull(m as MtkMovement));
  return {
    level, coach, foundationFirst, confident, struggles,
    focus: LIFTS.filter((m) => depth[m] && depth[m] !== "prereq"), depth,
    wantsProgramming: coach || ["Programming for myself", "Programming for clients"].includes(challenge),
    wantsExpert: coach || level === "Advanced" || challenge === "Complete system understanding",
    mobility: challenge === "Mobility" || foundationFirst,
  };
}

const advancedOk = (p: MtkProfile) => p.level === "Proficient" || p.level === "Advanced" || p.coach;

/** True when a lesson belongs in this member's plan. */
export function includeLesson(l: MtkLessonMeta, p: MtkProfile): boolean {
  if (l.type === "orientation") return true;
  if (l.type === "setup" || l.type === "grips") return p.foundationFirst || l.essential || p.coach;
  if (l.type === "programming") return p.wantsProgramming;
  if (l.type === "expert") return p.wantsExpert;
  if (l.type === "assessment") return p.coach || p.level !== "Foundation";
  const d = p.depth[l.movement];
  if (!d) return false;
  const flexibility = /flexibility/i.test(l.title);
  if (l.type === "choice") return d !== "prereq";
  switch (d) {
    case "prereq":
      return (l.type === "precheck" || l.type === "technique") && l.essential;
    case "learn":
      if (l.type === "variation") return l.level !== "advanced" || advancedOk(p);
      if (l.style === "pendulum" && !advancedOk(p) && l.type === "technique") return l.essential;
      if (flexibility) return p.mobility || l.level !== "core";
      return l.level !== "advanced" || advancedOk(p);
    case "fix":
      if (l.type === "variation") return l.level !== "advanced" && (l.level === "foundation" || advancedOk(p));
      return true;
    case "refine":
      if (l.type === "fault" || l.type === "variation") return true;
      if (l.type === "precheck") return l.coach >= 2 || (flexibility && p.mobility);
      return l.level !== "foundation" || (p.coach && l.coach >= 2);
  }
}

export type DbLesson = { id: string; sectionSeq: number; lessonSeq: number };

export type MtkSelection = {
  profile: MtkProfile;
  lessonIds: string[];
  total: number;
  byMovement: { movement: MtkMovement; label: string; count: number; depth?: Depth }[];
  minutes: number;
};

/** Select real lessons. Only IDs present in BOTH the live DB list and the classification survive, in DB order. */
export function selectMtkLessons(answers: MtkAnswers, dbLessons: DbLesson[], meta: MtkLessonMeta[] = MTK_LESSON_META): MtkSelection {
  const profile = profileFromAnswers(answers);
  const byId = new Map(meta.map((m) => [m.id, m]));
  const ordered = dbLessons.slice().sort((a, b) => a.sectionSeq - b.sectionSeq || a.lessonSeq - b.lessonSeq);
  const chosen = ordered.map((l) => byId.get(l.id)).filter((m): m is MtkLessonMeta => Boolean(m) && includeLesson(m!, profile));
  const counts = new Map<MtkMovement, number>();
  chosen.forEach((m) => counts.set(m.movement, (counts.get(m.movement) ?? 0) + 1));
  return {
    profile,
    lessonIds: chosen.map((m) => m.id),
    total: dbLessons.length,
    byMovement: [...counts].map(([movement, count]) => ({ movement, label: MOVEMENT_LABEL[movement], count, depth: profile.depth[movement] })),
    minutes: chosen.reduce((n, m) => n + m.minutes, 0),
  };
}

export type MtkPlanDay = { day: number; week: number; title: string; lessonIds: string[]; minutes: number };

/**
 * Group the ordered selection into learning days. A day fills up to the session length; a new day
 * starts early when the movement changes and the day is already at least half full, so related
 * lessons stay together. Order is never changed. Long lessons get a day of their own.
 */
export function groupIntoDays(lessonIds: string[], minutesPerSession: number, daysPerWeek: number, meta: MtkLessonMeta[] = MTK_LESSON_META): MtkPlanDay[] {
  const byId = new Map(meta.map((m) => [m.id, m]));
  const days: { ids: string[]; minutes: number; movements: MtkMovement[] }[] = [];
  let cur: (typeof days)[number] | null = null;
  for (const id of lessonIds) {
    const m = byId.get(id);
    if (!m) continue;
    const prev = cur?.movements[cur.movements.length - 1];
    const shift = cur && prev !== m.movement && cur.minutes >= minutesPerSession * 0.5;
    if (!cur || cur.minutes + m.minutes > minutesPerSession || shift) {
      cur = { ids: [], minutes: 0, movements: [] };
      days.push(cur);
    }
    cur.ids.push(id);
    cur.minutes += m.minutes;
    if (!cur.movements.includes(m.movement)) cur.movements.push(m.movement);
  }
  return days.map((d, i) => ({
    day: i + 1,
    week: Math.floor(i / daysPerWeek) + 1,
    title: d.movements.map((mv) => MOVEMENT_LABEL[mv]).join(" + "),
    lessonIds: d.ids,
    minutes: d.minutes,
  }));
}

/** Weeks the grouped plan needs at the chosen days per week. */
export function weeksNeeded(dayCount: number, daysPerWeek: number) {
  return Math.max(1, Math.ceil(dayCount / daysPerWeek));
}
