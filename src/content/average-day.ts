/**
 * "An Average Day" — the self-guided walkthrough of a full Kettlebell Lifestyle
 * training day (ported from the legacy WordPress Self-Guided > Average Day page).
 *
 * Section order mirrors the original page:
 *   Readiness Assessment → Morning Routine → Bodyweight Warm Up →
 *   Kettlebell Preparation → Workout → Post Training Stretching
 */

export type ReadinessOption = { value: string; label: string };

export type ReadinessStep = {
  id: string;
  question: string;
  options: ReadinessOption[];
  note?: { title?: string; body?: string; points?: string[] };
};

export const readinessSteps: ReadinessStep[] = [
  {
    id: "tired",
    question: "Did I wake up today feeling tired, honestly?",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
    note: {
      title: "When checking in with yourself, consider:",
      points: [
        "How alert and ready do I feel mentally?",
        "How good was my sleep last night?",
        "Did I feel the need to hit the snooze button today on the alarm?",
        "Did I need a cup of coffee to get myself going?",
      ],
    },
  },
  {
    id: "recovery",
    question: "How recovered does my body feel following the prior workout?",
    options: [
      { value: "full", label: "I’m 100% good to go!" },
      { value: "moderate", label: "Moderately recovered" },
      { value: "none", label: "Not at all" },
    ],
    note: {
      body: "Perform a quick body scan, examining both muscle and joint soreness/achiness. Are your muscles so sore that to the touch you could scream “ouch!”, or does it feel more mild and tolerable? If you are so sore and achy that you feel it will hamper today's training session, select “Not at all”.",
    },
  },
  {
    id: "gut",
    question: "Did I wake up with water retention, bloating, diarrhea, or constipation?",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
    note: {
      title:
        "Water retention occurs when excess fluids build up inside the body. A few of the ways this may show up:",
      points: [
        "Unexplained weight fluctuations in a short period of time",
        "Your ring doesn’t fit anymore, or your stomach feels swollen",
        "When pressed, your skin may hold an indent for a few seconds",
        "Swollen or stiff joints",
        "Constipation: do I feel complete after my bowel movement? Are my stools infrequent, hard, dry, or difficult to pass?",
      ],
    },
  },
  {
    id: "stress",
    question: "My overall stress level today is?",
    options: [
      { value: "low", label: "Low" },
      { value: "moderate", label: "Moderate — I’m experiencing some stress, but managing well" },
      { value: "high", label: "High — I’m feeling overwhelmed" },
    ],
    note: {
      body: "Stress isn’t always a bad thing, however, when it occurs at a level that we cannot manage effectively, over time it can become a problem. Ask yourself honestly: “what areas of my life (both personally and professionally) are feeling most stressed right now, and to what degree are they affecting me?”",
    },
  },
  {
    id: "motivation",
    question: "My willingness and motivation level for training today is?",
    options: [
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
    ],
    note: {
      body: "Do you feel excited to get after it today? Are you itching to move your body and get under those bells? If not, that’s ok, we all have those days — however, consider exploring why. Explore the question: “what things are draining my zest for life and motivation to train today?”",
    },
  },
];

export type ReadinessBand = {
  id: "green" | "amber" | "red";
  title: string;
  summary: string;
  advice: string[];
};

export type AverageDayClip = { title: string; vimeoId?: string };

export type AverageDaySection = {
  id: string;
  title: string;
  eyebrow: string;
  blurb: string;
  vimeoId?: string;
  notes?: string;
  recommendation?: string[];
  clips?: AverageDayClip[];
};

// Self Guided uses an alternate authored Workout III video. Resolve its
// assessment by course context rather than requiring the Immersion video ID.
export const AVERAGE_DAY_ID = "l1-phase-2-d25";

export const averageDaySections: AverageDaySection[] = [
  {
    id: "morning-routine",
    eyebrow: "01 · Wake up",
    title: "Morning Routine",
    blurb:
      "A short mobility and breathing sequence that switches your body on before the day starts.",
    vimeoId: "414027277/7f32157700",
    clips: [{ title: "Morning Routine II Tutorial", vimeoId: "412067411/53f226abc3" }],
  },
  {
    id: "bodyweight-warm-up",
    eyebrow: "02 · Prepare",
    title: "Bodyweight Warm Up",
    blurb: "Raise your temperature and open the joints you’re about to load.",
    vimeoId: "399568242/00289ee927",
    notes:
      "For this warm up you may follow along, or go at your own pace and perform as many repetitions in each movement based on your body’s needs today.",
  },
  {
    id: "kettlebell-preparation",
    eyebrow: "03 · Skill",
    title: "Kettlebell Preparation",
    blurb: "Bell in hand: rehearse the patterns that show up in today’s workout.",
    vimeoId: "414051145/0b9d8837cc",
    clips: [
      { title: "Staggered Stance Deadlift", vimeoId: "395104956/a85306ca33" },
      { title: "Alternating Halo - Modified Squat", vimeoId: "395325844/14f3473b02" },
      { title: "Offset Push Ups", vimeoId: "399542693/92af68cd18" },
      { title: "Static Alt. Side Lunge with Counter Rotation", vimeoId: "394846523/f790a05c3f" },
      { title: "Lunge Stance Row (supported)", vimeoId: "395332977/4bac721167" },
      { title: "Modified Butterflies", vimeoId: "399568713/d498aa092a" },
    ],
  },
  {
    id: "workout",
    eyebrow: "04 · Work",
    title: "Workout III",
    blurb: "The follow-along session. Match the effort to your readiness score.",
    vimeoId: "414042445/b2e2ae8ace",
  },
  {
    id: "post-training-stretching",
    eyebrow: "05 · Recover",
    title: "Post Training Stretching",
    blurb: "Close the day out: down-regulate and give back the range you just used.",
    notes:
      "Today it is suggested to perform these stretches following your training (you can always do more, and/or substitute with your personalised stretching program).",
    recommendation: ["Hip Flexor Stretch", "Bicep Stretch"],
    clips: [
      { title: "Hip Flexor Stretch", vimeoId: "398411366/2655a9e472" },
      { title: "Chest Stretch", vimeoId: "398409165/91a1ebfd6d" },
      { title: "Bicep Stretch", vimeoId: "398407376/b27ced03e8" },
      { title: "Quad Stretch", vimeoId: "398412224/2fb94b6a63" },
      { title: "Calf & Soleus Stretches", vimeoId: "398408872/491a44b21d" },
      { title: "Hamstring Stretch", vimeoId: "398411044/39e7cd38ff" },
      { title: "90/90 Hip Stretches", vimeoId: "399522521/022ad2e95b" },
      { title: "Lat Stretch", vimeoId: "399504807/da03aa0b75" },
    ],
  },
];
