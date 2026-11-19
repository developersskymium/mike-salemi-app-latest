/**
 * Mastering the Kettlebell paths: recommendation focuses inside the single
 * database MTK course (not separate programs or products). Sections are
 * referenced by their curriculum sequence numbers in program_sections.
 */

export const MTK_SLUG = "mastering-the-kettlebell";

export type MtkPathId = "ballistic" | "overhead" | "lower" | "full";
export type MtkAnswers = Record<string, string | string[] | undefined>;

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
  let path: MtkPathId = top === 0 || leaders.length > 1 ? (top === 0 ? "ballistic" : "full") : leaders[0];
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
