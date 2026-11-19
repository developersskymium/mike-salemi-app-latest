/**
 * Kettlebell Selector — chart-driven, not score-driven.
 *
 * Four answers (gender, bodyweight band, kettlebell level, fitness status)
 * resolve to one of sixteen scenarios from the official selection chart.
 * Each scenario returns three suggested bells, lightest to heaviest.
 */

export type Gender = "male" | "female";
export type WeightBand = "below" | "above";
export type KbLevel = "beginner" | "intermediate";
export type FitnessStatus = "low" | "medium-high";

export type KettlebellAnswers = {
  gender?: Gender;
  bodyweight?: WeightBand;
  level?: KbLevel;
  fitness?: FitnessStatus;
};

export type BellSuggestion = {
  /** Display label, e.g. "8–10" */
  label: string;
  /** Numeric weight used for relative sizing of the illustration */
  size: number;
};

export type KettlebellResult = {
  scenario: number;
  bells: [BellSuggestion, BellSuggestion, BellSuggestion];
  headline: string;
  summary: string;
  notes: string[];
};

export const kettlebellSelectorMeta = {
  id: "kettlebell-selector",
  slug: "kettlebell-selector",
  title: "Kettlebell Selector",
  tagline: "Find the right bells to start with",
  description:
    "Four quick questions. You get the three bells to build your set around, lightest to heaviest.",
};

/** The bodyweight threshold differs by gender. */
export function weightThreshold(gender: Gender) {
  return gender === "male" ? "160lbs" : "120lbs";
}

function bell(label: string): BellSuggestion {
  const nums = label.split("–").map((n) => Number(n));
  const size = nums.reduce((a, b) => a + b, 0) / nums.length;
  return { label, size };
}

type Row = [string, string, string];

/** key: gender | weightBand | level | fitness */
const chart: Record<string, { scenario: number; row: Row }> = {
  "male|below|beginner|medium-high": { scenario: 1, row: ["8–10", "12", "16–20"] },
  "male|below|intermediate|low": { scenario: 2, row: ["8–10", "12", "16–20"] },
  "male|below|beginner|low": { scenario: 3, row: ["8", "12", "16"] },
  "male|below|intermediate|medium-high": { scenario: 4, row: ["12", "16", "20"] },
  "male|above|beginner|medium-high": { scenario: 5, row: ["12–14", "16", "20"] },
  "male|above|intermediate|low": { scenario: 6, row: ["10–12", "16", "20–24"] },
  "male|above|beginner|low": { scenario: 7, row: ["10–12", "16", "20"] },
  "male|above|intermediate|medium-high": { scenario: 8, row: ["12", "16–20", "24"] },
  "female|below|beginner|medium-high": { scenario: 9, row: ["4–6", "8", "12–16"] },
  "female|below|intermediate|low": { scenario: 10, row: ["4–8", "10", "12–16"] },
  "female|below|beginner|low": { scenario: 11, row: ["4–6", "8", "12"] },
  "female|below|intermediate|medium-high": { scenario: 12, row: ["6–8", "10", "12–16"] },
  "female|above|beginner|medium-high": { scenario: 13, row: ["6–8", "10", "12–16"] },
  "female|above|intermediate|low": { scenario: 14, row: ["6", "8–10", "12–16"] },
  "female|above|beginner|low": { scenario: 15, row: ["4–8", "10", "12–16"] },
  "female|above|intermediate|medium-high": { scenario: 16, row: ["8", "12", "16–20"] },
};

export function resolveKettlebell(answers: KettlebellAnswers): KettlebellResult | null {
  const { gender, bodyweight, level, fitness } = answers;
  if (!gender || !bodyweight || !level || !fitness) return null;
  const hit = chart[`${gender}|${bodyweight}|${level}|${fitness}`];
  if (!hit) return null;

  const bells = hit.row.map(bell) as [BellSuggestion, BellSuggestion, BellSuggestion];

  return {
    scenario: hit.scenario,
    bells,
    headline: `Start with ${bells[0].label} kg`,
    summary:
      level === "beginner"
        ? "Begin on the lightest bell and earn the next one. Technique first, load second."
        : "Your first bell is a genuine working weight. The heavier bells come as the phases progress.",
    notes: [
      `Bell 1 — ${bells[0].label} kg: your On Ramp and skill-work bell.`,
      `Bell 2 — ${bells[1].label} kg: your main working bell through the phases.`,
      `Bell 3 — ${bells[2].label} kg: heavy swings and later-phase strength work.`,
      "Buy them in order. One good bell beats three you can't control.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Question definitions                                                */
/* ------------------------------------------------------------------ */

export type SelectorOption = { value: string; label: string; description?: string };

export type SelectorStep = {
  id: keyof KettlebellAnswers;
  eyebrow: string;
  question: string;
  help?: string;
  options: (answers: KettlebellAnswers) => SelectorOption[];
};

export const selectorSteps: SelectorStep[] = [
  {
    id: "gender",
    eyebrow: "Question 1",
    question: "Which chart should we use?",
    help: "The selection chart scales differently for male and female lifters.",
    options: () => [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
  },
  {
    id: "bodyweight",
    eyebrow: "Question 2",
    question: "Roughly where does your bodyweight sit?",
    help: "Used only to scale the load — nothing else.",
    options: (a) => {
      const t = weightThreshold(a.gender ?? "male");
      return [
        { value: "below", label: `Below ${t}` },
        { value: "above", label: `Above ${t}` },
      ];
    },
  },
  {
    id: "level",
    eyebrow: "Question 3",
    question: "What's your kettlebell level?",
    options: () => [
      {
        value: "beginner",
        label: "Beginner",
        description: "New to kettlebells, or coming back after a long break.",
      },
      {
        value: "intermediate",
        label: "Intermediate or above",
        description: "You already swing, clean and press with confidence.",
      },
    ],
  },
  {
    id: "fitness",
    eyebrow: "Question 4",
    question: "How's your general fitness right now?",
    options: () => [
      {
        value: "low",
        label: "Low",
        description: "Little or no consistent training in recent months.",
      },
      {
        value: "medium-high",
        label: "Medium to high",
        description: "Training regularly and recovering well.",
      },
    ],
  },
];
