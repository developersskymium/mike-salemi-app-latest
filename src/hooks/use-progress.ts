import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProgress, setLessonProgress } from "@/lib/progress.functions";
import { courses, dayOrder, totalLessons, trainingDayOrder } from "@/content/program";
import { useMutation as useRQMutation } from "@tanstack/react-query";
import { getCourseAttempts, restartCourse, type CourseAttemptRow } from "@/lib/progress.functions";

export type ProgressRow = {
  phase_id: string;
  day_id: string;
  lesson_id: string;
  completed_at: string;
};

export function useProgress(enabled: boolean) {
  const fetchProgress = useServerFn(getProgress);
  return useQuery({
    queryKey: ["progress"],
    queryFn: () => fetchProgress() as Promise<ProgressRow[]>,
    enabled,
    staleTime: 30_000,
  });
}

export function useSetLessonProgress() {
  const queryClient = useQueryClient();
  const mutate = useServerFn(setLessonProgress);
  return useMutation({
    mutationFn: (input: { phaseId: string; dayId: string; lessonId: string; completed: boolean }) =>
      mutate({ data: input }),
    // Optimistic so lesson-to-lesson navigation feels instant.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["progress"] });
      const previous = queryClient.getQueryData<ProgressRow[]>(["progress"]);
      queryClient.setQueryData<ProgressRow[]>(["progress"], (rows = []) => {
        const without = rows.filter(
          (r) => !(r.day_id === input.dayId && r.lesson_id === input.lessonId),
        );
        if (!input.completed) return without;
        return [
          ...without,
          {
            phase_id: input.phaseId,
            day_id: input.dayId,
            lesson_id: input.lessonId,
            completed_at: new Date().toISOString(),
          },
        ];
      });
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(["progress"], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}

export function summarise(rows: ProgressRow[] | undefined) {
  const completed = new Set((rows ?? []).map((r) => `${r.day_id}::${r.lesson_id}`));

  const isLessonDone = (dayId: string, lessonId: string) => completed.has(`${dayId}::${lessonId}`);

  const dayCompletion = (dayId: string) => {
    const location = dayOrder.find((d) => d.day.id === dayId);
    if (!location) return { done: 0, total: 0, complete: false };
    const done = location.day.lessons.filter((l) => isLessonDone(dayId, l.id)).length;
    return {
      done,
      total: location.day.lessons.length,
      complete: done === location.day.lessons.length,
    };
  };

  const latest = [...(rows ?? [])].sort(
    (a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at),
  )[0];
  const latestCourseId = latest
    ? dayOrder.find((entry) => entry.day.id === latest.day_id)?.course.id
    : undefined;
  const firstIncomplete =
    dayOrder.find((d) => d.course.id === latestCourseId && !dayCompletion(d.day.id).complete) ??
    dayOrder.find((d) => !dayCompletion(d.day.id).complete) ??
    dayOrder[dayOrder.length - 1];

  const completedDays = trainingDayOrder.filter((d) => dayCompletion(d.day.id).complete).length;

  /** A phase is complete when every day inside it is complete. */
  const phaseCompletion = (phaseId: string) => {
    const days = dayOrder.filter((d) => d.phase.id === phaseId);
    const done = days.filter((d) => dayCompletion(d.day.id).complete).length;
    return { done, total: days.length, complete: days.length > 0 && done === days.length };
  };

  /** A level (course) is complete when every day inside it is complete. */
  const courseCompletion = (courseId: string) => {
    const days = dayOrder.filter((d) => d.course.id === courseId);
    const doneDays = days.filter((d) => dayCompletion(d.day.id).complete).length;
    const lessonsTotal = days.reduce((sum, d) => sum + d.day.lessons.length, 0);
    const lessonsDone = days.reduce((sum, d) => sum + dayCompletion(d.day.id).done, 0);
    return {
      days: days.filter((d) => !d.day.pageType && dayCompletion(d.day.id).complete).length,
      daysTotal: days.filter((d) => !d.day.pageType).length,
      pages: doneDays,
      pagesTotal: days.length,
      lessons: lessonsDone,
      lessonsTotal,
      percent: lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0,
      complete: days.length > 0 && doneDays === days.length,
      started: lessonsDone > 0,
    };
  };

  /** The level the athlete is currently inside, and whether everything is done. */
  const currentCourse = firstIncomplete?.course;
  const allComplete = dayOrder.every((d) => dayCompletion(d.day.id).complete);

  /**
   * Immersion is strictly linear: a day only opens once every day before it is
   * finished. Days already completed stay open so athletes can revisit them.
   */
  const dayUnlocked = (dayId: string) => {
    const location = dayOrder.find((d) => d.day.id === dayId);
    if (!location) return false;
    if (dayCompletion(dayId).complete) return true;
    const nextInLevel = dayOrder.find(
      (d) => d.course.id === location.course.id && !dayCompletion(d.day.id).complete,
    );
    return !nextInLevel || location.index <= nextInLevel.index;
  };

  return {
    phaseCompletion,
    courseCompletion,
    currentCourse,
    allComplete,
    completedCount: completed.size,
    totalLessons,
    percent: totalLessons ? Math.round((completed.size / totalLessons) * 100) : 0,
    completedDays,
    isLessonDone,
    dayCompletion,
    dayUnlocked,
    currentDay: firstIncomplete,
  };
}

export function useCourseAttempts(enabled: boolean) {
  const fetchAttempts = useServerFn(getCourseAttempts);
  return useQuery({
    queryKey: ["course-attempts"],
    queryFn: () => fetchAttempts() as Promise<CourseAttemptRow[]>,
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Restart a level: the current run is archived (so it is remembered forever)
 * and the live progress for that level is wiped back to day one.
 */
export function useRestartCourse() {
  const queryClient = useQueryClient();
  const run = useServerFn(restartCourse);
  return useRQMutation({
    mutationFn: async (input: { courseId: string; rows: ProgressRow[] | undefined }) => {
      const course = courses.find((c) => c.id === input.courseId);
      if (!course) throw new Error("Unknown level");
      const days = dayOrder.filter((d) => d.course.id === course.id);
      const s = summarise(input.rows);
      return run({
        data: {
          courseId: course.id,
          dayIds: days.map((d) => d.day.id),
          lessonsTotal: days.reduce((sum, d) => sum + d.day.lessons.length, 0),
          daysTotal: s.courseCompletion(course.id).daysTotal,
          completedDayIds: days
            .filter((d) => !d.day.pageType && s.dayCompletion(d.day.id).complete)
            .map((d) => d.day.id),
          wasComplete: s.courseCompletion(course.id).complete,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["course-attempts"] });
    },
  });
}
