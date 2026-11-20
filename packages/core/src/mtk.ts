/**
 * Mastering the Kettlebell: intake → recommended path (legacy src/lib/mtk-paths.ts)
 * and the personalised lesson plan (legacy src/lib/mtk-plan.ts). Pure and deterministic;
 * works from plain lesson data (`mtk-lesson-meta.json` classification + live lesson list).
 */
import metaJson from "./mtk-lesson-meta.json";
import type { Curriculum } from "./types";

export const MTK_SLUG = "mastering-the-kettlebell";

export type MtkAnswers = Record<string, string | string[] | undefined>;

export type MtkPathId = "ballistic" | "overhead" | "lower" | "full";


export type MtkPathDef = {
  id: MtkPathId;
  name: string;
  movements: string[];
  /** Inclusive section sequence range that belongs to this path. */
  sections: [number, number];
  /** Section the path starts at for members who already have the basics. */
  startSection: number;
  initialFocus: string[];
};

/** Section sequence of "Starting Up": the foundation entry point used for foundation-first starts. */
export const MTK_FOUNDATION_SECTION = 2;

export const MTK_PATHS: Record<MtkPathId, MtkPathDef> = {
  ballistic: {
    id: "ballistic",
    name: "Ballistic Movements",
    movements: ["Deadlift", "Swing", "Clean", "Snatch"],
    sections: [4, 26],
    startSection: 4,
    initialFocus: ["Deadlift / hinge foundation", "Swing mechanics", "Clean progression"],
  },
  overhead: {
    id: "overhead",
    name: "Overhead Movements",
    movements: ["Press", "Jerk", "Turkish Get Up", "Windmill"],
    sections: [27, 36],
    startSection: 27,
    initialFocus: ["Press and jerk pre-check", "Overhead press position", "Turkish Get Up control"],
  },
  lower: {
    id: "lower",
    name: "Lower Body & Pulling",
    movements: ["Squat", "Lunge", "Row"],
    sections: [37, 48],
    startSection: 37,
    initialFocus: ["Squat pre-check and pattern", "Multi-directional lunges", "Row mechanics"],
  },
  full: {
    id: "full",
    name: "Full Mastering the Kettlebell",
    movements: ["Every MTK movement"],
    sections: [1, 52],
    startSection: 2,
    initialFocus: ["Grips and positions", "Deadlift and swing foundations", "Work through each movement family in order"],
  },
};

export type MtkRecommendation = {
  path: MtkPathId;
  pathName: string;
  foundationFirst: boolean;
  startSection: number;
  reasons: string[];
  initialFocus: string[];
  pace: string;
  scores: Record<MtkPathId, number>;
};

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

function paceFor(time: string): string {
  switch (time) {
    case "Less than 1 hour": return "2 short technique sessions a week, one movement at a time";
    case "1–2 hours": return "2–3 sessions a week, one section per week";
    case "2–3 hours": return "3 sessions a week, one to two sections per week";
    case "3–4 hours": return "3–4 sessions a week, two sections per week";
    case "4+ hours": return "4+ sessions a week, moving through a movement family every 1–2 weeks";
    default: return "Aim for 2–3 sessions a week and repeat a section whenever a busy week interrupts you";
  }
}

