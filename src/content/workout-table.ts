/**
 * Workout table — the per-day session plan.
 *
 * Every workout day carries a short readiness/equipment form. Submitting it
 * unlocks a table generated for THAT day, which is saved to the user's log
 * (visible in Immersion and on the profile).
 */

export type WorkoutFormField = {
  id: string;
  question: string;
  help?: string;
  options: { value: string; label: string; description?: string }[];
};

export const workoutForm: WorkoutFormField[] = [
  {
    id: "bell",
    question: "Which bell are you training with today?",
    help: "Use the Kettlebell Selector if you are unsure.",
    options: [
      { value: "light", label: "Light", description: "8–12 kg / 18–26 lb" },
      { value: "moderate", label: "Moderate", description: "16–20 kg / 35–44 lb" },
      { value: "heavy", label: "Heavy", description: "24 kg+ / 53 lb+" },
    ],
  },
  {
    id: "readiness",
    question: "How does the body feel right now?",
    options: [
      { value: "low", label: "Flat", description: "Poor sleep, sore, low drive" },
      { value: "ok", label: "Steady", description: "Normal — nothing remarkable" },
      { value: "high", label: "Sharp", description: "Rested, warm, ready to work" },
    ],
  },
  {
    id: "time",
    question: "How much time do you have?",
    options: [
      { value: "20", label: "20 minutes" },
      { value: "35", label: "35 minutes" },
      { value: "50", label: "50 minutes" },
    ],
  },
  {
    id: "space",
    question: "Where are you training?",
    options: [
      { value: "gym", label: "Gym", description: "Full space and racks" },
      { value: "home", label: "Home", description: "Limited space" },
      { value: "outdoor", label: "Outdoors", description: "Uneven ground, open space" },
    ],
  },
];

export type WorkoutAnswers = Record<string, string>;

export type WorkoutBlock = {
  block: string;
  movement: string;
  sets: string;
  reps: string;
  rest: string;
  note: string;
};

export type WorkoutTableData = {
  headline: string;
  summary: string;
  load: string;
  duration: string;
  blocks: WorkoutBlock[];
  cues: string[];
};

const LOAD: Record<string, string> = {
  light: "Light bell — own the technique",
  moderate: "Moderate bell — working weight",
  heavy: "Heavy bell — strength emphasis",
};

/** Deterministic: same day + same answers always produce the same table. */
export function buildWorkoutTable(
  day: { number: number; title: string; type: string; focus: string },
  answers: WorkoutAnswers,
): WorkoutTableData {
  const readiness = answers.readiness ?? "ok";
  const minutes = Number(answers.time ?? "35");
  const bell = answers.bell ?? "moderate";
  const space = answers.space ?? "home";

  const intensity = readiness === "low" ? -1 : readiness === "high" ? 1 : 0;
  const baseSets = minutes <= 20 ? 3 : minutes <= 35 ? 4 : 5;
  const sets = Math.max(2, baseSets + intensity);
  const rest = readiness === "low" ? "90s" : readiness === "high" ? "45s" : "60s";
  const swingReps = readiness === "low" ? 10 : readiness === "high" ? 20 : 15;

  const strength = day.type.includes("III")
    ? "Double bell front squat"
    : day.type.includes("II")
      ? "Single bell clean & press"
      : "Goblet squat";

  const carry = space === "outdoor" ? "Suitcase carry — 40 m" : "Rack carry — 30 s per side";

  const blocks: WorkoutBlock[] = [
    {
      block: "Prepare",
      movement: "Breath reset + hip and thoracic openers",
      sets: "1",
      reps: "5 min",
      rest: "—",
      note: readiness === "low" ? "Take an extra 3 minutes here today." : "Move until warm, not tired.",
    },
    {
      block: "Skill",
      movement: day.focus || "Hinge and swing mechanics",
      sets: "3",
      reps: "5 quality reps",
      rest: "45s",
      note: "Stop the set the moment shape breaks down.",
    },
    {
      block: "Strength",
      movement: strength,
      sets: String(sets),
      reps: readiness === "high" ? "5" : "6–8",
      rest: rest,
      note: LOAD[bell] ?? LOAD.moderate,
    },
    {
      block: "Ballistic",
      movement: "Two-hand swing",
      sets: String(sets),
      reps: `${swingReps}`,
      rest: rest,
      note: "Snap the hips, breathe on the backswing.",
    },
    {
      block: "Carry",
      movement: carry,
      sets: String(Math.max(2, sets - 1)),
      reps: "1 per side",
      rest: "60s",
      note: "Ribs down, neck long, no leaning.",
    },
    {
      block: "Down-shift",
      movement: "Nasal breathing + floor decompression",
      sets: "1",
      reps: "4 min",
      rest: "—",
      note: "Finish calm. This is part of the session, not an extra.",
    },
  ];

  if (minutes <= 20) blocks.splice(4, 1); // drop the carry on short sessions

  return {
    headline: `Day ${day.number} · ${day.type}`,
    summary:
      readiness === "low"
        ? "Reduced volume, longer rest. Today is about showing up cleanly."
        : readiness === "high"
          ? "Full volume with tight rest. Push the strength block, keep technique honest."
          : "Standard session. Steady effort across every block.",
    load: LOAD[bell] ?? LOAD.moderate,
    duration: `${minutes} minutes`,
    blocks,
    cues: [
      "Every rep starts with a braced breath.",
      "Leave one or two reps in reserve on the strength block.",
      readiness === "low"
        ? "If anything feels sharp, swap the ballistic block for carries."
        : "Log how the bell felt — it decides your next progression.",
    ],
  };
}

export function isWorkoutDay(type: string) {
  return type.startsWith("Workout") || type === "Challenge Day";
}
