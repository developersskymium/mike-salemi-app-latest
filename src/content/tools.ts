/**
 * Question-driven tools (Kettlebell Selector, Stretch Test).
 *
 * PLACEHOLDER LOGIC — replace the questions, option scores and result bands
 * with the real ones. Adding a new tool is just another entry in `tools`.
 */

export type ToolOption = {
  value: string;
  label: string;
  description?: string;
  score: number;
};

export type ToolQuestion = {
  id: string;
  question: string;
  help?: string;
  options: ToolOption[];
};

export type ToolBand = {
  maxScore: number;
  title: string;
  summary: string;
  points: string[];
  videoIds: string[];
};

export type ToolConfig = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  questions: ToolQuestion[];
  bands: ToolBand[];
};

export const kettlebellSelector: ToolConfig = {
  id: "kettlebell-selector",
  slug: "kettlebell-selector",
  title: "Kettlebell Selector",
  tagline: "Find the right bell to start with",
  description:
    "Six quick questions about your background, strength and goals. You get a starting weight and the next bell to buy.",
  questions: [
    {
      id: "experience",
      question: "How much kettlebell experience do you have?",
      options: [
        { value: "none", label: "None at all", score: 0 },
        { value: "some", label: "A few sessions", score: 2 },
        { value: "regular", label: "I train with bells regularly", score: 4 },
        { value: "years", label: "Years of practice", score: 6 },
      ],
    },
    {
      id: "strength",
      question: "How would you describe your general strength training background?",
      options: [
        { value: "new", label: "New to resistance training", score: 0 },
        { value: "returning", label: "Returning after a long break", score: 1 },
        { value: "consistent", label: "Consistent for a year or more", score: 3 },
        { value: "advanced", label: "Advanced lifter", score: 5 },
      ],
    },
    {
      id: "bodyweight",
      question: "Roughly where does your bodyweight sit?",
      help: "Used only as a rough scaling input, not a judgement.",
      options: [
        { value: "under60", label: "Under 60 kg / 132 lb", score: 0 },
        { value: "60-75", label: "60–75 kg / 132–165 lb", score: 1 },
        { value: "75-90", label: "75–90 kg / 165–198 lb", score: 3 },
        { value: "over90", label: "Over 90 kg / 198 lb", score: 4 },
      ],
    },
    {
      id: "hinge",
      question: "Can you hinge at the hips with a flat back and no discomfort?",
      options: [
        { value: "no", label: "Not yet — it feels awkward", score: 0 },
        { value: "sort-of", label: "Sort of, with cues", score: 1 },
        { value: "yes", label: "Yes, comfortably", score: 3 },
      ],
    },
    {
      id: "goal",
      question: "What are you mainly training for?",
      options: [
        { value: "conditioning", label: "Conditioning and fat loss", score: 1 },
        { value: "general", label: "General fitness and longevity", score: 2 },
        { value: "strength", label: "Strength and muscle", score: 4 },
      ],
    },
    {
      id: "equipment",
      question: "How many bells can you buy right now?",
      options: [
        { value: "one", label: "Just one", score: 1 },
        { value: "two", label: "Two", score: 2 },
        { value: "several", label: "A small set", score: 3 },
      ],
    },
  ],
  bands: [
    {
      maxScore: 6,
      title: "Start at 8 kg / 18 lb",
      summary: "Begin light and earn the load. Your first job is a clean hinge, not a heavy bell.",
      points: [
        "Start with one 8 kg bell for all On Ramp work.",
        "Next purchase: 12 kg, once you can swing 8 kg for 10 sets of 10.",
        "Spend at least three weeks in Phase 1 before adding weight.",
      ],
      videoIds: ["on-ramp-welcome", "hinge-mechanics"],
    },
    {
      maxScore: 12,
      title: "Start at 12 kg / 26 lb",
      summary: "You have enough base to load the hinge properly from day one.",
      points: [
        "12 kg for swings and two-hand work, 8 kg for pressing if you have it.",
        "Next purchase: 16 kg.",
        "Run the On Ramp anyway — it sets the standard for everything after.",
      ],
      videoIds: ["hinge-mechanics", "swing-30-30"],
    },
    {
      maxScore: 18,
      title: "Start at 16 kg / 35 lb",
      summary: "Your background supports a working bell straight away.",
      points: [
        "16 kg for ballistics, 12 kg for your first presses.",
        "Next purchase: 20 kg or 24 kg.",
        "Move through the On Ramp quickly, but do not skip it.",
      ],
      videoIds: ["swing-30-30", "press-groove"],
    },
    {
      maxScore: 99,
      title: "Start at 20–24 kg / 44–53 lb",
      summary: "You are ready for a genuine working bell and can push straight into Phase 2.",
      points: [
        "24 kg for swings, 20 kg for cleans and presses.",
        "Next purchase: a second matched bell for double work.",
        "Use the On Ramp as a technique audit rather than a build-up.",
      ],
      videoIds: ["clean-press-emom", "taming-the-arc"],
    },
  ],
};

