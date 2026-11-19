/**
 * Kettlebell Lifestyle program content.
 *
 * Hierarchy mirrors the real program:
 *   Course (Level I Beginner / Level II Intermediate)
 *     └─ Phase (On Ramp, Phase 1, Phase 2, Phase 3)
 *         └─ Day
 *             └─ Lesson (Vimeo video)
 *
 * Imported lesson IDs are stable so saved student progress survives updates.
 * `vimeoId` is the numeric Vimeo video id (e.g. "76979871").
 */

import beginnerImage from "@/assets/beginner.png.asset.json";
import intermediateImage from "@/assets/intermediate.png.asset.json";
import { isChromeSection, sourceForDay, vimeoIdFromUrl, type SourcePost } from "./lesson-source";
import immersionSource from "./immersion-source.json";
import { overrideDayTitle } from "./editorial-overrides";
import curriculumSupplement from "./curriculum-supplement.json";
import lessonCorrections from "./lesson-corrections.json";

export type LessonVideo = { title: string; vimeoId: string };

export type Lesson = {
  id: string;
  title: string;
  description: string;
  vimeoId: string;
  kind: "mobility" | "warmup" | "skill" | "workout" | "recovery" | "lifestyle";
  duration: string;
  /** Long-form notes carried over from the original lesson page. */
  notes?: string;
  /** Marker for a shift table or Gravity Form embedded in the original lesson. */
  tableOrFormId?: string | null;
  /** Extra tutorial / demo videos shown alongside the main one. */
  /** Extra tutorial / demo videos shown alongside the main one. */
  associatedVideos?: LessonVideo[];
  /**
   * Interactive step rather than a plain video:
   *  - "readiness": the Training Readiness Assessment form
   *  - "workout":   carries the workout table built from that assessment
   */
  special?: "readiness" | "workout" | "completion";
  /** Static source workout table id (shown when the day has no readiness assessment). */
  tableId?: string;
  images?: { url: string; alt: string }[];
  links?: { label: string; url: string }[];
};

export type DayType =
  | "On Ramp"
  | "Workout I Day"
  | "Workout II Day"
  | "Workout III Day"
  | "Recovery Day"
  | "Skill Development Day"
  | "Preparation Day"
  | "Challenge Day"
  | "Overview";

export type Day = {
  id: string;
  number: number;
  /** Additional authored pages keep all existing training day IDs and numbers stable. */
  pageType?: "overview" | "transition";
  title: string;
  type: DayType;
  focus: string;
  intro: string;
  /** Source "Let's Begin" content, represented in the day introduction (not a step). */
  letsBegin?: { sourceLessonId: string; html: string; image: string | null };
  lessons: Lesson[];
};

export type Phase = {
  id: string;
  name: string;
  label: string;
  weeks: string;
  blurb: string;
  introVimeoId: string;
  planLabel: string;
  overview: string;
  whatsNext?: string;
  days: Day[];
};

export type Contributor = { name: string; credential?: string };

export type Course = {
  id: string;
  slug: string;
  level: string;
  title: string;
  tagline: string;
  heroVimeoId: string;
  image: string;
  description: string;
  outcomes: string[];
  format: string[];
  whatsNeeded: string[];
  contributors: Contributor[];
  phases: Phase[];
};

const V = "76979871";

const LESSON_TEMPLATE: Array<{
  slug: string;
  title: string;
  kind: Lesson["kind"];
  duration: string;
  description: string;
}> = [
  {
    slug: "morning",
    title: "Morning Routine",
    kind: "mobility",
    duration: "8 min",
    description: "Wake the joints up before anything gets loaded. Do this one first, every time.",
  },
  {
    slug: "warmup",
    title: "Bodyweight Warm-Up",
    kind: "warmup",
    duration: "10 min",
    description: "Bodyweight prep that takes you from cold to ready without burning the session.",
  },
  {
    slug: "skill",
    title: "Skill Session",
    kind: "skill",
    duration: "14 min",
    description:
      "The technical focus of the day, coached rep by rep with the common faults called out.",
  },
  {
    slug: "workout",
    title: "Follow-Along Workout",
    kind: "workout",
    duration: "26 min",
    description: "Train alongside the video. Timers, cues and scaling options are built in.",
  },
  {
    slug: "stretch",
    title: "Cooldown & Stretch",
    kind: "recovery",
    duration: "9 min",
    description:
      "Personalised stretch block to bring the nervous system back down and keep the range you earned.",
  },
];

