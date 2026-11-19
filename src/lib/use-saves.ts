import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getToolResults } from "@/lib/progress.functions";
import { getWorkoutTables, type WorkoutTableRow } from "@/lib/achievements.functions";
import { getSavedVideos, listLibraryVideos, type SavedVideoRow } from "@/lib/library.functions";
import { tools } from "@/content/tools";
import { dayLabel, findDay } from "@/content/program";
import { libraryVideos, type LibraryVideo } from "@/content/library";

export type ToolResultRow = {
  id: string;
  tool_id: string;
  answers: Record<string, string>;
  result: { score?: number; title?: string; detail?: Record<string, unknown> } | null;
  created_at: string;
};

export type SaveDetail =
  | { kind: "tool"; row: ToolResultRow }
  | { kind: "workout"; row: WorkoutTableRow }
  | { kind: "video"; row: SavedVideoRow; video: LibraryVideo | undefined };

export type SaveItem = {
  id: string;
  kind: "tool" | "workout" | "video";
  /** tool id, course id for workouts, or "video" — used by the type filter */
  sourceId: string;
  title: string;
  subtitle: string;
  createdAt: string;
  href: { to: string; params?: Record<string, string> } | null;
  meta: string[];
  detail: SaveDetail;
};

export function useSaves(enabled = true) {
  const fetchTools = useServerFn(getToolResults);
  const fetchWorkouts = useServerFn(getWorkoutTables);
  const fetchVideos = useServerFn(getSavedVideos);
  const fetchLibrary = useServerFn(listLibraryVideos);

  const libraryQuery = useQuery({
    queryKey: ["library-videos"],
    queryFn: () => fetchLibrary() as Promise<LibraryVideo[]>,
    enabled,
    staleTime: 5 * 60_000,
  });

  const toolQuery = useQuery({
    queryKey: ["tool-results"],
    queryFn: () => fetchTools() as Promise<ToolResultRow[]>,
    enabled,
    staleTime: 30_000,
  });

  const workoutQuery = useQuery({
    queryKey: ["workout-tables"],
    queryFn: () => fetchWorkouts() as Promise<WorkoutTableRow[]>,
    enabled,
    staleTime: 30_000,
  });

  const videoQuery = useQuery({
    queryKey: ["saved-videos"],
    queryFn: () => fetchVideos() as Promise<SavedVideoRow[]>,
    enabled,
    staleTime: 30_000,
  });

  const items = useMemo<SaveItem[]>(() => {
    const toolItems: SaveItem[] = (toolQuery.data ?? [])
      .filter((row) => tools.some((tool) => tool.id === row.tool_id))
      .map((row) => {
        const tool = tools.find((t) => t.id === row.tool_id);
        const bells = (row.result?.detail?.bells as string[] | undefined) ?? [];
        return {
          id: `tool-${row.id}`,
          kind: "tool",
          sourceId: row.tool_id,
          title: tool?.title ?? row.tool_id,
          subtitle: row.result?.title ?? tool?.tagline ?? "Saved result",
          createdAt: row.created_at,
          href: tool ? { to: "/tools/$toolSlug", params: { toolSlug: tool.slug } } : null,
          meta: bells.length
            ? bells.slice(0, 3)
            : [`${Object.keys(row.answers ?? {}).length} answers`],
          detail: { kind: "tool", row },
        };
      });

    const workoutItems: SaveItem[] = (workoutQuery.data ?? []).map((row) => {
      const location = findDay(row.day_id);
      const blocks = (row.table_data?.blocks as unknown[] | undefined)?.length ?? 0;
      return {
        id: `workout-${row.id}`,
        kind: "workout",
        sourceId: row.course_id,
        title: location
          ? location.day.title.toLowerCase().startsWith(dayLabel(location.day).toLowerCase())
            ? location.day.title
            : `${dayLabel(location.day)} — ${location.day.title}`
          : "Workout plan",
        subtitle: location
          ? `${location.course.title} · ${location.phase.name}`
          : "Saved workout table",
        createdAt: row.created_at,
        href: { to: "/immersion/day/$dayId", params: { dayId: row.day_id } },
        meta: [blocks ? `${blocks} blocks` : "Session plan"],
        detail: { kind: "workout", row },
      };
    });

    const catalog = libraryQuery.data ?? libraryVideos;
    const videoItems: SaveItem[] = (videoQuery.data ?? [])
      .filter((row) => catalog.some((video) => video.id === row.video_id))
      .map((row) => {
        const video = catalog.find((v) => v.id === row.video_id);
        return {
          id: `video-${row.id}`,
          kind: "video",
          sourceId: "video",
          title: video?.title ?? row.title ?? "Saved video",
          subtitle: video?.categories.length ? video.categories.join(" · ") : "Library video",
          createdAt: row.created_at,
          href: { to: "/library" },
          meta: video?.levels.slice(0, 2) ?? ["Library"],
          detail: { kind: "video", row, video },
        };
      });

    return [...toolItems, ...workoutItems, ...videoItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [toolQuery.data, workoutQuery.data, videoQuery.data, libraryQuery.data]);

  return {
    items,
    isLoading:
      toolQuery.isLoading ||
      workoutQuery.isLoading ||
      videoQuery.isLoading ||
      libraryQuery.isLoading,
    isError:
      toolQuery.isError || workoutQuery.isError || videoQuery.isError || libraryQuery.isError,
  };
}

export function formatSaveDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
