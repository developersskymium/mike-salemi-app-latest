import type { WeekEntry } from "@ms/api";
import { daysBetween, type IsoDate } from "@ms/core";
import type { DayType } from "@/components/graphics";
import type { IconName } from "@/components/ui";
import type { Enrollment, TodayRaw } from "@/lib/loaders/today-plan-you";
import { pickContinue } from "@/lib/continue";
import { startOfWeek, weekDates } from "./dates";
import { dayTypeOf, entryHref, lessonHref, missedByPlan, photoFor, plural, splitDayTitle } from "./model";
import type { PhotoKey } from "./photos";

export interface NextAction {
  eyebrow: string;
  title: string;
  dayType: DayType | null;
  photo: PhotoKey;
  meta: { icon: IconName; text: string }[];
  cta: string;
  href: string;
  hint: string | null;
  steps: { done: number; total: number } | null;
  external?: boolean;
}

export type DayState = "done" | "partial" | "missed" | "planned" | "rest";
export interface WeekDay {
  date: IsoDate;
  isToday: boolean;
  state: DayState;
  progress: number;
  entries: WeekEntry[];
}

export interface UpcomingEvent {
  id: string;
  kind: "run" | "coaching" | "session";
  title: string;
  subtitle: string;
  when: string;
  href: string;
}

const STREAK_MILESTONES = [3, 7, 30, 60, 100, 365];