const FOCUS: Record<string, string> = {
  "On Ramp": "Positions before load — movement prep, breathing and lifestyle habits.",
  "Workout I Day": "Follow-along strength and ballistic work — the primary session of the block.",
  "Workout II Day": "Second workout of the block — different pattern emphasis, same standards.",
  "Workout III Day": "Third session of the block — density and capacity focus.",
  "Recovery Day":
    "Low-intensity restoration: mobility, breathing and your personalised stretch plan.",
  "Skill Development Day": "Dedicated technique practice with the common faults called out.",
  "Preparation Day": "Set up for the next phase — testing, bell selection and plan review.",
  "Challenge Day": "The benchmark session that closes the level out.",
};

const LESSONS_BY_TYPE: Record<string, string[]> = {
  "On Ramp": ["morning", "warmup", "skill", "workout", "stretch"],
  "Workout I Day": ["morning", "warmup", "skill", "workout", "stretch"],
  "Workout II Day": ["morning", "warmup", "skill", "workout", "stretch"],
  "Workout III Day": ["morning", "warmup", "skill", "workout", "stretch"],
  "Recovery Day": ["morning", "warmup", "stretch"],
  "Skill Development Day": ["morning", "warmup", "skill", "stretch"],
  "Preparation Day": ["morning", "skill", "stretch"],
  "Challenge Day": ["morning", "warmup", "workout", "stretch"],
};

type DaySpec = [title: string, type: DayType];

/** Best-fit kind + duration for a real sublesson title from the export. */
function classify(title: string): { kind: Lesson["kind"]; duration: string } {
  const t = title.toLowerCase();
  if (t.includes("morning")) return { kind: "mobility", duration: "8 min" };
  if (t.includes("warm")) return { kind: "warmup", duration: "10 min" };
  if (t.includes("stretch")) return { kind: "recovery", duration: "9 min" };
  if (t.includes("working in") || t.includes("readiness") || t.includes("preparation"))
    return { kind: "lifestyle", duration: "6 min" };
  if (t.includes("skill") || t.includes("tutorial")) return { kind: "skill", duration: "14 min" };
  if (t.includes("workout") || t.includes("challenge"))
    return { kind: "workout", duration: "26 min" };
  return { kind: "lifestyle", duration: "7 min" };
}

