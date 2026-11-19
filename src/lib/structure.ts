/**
 * Program Structure v2.
 *
 * Course → Phase → Day → Lesson, where every lesson declares which content
 * blocks it carries. The payloads for each block get filled in later; for now
 * the flags describe the shape of the lesson so the app knows what to render.
 */

import { courses } from "@/content/program";

export const LESSON_CAPABILITIES = [
  { key: "video", label: "Video", hint: "A primary Vimeo video" },
  { key: "form", label: "Form", hint: "Questions the user answers" },
  { key: "content", label: "Content", hint: "Written copy / instructions" },
  { key: "associatedVideos", label: "Associated videos", hint: "Extra reference clips" },
  { key: "table", label: "Table", hint: "A structured table (e.g. workout table)" },
] as const;

export type CapabilityKey = (typeof LESSON_CAPABILITIES)[number]["key"];

export type StructureLesson = {
  id: string;
  title: string;
  video: boolean;
  form: boolean;
  content: boolean;
  associatedVideos: boolean;
  table: boolean;
  /** Marks the form whose submission unlocks this day's workout table. */
  unlocksTable?: boolean;
  /** Marks the table lesson that stays locked until the form is submitted. */
  lockedUntilForm?: boolean;
  notes?: string;
};

export type StructureDay = {
  id: string;
  title: string;
  dayType: string;
  lessons: StructureLesson[];
};

export type StructurePhase = { id: string; title: string; days: StructureDay[] };
export type StructureCourse = { id: string; title: string; phases: StructurePhase[] };
export type Structure = { version: 2; courses: StructureCourse[] };

export const DAY_TYPES = [
  "Workout day",
  "Recovery day",
  "Skill day",
  "Mobility day",
  "Rest day",
  "Challenge day",
  "Lesson day",
] as const;

export const uid = () => Math.random().toString(36).slice(2, 10);

export function emptyStructure(): Structure {
  return { version: 2, courses: [] };
}

export function newLesson(partial: Partial<StructureLesson> = {}): StructureLesson {
  return {
    id: uid(),
    title: "",
    video: false,
    form: false,
    content: false,
    associatedVideos: false,
    table: false,
    ...partial,
  };
}

export function newDay(partial: Partial<StructureDay> = {}): StructureDay {
  return { id: uid(), title: "", dayType: "Workout day", lessons: [], ...partial };
}

export function isWorkoutDay(dayType: string) {
  return dayType.toLowerCase().startsWith("workout");
}

/**
 * Every workout day carries a form lesson that unlocks a workout-table lesson.
 * This is the program rule, so the builder guarantees both exist.
 */
export function ensureWorkoutPair(day: StructureDay): StructureDay {
  if (!isWorkoutDay(day.dayType)) return day;
  const lessons = [...day.lessons];
  if (!lessons.some((l) => l.unlocksTable)) {
    lessons.push(
      newLesson({ title: "Workout check-in", form: true, content: true, unlocksTable: true }),
    );
  }
  if (!lessons.some((l) => l.lockedUntilForm)) {
    lessons.push(newLesson({ title: "Workout table", table: true, lockedUntilForm: true }));
  }
  return { ...day, lessons };
}

/** Seed the builder from the content already shipping in the app. */
export function structureFromProgram(): Structure {
  return {
    version: 2,
    courses: courses.map((course) => ({
      id: uid(),
      title: `${course.level} — ${course.title}`,
      phases: course.phases.map((phase) => ({
        id: uid(),
        title: phase.name,
        days: phase.days.map((day) =>
          ensureWorkoutPair({
            id: uid(),
            title: day.title,
            dayType: day.type.toLowerCase().includes("workout")
              ? "Workout day"
              : day.type.toLowerCase().includes("recovery")
                ? "Recovery day"
                : day.type.toLowerCase().includes("skill")
                  ? "Skill day"
                  : day.type.toLowerCase().includes("challenge")
                    ? "Challenge day"
                    : "Lesson day",
            lessons: day.lessons.map((lesson) =>
              newLesson({ title: lesson.title, video: true, content: true }),
            ),
          }),
        ),
      })),
    })),
  };
}

export function countStructure(structure: Structure) {
  let phases = 0;
  let days = 0;
  let lessons = 0;
  let forms = 0;
  let tables = 0;
  for (const course of structure.courses) {
    phases += course.phases.length;
    for (const phase of course.phases) {
      days += phase.days.length;
      for (const day of phase.days) {
        lessons += day.lessons.length;
        forms += day.lessons.filter((l) => l.form).length;
        tables += day.lessons.filter((l) => l.table).length;
      }
    }
  }
  return { courses: structure.courses.length, phases, days, lessons, forms, tables };
}

/** Defensive read — older/partial documents still load. */
export function normaliseStructure(input: unknown): Structure {
  const raw = input as Partial<Structure> | null;
  if (!raw || !Array.isArray(raw.courses)) return emptyStructure();
  return {
    version: 2,
    courses: raw.courses.map((course) => ({
      id: course?.id ?? uid(),
      title: course?.title ?? "",
      phases: (course?.phases ?? []).map((phase) => ({
        id: phase?.id ?? uid(),
        title: phase?.title ?? "",
        days: (phase?.days ?? []).map((day) => ({
          id: day?.id ?? uid(),
          title: day?.title ?? "",
          dayType: day?.dayType ?? "Workout day",
          lessons: (day?.lessons ?? []).map((lesson) => newLesson(lesson ?? {})),
        })),
      })),
    })),
  };
}