/** Pure: turns Today's raw data into the screen model (same code for real data and fixtures). */
export function buildToday(raw: TodayRaw) {
  const { today } = raw;
  const typeOf = (slug: string) => raw.enrollments.find((e) => e.program_slug === slug)?.program_type;
  const ws = startOfWeek(today);
  const todays = raw.entries.filter((e) => e.on_date === today);
  const todaysOpen = todays.filter((e) => !e.done && !e.skipped && e.item_kind !== "rest");
  // "Continue" is the main training program (KBL first), never a tool or a course's intro lesson.
  const primary: Enrollment | undefined = pickContinue(raw.enrollments, raw.introLessonIds);

  /* ---------------------------------------------------------------- next action */
  let next: NextAction | null = null;
  const nowIso = new Date().toISOString();
  const liveCoaching = raw.experiences.coaching.bookings.find((b) => {
    if (b.status !== "booked") return false;
    const mins = (new Date(b.starts_at).getTime() - Date.parse(nowIso)) / 60000;
    return mins < 90 && mins > -b.duration_minutes;
  });
  const onPlanEnrollment = primary && (todaysOpen.length === 0 || todaysOpen.some((e) => e.lesson_id === primary.current_lesson_id));

  if (liveCoaching) {
    next = {
      eyebrow: "Coaching, starting soon",
      title: "Coaching with Mike",
      dayType: null,
      photo: "coaching",
      meta: [{ icon: "clock", text: new Date(liveCoaching.starts_at).toISOString().slice(11, 16) }, { icon: "timer", text: `${liveCoaching.duration_minutes} min` }],
      cta: "Join the call",
      href: liveCoaching.meeting_url ?? "/coaching",
      external: !!liveCoaching.meeting_url,
      hint: liveCoaching.member_note,
      steps: null,
    };
  } else if (primary && onPlanEnrollment) {
    const { day, name } = splitDayTitle(primary.current_lesson_title ?? "");
    const lesson = raw.currentLesson?.lessonId === primary.current_lesson_id ? raw.currentLesson : null;
    const dt = dayTypeOf(lesson?.dayType, primary.current_lesson_title);
    const steps = lesson?.steps ?? [];
    const done = steps.filter((s) => s.done).length;
    const nextStep = steps.findIndex((s) => !s.done);
    const level = primary.path_name?.split("·")[0]?.trim();
    const label = day ? `Day ${day}` : "lesson";
    next = {
      eyebrow: [primary.program_name, primary.current_section_title].filter(Boolean).join(" · "),
      title: name || primary.program_name,
      dayType: dt,
      photo: photoFor(dt, primary.program_slug),
      meta: [
        ...(day ? [{ icon: "calendar" as IconName, text: `Day ${day} of ${primary.lessons_total}` }] : []),
        ...(steps.length ? [{ icon: "steps" as IconName, text: plural(steps.length, "step") }] : []),
        ...(level ? [{ icon: "kettlebell" as IconName, text: level }] : []),
      ],
      cta: done > 0 ? `Continue ${label}` : `Start ${label}`,
      href: lessonHref(primary.program_slug, primary.current_lesson_id, { type: primary.program_type, mode: primary.mode }),
      hint: nextStep >= 0 ? `Next: ${steps[nextStep]!.title}, step ${nextStep + 1} of ${steps.length}` : null,
      steps: steps.length ? { done, total: steps.length } : null,
    };
  } else if (todaysOpen[0]) {
    const e = todaysOpen[0];
    const dt = dayTypeOf(null, e.title, e.item_kind);
    next = {
      eyebrow: [e.subtitle, e.program_name].filter(Boolean).join(" · "),
      title: splitDayTitle(e.title).name,
      dayType: dt,
      photo: photoFor(dt, e.program_slug),
      meta: [{ icon: e.item_kind === "recovery" ? "leaf" : "kettlebell", text: e.item_kind === "recovery" ? "Recovery" : "Training" }],
      cta: "Start session",
      href: entryHref(e, typeOf),
      hint: todaysOpen.length > 1 ? `Then ${splitDayTitle(todaysOpen[1]!.title).name}` : null,
      steps: null,
    };
  } else if (primary) {
    const { day, name } = splitDayTitle(primary.current_lesson_title ?? "");
    const dt = dayTypeOf(null, primary.current_lesson_title);
    next = {
      eyebrow: primary.program_name,
      title: name,
      dayType: dt,
      photo: photoFor(dt, primary.program_slug),
      meta: day ? [{ icon: "calendar", text: `Day ${day}` }] : [],
      cta: day ? `Continue Day ${day}` : "Continue",
      href: lessonHref(primary.program_slug, primary.current_lesson_id, { type: primary.program_type, mode: primary.mode }),
      hint: null,
      steps: null,
    };
  }

  /* ---------------------------------------------------------------- week */
  const week: WeekDay[] = weekDates(ws).map((date) => {
    const es = raw.entries.filter((e) => e.on_date === date && e.kind === "plan" && e.item_kind !== "rest");
    const done = es.filter((e) => e.done).length;
    const p = es.length ? done / es.length : 0;
    const state: DayState = !es.length ? "rest" : p >= 1 ? "done" : date < today ? (done ? "partial" : "missed") : done ? "partial" : "planned";
    return { date, isToday: date === today, state, progress: p, entries: raw.entries.filter((e) => e.on_date === date) };
  });
  const weekPlanned = week.reduce((n, d) => n + d.entries.filter((e) => e.kind === "plan" && e.item_kind !== "rest").length, 0);
  const weekDone = week.reduce((n, d) => n + d.entries.filter((e) => e.kind === "plan" && e.done).length, 0);
  const missed = missedByPlan(raw.entries, today);

  /* ---------------------------------------------------------------- goal */
  const goalRow = raw.goals.find((g) => g.status === "active") ?? null;
  const goalPlan = goalRow ? raw.plans.find((p) => p.goal_id === goalRow.id) ?? null : null;
  const counts = goalPlan ? raw.planCounts.find((c) => c.plan_id === goalPlan.id) : undefined;
  const goal = goalRow
    ? {
        id: goalRow.id,
        kind: goalRow.kind,
        title: goalRow.title,
        targetDate: goalRow.target_date,
        daysLeft: goalRow.target_date ? daysBetween(today, goalRow.target_date) : null,
        planId: goalPlan?.id ?? null,
        planName: goalPlan?.name ?? null,
        done: counts?.done ?? 0,
        total: counts?.total ?? 0,
        next: goalPlan ? raw.entries.find((e) => e.plan_id === goalPlan.id && e.on_date >= today && !e.done && !e.skipped) ?? null : null,
      }
    : null;

  /* ---------------------------------------------------------------- rings */
  const r = raw.rewards;
  const nextMilestone = STREAK_MILESTONES.find((m) => m > r.streak_current) ?? Math.max(r.streak_best, r.streak_current + 1);
  const todayPlanned = todays.filter((e) => e.kind === "plan" && e.item_kind !== "rest");
  const todayRing = todayPlanned.length
    ? { done: todayPlanned.filter((e) => e.done).length, total: todayPlanned.length, unit: "sessions" }
    : next?.steps
      ? { done: next.steps.done, total: next.steps.total, unit: "steps" }
      : { done: 0, total: 1, unit: "sessions" };
  const rings = {
    program: primary ? { done: primary.lessons_done, total: primary.lessons_total, label: primary.path_name?.split("·")[0]?.trim() || primary.program_name } : null,
    today: todayRing,
    streak: { days: r.streak_current, target: nextMilestone },
  };

  /* ---------------------------------------------------------------- events */
  const upcoming: UpcomingEvent[] = [];
  for (const run of raw.experiences.runs) {
    if (run.phase === "after" || ["declined", "cancelled"].includes(run.status)) continue;
    upcoming.push({
      id: run.run_id,
      kind: "run",
      title: run.run_name,
      subtitle: run.status === "booked" ? `${run.checklist.done}/${run.checklist.total} prepared` : `Application ${run.status.replace("_", " ")}`,
      when: run.phase === "during" ? "Now" : `In ${run.countdown_days} days`,
      href: `/experiences/${run.run_id}`,
    });
  }
  for (const b of raw.experiences.coaching.bookings) {
    if (b.status !== "booked" || b.starts_at < nowIso) continue;
    upcoming.push({ id: b.id, kind: "coaching", title: "Coaching with Mike", subtitle: `${b.duration_minutes} min`, when: b.starts_at.slice(0, 10), href: "/coaching" });
  }
  for (const e of raw.entries) {
    if (e.kind !== "run_session" || e.on_date < today || !e.ref_id) continue;
    upcoming.push({ id: e.ref_id, kind: "session", title: e.title, subtitle: e.subtitle ?? "", when: e.on_date, href: entryHref(e, typeOf) });
  }
  const applied = new Set(raw.experiences.runs.map((x) => x.run_id));
  const invitation = raw.openRuns.find((x) => !applied.has(x.id)) ?? null;

  return {
    today,
    firstName: raw.profile.firstName,
    timezone: raw.profile.timezone,
    // The app-wide onboarding (completed_at / skipped_at) counts too: it sets a profile, not a goal row.
    needsOnboarding: !goalRow && !raw.profile.onboarding.goal_skipped && !raw.profile.onboarding.completed_at && !raw.profile.onboarding.skipped_at,
    next,
    primary: primary ?? null,
    /** The primary enrollment's current day (steps with durations, focus). */
    currentLesson: raw.currentLesson,
    week,
    weekSummary: { planned: weekPlanned, done: weekDone },
    missed,
    goal,
    rings,
    rewards: r,
    upcoming,
    invitation,
  };
}

export type TodayView = ReturnType<typeof buildToday>;
