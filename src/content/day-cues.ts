/**
 * Small, static cue content for the Immersion "today" panel: a breathing cue,
 * a mobility tip and a mindset note, plus the pre/post session prompts.
 * Keyed loosely to the phase so the cards change as the program progresses.
 */

export type DayCue = { breath: string; mobility: string; mindset: string };

const CUES: DayCue[] = [
  {
    breath: "Nasal only for the first five minutes. If you have to open your mouth, the pace is too high.",
    mobility: "Two minutes in a deep squat before you touch a bell. Heels down, chest tall.",
    mindset: "Today is about showing up, not scoring. Finish the lessons in order.",
  },
  {
    breath: "Exhale sharply at the top of every hinge. The breath is the brace.",
    mobility: "90/90 hip switches, ten each side. Slow, no hands if you can.",
    mindset: "Technique before load. The bell will feel lighter next week.",
  },
  {
    breath: "Box breathe between sets — four in, four hold, four out. Recover on purpose.",
    mobility: "Thoracic rotations against a wall, eight each way, before overhead work.",
    mindset: "Consistency compounds. One honest session beats three rushed ones.",
  },
  {
    breath: "Breathe behind the shield during carries. Ribs down, pressure in.",
    mobility: "Ankle rocks and a wall slide to open the shoulders before you press.",
    mindset: "Fatigue is not the goal. Quality reps are the goal.",
  },
];

/** Deterministic per day so the cards are stable within a session. */
export function cuesForDay(phaseIndex: number, dayNumber: number): DayCue {
  return CUES[(phaseIndex + dayNumber) % CUES.length];
}

export const preSessionChecklist = [
  { id: "bell", label: "Bell within reach" },
  { id: "space", label: "Space cleared around you" },
  { id: "water", label: "Water and a towel nearby" },
];

export const postSessionPrompt =
  "Log the day, note how the bell felt, then step away. Recovery is part of the program.";

/** Rough estimate used for the resume CTA when video durations are unknown. */
export function estimateMinutes(lessonCount: number) {
  return Math.max(8, Math.round(lessonCount * 6));
}