function firstSentence(text: string) {
  const clean = text
    .replace(/^NOTES:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  const cut = clean.slice(0, 180);
  return clean.length > 180 ? `${cut.replace(/\s\S*$/, "")}…` : cut;
}

/** Turn a parsed WordPress lesson post into the app's lesson list. */
function lessonsFromSource(id: string, post: SourcePost, fallbackKind: DayType): Lesson[] {
  const sections = post.sublessons.filter((s) => !isChromeSection(s));
  const lessons = sections.map((s, i) => {
    const { kind, duration } = classify(s.sublesson_title);
    const main = vimeoIdFromUrl(s.main_vimeo_url);
    const associated = s.associated_videos
      .map((v) => ({ title: v.video_title, vimeoId: vimeoIdFromUrl(v.vimeo_url) ?? "" }))
      .filter((v) => v.vimeoId);
    return {
      id: `${id}-s${s.sublesson_index || i + 1}`,
      title: s.sublesson_title,
      description: firstSentence(s.content_text) || FOCUS[fallbackKind] || "",
      vimeoId: main ?? associated[0]?.vimeoId ?? V,
      kind,
      duration,
      notes: s.content_text || undefined,
      tableOrFormId: s.table_or_form_id,
      associatedVideos: associated.length ? associated : undefined,
    } satisfies Lesson;
  });
  return lessons;
}

/** Workout days open with the Training Readiness Assessment. */
const WORKOUT_DAY_TYPES: DayType[] = [
  "Workout I Day",
  "Workout II Day",
  "Workout III Day",
  "Challenge Day",
];

export function isWorkoutDay(type: DayType) {
  return WORKOUT_DAY_TYPES.includes(type);
}

/**
 * Flag the readiness step on workout days and the workout lesson that shows
 * the resulting table. Most days already ship a "Training Readiness
 * Assessment" sub-lesson in the source content — that one is flagged in place
 * so it is never duplicated. Only days missing it get a synthetic one.
 */
function withReadiness(dayId: string, type: DayType, lessons: Lesson[]): Lesson[] {
  if (!isWorkoutDay(type)) return lessons;
  const isReadinessTitle = (title: string) => /readiness/i.test(title);
  let seenReadiness = false;
  const flagged = lessons.map((l) => {
    if (l.special === "readiness") {
      seenReadiness = true;
      return l;
    }
    if (!l.special && isReadinessTitle(l.title) && !seenReadiness) {
      seenReadiness = true;
      return { ...l, special: "readiness" } as Lesson;
    }
    return l.special
      ? l
      : l.kind === "workout" || /workout|challenge/i.test(l.title)
        ? ({ ...l, special: "workout" } as Lesson)
        : l;
  });
  // Drop any duplicate readiness sub-lessons the source content repeats.
  const deduped = flagged.filter((l) => l.special === "readiness" || !isReadinessTitle(l.title));
  if (seenReadiness) return deduped;
  const assessment: Lesson = {
    id: `${dayId}-readiness`,
    title: "Training Readiness Assessment",
    description:
      "Five honest questions about how you woke up today. Your answers set the workout table for this session.",
    vimeoId: "",
    kind: "lifestyle",
    duration: "3 min",
    special: "readiness",
  };
  return [assessment, ...deduped];
}

type ImportedLesson = {
  id: string;
  title: string;
  kind: Lesson["kind"];
  special?: "readiness" | "workout" | "completion";
  tableId?: string;
  vimeoId?: string;
  notes?: string;
  associatedVideos?: LessonVideo[];
};
type ImportedDay = {
  title: string;
  type: DayType;
  lessons: ImportedLesson[];
  letsBegin?: { sourceLessonId: string; html: string; image: string | null };
};
type ImportedPhase = { id: string; introVimeoId: string; overview: string; days: ImportedDay[] };
const imported = immersionSource as unknown as Record<string, ImportedPhase[]>;
const sourceVimeoIds = new Map<string, string>();
for (const phases of Object.values(imported)) {
  for (const phase of phases)
    for (const day of phase.days)
      for (const lesson of day.lessons) {
        for (const value of [
          lesson.vimeoId,
          ...(lesson.associatedVideos ?? []).map((clip) => clip.vimeoId),
        ]) {
          if (value?.includes("/")) sourceVimeoIds.set(value.split("/")[0], value);
        }
      }
}
function sourceVimeoId(value: string) {
  return value.includes("/") ? value : (sourceVimeoIds.get(value) ?? value);
}

function importedPhase(courseKey: string, phaseKey: string): ImportedPhase | undefined {
  return imported[courseKey]?.find((p) => p.id === phaseKey);
}

function lessonsFromImport(dayId: string, type: DayType, src: ImportedLesson[]): Lesson[] {
  // The Intermediate Day 3 export includes an empty duplicate Completion.
  // Keep the authored completion and its stable ID; it is one action per day.
  const completion = src.filter((lesson) => lesson.special === "completion");
  const lastCompletion = completion[completion.length - 1];
  return src
    .filter((lesson) => lesson.special !== "completion" || lesson === lastCompletion)
    .map((original) => {
      const correction = (lessonCorrections as Record<string, Partial<ImportedLesson>>)[
        original.id
      ];
      const s = { ...original, ...correction };
      const { duration } = classify(s.title);
      const vimeoId = sourceVimeoId(s.vimeoId || s.associatedVideos?.[0]?.vimeoId || "");
      const notes = /what.s next/i.test(s.title)
        ? "You've completed this Kettlebell Lifestyle level. Revisit any day in Self Guided, use the video library to refine your technique, or return to Immersion for your next training block. Your progress stays in your account."
        : s.notes;
      return {
        id: `${dayId}-${s.id}`,
        title: s.title,
        description: firstSentence(notes ?? "") || FOCUS[type] || "",
        vimeoId,
        kind: s.kind,
        duration:
          s.special === "readiness" ? "3 min" : s.special === "completion" ? "1 min" : duration,
        notes,
        associatedVideos: s.associatedVideos?.length
          ? s.associatedVideos.map((clip) => ({ ...clip, vimeoId: sourceVimeoId(clip.vimeoId) }))
          : undefined,
        special: s.special,
        tableId: s.tableId,
      } satisfies Lesson;
    });
}

function buildDays(
  courseKey: string,
  phaseKey: string,
  specs: DaySpec[],
  startNumber: number,
): Day[] {
  const realDays = importedPhase(courseKey, phaseKey)?.days ?? [];
  const days: Day[] = specs.map(([fallbackTitle, fallbackType], i) => {
    const number = startNumber + i;
    const id = `${courseKey}-${phaseKey}-d${number}`;
    const real = realDays[i];
    const type = real?.type ?? fallbackType;
    const title = overrideDayTitle(id, real?.title ?? fallbackTitle);
    const focus = FOCUS[type] ?? "";
    let base: Lesson[];
    if (real) {
      base = lessonsFromImport(id, type, real.lessons);
    } else {
      const source = sourceForDay(courseKey, number);
      const sourced = source ? lessonsFromSource(id, source, type) : [];
      const slugs = LESSONS_BY_TYPE[type] ?? LESSONS_BY_TYPE["Workout I Day"];
      base = sourced.length
        ? sourced
        : LESSON_TEMPLATE.filter((l) => slugs.includes(l.slug)).map((l) => ({
            id: `${id}-${l.slug}`,
            title: l.title,
            description: l.description,
            vimeoId: V,
            kind: l.kind,
            duration: l.duration,
          }));
    }
    return {
      id,
      number,
      title,
      type,
      focus,
      intro: `${title}. ${focus} Work through the lessons in order — each one unlocks the next piece of the day.`,
      letsBegin: real?.letsBegin,
      // Some source pages placed extra content after Completion. Keep every
      // lesson and its stable ID, with Completion as the final day action.
      lessons: real
        ? [
            ...base.filter((lesson) => lesson.special !== "completion"),
            ...base.filter((lesson) => lesson.special === "completion"),
          ]
        : withReadiness(id, type, base),
    };
  });
  const source = (
    curriculumSupplement as unknown as Record<
      string,
      {
        phaseId: string;
        overview: Day;
        transition: (Day & { afterSourcePostId: string }) | null;
      }[]
    >
  )[courseKey]?.find((p) => p.phaseId === phaseKey);
  if (!source) return days;
  return [
    source.overview,
    ...days.flatMap((day) => {
      const postId = day.lessons[0]?.id.match(/(?:b|int)-(\d+)-/)?.[1];
      return source.transition && source.transition.afterSourcePostId === postId
        ? [day, source.transition]
        : [day];
    }),
  ];
}

const WI: DayType = "Workout I Day";
const WII: DayType = "Workout II Day";
const WIII: DayType = "Workout III Day";
const REC: DayType = "Recovery Day";
const SKILL: DayType = "Skill Development Day";

function numbered(types: DayType[], start: number): DaySpec[] {
  return types.map((t, i) => [`Day ${start + i} – ${t}`, t] as DaySpec);
}

function unnumbered(types: DayType[]): DaySpec[] {
  return types.map((t) => [t, t] as DaySpec);
}

const ON_RAMP: DaySpec[] = Array.from(
  { length: 7 },
  (_, i) => [`Day ${i + 1}`, "On Ramp"] as DaySpec,
);

const P1_TYPES: DayType[] = [WI, REC, WII, REC, WI, REC, REC, WII, REC, WI, REC, WII, WI];
const P2_TYPES: DayType[] = [
  WI,
  REC,
  WII,
  REC,
  WIII,
  SKILL,
  REC,
  WI,
  REC,
  WII,
  REC,
  WIII,
  SKILL,
  REC,
  WI,
  REC,
  WII,
  REC,
  WIII,
  SKILL,
];
const P3_TYPES: DayType[] = [
  WI,
  REC,
  WII,
  REC,
  WI,
  SKILL,
  REC,
  WII,
  REC,
  WI,
  REC,
  WII,
  SKILL,
  REC,
  WI,
  REC,
  WII,
  REC,
  WI,
  REC,
  "Challenge Day",
];

const L2_P1_TYPES: DayType[] = [
  WI,
  REC,
  WII,
  REC,
  WI,
  WII,
  REC,
  WI,
  WII,
  REC,
  WI,
  WII,
  "Preparation Day",
];

const OVERVIEW =
  "Watch the phase overview before you start — it covers the intent, the schedule and how to scale each session.";

function phaseIntro(courseKey: string, phaseKey: string) {
  return importedPhase(courseKey, phaseKey)?.introVimeoId || V;
}

function makePhases(
  courseKey: string,
  opts: { p1: DaySpec[]; p2: DaySpec[]; p3: DaySpec[] },
): Phase[] {
  const onRampCount = ON_RAMP.length;
  return [
    {
      id: `${courseKey}-on-ramp`,
      name: "On Ramp Phase",
      label: "On Ramp",
      weeks: "Week 0",
      blurb:
        "Seven days of movement and lifestyle work that get you ready to load. Positions first, load second.",
      introVimeoId: phaseIntro(courseKey, "on-ramp"),
      planLabel: "Download On Ramp Phase plan",
      overview: OVERVIEW,
      days: buildDays(courseKey, "on-ramp", ON_RAMP, 1),
    },
    {
      id: `${courseKey}-phase-1`,
      name: "Phase 1",
      label: "Phase 1",
      weeks: "Weeks 1–3",
      blurb: "Groove the core lifts with honest volume, alternating workout and recovery days.",
      introVimeoId: phaseIntro(courseKey, "phase-1"),
      planLabel: "Download Phase 1 plan",
      overview: OVERVIEW,
      whatsNext: "What's Next — a look ahead at how Phase 2 raises the density.",
      days: buildDays(courseKey, "phase-1", opts.p1, onRampCount + 1),
    },
    {
      id: `${courseKey}-phase-2`,
      name: "Phase 2",
      label: "Phase 2",
      weeks: "Weeks 4–6",
      blurb: "Three workouts per block plus a dedicated skill development day.",
      introVimeoId: phaseIntro(courseKey, "phase-2"),
      planLabel: "Download Phase 2 plan",
      overview: OVERVIEW,
      whatsNext: "What's Next — how Phase 3 builds toward the Challenge Day.",
      days: buildDays(courseKey, "phase-2", opts.p2, onRampCount + opts.p1.length + 1),
    },
    {
      id: `${courseKey}-phase-3`,
      name: "Phase 3",
      label: "Phase 3",
      weeks: "Weeks 7–9",
      blurb:
        "The final block — heavier work, skill sessions and the Challenge Day that closes the level.",
      introVimeoId: phaseIntro(courseKey, "phase-3"),
      planLabel: "Download Phase 3 plan",
      overview: OVERVIEW,
      days: buildDays(
        courseKey,
        "phase-3",
        opts.p3,
        onRampCount + opts.p1.length + opts.p2.length + 1,
      ),
    },
  ];
}

const CONTRIBUTORS: Contributor[] = [
  { name: "Mark England" },
  { name: "Paul Chek" },
  { name: "Dr. Drew Vercellino" },
  { name: "Dr. Josh Moreali" },
  { name: "Dr. Joey Salgado" },
  { name: "Chris Chamberlin" },
  { name: "Jator Pierre" },
  { name: "Stefanie Obregozo" },
  { name: "Brooks Meadows", credential: "Recess Founder, GMB Fitness Coach" },
  { name: "Danielle Cook Kawash", credential: "MS, RD, NBC-HWC" },
  { name: "Warren Williams", credential: "C.H.E.K Lv. 4 & H.L.C Lv. 3" },
];

export const courses: Course[] = [
  {
    id: "beginner",
    slug: "beginner",
    image: beginnerImage.url,
    level: "Level I",
    title: "Kettlebell Lifestyle Beginner",
    tagline: "Nine weeks to a kettlebell you can trust",
    heroVimeoId: phaseIntro("l1", "on-ramp"),
    description:
      "Kettlebell Lifestyle is a 9-week personalised, multi-level kettlebell and wellness program. Level I teaches the swing variations, squats, presses, cleans and combination movements from the ground up — alongside morning routines, personalised stretching, bodyweight warm-ups and follow-along workouts.",
    outcomes: [
      "Execute beginner-level kettlebell movements safely and efficiently",
      "Spot the common lifting mistakes and fix them on the spot",
      "Follow a balanced, structured program from warm-up to cooldown",
      "Build a morning and mobility habit that survives a busy week",
    ],
    format: [
      "9 weeks across four phases — On Ramp, Phase 1, Phase 2 and Phase 3",
      "61 numbered days: workout, recovery, skill development and a final Challenge Day",
      "Follow-along workouts with on-screen timers and scaling options",
      "Downloadable phase plans so you can train away from the screen",
    ],
    whatsNeeded: [
      "One kettlebell — use the Kettlebell Selector if you're unsure",
      "A mat and roughly 2m x 2m of floor space",
      "A wall or doorway for mobility drills",
      "Around 45 minutes per training day",
    ],
    contributors: CONTRIBUTORS,
    phases: makePhases("l1", {
      p1: numbered(P1_TYPES, 8),
      p2: numbered(P2_TYPES, 21),
      p3: numbered(P3_TYPES, 41),
    }),
  },
  {
    id: "intermediate",
    slug: "intermediate",
    image: intermediateImage.url,
    level: "Level II",
    title: "Kettlebell Lifestyle Intermediate",
    tagline: "Heavier bells, longer chains, real capacity",
    heroVimeoId: phaseIntro("l2", "on-ramp"),
    description:
      "Level II picks up where the Beginner program ends. Denser conditioning, double-bell work, snatch progressions and complexes — with the same morning routine, warm-up and stretching structure holding it all together.",
    outcomes: [
      "Chain movements into complexes without losing position",
      "Progress load and density on purpose instead of by feel",
      "Own the get-up, snatch and double-bell work",
      "Manage fatigue with deliberate deload and restore days",
    ],
    format: [
      "9 weeks across four phases — On Ramp, Phase 1 (plus a Preparation Day), Phase 2 and Phase 3",
      "Heavier strength blocks paired with pacing-based conditioning",
      "Skill sessions dedicated to snatch and complex technique",
      "Deload and restore days built into every phase",
    ],
    whatsNeeded: [
      "Two kettlebells of the same weight where possible",
      "A mat and clear overhead space",
      "Completed Level I or equivalent kettlebell experience",
      "Around 60 minutes per training day",
    ],
    contributors: CONTRIBUTORS,
    phases: makePhases("l2", {
      p1: unnumbered(L2_P1_TYPES),
      p2: unnumbered(P2_TYPES),
      p3: unnumbered(P3_TYPES),
    }),
  },
];

/** Legacy alias — some screens iterate courses as the top-level program. */
export const program = courses;

export type DayLocation = {
  day: Day;
  phase: Phase;
  course: Course;
  index: number;
  indexInCourse: number;
};

export const dayOrder: DayLocation[] = courses
  .flatMap((course) => {
    let indexInCourse = 0;
    return course.phases.flatMap((phase) =>
      phase.days.map((day) => ({ day, phase, course, index: 0, indexInCourse: indexInCourse++ })),
    );
  })
  .map((entry, index) => ({ ...entry, index }));

export const trainingDayOrder = dayOrder.filter(({ day }) => !day.pageType);
export const totalDays = trainingDayOrder.length;
export const totalPages = dayOrder.length;
export const totalLessons = dayOrder.reduce((sum, d) => sum + d.day.lessons.length, 0);

export function courseDays(courseId: string) {
  return dayOrder.filter((d) => d.course.id === courseId);
}

export function dayLabel(day: Pick<Day, "number" | "title" | "pageType"> | null | undefined) {
  if (!day) return "Training session";
  return day.pageType ? day.title : `Day ${day.number}`;
}

export function dayBadge(day: Pick<Day, "number" | "pageType">) {
  return day.pageType === "overview"
    ? "Intro"
    : day.pageType === "transition"
      ? "Next"
      : String(day.number);
}

export function trainingDays(days: Day[]) {
  return days.filter((day) => !day.pageType);
}

export function findCourse(slug: string): Course | undefined {
  return courses.find((c) => c.slug === slug || c.id === slug);
}

export function findDay(dayId: string): DayLocation | undefined {
  return dayOrder.find((d) => d.day.id === dayId);
}

export function findPhase(phaseId: string): Phase | undefined {
  return courses.flatMap((c) => c.phases).find((p) => p.id === phaseId);
}

export function nextDay(dayId: string): DayLocation | undefined {
  const current = findDay(dayId);
  if (!current) return undefined;
  const next = dayOrder[current.index + 1];
  return next?.course.id === current.course.id ? next : undefined;
}

export function previousDay(dayId: string): DayLocation | undefined {
  const current = findDay(dayId);
  if (!current) return undefined;
  const previous = current.index > 0 ? dayOrder[current.index - 1] : undefined;
  return previous?.course.id === current.course.id ? previous : undefined;
}