/** Simple, transparent scoring of the MTK intake into one recommended path. */
export function recommendMtkPath(answers: MtkAnswers): MtkRecommendation {
  const scores: Record<MtkPathId, number> = { ballistic: 0, overhead: 0, lower: 0, full: 0 };
  const reasons: string[] = [];
  const role = one(answers.role);
  const experience = one(answers.experience);
  const confident = list(answers.confident);
  const improve = one(answers.improve);
  const focus = one(answers.focus);
  const challenge = one(answers.challenge);
  const knowledge = Number.parseInt(one(answers.knowledge), 10) || 0;

  // Area chosen first is the strongest signal.
  const focusMap: Record<string, MtkPathId> = {
    "Ballistic Movements": "ballistic",
    "Overhead Movements": "overhead",
    "Lower Body & Pulling": "lower",
    "All of them": "full",
  };
  if (focusMap[focus]) {
    scores[focusMap[focus]] += 4;
    reasons.push(`You chose ${focus === "All of them" ? "to work on every area" : focus} first`);
  }

  const improveMap: Record<string, MtkPathId> = {
    "Swing / Clean / Snatch": "ballistic",
    "Power and conditioning": "ballistic",
    "Overhead strength and technique": "overhead",
    "Turkish Get Up / overhead control": "overhead",
    "Squat / Lunge / Row": "lower",
    "Overall strength and movement quality": "lower",
    "Become a better kettlebell coach": "full",
    "Learn the full system": "full",
  };
  if (improveMap[improve]) {
    scores[improveMap[improve]] += 3;
    reasons.push(`Your goal is ${improve.toLowerCase()}`);
  }

  const challengeMap: Record<string, MtkPathId> = {
    "Power/explosiveness": "ballistic",
    Conditioning: "ballistic",
    "Stability/control": "overhead",
    Strength: "lower",
    Mobility: "lower",
    "Programming for clients": "full",
    "Complete system understanding": "full",
    "Advanced progressions": "full",
  };
  if (challengeMap[challenge]) scores[challengeMap[challenge]] += 1;

  // Movements already confident in: indicates which families they already practise.
  const families = (["ballistic", "overhead", "lower"] as const).filter((id) =>
    MTK_PATHS[id].movements.some((m) => confident.includes(m)),
  );
  for (const id of families) scores[id] += 1;
  if (families.length >= 3) {
    scores.full += 2;
    reasons.push("You already work across several movement categories");
  }

  const coaches =
    role === "Personal trainer / strength coach" ||
    role === "Movement / rehab professional" ||
    role === "I train myself and coach others" ||
    experience === "I regularly coach kettlebells";
  if (coaches) {
    scores.full += 3;
    reasons.push("You coach others, so the complete system serves you best");
  }
  if (knowledge >= 5 || experience === "More than 3 years") scores.full += 1;

  const order: MtkPathId[] = ["ballistic", "overhead", "lower", "full"];
  const top = Math.max(...order.map((id) => scores[id]));
  const leaders = order.filter((id) => scores[id] === top);
  // No single primary focus (tie or no signal) → the full system.
  let path: MtkPathId = top === 0 || leaders.length > 1 ? (top === 0 ? "ballistic" : "full") : leaders[0]!;
  if (top === 0) reasons.push("No single focus stood out, so we start with the ballistic foundation every movement builds on");
  else if (leaders.length > 1 && !reasons.some((r) => r.includes("complete system"))) reasons.push("No single primary focus stood out");
  if (leaders.length > 1 && top > 0) path = "full";

  const foundationFirst =
    experience === "Completely new" ||
    experience === "Used kettlebells a few times" ||
    confident.includes("Still learning fundamentals") ||
    confident.includes("Unsure about my technique") ||
    improve === "Strong kettlebell fundamentals" ||
    knowledge === 1;
  if (foundationFirst) reasons.push("We'll start you at the foundations and pre-checks before loading the lifts");

  const def = MTK_PATHS[path];
  return {
    path,
    pathName: def.name,
    foundationFirst,
    startSection: foundationFirst ? MTK_FOUNDATION_SECTION : def.startSection,
    reasons,
    initialFocus: foundationFirst ? ["Starting up, grips and positions", ...def.initialFocus.slice(0, 2)] : def.initialFocus,
    pace: paceFor(one(answers.time)),
    scores,
  };
}

/** True when a section (by sequence) belongs to the given path. */
export function sectionInPath(path: MtkPathId, sequence: number): boolean {
  const [a, b] = MTK_PATHS[path].sections;
  return sequence >= a && sequence <= b;
}

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
  const level: MtkLevel = (["Foundation", "Developing", "Proficient", "Advanced"] as const)[Math.min(3, Math.max(0, score))]!;
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

