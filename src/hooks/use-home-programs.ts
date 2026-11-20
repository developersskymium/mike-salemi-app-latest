import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { courses, dayLabel, dayOrder } from "@/content/program";
import { getHomeDashboard, joinProgram, kblKey } from "@/lib/home.functions";
import { summarise, useProgress } from "@/hooks/use-progress";
import { useResumePosition } from "@/hooks/use-day-state";

/** Where a program card's button goes. */
export type ProgramTarget =
  | { kind: "course"; slug: string; lessonId?: string }
  | { kind: "kbl"; dayId: string };

/** One program as the home page shows it — DB course or KBL level alike. */
export type HomeItem = {
  key: string;
  /** URL slug: course slug, or the KBL level slug ("beginner"). */
  slug: string;
  /** Enrollment key passed to joinProgram. */
  programKey: string;
  name: string;
  summary: string | null;
  image: string | null;
  access: "included" | "owned" | "locked";
  priceCents: number;
  featured: boolean;
  enrolled: boolean;
  percent: number;
  complete: boolean;
  /** "12 of 302 lessons" / "8 of 60 days" */
  progressLabel: string;
  /** Size line for programs not joined yet, e.g. "302 lessons". */
  sizeLabel: string;
  /** What Resume opens next, e.g. "Day 8 · Workout I Day". */
  nextLabel: string | null;
  lastActivityAt: string | null;
  resume: ProgramTarget;
  start: ProgramTarget;
};

/** "Day 8 · Workout I Day", or just "Day 6" / "Phase 1 Overview" when that's all there is. */
function kblDayLabel(day: Parameters<typeof dayLabel>[0] & { title: string }) {
  const label = dayLabel(day);
  const rest = day.title.replace(/^Day \d+\s*-\s*/, "").trim();
  return !rest || rest === label ? label : `${label} · ${rest}`;
}

const latest = (...values: (string | null | undefined)[]) =>
  values.filter((v): v is string => Boolean(v)).sort().pop() ?? null;

/**
 * Every program on the home page with the member's state: joined or not,
 * percent complete, where Resume goes and where Join starts.
 */
export function useHomePrograms(enabled = true) {
  const fetchDashboard = useServerFn(getHomeDashboard);
  const dashboard = useQuery({
    queryKey: ["home-dashboard"],
    queryFn: () => fetchDashboard(),
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
  const kblProgress = useProgress(enabled);
  const { position } = useResumePosition(enabled);

  const items = useMemo<HomeItem[]>(() => {
    const s = summarise(kblProgress.data);
    const rows = kblProgress.data ?? [];

    const kbl: HomeItem[] = courses.map((course) => {
      const days = dayOrder.filter((d) => d.course.id === course.id);
      const cc = s.courseCompletion(course.id);
      const here = position?.location.course.id === course.id ? position : null;
      const nextDay =
        here?.location ??
        days.find((d) => !s.dayCompletion(d.day.id).complete) ??
        days[days.length - 1];
      const firstDay = days[0];
      const dayIds = new Set(days.map((d) => d.day.id));
      const lastDone = rows
        .filter((r) => dayIds.has(r.day_id))
        .reduce((m, r) => (r.completed_at > m ? r.completed_at : m), "");
      const joined = dashboard.data?.kblEnrollments[course.id];
      return {
        key: kblKey(course.id),
        slug: course.slug,
        programKey: kblKey(course.id),
        name: course.title,
        summary: course.tagline,
        image: course.image,
        access: "included",
        priceCents: 0,
        featured: course.id === "beginner",
        enrolled: cc.started || Boolean(joined) || Boolean(here),
        percent: cc.percent,
        complete: cc.complete,
        progressLabel: `${cc.days} of ${cc.daysTotal} days`,
        sizeLabel: `${cc.daysTotal} training days`,
        nextLabel: nextDay ? kblDayLabel(nextDay.day) : null,
        lastActivityAt: latest(lastDone, here?.updatedAt, joined?.lastOpenedAt, joined?.enrolledAt),
        resume: { kind: "kbl", dayId: (nextDay ?? firstDay).day.id },
        start: { kind: "kbl", dayId: firstDay.day.id },
      };
    });

    const db: HomeItem[] = (dashboard.data?.programs ?? []).map((p) => ({
      key: p.id,
      slug: p.slug,
      programKey: p.id,
      name: p.name,
      summary: p.summary,
      image: p.image,
      access: p.access,
      priceCents: p.priceCents,
      featured: p.featured,
      enrolled: p.enrolled,
      percent: p.percent,
      complete: p.lessonCount > 0 && p.completed === p.lessonCount,
      progressLabel: `${p.completed} of ${p.lessonCount} lessons`,
      sizeLabel: `${p.lessonCount} lesson${p.lessonCount === 1 ? "" : "s"}`,
      nextLabel: p.nextLesson?.title ?? null,
      lastActivityAt: p.lastActivityAt,
      resume: { kind: "course", slug: p.slug, lessonId: p.nextLesson?.id },
      start: { kind: "course", slug: p.slug, lessonId: p.firstLesson?.id },
    }));

    return [...kbl, ...db];
  }, [dashboard.data, kblProgress.data, position]);

  const enrolled = items
    .filter((i) => i.enrolled)
    .sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""));

  return {
    // A failed dashboard request must not leave the page on its skeleton.
    isLoading: (dashboard.isLoading && !dashboard.isError) || kblProgress.isLoading,
    error: dashboard.error,
    items,
    enrolled,
    joinable: items.filter((i) => !i.enrolled && i.access !== "locked"),
    locked: items.filter((i) => !i.enrolled && i.access === "locked"),
  };
}

/** Join a program, then refresh the home data. */
export function useJoinProgram() {
  const queryClient = useQueryClient();
  const join = useServerFn(joinProgram);
  return useMutation({
    mutationFn: (programKey: string) => join({ data: { programKey } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["home-dashboard"] }),
  });
}
