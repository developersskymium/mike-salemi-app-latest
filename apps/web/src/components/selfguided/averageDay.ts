/**
 * "An Average Day" authored copy, ported from the legacy Self-Guided page
 * (src/content/average-day.ts). Blocks map onto the real Level I · Phase II · Workout III day
 * (lesson l1-phase-2-d25) by step kind; the authored clips and stretching recommendation are
 * added where the day itself has none. Readiness questions come from the real form.
 */
export interface AvgBlock {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  /** Which real step this block plays (by step title, case-insensitive prefix). */
  step: RegExp;
  notes?: string;
  recommendation?: string[];
  /** Vimeo provider ids of the authored "Associated videos" (resolved from the videos table). */
  clips?: string[];
}

export const AVERAGE_BLOCKS: AvgBlock[] = [
  {
    id: "morning-routine", eyebrow: "01 · Wake up", title: "Morning Routine", step: /^morning/i,
    blurb: "A short mobility and breathing sequence that switches your body on before the day starts.",
    clips: ["412067411"],
  },
  {
    id: "bodyweight-warm-up", eyebrow: "02 · Prepare", title: "Bodyweight Warm Up", step: /^bodyweight/i,
    blurb: "Raise your temperature and open the joints you're about to load.",
    notes: "For this warm up you may follow along, or go at your own pace and perform as many repetitions in each movement based on your body's needs today.",
  },
  {
    id: "kettlebell-preparation", eyebrow: "03 · Skill", title: "Kettlebell Preparation", step: /^kettlebell prep/i,
    blurb: "Bell in hand: rehearse the patterns that show up in today's workout.",
  },
  {
    id: "workout", eyebrow: "04 · Work", title: "Workout III", step: /^workout/i,
    blurb: "The follow-along session. Match the effort to your readiness score.",
  },
  {
    id: "post-training-stretching", eyebrow: "05 · Recover", title: "Post Training Stretching", step: /stretch/i,
    blurb: "Close the day out: down-regulate and give back the range you just used.",
    notes: "Today it is suggested to perform these stretches following your training (you can always do more, and/or substitute with your personalised stretching program).",
    recommendation: ["Hip Flexor Stretch", "Bicep Stretch"],
    clips: ["398411366", "398409165", "398407376", "398412224", "398408872", "398411044", "399522521", "399504807"],
  },
];

export const AVERAGE_VIDEO_IDS = [...new Set(AVERAGE_BLOCKS.flatMap((b) => b.clips ?? []))];

/** Band advice shown with the result (legacy readiness-table copy). */
export const BAND_COPY: Record<"green" | "amber" | "red", { pill: string; advice: string[] }> = {
  green: { pill: "Green light", advice: ["Train the full table as written", "Keep rest periods honest", "Finish with your stretches", "Log how it felt"] },
  amber: { pill: "Scale it back", advice: ["Use the modified table", "Lighter bell or fewer rounds", "Stretch and breathe longer", "Sleep and hydrate tonight"] },
  red: { pill: "Recover today", advice: ["Swap the workout for recovery", "Gentle mobility and working-in", "Walk outside if you can", "Reassess tomorrow morning"] },
};