export const stretchTest: ToolConfig = {
  id: "stretch-test",
  slug: "stretch-test",
  title: "Stretch Test",
  tagline: "Check the positions the program demands",
  description:
    "Five self-assessments covering hips, ankles, shoulders and t-spine. You get a mobility profile and the exact drills to prioritise.",
  questions: [
    {
      id: "toe-touch",
      question: "Standing with straight legs, how far do your hands reach?",
      options: [
        { value: "shins", label: "Mid-shin or higher", score: 0 },
        { value: "ankles", label: "Around my ankles", score: 1 },
        { value: "floor", label: "Fingertips or palms to the floor", score: 3 },
      ],
    },
    {
      id: "deep-squat",
      question: "Can you sit into a deep squat with heels down?",
      options: [
        { value: "no", label: "No — heels lift or I fall back", score: 0 },
        { value: "briefly", label: "Briefly, with effort", score: 1 },
        { value: "rest", label: "Yes, I can rest there", score: 3 },
      ],
    },
    {
      id: "overhead",
      question: "Lying on your back, can you press your arms overhead to the floor with ribs down?",
      options: [
        { value: "no", label: "No — my ribs flare or arms stop short", score: 0 },
        { value: "partly", label: "Almost", score: 1 },
        { value: "yes", label: "Yes, easily", score: 3 },
      ],
    },
    {
      id: "ankle",
      question: "Knee-to-wall ankle test: how far from the wall is your toe?",
      options: [
        { value: "under5", label: "Less than 5 cm / 2 in", score: 0 },
        { value: "5-10", label: "5–10 cm / 2–4 in", score: 2 },
        { value: "over10", label: "More than 10 cm / 4 in", score: 3 },
      ],
    },
    {
      id: "rotation",
      question: "Seated, how freely can you rotate your upper back each way?",
      options: [
        { value: "stiff", label: "Stiff and uneven side to side", score: 0 },
        { value: "ok", label: "Reasonable, slightly uneven", score: 2 },
        { value: "free", label: "Free and symmetrical", score: 3 },
      ],
    },
  ],
  bands: [
    {
      maxScore: 4,
      title: "Restricted — mobility first",
      summary: "Several positions the program relies on are not available yet. That is fixable, and quickly.",
      points: [
        "Run the daily mobility minimums before every session.",
        "Stay in Phase 1 until the toe touch and ankle test improve.",
        "Retake this test in two weeks.",
      ],
      videoIds: ["daily-mobility", "hip-opener-flow"],
    },
    {
      maxScore: 9,
      title: "Workable — train and maintain",
      summary: "You can train the full program safely with targeted maintenance work.",
      points: [
        "Ten minutes of mobility before each session.",
        "Prioritise whichever test scored lowest for you.",
        "Retake this test monthly.",
      ],
      videoIds: ["daily-mobility"],
    },
    {
      maxScore: 99,
      title: "Open — keep it",
      summary: "You have the range the program asks for. The job now is keeping it.",
      points: [
        "Short mobility flow on rest days is enough.",
        "Move straight into Phase 2 when your strength base allows.",
        "Retake this test each quarter.",
      ],
      videoIds: ["hip-opener-flow", "training-forever"],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Additional assessments                                              */
/* ------------------------------------------------------------------ */

export const recoveryCheck: ToolConfig = {
  id: "recovery-check",
  slug: "recovery-check",
  title: "Readiness Check",
  tagline: "Should you push today, or back off?",
  description:
    "Six questions on sleep, soreness, stress and appetite. You get a clear call: full session, modified session, or recovery day.",
  questions: [
    {
      id: "sleep",
      question: "How did you sleep last night?",
      options: [
        { value: "poor", label: "Badly — under 5 hours or broken", score: 0 },
        { value: "ok", label: "Okay — 5 to 7 hours", score: 2 },
        { value: "good", label: "Well — 7 hours or more", score: 4 },
      ],
    },
    {
      id: "soreness",
      question: "How sore are you from your last session?",
      options: [
        { value: "high", label: "Very sore, movement is limited", score: 0 },
        { value: "mild", label: "Mildly sore", score: 2 },
        { value: "none", label: "Fresh", score: 4 },
      ],
    },
    {
      id: "energy",
      question: "Where is your energy right now?",
      options: [
        { value: "flat", label: "Flat — dragging myself around", score: 0 },
        { value: "steady", label: "Steady", score: 2 },
        { value: "high", label: "Sharp and ready", score: 4 },
      ],
    },
    {
      id: "stress",
      question: "How is life stress this week?",
      options: [
        { value: "high", label: "High — work or home is heavy", score: 0 },
        { value: "normal", label: "Normal", score: 2 },
        { value: "low", label: "Low, things feel calm", score: 3 },
      ],
    },
    {
      id: "appetite",
      question: "How is your appetite and hydration?",
      options: [
        { value: "off", label: "Off — skipping meals or dehydrated", score: 0 },
        { value: "ok", label: "Reasonable", score: 2 },
        { value: "strong", label: "Strong and consistent", score: 3 },
      ],
    },
    {
      id: "motivation",
      question: "How do you feel about training today?",
      options: [
        { value: "dread", label: "Dreading it", score: 0 },
        { value: "neutral", label: "Neutral — I'll show up", score: 2 },
        { value: "keen", label: "Keen to get under the bell", score: 3 },
      ],
    },
  ],
  bands: [
    {
      maxScore: 7,
      title: "Recovery day",
      summary: "Your body is asking for a lighter load. Take the recovery option today.",
      points: [
        "Swap today's session for mobility and breathing.",
        "Prioritise sleep tonight over any extra volume.",
        "Re-run this check tomorrow morning.",
      ],
      videoIds: ["daily-mobility"],
    },
    {
      maxScore: 14,
      title: "Modified session",
      summary: "Train, but pull the intensity back. Keep the movement, drop the load.",
      points: [
        "Use one bell size down, or cut the last round.",
        "Keep technique work — skip the conditioning finisher.",
        "Stop if quality drops before the set ends.",
      ],
      videoIds: ["daily-mobility"],
    },
    {
      maxScore: 99,
      title: "Full session — go",
      summary: "You are recovered. Train the session as written.",
      points: [
        "Warm up properly, then hit the prescribed loads.",
        "This is a good day to test a heavier bell.",
        "Log how it felt so you can compare next week.",
      ],
      videoIds: ["training-forever"],
    },
  ],
};

export const movementScreen: ToolConfig = {
  id: "movement-screen",
  slug: "movement-screen",
  title: "Movement Screen",
  tagline: "Check the five positions the program relies on",
  description:
    "A short self-screen of the hinge, squat, overhead, rack and loaded carry positions. Tells you which drills to prioritise before adding load.",
  questions: [
    {
      id: "hinge",
      question: "Hip hinge: can you push your hips back with a flat back and feel your hamstrings?",
      options: [
        { value: "no", label: "No — my back rounds", score: 0 },
        { value: "partial", label: "Partially — needs cueing", score: 2 },
        { value: "yes", label: "Yes, clean and repeatable", score: 4 },
      ],
    },
    {
      id: "squat",
      question: "Deep squat: can you sit to the bottom with heels down?",
      options: [
        { value: "no", label: "No — heels lift or I fall back", score: 0 },
        { value: "partial", label: "Partially — with a small heel lift", score: 2 },
        { value: "yes", label: "Yes, comfortably", score: 4 },
      ],
    },
    {
      id: "overhead",
      question: "Overhead: can you press an arm straight up beside your ear without arching?",
      options: [
        { value: "no", label: "No — I rib-flare or can't get there", score: 0 },
        { value: "partial", label: "Almost", score: 2 },
        { value: "yes", label: "Yes, both sides", score: 4 },
      ],
    },
    {
      id: "rack",
      question: "Front rack: can you rest a bell on your forearm with a relaxed shoulder?",
      options: [
        { value: "no", label: "No — wrist or shoulder complains", score: 0 },
        { value: "partial", label: "One side is fine, one isn't", score: 2 },
        { value: "yes", label: "Yes, both sides", score: 3 },
      ],
    },
    {
      id: "carry",
      question: "Loaded carry: can you walk 60 seconds with a bell without your ribs flaring?",
      options: [
        { value: "no", label: "No", score: 0 },
        { value: "partial", label: "Some of it", score: 2 },
        { value: "yes", label: "Yes, braced the whole way", score: 3 },
      ],
    },
    {
      id: "asymmetry",
      question: "Do you notice a clear left/right difference in any of the above?",
      options: [
        { value: "large", label: "Yes, a big difference", score: 0 },
        { value: "small", label: "A small difference", score: 2 },
        { value: "none", label: "No, they feel even", score: 3 },
      ],
    },
  ],
  bands: [
    {
      maxScore: 8,
      title: "Build the positions first",
      summary: "Load will reinforce what is missing. Spend two weeks on position work.",
      points: [
        "Run the On Ramp mobility lessons daily.",
        "Drill the hinge and squat pattern unloaded before each session.",
        "Re-screen in two weeks before adding weight.",
      ],
      videoIds: ["daily-mobility", "hip-opener-flow"],
    },
    {
      maxScore: 15,
      title: "Train with targeted work",
      summary: "Your positions are good enough to train — patch the weak link as you go.",
      points: [
        "Add five minutes of work on your lowest-scoring position.",
        "Keep unilateral work in every session to even out asymmetry.",
        "Re-screen monthly.",
      ],
      videoIds: ["daily-mobility"],
    },
    {
      maxScore: 99,
      title: "Positions are ready",
      summary: "All five positions are available to you. Load them.",
      points: [
        "Progress bell weight as the program prescribes.",
        "Keep a short mobility flow as maintenance.",
        "Re-screen each phase.",
      ],
      videoIds: ["hip-opener-flow"],
    },
  ],
};

export const gripTest: ToolConfig = {
  id: "grip-test",
  slug: "grip-test",
  title: "Grip & Carry Test",
  tagline: "Is your grip the limiting factor?",
  description:
    "Grip fails before the lift does for most people. Five questions to find out whether to program dedicated grip work.",
  questions: [
    {
      id: "hang",
      question: "How long can you hang from a bar?",
      options: [
        { value: "under15", label: "Under 15 seconds", score: 0 },
        { value: "15-30", label: "15 to 30 seconds", score: 2 },
        { value: "30-60", label: "30 to 60 seconds", score: 3 },
        { value: "over60", label: "Over a minute", score: 4 },
      ],
    },
    {
      id: "carry",
      question: "What limits your farmer's carry first?",
      options: [
        { value: "grip", label: "My hands open up", score: 0 },
        { value: "trunk", label: "My trunk or breathing", score: 3 },
        { value: "legs", label: "My legs", score: 3 },
      ],
    },
    {
      id: "swing",
      question: "During longer swing sets, what fails first?",
      options: [
        { value: "grip", label: "Grip", score: 0 },
        { value: "breath", label: "Breathing", score: 2 },
        { value: "hips", label: "Hips and glutes", score: 3 },
      ],
    },
    {
      id: "callus",
      question: "How are your hands after a session?",
      options: [
        { value: "torn", label: "Torn or blistering regularly", score: 0 },
        { value: "sore", label: "Sore but intact", score: 2 },
        { value: "fine", label: "Fine", score: 3 },
      ],
    },
    {
      id: "forearm",
      question: "Do you get forearm or elbow pain from kettlebell work?",
      options: [
        { value: "often", label: "Often", score: 0 },
        { value: "sometimes", label: "Sometimes", score: 1 },
        { value: "never", label: "Never", score: 3 },
      ],
    },
  ],
  bands: [
    {
      maxScore: 6,
      title: "Grip is your limiter",
      summary: "Your grip gives out before the target muscles do. Program it directly.",
      points: [
        "Add two sets of bar hangs after every session.",
        "Break long swing sets into shorter clusters.",
        "Check your hand position — hook grip, not a death grip.",
      ],
      videoIds: ["daily-mobility"],
    },
    {
      maxScore: 12,
      title: "Grip is adequate",
      summary: "Grip holds up for now but will limit you as loads climb.",
      points: [
        "One carry variation per week is enough maintenance.",
        "Rotate bell handle thickness if you can.",
        "Retest at the end of the phase.",
      ],
      videoIds: ["training-forever"],
    },
    {
      maxScore: 99,
      title: "Strong grip",
      summary: "Grip is not holding you back. Train the lift, not the hands.",
      points: [
        "Keep carries in the program for trunk work, not grip.",
        "You can progress bell size on schedule.",
        "Retest each level.",
      ],
      videoIds: ["training-forever"],
    },
  ],
};

export const breathTest: ToolConfig = {
  id: "breath-test",
  slug: "breath-test",
  title: "Breath & Conditioning Test",
  tagline: "How is your engine, really?",
  description:
    "Five questions about breathing under load and between sets. Tells you whether to add conditioning or work on mechanics first.",
  questions: [
    {
      id: "nasal",
      question: "Can you breathe through your nose for a full warm-up?",
      options: [
        { value: "no", label: "No — I mouth-breathe almost immediately", score: 0 },
        { value: "partly", label: "Partly", score: 2 },
        { value: "yes", label: "Yes, the whole way", score: 4 },
      ],
    },
    {
      id: "recovery",
      question: "How long until your breathing settles after a hard set?",
      options: [
        { value: "long", label: "Over three minutes", score: 0 },
        { value: "medium", label: "One to three minutes", score: 2 },
        { value: "fast", label: "Under a minute", score: 4 },
      ],
    },
    {
      id: "stairs",
      question: "Two flights of stairs at pace — how do you finish?",
      options: [
        { value: "gassed", label: "Gassed", score: 0 },
        { value: "puffed", label: "Puffed but fine", score: 2 },
        { value: "easy", label: "Barely noticed", score: 3 },
      ],
    },
    {
      id: "brace",
      question: "Can you brace your trunk and still breathe during a carry?",
      options: [
        { value: "no", label: "No — I hold my breath", score: 0 },
        { value: "sometimes", label: "Sometimes", score: 2 },
        { value: "yes", label: "Yes", score: 3 },
      ],
    },
    {
      id: "weekly",
      question: "How much deliberate conditioning do you do weekly?",
      options: [
        { value: "none", label: "None", score: 0 },
        { value: "some", label: "One or two sessions", score: 2 },
        { value: "lots", label: "Three or more", score: 3 },
      ],
    },
  ],
  bands: [
    {
      maxScore: 7,
      title: "Mechanics before volume",
      summary: "Your breathing mechanics are the bottleneck, not your fitness.",
      points: [
        "Practise nasal breathing during every warm-up.",
        "Use the recovery-day breathing lessons twice a week.",
        "Keep work intervals short until breath control holds.",
      ],
      videoIds: ["daily-mobility"],
    },
    {
      maxScore: 13,
      title: "Add conditioning gradually",
      summary: "The engine works. Build it with structured intervals rather than random hard days.",
      points: [
        "Add one conditioning finisher per week.",
        "Keep rest periods honest — recovery is the training.",
        "Retest in four weeks.",
      ],
      videoIds: ["training-forever"],
    },
    {
      maxScore: 99,
      title: "Strong engine",
      summary: "Your conditioning supports the program's hardest days.",
      points: [
        "Use conditioning to support strength, not replace it.",
        "Challenge days are appropriate for you.",
        "Retest each level.",
      ],
      videoIds: ["training-forever"],
    },
  ],
};


export const swingTempo: ToolConfig = {
  id: "swing-tempo",
  slug: "swing-tempo",
  title: "Swing Tempo Planner",
  tagline: "Build a conditioning session that fits your bell, your clock and today's effort.",
  description:
    "Answer five questions about your bell, breathing, available time and target effort. You get a work-to-rest prescription, set count and a weekly dose that supports strength instead of eating it.",
  questions: [
    {
      id: "bell",
      question: "Which bell will you swing today?",
      options: [
        { value: "light", label: "Light", description: "Ten clean reps feel easy", score: 1 },
        { value: "moderate", label: "Moderate", description: "Fifteen reps is honest work", score: 2 },
        { value: "heavy", label: "Heavy", description: "Ten reps is already a lot", score: 3 },
      ],
    },
    {
      id: "time",
      question: "How long is the conditioning block?",
      options: [
        { value: "10", label: "10 minutes", score: 1 },
        { value: "20", label: "20 minutes", score: 2 },
        { value: "30", label: "30 minutes or more", score: 3 },
      ],
    },
    {
      id: "breath",
      question: "Can you hold nasal breathing through a set of ten?",
      help: "This is the honest test of whether your pace is right.",
      options: [
        { value: "no", label: "No — I have to gasp", score: 1 },
        { value: "sometimes", label: "Most of the time", score: 2 },
        { value: "yes", label: "Comfortably", score: 3 },
      ],
    },
    {
      id: "goal",
      question: "What is this session for?",
      options: [
        { value: "recovery", label: "Flush and recover", score: 1 },
        { value: "engine", label: "Build the engine", score: 2 },
        { value: "power", label: "Sharpen power output", score: 3 },
      ],
    },
    {
      id: "frequency",
      question: "How many hard sessions have you done this week?",
      options: [
        { value: "0", label: "None yet", score: 3 },
        { value: "1", label: "One or two", score: 2 },
        { value: "3", label: "Three or more", score: 1 },
      ],
    },
  ],
  bands: [
    {
      maxScore: 7,
      title: "Short sets, long rest",
      summary: "Keep the dose small so the quality stays high and recovery is not compromised.",
      points: [
        "10 swings on the minute, 8–10 rounds.",
        "Stop the session the moment the hinge softens.",
        "Nasal breathing only — if you cannot, rest longer.",
      ],
      videoIds: ["daily-mobility"],
    },
    {
      maxScore: 11,
      title: "Steady intervals",
      summary: "A 1:1 work-to-rest rhythm builds the engine without draining strength days.",
      points: [
        "30 seconds of swings, 30 seconds rest, 12–16 rounds.",
        "Two of these per week, never the day before a heavy workout day.",
        "Finish with four minutes of down-shift breathing.",
      ],
      videoIds: ["training-forever"],
    },
    {
      maxScore: 99,
      title: "Power intervals",
      summary: "You have the capacity for dense work. Keep it sharp rather than long.",
      points: [
        "15 hard swings every 45 seconds, 15–20 rounds.",
        "Cap it at two power sessions per week.",
        "Log rep quality — the first sloppy round ends the session.",
      ],
      videoIds: ["training-forever"],
    },
  ],
};

export const loadProgression: ToolConfig = {
  id: "load-progression",
  slug: "load-progression",
  title: "Load Progression Planner",
  tagline: "Know exactly when to move up a bell — and when to stay put.",
  description:
    "Six questions on rep quality, recovery, grip and consistency decide whether you add reps, add sets, or step up to the next bell size.",
  questions: [
    {
      id: "quality",
      question: "How do the last two reps of your working sets look?",
      options: [
        { value: "ragged", label: "Ragged — shape breaks down", score: 1 },
        { value: "okay", label: "Holding, but effortful", score: 2 },
        { value: "clean", label: "Identical to the first rep", score: 3 },
      ],
    },
    {
      id: "reserve",
      question: "How many reps do you have left at the end of a set?",
      options: [
        { value: "0", label: "None — I am at the limit", score: 1 },
        { value: "2", label: "About two", score: 2 },
        { value: "4", label: "Four or more", score: 3 },
      ],
    },
    {
      id: "recovery",
      question: "How do you feel the day after a workout day?",
      options: [
        { value: "wrecked", label: "Wrecked for two days", score: 1 },
        { value: "sore", label: "Sore but functional", score: 2 },
        { value: "fresh", label: "Ready to train again", score: 3 },
      ],
    },
    {
      id: "grip",
      question: "Does grip fail before the target muscle does?",
      options: [
        { value: "always", label: "Almost every set", score: 1 },
        { value: "sometimes", label: "On the longest sets", score: 2 },
        { value: "never", label: "Rarely", score: 3 },
      ],
    },
    {
      id: "consistency",
      question: "How consistent have the last three weeks been?",
      options: [
        { value: "patchy", label: "Patchy — missed sessions", score: 1 },
        { value: "mostly", label: "Mostly on plan", score: 2 },
        { value: "full", label: "Every session completed", score: 3 },
      ],
    },
    {
      id: "time-at-load",
      question: "How long have you used your current bell?",
      options: [
        { value: "new", label: "Less than 3 weeks", score: 1 },
        { value: "mid", label: "3 to 8 weeks", score: 2 },
        { value: "long", label: "More than 8 weeks", score: 3 },
      ],
    },
  ],
  bands: [
    {
      maxScore: 9,
      title: "Stay at this bell",
      summary: "Technique and recovery are still catching up to the load you already own.",
      points: [
        "Hold the current bell for at least three more weeks.",
        "Add one set before you add any weight.",
        "Film one working set a week and compare shape.",
      ],
      videoIds: ["daily-mobility"],
    },
    {
      maxScore: 14,
      title: "Add volume, not weight",
      summary: "You are close. Earn the next bell by expanding what you can do with this one.",
      points: [
        "Add two reps per set until you reach the top of the rep range.",
        "Then add a set, and hold that for a full week.",
        "Retest this planner in two weeks.",
      ],
      videoIds: ["training-forever"],
    },
    {
      maxScore: 99,
      title: "Step up a bell",
      summary: "Quality, recovery and consistency all say you have outgrown the current load.",
      points: [
        "Move up one bell size on the strength block only.",
        "Drop back to the lower end of the rep range for two weeks.",
        "Keep the old bell for ballistics until the new one feels smooth.",
      ],
      videoIds: ["training-forever"],
    },
  ],
};

/** Only the polished tools are listed; the rest stay defined but hidden. */
export const tools: ToolConfig[] = [kettlebellSelector, stretchTest, recoveryCheck];
void [movementScreen, gripTest, breathTest, swingTempo, loadProgression];

export function scoreTool(config: ToolConfig, answers: Record<string, string>) {
  const score = config.questions.reduce((sum, q) => {
    const option = q.options.find((o) => o.value === answers[q.id]);
    return sum + (option?.score ?? 0);
  }, 0);
  const band = config.bands.find((b) => score <= b.maxScore) ?? config.bands[config.bands.length - 1];
  return { score, band };
}