/**
 * Plain lesson list for `selectMtkLessons` from a v2 curriculum. Lessons are
 * matched to the classification by their legacy id (`key`), falling back to `id`;
 * the returned ids are the classification ids. Map back with `mtkLessonIdMap`.
 */
export function mtkLessonsFromCurriculum(curriculum: Curriculum): DbLesson[] {
  const sectionPos = new Map(curriculum.sections.map((s) => [s.id, s.position]));
  return curriculum.lessons.map((l) => ({
    id: l.key ?? l.id,
    sectionSeq: sectionPos.get(l.sectionId) ?? 0,
    lessonSeq: l.position,
  }));
}

/** Classification id (legacy id) → v2 lesson id. */
export function mtkLessonIdMap(curriculum: Curriculum): Map<string, string> {
  return new Map(curriculum.lessons.map((l) => [l.key ?? l.id, l.id]));
}

/* ------------------------------------------------------------------ results (legacy factsFor) */

export const MTK_DEPTH_WHY: Record<Depth, string> = {
  fix: "You said you struggle with this — pre-checks, technique and error corrections",
  learn: "Part of your chosen focus — full technique progression",
  refine: "You're confident here — error corrections and variations to refine it",
  prereq: "Required foundation for the lifts you're focusing on",
};

export type MtkFocusArea = { movement: MtkMovement; label: string; count: number; why: string; depth?: Depth };

export type MtkResult = {
  level: MtkLevel;
  coach: boolean;
  strengths: string[];
  gaps: string[];
  focusAreas: MtkFocusArea[];
  /** Classification ids (= v2 lesson ids for MTK), in curriculum order. */
  lessonIds: string[];
  recommended: number;
  total: number;
  minutes: number;
  summary: string;
};

/**
 * Results for one assessment: level, strengths, gaps, focus areas and the factual summary
 * ("…That is N of M lessons; the rest of MTK stays open in Full Curriculum.").
 */
export function mtkResult(answers: MtkAnswers, dbLessons: DbLesson[], meta: MtkLessonMeta[] = MTK_LESSON_META): MtkResult {
  const sel = selectMtkLessons(answers, dbLessons, meta);
  const p = sel.profile;
  const strengths = p.confident.map((m) => MOVEMENT_LABEL[m]);
  const gaps = [...new Set([...p.struggles, ...p.focus.filter((m) => !p.confident.includes(m))])].map((m) => MOVEMENT_LABEL[m]);
  const focusAreas = sel.byMovement.map((b) => ({
    movement: b.movement,
    label: b.label,
    count: b.count,
    depth: b.depth,
    why: b.depth ? MTK_DEPTH_WHY[b.depth] : b.movement === "general" ? "Set-up, grips and orientation" : "Programming and expert material",
  }));
  const parts: string[] = [];
  if (strengths.length) parts.push(`You reported confidence in the ${strengths.join(", ")}`);
  if (p.struggles.length) parts.push(`identified the ${p.struggles.map((m) => MOVEMENT_LABEL[m]).join(", ")} as areas you struggle with`);
  const summary = `${parts.length ? parts.join(" and ") + ". " : ""}Your plan concentrates on ${p.focus.map((m) => MOVEMENT_LABEL[m]).join(", ") || "the fundamentals"}${p.foundationFirst ? ", starting from set-up, grips and pre-checks" : ""}${p.coach ? ", with the coaching and programming material you asked for" : ""}. That is ${sel.lessonIds.length} of ${sel.total} lessons; the rest of MTK stays open in Full Curriculum.`;
  return {
    level: p.level, coach: p.coach, strengths, gaps, focusAreas,
    lessonIds: sel.lessonIds, recommended: sel.lessonIds.length, total: sel.total, minutes: sel.minutes, summary,
  };
}

/** Movement of a lesson (classification), for plan-day titles and the movement map. */
export function mtkMovementOf(lessonId: string, meta: MtkLessonMeta[] = MTK_LESSON_META): MtkMovement | null {
  return meta.find((m) => m.id === lessonId)?.movement ?? null;
}
