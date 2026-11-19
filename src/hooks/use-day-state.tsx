import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDayStates, saveDayState } from "@/lib/day-state.functions";
import { findDay, type DayLocation } from "@/content/program";

export type DayStateRow = {
  day_id: string;
  course_id: string;
  active_lesson_id: string | null;
  draft_answers: Record<string, string> | null;
  updated_at: string;
};

/**
 * Autosave for a training day: the step you're on and any in-progress
 * assessment answers live on the server, so a refresh or a different device
 * picks the day up exactly where it was left. Writes are debounced and
 * deduplicated so scrubbing through steps doesn't hammer the backend.
 */
export function useDayState(courseId: string, dayId: string, enabled = true) {
  const fetchStates = useServerFn(getDayStates);
  const persist = useServerFn(saveDayState);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["day-state"],
    queryFn: () => fetchStates() as Promise<DayStateRow[]>,
    enabled,
    staleTime: 30_000,
  });

  const row = useMemo(
    () => (query.data ?? []).find((r) => r.day_id === dayId) ?? null,
    [query.data, dayId],
  );

  const save = useMutation({
    mutationFn: (input: { activeLessonId?: string | null; draftAnswers?: Record<string, string> }) =>
      persist({ data: { courseId, dayId, ...input } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["day-state"] }),
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<string>("");
  const saveRef = useRef(save.mutate);
  saveRef.current = save.mutate;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const autosave = useCallback(
    (input: { activeLessonId?: string | null; draftAnswers?: Record<string, string> }) => {
      if (!enabled) return;
      const signature = JSON.stringify(input);
      if (signature === lastSent.current) return;
      lastSent.current = signature;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => saveRef.current(input), 600);
    },
    [enabled],
  );

  return {
    isLoading: query.isLoading,
    row,
    activeLessonId: row?.active_lesson_id ?? null,
    draftAnswers: row?.draft_answers ?? null,
    autosave,
  };
}

export type ResumePosition = {
  location: DayLocation;
  /** Sub-lesson the athlete was on, when one was recorded. */
  activeLessonId: string | null;
  updatedAt: string;
};

/**
 * The last place the athlete actually was — level (course), phase, day and
 * sub-lesson — read from the same autosaved day rows. Used to offer a
 * one-tap "pick up where you left off" when they come back.
 */
export function useResumePosition(enabled = true) {
  const fetchStates = useServerFn(getDayStates);

  const query = useQuery({
    queryKey: ["day-state"],
    queryFn: () => fetchStates() as Promise<DayStateRow[]>,
    enabled,
    staleTime: 30_000,
  });

  const position = useMemo<ResumePosition | null>(() => {
    const rows = [...(query.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    for (const row of rows) {
      const location = findDay(row.day_id);
      if (location) {
        return { location, activeLessonId: row.active_lesson_id ?? null, updatedAt: row.updated_at };
      }
    }
    return null;
  }, [query.data]);

  return { isLoading: query.isLoading, position };
}

