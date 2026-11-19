import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStructure } from "@/lib/structure.functions";
import type { Structure, StructureDay, StructureLesson } from "@/lib/structure";
import type { Lesson } from "@/content/program";

/**
 * Bridges the Structure editor to the live training pages.
 *
 * Authored lessons are matched to the static program by index so completion
 * history (which is keyed on the static lesson id) is never invalidated.
 * Titles and capability flags come from the editor; everything else falls back
 * to the shipped content.
 */
export type RuntimeLesson = Lesson & {
  capabilities?: {
    video: boolean;
    form: boolean;
    content: boolean;
    associatedVideos: boolean;
    table: boolean;
    unlocksTable?: boolean;
    lockedUntilForm?: boolean;
  };
};

function indexDays(structure: Structure | null | undefined) {
  const map = new Map<string, StructureDay>();
  for (const course of structure?.courses ?? []) {
    for (const phase of course.phases) {
      for (const day of phase.days) {
        map.set(day.id, day);
        // Also index by title so editor days authored fresh can still match.
        if (day.title) map.set(`title:${day.title.trim().toLowerCase()}`, day);
      }
    }
  }
  return map;
}

function merge(lesson: Lesson, authored: StructureLesson | undefined): RuntimeLesson {
  if (!authored) return lesson;
  return {
    ...lesson,
    title: authored.title?.trim() || lesson.title,
    capabilities: {
      video: authored.video,
      form: authored.form,
      content: authored.content,
      associatedVideos: authored.associatedVideos,
      table: authored.table,
      unlocksTable: authored.unlocksTable,
      lockedUntilForm: authored.lockedUntilForm,
    },
  };
}

export function useStructureOverlay(enabled = true) {
  const fetchStructure = useServerFn(getStructure);
  const { data } = useQuery({
    queryKey: ["program-structure"],
    queryFn: () => fetchStructure(),
    enabled,
    staleTime: 5 * 60_000,
  });

  const structure = (data?.data ?? null) as Structure | null;
  const days = indexDays(structure);

  /** Returns the lessons to render for a day, with authored overrides applied. */
  function lessonsFor(day: { id: string; title: string; lessons: Lesson[] }): RuntimeLesson[] {
    const authored =
      days.get(day.id) ?? days.get(`title:${day.title.trim().toLowerCase()}`) ?? undefined;
    if (!authored?.lessons?.length) return day.lessons;
    return day.lessons.map((lesson, i) => merge(lesson, authored.lessons[i]));
  }

  return { structure, lessonsFor, hasStructure: Boolean(structure?.courses?.length) };
}
