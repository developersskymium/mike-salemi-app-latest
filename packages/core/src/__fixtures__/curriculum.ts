import type { Curriculum, LessonWithSteps, Section, Step } from "../types";

/**
 * Small KBL-shaped curriculum builder for tests. Each section spec lists its
 * pages: "o" overview, "t" transition, a number = training day with that many steps.
 */
export function buildCurriculum(pathKey: string, sections: (("o" | "t" | number)[])[], opts: { optionalLast?: boolean } = {}): Curriculum {
  const programId = "kbl";
  const pathId = `path-${pathKey}`;
  const outSections: Section[] = [];
  const lessons: LessonWithSteps[] = [];
  let day = 0;
  sections.forEach((pages, si) => {
    const sectionId = `${pathKey}-s${si + 1}`;
    outSections.push({ id: sectionId, programId, pathId, title: `Phase ${si + 1}`, position: si + 1 });
    pages.forEach((page, li) => {
      const pageType = page === "o" ? "overview" : page === "t" ? "transition" : null;
      const id = pageType ? `${sectionId}-${pageType}` : `${pathKey}-d${++day}`;
      const count = typeof page === "number" ? page : 1;
      const steps: Step[] = Array.from({ length: count }, (_, i) => ({
        id: `${id}-step${i + 1}`,
        lessonId: id,
        title: `Step ${i + 1}`,
        special: "none",
        isRequired: !(opts.optionalLast && count > 1 && i === count - 1),
        position: i + 1,
        clips: [],
      }));
      lessons.push({
        id,
        sectionId,
        programId,
        pathId,
        title: pageType ? (pageType === "overview" ? "Overview" : "Transition") : `Day ${day}`,
        pageType,
        dayNumber: pageType ? null : day,
        position: li + 1,
        steps,
      });
    });
  });
  return {
    program: {
      id: programId,
      slug: "kettlebell-lifestyle",
      name: "Kettlebell Lifestyle",
      type: "day_program",
      isFree: false,
      sectionLabel: "Phase",
      lessonLabel: "Day",
      sequenceLocked: false,
      modes: ["immersion", "self_guided"],
    },
    path: { id: pathId, programId, kind: "level", name: `Level ${pathKey}`, position: 1 },
    sections: outSections,
    lessons,
  };
}

export const stepsOf = (c: Curriculum, ...lessonIds: string[]) =>
  c.lessons.filter((l) => lessonIds.includes(l.id)).flatMap((l) => l.steps.map((s) => s.id));

export const allSteps = (c: Curriculum) => c.lessons.flatMap((l) => l.steps.map((s) => s.id));
