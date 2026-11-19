/**
 * Links library videos back to where they appear in the curriculum.
 *
 * Library entries declare `usedIn` day ids; this resolves them into readable
 * context ("Level I · On Ramp · Day 3") plus route params so a video can be
 * opened in its training context.
 */

import { dayLabel, findDay } from "@/content/program";
import type { LibraryVideo } from "@/content/library";

export type CurriculumRef = {
  dayId: string;
  courseSlug: string;
  courseLevel: string;
  phaseLabel: string;
  dayNumber: number;
  dayTitle: string;
  label: string;
};

export function curriculumRefs(video: Pick<LibraryVideo, "usedIn">): CurriculumRef[] {
  return (video.usedIn ?? [])
    .map((dayId) => {
      const location = findDay(dayId);
      if (!location) return null;
      return {
        dayId,
        courseSlug: location.course.slug,
        courseLevel: location.course.level,
        phaseLabel: location.phase.label,
        dayNumber: location.day.number,
        dayTitle: location.day.title,
        label: `${location.course.level} · ${location.phase.label} · ${dayLabel(location.day)}`,
      } satisfies CurriculumRef;
    })
    .filter((v): v is CurriculumRef => v !== null);
}

export function isInProgram(video: Pick<LibraryVideo, "usedIn">): boolean {
  return curriculumRefs(video).length > 0;
}
