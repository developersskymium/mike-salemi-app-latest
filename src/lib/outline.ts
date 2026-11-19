import { courses } from "@/content/program";

export type OutlineSubLesson = { id: string; title: string };

export type OutlineDay = {
  id: string;
  title: string;
  dayType: string;
  lessons: OutlineSubLesson[];
};

export type OutlinePhase = {
  id: string;
  title: string;
  days: OutlineDay[];
};

export type OutlineCourse = {
  id: string;
  title: string;
  phases: OutlinePhase[];
};

export type Outline = {
  version: 1;
  courses: OutlineCourse[];
};

export const DAY_TYPES = [
  "Workout day",
  "Recovery day",
  "Skill day",
  "Mobility day",
  "Rest day",
  "Lesson day",
] as const;

export const uid = () => Math.random().toString(36).slice(2, 10);

export function emptyOutline(): Outline {
  return { version: 1, courses: [] };
}

/** Seed the builder from the placeholder content already in the app. */
export function outlineFromProgram(): Outline {
  return {
    version: 1,
    courses: courses.map((course) => ({
      id: uid(),
      title: `${course.level} — ${course.title}`,
      phases: course.phases.map((phase) => ({
        id: uid(),
        title: phase.name,
        days: phase.days.map((day) => ({
          id: uid(),
          title: day.title,
          dayType: "Workout day",
          lessons: day.lessons.map((lesson) => ({ id: uid(), title: lesson.title })),
        })),
      })),
    })),
  };
}

export function countOutline(outline: Outline) {
  const phases = outline.courses.reduce((n, c) => n + c.phases.length, 0);
  const days = outline.courses.reduce(
    (n, c) => n + c.phases.reduce((m, p) => m + p.days.length, 0),
    0,
  );
  const lessons = outline.courses.reduce(
    (n, c) => n + c.phases.reduce((m, p) => m + p.days.reduce((k, d) => k + d.lessons.length, 0), 0),
    0,
  );
  return { courses: outline.courses.length, phases, days, lessons };
}

/**
 * Parse an indented outline:
 *   Course title
 *     Phase title
 *       Day title | Workout day
 *         Lesson title
 * Indentation is by two spaces or a tab. Blank lines are ignored.
 */
export function parseOutlineText(text: string): Outline {
  const out: Outline = { version: 1, courses: [] };
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    const expanded = raw.replace(/\t/g, "  ");
    const indent = expanded.length - expanded.trimStart().length;
    const depth = Math.min(3, Math.floor(indent / 2));
    const line = expanded.trim().replace(/^[-*•]\s*/, "");
    const [title, meta] = line.split("|").map((s) => s.trim());

    if (depth === 0) {
      out.courses.push({ id: uid(), title, phases: [] });
      continue;
    }
    const course = out.courses.at(-1);
    if (!course) continue;
    if (depth === 1) {
      course.phases.push({ id: uid(), title, days: [] });
      continue;
    }
    const phase = course.phases.at(-1);
    if (!phase) continue;
    if (depth === 2) {
      phase.days.push({ id: uid(), title, dayType: meta || "Workout day", lessons: [] });
      continue;
    }
    const day = phase.days.at(-1);
    if (!day) continue;
    day.lessons.push({ id: uid(), title });
  }
  return out;
}

export function outlineToText(outline: Outline): string {
  const lines: string[] = [];
  for (const course of outline.courses) {
    lines.push(course.title);
    for (const phase of course.phases) {
      lines.push(`  ${phase.title}`);
      for (const day of phase.days) {
        lines.push(`    ${day.title}${day.dayType ? ` | ${day.dayType}` : ""}`);
        for (const lesson of day.lessons) lines.push(`      ${lesson.title}`);
      }
    }
  }
  return lines.join("\n");
}
