import type { SeqStep } from "./Sequence";

/** The set-up checklist, one line per step in Mike's order (cues from the source plan). */
export const CHECKLIST: { step: string; cue: string }[] = [
  { step: "Feet", cue: "Root through the floor" },
  { step: "Hips", cue: "Back, then down" },
  { step: "Back", cue: "Long from crown to tailbone" },
  { step: "Shoulders", cue: "Shoulders down away from the ears" },
  { step: "Head", cue: "Neutral, or slightly up so the eyes hold the horizon" },
  { step: "Grip", cue: "Relaxed yet secure" },
  { step: "Breath", cue: "belly breath in, draw the navel in, hold" },
];

/** With neck history the head line stays neutral. */
export const checklistFor = (neck: boolean) =>
  CHECKLIST.map((c) => (c.step === "Head" && neck ? { ...c, cue: "keep it neutral if you have neck problems" } : c));

/** The ebook's Approach: stand behind the bell, 3 belly breaths, picture the rep, step in, run the checklist. */
export function approachSteps(neck: boolean, compact = false): SeqStep[] {
  const breaths: SeqStep[] = [1, 2, 3].flatMap((n) => [
    { group: `Belly breath ${n} of 3`, title: "Breathe in", detail: "Into the belly, not the chest.", seconds: 4, breath: "in" as const, say: n === 1 ? "Three belly breaths. Breathe in." : "In." },
    { group: `Belly breath ${n} of 3`, title: "Breathe out", seconds: 4, breath: "out" as const, say: "Out." },
  ]);
  return [
    { title: "Stand 2–3 ft behind the bell", detail: "Feet under you, the bell on the floor in front.", say: "Stand two to three feet behind the bell.", seconds: compact ? 4 : undefined },
    ...breaths,
    { title: "Picture the rep", detail: "See the first swing before you take it: the hike, the snap, the float.", seconds: compact ? 5 : 8 },
    { title: "Step up: right foot, then left", detail: "The bell ends up about a foot in front of your toes.", say: "Step up. Right foot, then left.", seconds: compact ? 4 : undefined },
    ...checklistFor(neck).map((c, k) => ({ group: `Checklist · ${k + 1} of 7 · ${c.step}`, title: c.cue.charAt(0).toUpperCase() + c.cue.slice(1), seconds: 3, say: c.cue })),
  ];
}

/** The staggered-stance tripod drill from Step 1. Exhale on the press, inhale on the release. */
export function feetSteps(reps: number): SeqStep[] {
  const one = (group: string, both = false): SeqStep[] => [
    { group, title: "Lift and spread the toes", detail: both ? "Both feet." : "Heel down, toes up and wide.", seconds: 3 },
    { group, title: "Set them down", detail: "Big toe, little toe, heel: the tripod.", seconds: 2 },
    { group, title: "Press 10–20% through the tips", detail: "Toes stay flat and relaxed, not crinkled. Exhale as you press.", seconds: 5, breath: "out", say: "Press, ten to twenty percent. Exhale." },
    { group, title: "Relax", detail: "Inhale as you let go.", seconds: 3, breath: "in", say: "Relax. Inhale." },
  ];
  const set = (name: string, both = false) => Array.from({ length: reps }, (_, r) => one(`${name} · ${r + 1} of ${reps}`, both)).flat();
  return [
    { title: "Staggered stance", detail: "One foot a half step forward. Work the front foot first.", say: "Staggered stance. Front foot first." },
    ...set("Front foot"),
    { title: "Switch feet", detail: "Bring the other foot forward.", seconds: 4 },
    ...set("Other foot"),
    { title: "Both feet together", detail: "Feet about shoulder width, as for your set-up.", seconds: 4 },
    ...set("Both feet", true),
  ];
}
