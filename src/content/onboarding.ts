/**
 * Kettlebell Lifestyle — Intake Questionnaire
 * Ported from the legacy Gravity Forms "Intake Questionnaire" (form 18).
 * Each legacy page becomes one step in the wizard.
 */

export type IntakeOption = {
  value: string;
  label: string;
  description?: string;
  bullets?: string[];
};

export type IntakeQuestion = {
  id: string;
  label: string;
  help?: string;
  type: "single" | "multi";
  required?: boolean;
  options: IntakeOption[];
};

export type IntakeStep = {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  note?: { title: string; points: string[] };
  questions: IntakeQuestion[];
};

export const intakeSteps: IntakeStep[] = [
  {
    id: "experience",
    eyebrow: "Step 01",
    title: "Your kettlebell history",
    intro: "We start with the basics so we can drop you into the right level of Kettlebell Lifestyle.",
    questions: [
      {
        id: "used_kettlebell",
        label: "Have you ever used a kettlebell before?",
        type: "single",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    id: "level",
    eyebrow: "Step 02",
    title: "Describe your kettlebell level",
    intro:
      "Not sure? Use the intermediate movement standards as your guide — squats, two hand swings, deadlifts and overhead presses should feel proficient, not new.",
    questions: [
      {
        id: "kettlebell_level",
        label: "Describe your kettlebell level",
        type: "single",
        required: true,
        options: [
          {
            value: "beginner",
            label: "Beginner",
            bullets: ["I’ve rarely used a kettlebell before"],
          },
          {
            value: "intermediate",
            label: "Intermediate",
            bullets: [
              "I use a kettlebell fairly often",
              "I feel proficient with squats, two hand swings, deadlifts and overhead presses",
            ],
          },
          { value: "advanced", label: "Advanced" },
        ],
      },
    ],
  },
  {
    id: "fitness",
    eyebrow: "Step 03",
    title: "Fitness baseline",
    questions: [
      {
        id: "fitness_level",
        label: "Describe your fitness level",
        type: "single",
        options: [
          { value: "low", label: "Low", bullets: ["I feel out of shape"] },
          {
            value: "medium",
            label: "Medium",
            bullets: ["I’m in decent shape, and/or I train with resistance at least 2x/week"],
          },
          {
            value: "high",
            label: "High",
            bullets: ["My fitness is on the higher side, and/or I train with resistance 3+ times a week"],
          },
        ],
      },
      {
        id: "consistency",
        label: "How long have you been consistently exercising?",
        type: "single",
        options: [
          { value: "lt6m", label: "Less than 6 months" },
          { value: "6m-2y", label: "Between 6 months and 2 years" },
          { value: "gt2y", label: "More than 2 years" },
        ],
      },
    ],
  },
  {
    id: "mobility",
    eyebrow: "Step 04",
    title: "Joint mobility",
    intro: "This tells us how much prep and mobility work to weave into your on-ramp.",
    questions: [
      {
        id: "shoulders",
        label: "Do your shoulder(s) feel limited or restricted in some way?",
        type: "single",
        options: [
          { value: "no", label: "No" },
          { value: "some", label: "Yes, but not much" },
          { value: "lots", label: "Yes, quite a bit" },
        ],
      },
      {
        id: "hips",
        label: "Do your hip(s) feel limited or restricted in some way?",
        type: "single",
        options: [
          { value: "no", label: "No" },
          { value: "some", label: "Yes, but not much" },
          { value: "lots", label: "Yes, quite a bit" },
        ],
      },
    ],
  },
  {
    id: "goals",
    eyebrow: "Step 05",
    title: "What do you want to improve most?",
    questions: [
      {
        id: "focus_areas",
        label: "What areas of your training, ability, or lifestyle do you wish to improve upon most?",
        help: "Select all that apply.",
        type: "multi",
        options: [
          "Kettlebell Skill",
          "Health",
          "Fitness",
          "Longevity & Injury Prevention",
          "Flexibility/Mobility",
          "Mindset",
          "Nutrition",
          "Sleep",
          "Strength",
          "Conditioning",
          "Fat Loss",
        ].map((label) => ({ value: label, label })),
      },
    ],
  },
  {
    id: "hydration",
    eyebrow: "Step 06",
    title: "Hydration",
    questions: [
      {
        id: "water",
        label:
          "Are you drinking at least half an ounce of quality filtered water per pound of bodyweight a day?",
        type: "single",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    id: "sleep",
    eyebrow: "Step 07",
    title: "Sleep",
    note: {
      title: "Questions to consider on sleep quality",
      points: [
        "Do you fall asleep easily (~30 minutes or less)?",
        "Are you waking up multiple times a night?",
        "Do you wake up in the morning feeling rested?",
      ],
    },
    questions: [
      {
        id: "sleep",
        label: "Do you get 7+ hours of quality sleep per night?",
        type: "single",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    id: "nutrition",
    eyebrow: "Step 08",
    title: "Nutrition & digestion",
    questions: [
      {
        id: "nutrition",
        label: "How would you describe your nutrition and digestion?",
        type: "single",
        options: [
          {
            value: "above",
            label: "Above average",
            bullets: ["Food leaves me energised, with regular, easy to pass bowel movements"],
          },
          {
            value: "average",
            label: "Average",
            bullets: ["I generally eat clean, but certain foods affect my digestion adversely"],
          },
          {
            value: "below",
            label: "Below average",
            bullets: ["I don’t eat the greatest, and/or often experience digestive discomfort"],
          },
        ],
      },
    ],
  },
  {
    id: "stress",
    eyebrow: "Step 09",
    title: "Stress & balance",
    questions: [
      {
        id: "stress_level",
        label: "How would you describe your daily stress level?",
        type: "single",
        options: [
          { value: "low", label: "Low", bullets: ["I rarely feel stressed"] },
          { value: "moderate", label: "Moderate", bullets: ["I’m sometimes stressed, but I manage it well"] },
          { value: "high", label: "High", bullets: ["I feel stressed a majority of the time"] },
        ],
      },
      {
        id: "stress_management",
        label: "How well do you manage your stress on a daily basis?",
        type: "single",
        options: [
          { value: "poorly", label: "Poorly" },
          { value: "moderate", label: "Moderate" },
          { value: "well", label: "Well" },
        ],
      },
      {
        id: "work_life",
        label: "Do you feel you have a good work-life balance?",
        type: "single",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    id: "solitude",
    eyebrow: "Step 10",
    title: "Time with yourself",
    questions: [
      {
        id: "alone",
        label: "How comfortable do you feel being alone?",
        type: "single",
        options: [
          {
            value: "uncertain",
            label: "Not very / uncertain",
            bullets: ["I’ve never paid attention to this and am not sure"],
          },
          {
            value: "mild",
            label: "Mildly",
            bullets: ["I don’t feel comfortable unless I’m around others, or have the TV or radio on"],
          },
          {
            value: "super",
            label: "Super comfortable",
            bullets: ["I can sit quietly or meditate with no distractions for an hour"],
          },
        ],
      },
    ],
  },
  {
    id: "flexibility",
    eyebrow: "Step 11",
    title: "Flexibility",
    questions: [
      {
        id: "flexibility",
        label: "Would you consider your body to be:",
        type: "single",
        options: [
          { value: "stiff", label: "Stiff as a board and not flexible" },
          { value: "mild", label: "Mildly flexible" },
          { value: "high", label: "Highly flexible" },
        ],
      },
    ],
  },
  {
    id: "posture",
    eyebrow: "Step 12",
    title: "Posture",
    note: {
      title: "Not sure?",
      points: [
        "If your posture shows characteristics of anything other than good posture, choose option 1 or 2.",
        "One tell: where do your ears sit relative to your shoulders when standing relaxed?",
      ],
    },
    questions: [
      {
        id: "posture",
        label: "Do you feel your posture is:",
        type: "single",
        options: [
          { value: "poor", label: "Poor and out of balance" },
          { value: "ok", label: "Ok, but could use some improvement" },
          { value: "good", label: "Good and well-balanced" },
        ],
      },
    ],
  },
  {
    id: "coordination",
    eyebrow: "Step 13",
    title: "Coordination",
    questions: [
      {
        id: "coordination",
        label: "How would you describe your level of coordination?",
        type: "single",
        options: [
          { value: "low", label: "Low", description: "I feel like a baby giraffe at times ; )" },
          { value: "medium", label: "Medium", description: "Somewhere between a giraffe and a cheetah" },
          { value: "high", label: "High", description: "Oh heck yeah, I’m a cheetah!" },
        ],
      },
    ],
  },
];

export type IntakeAnswers = Record<string, string | string[]>;

export type IntakeRecommendation = {
  courseSlug: string;
  courseLabel: string;
  headline: string;
  summary: string;
  priorities: string[];
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Maps intake answers onto a recommended starting course and focus priorities. */
export function scoreIntake(answers: IntakeAnswers): IntakeRecommendation {
  const used = asString(answers.used_kettlebell);
  const level = asString(answers.kettlebell_level);
  const fitness = asString(answers.fitness_level);

  const intermediate =
    used === "yes" && (level === "intermediate" || level === "advanced") && fitness !== "low";

  const priorities: string[] = [];
  if (asString(answers.shoulders) === "lots" || asString(answers.hips) === "lots") {
    priorities.push("Prioritise the mobility work in the On Ramp — your joints need runway before load.");
  }
  if (asString(answers.flexibility) === "stiff") {
    priorities.push("Add the stretch protocols after every session and retake the Stretch Test in 4 weeks.");
  }
  if (asString(answers.posture) === "poor") {
    priorities.push("Run the posture correctives daily; they unlock your overhead positions.");
  }
  if (asString(answers.sleep) === "no") {
    priorities.push("Sleep is the cheapest performance gain available — aim for 7+ hours before adding volume.");
  }
  if (asString(answers.water) === "no") {
    priorities.push("Dial in hydration: half an ounce of filtered water per pound of bodyweight, daily.");
  }
  if (asString(answers.nutrition) === "below") {
    priorities.push("Clean up one meal a day before overhauling everything — digestion drives recovery.");
  }
  if (asString(answers.stress_level) === "high" || asString(answers.stress_management) === "poorly") {
    priorities.push("Use the breathing and down-regulation lessons on your rest days.");
  }
  if (asString(answers.coordination) === "low") {
    priorities.push("Slow the tempo on skill days — reps at half speed build coordination fastest.");
  }
  if (priorities.length === 0) {
    priorities.push("You’re in strong shape — focus on technical precision and progressive load.");
  }

  return intermediate
    ? {
        courseSlug: "intermediate",
        courseLabel: "Level II — Intermediate",
        headline: "You’re starting at Level II",
        summary:
          "Your kettlebell background and training consistency mean you can skip the absolute basics and start with the Intermediate track.",
        priorities: priorities.slice(0, 4),
      }
    : {
        courseSlug: "beginner",
        courseLabel: "Level I — Beginner",
        headline: "You’re starting at Level I",
        summary:
          "We’ll build your foundation first: the On Ramp phase teaches the positions and breathing that everything else is stacked on.",
        priorities: priorities.slice(0, 4),
      };
}
