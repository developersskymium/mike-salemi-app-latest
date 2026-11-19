import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  ListChecks,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { AnimatedProgress, CountUp, Reveal } from "@/components/motion-kit";
import { EmptyState, Spinner, buttonStyles } from "@/components/ui-kit";

import { dayLabel, courses, trainingDays } from "@/content/program";
import { useProgress, summarise } from "@/hooks/use-progress";
import { useSession } from "@/hooks/use-session";
import {
  bulkPlaceScheduleDays,
  createSchedule,
  deleteSchedule,
  getSchedule,
  placeScheduleDay,
  removeScheduleDay,
  updateSchedule,
} from "@/lib/schedule.functions";
import { cn } from "@/lib/utils";
import {
  defaultPrefs,
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications.functions";
import { detectTimezone, reminderTimeFor } from "@/lib/reminders";
import { buildIcs, downloadIcs, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar";
import { ReminderTiming } from "@/components/reminder-timing";
import { NextSessionCard } from "@/components/next-session-card";
import { getSelfGuidedPlans } from "@/lib/self-guided-plan.functions";

export const Route = createFileRoute("/_authenticated/schedule/")({
  head: () => ({
    meta: [
      { title: "Schedule — Mike Salemi App" },
      {
        name: "description",
        content:
          "Build your own Kettlebell Lifestyle training schedule: drag days onto a calendar, set reminders and choose what happens when you miss a session.",
      },
      { property: "og:title", content: "Schedule — Mike Salemi App" },
      {
        property: "og:description",
        content: "Drag your training days onto a calendar and set reminders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchedulePage,
});

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

const FALLBACKS = [
  {
    value: "shift",
    label: "Shift everything forward",
    hint: "A missed day pushes the rest of the plan back a day.",
  },
  {
    value: "skip",
    label: "Skip the missed day",
    hint: "Move on. The missed day is marked skipped.",
  },
  {
    value: "weekend",
    label: "Catch up on the weekend",
    hint: "Missed days queue onto the next free weekend slot.",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function SchedulePage() {
  const queryClient = useQueryClient();
  const fetchSchedule = useServerFn(getSchedule);
  const create = useServerFn(createSchedule);
  const update = useServerFn(updateSchedule);
  const remove = useServerFn(deleteSchedule);
  const place = useServerFn(placeScheduleDay);
  const unplace = useServerFn(removeScheduleDay);
  const bulk = useServerFn(bulkPlaceScheduleDays);
  const fetchCreatedPlans = useServerFn(getSelfGuidedPlans);

  const { data, isLoading } = useQuery({ queryKey: ["schedule"], queryFn: () => fetchSchedule() });
  const { data: createdPlans = [] } = useQuery({
    queryKey: ["self-guided-plans"],
    queryFn: () => fetchCreatedPlans(),
  });
  const { user } = useSession();
  const { data: progressRows } = useProgress(Boolean(user));
  const summary = summarise(progressRows);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["schedule"] });

  const schedules = data?.schedules ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = schedules.find((s) => s.id === activeId) ?? schedules[0];
  const days = (data?.days ?? []).filter((d) => d.schedule_id === active?.id);
  const createdSessions = useMemo(
    () =>
      createdPlans
        .flatMap((plan) =>
          plan.status === "active"
            ? plan.self_guided_plan_sessions.map((session) => ({ ...session, planName: plan.name }))
            : [],
        )
        .filter((session) => Boolean(session.scheduled_on)),
    [createdPlans],
  );

  const course = courses.find((c) => c.id === active?.course_id) ?? courses[0];
  const [anchor, setAnchor] = useState(() => new Date());
  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "agenda">("month");

  const placedIds = new Set(days.map((d) => d.day_id));
  const unplaced = course.phases.flatMap((phase) =>
    trainingDays(phase.days)
      .filter((d) => !placedIds.has(d.id))
      .map((d) => ({ day: d, phase })),
  );

  const byDate = useMemo(() => {
    type CalendarItem =
      | { kind: "core"; value: (typeof days)[number] }
      | { kind: "created"; value: (typeof createdSessions)[number] };
    const map = new Map<string, CalendarItem[]>();
    for (const d of days) {
      const list = map.get(d.scheduled_on) ?? [];
      list.push({ kind: "core", value: d });
      map.set(d.scheduled_on, list);
    }
    for (const session of createdSessions) {
      if (!session.scheduled_on) continue;
      const list = map.get(session.scheduled_on) ?? [];
      list.push({ kind: "created", value: session });
      map.set(session.scheduled_on, list);
    }
    return map;
  }, [days, createdSessions]);

  const createMutation = useMutation({
    mutationFn: (courseId: string) =>
      create({
        data: {
          name: `${courses.find((c) => c.id === courseId)?.title ?? "Training"} schedule`,
          courseId,
          startDate: iso(new Date()),
        },
      }),
    onSuccess: (row) => {
      setActiveId((row as { id: string })?.id ?? null);
      invalidate();
      toast.success("Schedule created");
    },
    onError: () => toast.error("Couldn't create that schedule"),
  });

  const patchMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => update({ data: { id: active!.id, patch } }),
    onSuccess: invalidate,
    onError: () => toast.error("Couldn't save that change"),
  });

  const placeMutation = useMutation({
    mutationFn: (input: { dayId: string; phaseId: string; scheduledOn: string }) =>
      place({
        data: {
          scheduleId: active!.id,
          courseId: course.id,
          phaseId: input.phaseId,
          dayId: input.dayId,
          scheduledOn: input.scheduledOn,
        },
      }),
    onSuccess: invalidate,
    onError: () => toast.error("Couldn't place that day"),
  });

  const unplaceMutation = useMutation({
    mutationFn: (dayId: string) => unplace({ data: { scheduleId: active!.id, dayId } }),
    onSuccess: invalidate,
  });

  const autofillMutation = useMutation({
    mutationFn: (pattern: number[]) => {
      const start = active?.start_date ? parseIso(active.start_date) : new Date();
      const all = course.phases.flatMap((phase) =>
        trainingDays(phase.days).map((day) => ({ day, phase })),
      );
      const out: { courseId: string; phaseId: string; dayId: string; scheduledOn: string }[] = [];
      let cursor = new Date(start);
      let guard = 0;
      for (const item of all) {
        while (!pattern.includes(((cursor.getDay() + 6) % 7) + 1) && guard++ < 2000) {
          cursor = addDays(cursor, 1);
        }
        out.push({
          courseId: course.id,
          phaseId: item.phase.id,
          dayId: item.day.id,
          scheduledOn: iso(cursor),
        });
        cursor = addDays(cursor, 1);
      }
      return bulk({ data: { scheduleId: active!.id, replace: true, days: out } });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Schedule filled in");
    },
    onError: () => toast.error("Couldn't autofill the schedule"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      setActiveId(null);
      invalidate();
    },
  });

  function dropOn(dateIso: string, payload: string) {
    const [dayId, phaseId] = payload.split("|");
    if (!dayId || !active) return;
    placeMutation.mutate({ dayId, phaseId, scheduledOn: dateIso });
  }

  const dayById = (id: string) => {
    for (const phase of course.phases) {
      const day = phase.days.find((d) => d.id === id);
      if (day) return { day, phase };
    }
    return null;
  };

  /* ---------------------------------------------------------------- */
  /* Catch-up: a missed day shouldn't quietly break the whole plan.    */
  /* ---------------------------------------------------------------- */

  const todayIso = iso(new Date());
  const missed = useMemo(
    () =>
      days.filter((d) => {
        if (d.scheduled_on >= todayIso) return false;
        if (d.status === "done" || d.status === "skipped") return false;
        const c = summary.dayCompletion(d.day_id);
        return !(c.total > 0 && c.done === c.total);
      }),
    [days, todayIso, summary],
  );

  const fallbackCopy =
    FALLBACKS.find((f) => f.value === active?.fallback_rule)?.hint ?? FALLBACKS[0].hint;

  const catchUpMutation = useMutation({
    mutationFn: async () => {
      if (!active) return;
      const rule = active.fallback_rule || "shift";

      if (rule === "skip") {
        // Clear the missed days off the calendar; the rest of the plan stands.
        for (const m of missed) await unplace({ data: { scheduleId: active.id, dayId: m.day_id } });
        return;
      }

      if (rule === "weekend") {
        // Queue missed days onto the next free weekend slots.
        const taken = new Set(
          days.filter((d) => d.scheduled_on >= todayIso).map((d) => d.scheduled_on),
        );
        const out: { courseId: string; phaseId: string; dayId: string; scheduledOn: string }[] = [];
        let cursor = new Date();
        let guard = 0;
        for (const m of missed) {
          while (guard++ < 400) {
            cursor = addDays(cursor, 1);
            const weekday = (cursor.getDay() + 6) % 7; // 5 = Sat, 6 = Sun
            if (weekday >= 5 && !taken.has(iso(cursor))) break;
          }
          taken.add(iso(cursor));
          out.push({
            courseId: course.id,
            phaseId: m.phase_id,
            dayId: m.day_id,
            scheduledOn: iso(cursor),
          });
        }
        await bulk({ data: { scheduleId: active.id, replace: false, days: out } });
        return;
      }

      // Default — shift everything forward so the first missed day is today.
      const earliest = missed.reduce(
        (min, m) => (m.scheduled_on < min ? m.scheduled_on : min),
        missed[0].scheduled_on,
      );
      const offset = Math.round(
        (parseIso(todayIso).getTime() - parseIso(earliest).getTime()) / 86_400_000,
      );
      if (offset <= 0) return;
      const out = days
        .filter((d) => d.scheduled_on >= earliest)
        .map((d) => ({
          courseId: course.id,
          phaseId: d.phase_id,
          dayId: d.day_id,
          scheduledOn: iso(addDays(parseIso(d.scheduled_on), offset)),
        }));
      await bulk({ data: { scheduleId: active.id, replace: false, days: out } });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Plan updated");
    },
    onError: () => toast.error("Couldn't adjust the plan"),
  });

  const totalDays = course.phases.reduce((n, p) => n + trainingDays(p.days).length, 0);
  const placedCount = days.length;
  const nextSession = useMemo(() => {
    const upcoming = days
      .filter((d) => d.scheduled_on >= todayIso)
      .sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on))[0];
    if (!upcoming) return null;
    const found = dayById(upcoming.day_id);
    return {
      label: found ? `${dayLabel(found.day)} · ${found.day.title}` : upcoming.day_id,
      when: parseIso(upcoming.scheduled_on).toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "short",
      }),
      date: upcoming.scheduled_on,
      dayId: upcoming.day_id,
      phaseName: found?.phase.name,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, todayIso, course.id]);

  /* Reminder preferences (time / frequency / timezone) ------------------ */
  const fetchPrefs = useServerFn(getNotificationPrefs);
  const savePrefs = useServerFn(saveNotificationPrefs);
  const { data: prefsRow } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: () => fetchPrefs(),
  });
  const prefs: NotificationPrefs = {
    ...defaultPrefs,
    ...((prefsRow ?? {}) as Partial<NotificationPrefs>),
    reminder_days: Array.isArray((prefsRow as { reminder_days?: number[] } | null)?.reminder_days)
      ? ((prefsRow as { reminder_days: number[] }).reminder_days ?? defaultPrefs.reminder_days)
      : defaultPrefs.reminder_days,
    reminder_times:
      ((prefsRow as { reminder_times?: Record<string, string> } | null)?.reminder_times as
        Record<string, string> | undefined) ?? {},
    reminder_timezone:
      (prefsRow as { reminder_timezone?: string } | null)?.reminder_timezone || detectTimezone(),
  };

  const prefsMutation = useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) => savePrefs({ data: { prefs: patch } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-prefs"] }),
    onError: () => toast.error("Couldn't save reminder settings"),
  });

  /* Calendar sync ------------------------------------------------------- */
  const calendarEvents = useMemo(() => {
    const coreEvents = days
      .slice()
      .sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on))
      .map((d) => {
        const found = dayById(d.day_id);
        const isoDay = ((parseIso(d.scheduled_on).getDay() + 6) % 7) + 1;
        return {
          uid: `${d.schedule_id}-${d.day_id}`,
          title: found
            ? `Kettlebell · ${dayLabel(found.day)} — ${found.day.title}`
            : "Kettlebell training",
          description: found
            ? `${found.phase.name} · Open your session at ${typeof window !== "undefined" ? window.location.origin : ""}/self-guided/day/${d.day_id}`
            : "Mike Salemi App training day",
          date: d.scheduled_on,
          time: reminderTimeFor(prefs, isoDay),
          durationMinutes: 60,
          reminderMinutesBefore: active?.reminders_enabled ? 30 : null,
        } satisfies CalendarEvent;
      });
    const createdEvents = createdSessions.flatMap((session) => {
      if (!session.scheduled_on) return [];
      const source = (session.source ?? {}) as { programName?: string; programSlug?: string };
      const isoDay = ((parseIso(session.scheduled_on).getDay() + 6) % 7) + 1;
      return [
        {
          uid: `created-${session.id}`,
          title: `Created plan · ${session.title}`,
          description: `${source.programName ?? "Kettlebell Lifestyle"}${source.programSlug ? ` · ${typeof window !== "undefined" ? window.location.origin : ""}/courses/${source.programSlug}` : ""}`,
          date: session.scheduled_on,
          time: reminderTimeFor(prefs, isoDay),
          durationMinutes: session.duration_minutes,
          reminderMinutesBefore: 30,
        } satisfies CalendarEvent,
      ];
    });
    return [...coreEvents, ...createdEvents].sort((a, b) => a.date.localeCompare(b.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    days,
    createdSessions,
    course.id,
    prefs.reminder_time,
    prefs.reminder_times,
    active?.reminders_enabled,
  ]);

  const exportCalendar = () => {
    if (calendarEvents.length === 0) {
      toast.error("Place some days on the calendar first");
      return;
    }
    downloadIcs(
      "kettlebell-lifestyle-schedule",
      buildIcs(calendarEvents, active?.name ?? "Mike Salemi App"),
    );
    toast.success("Calendar file downloaded — open it to add the sessions");
  };

  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow="Self-guided"
          title="Build your schedule"
          lede="Drop training days onto the calendar in whatever rhythm fits your week. Set reminders and decide what happens when life gets in the way."
        />

        {createdPlans.length > 0 && (
          <Section tight>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-primary">Created for you</p>
                <h2 className="title-section mt-2 text-foreground">Self-guided plans</h2>
              </div>
              <a href="/self-guided/creator" className="text-sm font-semibold text-primary">
                Create another
              </a>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {createdPlans.slice(0, 4).map((plan) => {
                const sessions = plan.self_guided_plan_sessions
                  .slice()
                  .sort((a, b) => a.sequence - b.sequence);
                const next =
                  sessions.find(
                    (session) => session.scheduled_on && session.scheduled_on >= todayIso,
                  ) ?? sessions[0];
                const source = (next?.source ?? {}) as {
                  programName?: string;
                  programSlug?: string;
                };
                return (
                  <div key={plan.id} className="rounded-2xl border border-border bg-surface p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {sessions.length} sessions · {plan.status}
                        </p>
                      </div>
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    {next && (
                      <div className="mt-4 rounded-xl bg-secondary p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Next · {next.scheduled_on}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{next.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{source.programName}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {isLoading ? (
          <Section>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Loading your schedules
            </div>
          </Section>
        ) : !active ? (
          <Section>
            <EmptyState
              icon={CalendarDays}
              title="No schedule yet"
              description="Pick a level and we'll create a blank calendar you can fill in — by dragging days, or with a one-tap weekly pattern."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {courses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => createMutation.mutate(c.id)}
                      disabled={createMutation.isPending}
                      className={buttonStyles.primary}
                    >
                      {createMutation.isPending && <Spinner />}
                      <Plus className="h-4 w-4" />
                      {c.level}
                    </button>
                  ))}
                </div>
              }
            />
          </Section>
        ) : (
          <>
            {/* Schedule switcher + settings ------------------------------ */}
            <Section tight>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
                  {schedules.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveId(s.id)}
                      className={cn(
                        "tap flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold",
                        s.id === active.id
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                  {schedules.length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        createMutation.mutate(
                          course.id === courses[0].id ? courses[1].id : courses[0].id,
                        )
                      }
                      className="tap flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" /> New
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
                    {(["month", "agenda"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setView(v)}
                        className={cn(
                          "tap min-h-8 rounded-full px-3 text-xs font-semibold capitalize",
                          view === v ? "bg-foreground text-background" : "text-muted-foreground",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(active.id)}
                    className="tap grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                    aria-label="Delete this schedule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quick fill patterns */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="eyebrow text-muted-foreground">Guided schedule</span>
                {[
                  { label: "3 days / week", pattern: [1, 3, 5] },
                  { label: "4 days / week", pattern: [1, 2, 4, 5] },
                  { label: "5 days / week", pattern: [1, 2, 3, 4, 5] },
                  { label: "Every day", pattern: [1, 2, 3, 4, 5, 6, 7] },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => autofillMutation.mutate(p.pattern)}
                    disabled={autofillMutation.isPending}
                    className="tap inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-foreground hover:border-foreground/30"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-primary" />
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Pick a recommended pace, or build a custom schedule by placing or moving days on the
                calendar. Your days always stay in order (Day 1, Day 2, Day 3…) whichever weekdays
                you train.
              </p>
            </Section>

            {/* Next session preview --------------------------------------- */}
            {nextSession ? (
              <Section tight>
                <NextSessionCard
                  session={{
                    label: nextSession.label,
                    phaseName: nextSession.phaseName,
                    dayId: nextSession.dayId,
                    date: nextSession.date,
                    reminderTime: reminderTimeFor(
                      prefs,
                      ((parseIso(nextSession.date).getDay() + 6) % 7) + 1,
                    ),
                    timezone: prefs.reminder_timezone,
                    remindersEnabled: Boolean(
                      active?.reminders_enabled && prefs.training_reminders,
                    ),
                  }}
                />
              </Section>
            ) : null}

            {/* Plan overview ---------------------------------------------- */}
            <Section tight>
              <Reveal>
                <div className="overflow-hidden rounded-3xl border border-hairline bg-surface raise-soft">
                  <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="eyebrow text-primary">Plan overview</p>
                      <h2 className="mt-1 text-lg font-semibold text-foreground">
                        <CountUp value={placedCount} /> of {totalDays} days on the calendar
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {nextSession
                          ? `Next up: ${nextSession.label} on ${nextSession.when}.`
                          : "Drop a day onto a date to get started."}
                      </p>
                      <AnimatedProgress
                        value={totalDays ? (placedCount / totalDays) * 100 : 0}
                        className="mt-4"
                        label="Days placed"
                      />
                    </div>
                    <div className="flex gap-2 sm:flex-col">
                      <div className="flex-1 rounded-2xl border border-hairline bg-background/60 px-4 py-3 text-center">
                        <p className="eyebrow text-muted-foreground">Placed</p>
                        <p className="text-xl font-semibold text-foreground">
                          <CountUp value={placedCount} />
                        </p>
                      </div>
                      <div className="flex-1 rounded-2xl border border-hairline bg-background/60 px-4 py-3 text-center">
                        <p className="eyebrow text-muted-foreground">Missed</p>
                        <p
                          className={cn(
                            "text-xl font-semibold",
                            missed.length > 0 ? "text-destructive" : "text-foreground",
                          )}
                        >
                          <CountUp value={missed.length} />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </Section>

            {/* Catch up on missed days ------------------------------------ */}
            {missed.length > 0 && (
              <Section tight>
                <div className="rounded-3xl border border-hairline bg-surface raise-soft p-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="eyebrow text-muted-foreground">Behind the plan</p>
                      <h3 className="mt-1 text-base font-semibold text-foreground">
                        {missed.length} missed {missed.length === 1 ? "day" : "days"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{fallbackCopy}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => catchUpMutation.mutate()}
                      disabled={catchUpMutation.isPending}
                      className={cn(buttonStyles.primary, "shrink-0")}
                    >
                      {catchUpMutation.isPending ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                      Fix my plan
                    </button>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {missed.slice(0, 6).map((m) => (
                      <li
                        key={m.day_id}
                        className="rounded-full border border-border px-2.5 py-1 text-[0.625rem] text-muted-foreground"
                      >
                        {dayById(m.day_id)?.day.title ?? m.day_id} ·{" "}
                        {parseIso(m.scheduled_on).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </li>
                    ))}
                    {missed.length > 6 && (
                      <li className="rounded-full border border-dashed border-border px-2.5 py-1 text-[0.625rem] text-muted-foreground">
                        +{missed.length - 6} more
                      </li>
                    )}
                  </ul>
                </div>
              </Section>
            )}

            {/* Calendar + tray -------------------------------------------- */}
            <Section>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                {/* Calendar */}
                <div className="order-2 lg:order-1">
                  {view === "month" ? (
                    <div className="overflow-hidden rounded-3xl border border-hairline bg-surface raise-soft">
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-3 py-2.5">
                        <button
                          type="button"
                          aria-label="Previous month"
                          onClick={() =>
                            setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))
                          }
                          className="tap tap-target grid place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <p className="text-center text-sm font-semibold text-foreground">
                          {anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                        </p>
                        <button
                          type="button"
                          aria-label="Next month"
                          onClick={() =>
                            setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))
                          }
                          className="tap tap-target grid place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 border-b border-border">
                        {WEEKDAYS.map((w) => (
                          <div
                            key={w}
                            className="py-2 text-center text-[0.625rem] font-semibold text-muted-foreground"
                          >
                            {w}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7">
                        {monthGrid(anchor).map((date) => {
                          const key = iso(date);
                          const inMonth = date.getMonth() === anchor.getMonth();
                          const isToday = key === iso(new Date());
                          const items = byDate.get(key) ?? [];
                          return (
                            <div
                              key={key}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                dropOn(key, e.dataTransfer.getData("text/plain"));
                              }}
                              onClick={() => {
                                if (picked) {
                                  dropOn(key, picked);
                                  setPicked(null);
                                }
                              }}
                              className={cn(
                                "min-h-[4.5rem] border-b border-r border-border p-1.5 transition-colors last:border-r-0 sm:min-h-[6rem]",
                                !inMonth && "opacity-40",
                                picked && "cursor-copy hover:bg-primary/5",
                              )}
                            >
                              <p
                                className={cn(
                                  "numeric text-[0.6875rem]",
                                  isToday
                                    ? "inline-grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground"
                                    : "text-muted-foreground",
                                )}
                              >
                                {date.getDate()}
                              </p>
                              <div className="mt-1 space-y-1">
                                {items.map((item) => {
                                  if (item.kind === "created")
                                    return (
                                      <div
                                        key={`created-${item.value.id}`}
                                        className="truncate rounded-md border border-primary/25 bg-surface px-1.5 py-1 text-[0.625rem] font-semibold text-foreground"
                                      >
                                        <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
                                        {item.value.title}
                                      </div>
                                    );
                                  const found = dayById(item.value.day_id);
                                  return (
                                    <button
                                      key={item.value.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        unplaceMutation.mutate(item.value.day_id);
                                      }}
                                      title="Remove from this date"
                                      className="tap block w-full truncate rounded-md bg-primary/10 px-1.5 py-1 text-left text-[0.625rem] font-semibold text-primary"
                                    >
                                      Day {found?.day.number ?? "?"}
                                      <span className="ml-1 font-normal opacity-70">
                                        {found?.day.type.replace(" Day", "")}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-3xl border border-hairline bg-surface raise-soft">
                      {days.length === 0 && createdSessions.length === 0 ? (
                        <p className="p-6 text-sm text-muted-foreground">Nothing scheduled yet.</p>
                      ) : (
                        [
                          ...days.map((value) => ({ kind: "core" as const, value })),
                          ...createdSessions.map((value) => ({ kind: "created" as const, value })),
                        ]
                          .sort((a, b) =>
                            (a.value.scheduled_on ?? "").localeCompare(b.value.scheduled_on ?? ""),
                          )
                          .map((item) => {
                            if (item.kind === "created") {
                              const source = (item.value.source ?? {}) as { programName?: string };
                              return (
                                <div
                                  key={`created-${item.value.id}`}
                                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                                >
                                  <p className="numeric w-16 text-xs text-muted-foreground">
                                    {item.value.scheduled_on
                                      ? parseIso(item.value.scheduled_on).toLocaleDateString(
                                          undefined,
                                          { month: "short", day: "numeric" },
                                        )
                                      : "Flexible"}
                                  </p>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                      {item.value.title}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      Created plan · {source.programName ?? item.value.planName}
                                    </p>
                                  </div>
                                  <Sparkles className="h-4 w-4 text-primary" />
                                </div>
                              );
                            }
                            const found = dayById(item.value.day_id);
                            return (
                              <div
                                key={item.value.id}
                                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                              >
                                <p className="numeric w-16 shrink-0 text-xs text-muted-foreground">
                                  {parseIso(item.value.scheduled_on).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {dayLabel(found?.day)} · {found?.day.title}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {found?.phase.name}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => unplaceMutation.mutate(item.value.day_id)}
                                  aria-label="Remove from schedule"
                                  className="tap grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>

                {/* Tray of unscheduled days */}
                <aside className="order-1 lg:order-2">
                  <div className="rounded-3xl border border-hairline bg-surface raise-soft">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">Days to place</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {picked
                          ? "Now tap a date on the calendar."
                          : "Drag onto a date, or tap to pick then tap a date."}
                      </p>
                    </div>
                    <div className="max-h-[26rem] space-y-1 overflow-y-auto p-2">
                      {unplaced.length === 0 && (
                        <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                          Every day is on the calendar.
                        </p>
                      )}
                      {unplaced.slice(0, 80).map(({ day, phase }) => {
                        const payload = `${day.id}|${phase.id}`;
                        const isPicked = picked === payload;
                        return (
                          <button
                            key={day.id}
                            type="button"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", payload)}
                            onClick={() => setPicked(isPicked ? null : payload)}
                            className={cn(
                              "tap grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl border px-2.5 py-2 text-left",
                              isPicked
                                ? "border-primary bg-primary/10"
                                : "border-transparent hover:border-border hover:bg-subtle",
                            )}
                          >
                            <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-foreground">
                                {dayLabel(day)} · {day.title}
                              </span>
                              <span className="block truncate text-[0.625rem] text-muted-foreground">
                                {phase.name} · {day.type}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </aside>
              </div>
            </Section>

            {/* Reminders + fallback --------------------------------------- */}
            <Section>
              <div className="grid gap-5 lg:grid-cols-2">
                <Reveal>
                  <div className="h-full rounded-3xl border border-hairline bg-surface p-5 raise-soft">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                        <Bell className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="title-section text-foreground">Reminders</h2>
                        <p className="text-xs text-muted-foreground">
                          {active.reminders_enabled
                            ? `A nudge at ${(active.reminder_time ?? "07:00").slice(0, 5)} on training days.`
                            : "Reminders are off right now."}
                        </p>
                      </div>
                    </div>

                    <label className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-background/60 px-4 py-3">
                      <span className="text-sm font-medium text-foreground">
                        Remind me on scheduled days
                      </span>
                      <Toggle
                        checked={active.reminders_enabled}
                        onChange={(v) => patchMutation.mutate({ reminders_enabled: v })}
                      />
                    </label>

                    <div
                      className={cn(
                        "mt-3 rounded-2xl border border-hairline bg-background/60 p-4 transition-opacity",
                        !active.reminders_enabled && "pointer-events-none opacity-50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="eyebrow text-muted-foreground">Reminder time</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {["06:00", "07:00", "12:00", "17:30"].map((t) => {
                          const selected = (active.reminder_time ?? "07:00").slice(0, 5) === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => patchMutation.mutate({ reminder_time: t })}
                              className={cn(
                                "tap numeric min-h-9 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                              )}
                            >
                              {t}
                            </button>
                          );
                        })}
                        <input
                          type="time"
                          value={(active.reminder_time ?? "07:00").slice(0, 5)}
                          onChange={(e) => patchMutation.mutate({ reminder_time: e.target.value })}
                          aria-label="Custom reminder time"
                          className="numeric h-9 rounded-full border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <ReminderTiming
                        prefs={prefs}
                        disabled={!active.reminders_enabled}
                        onChange={(patch) => prefsMutation.mutate(patch)}
                      />
                    </div>

                    <label className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-background/60 px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <CalendarCheck className="h-3.5 w-3.5 text-primary" /> Start date
                      </span>
                      <input
                        type="date"
                        value={active.start_date}
                        onChange={(e) => patchMutation.mutate({ start_date: e.target.value })}
                        className="numeric h-9 rounded-full border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </label>
                  </div>
                </Reveal>

                <Reveal delay={80}>
                  <div className="h-full rounded-3xl border border-hairline bg-surface p-5 raise-soft">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                        <ListChecks className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="title-section text-foreground">If you miss a day</h2>
                        <p className="text-xs text-muted-foreground">
                          We'll apply this automatically.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-2">
                      {FALLBACKS.map((f) => {
                        const selected = (active.fallback_rule ?? "shift") === f.value;
                        return (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => patchMutation.mutate({ fallback_rule: f.value })}
                            className={cn(
                              "tap grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                              selected
                                ? "border-primary bg-primary/5"
                                : "border-hairline hover:border-foreground/25",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid h-4 w-4 place-items-center rounded-full border",
                                selected ? "border-primary" : "border-border",
                              )}
                            >
                              {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-foreground">
                                {f.label}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {f.hint}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Reveal>
              </div>
            </Section>

            {/* Calendar sync ---------------------------------------------- */}
            <Section>
              <Reveal>
                <div className="rounded-3xl border border-hairline bg-surface p-5 raise-soft">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="title-section text-foreground">Calendar sync</h2>
                      <p className="text-xs text-muted-foreground">
                        Put your {calendarEvents.length} scheduled{" "}
                        {calendarEvents.length === 1 ? "session" : "sessions"} into Apple Calendar
                        or Google Calendar
                        {active.reminders_enabled
                          ? ", with a 30-minute alert before each one."
                          : "."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={exportCalendar} className={buttonStyles.primary}>
                      <CalendarDays className="mr-2 h-4 w-4" /> Add to Apple Calendar (.ics)
                    </button>
                    {nextSession ? (
                      <a
                        href={googleCalendarUrl({
                          uid: `${active.id}-${nextSession.dayId}`,
                          title: `Kettlebell · ${nextSession.label}`,
                          description: "Mike Salemi App training session",
                          date: nextSession.date,
                          time: reminderTimeFor(
                            prefs,
                            ((parseIso(nextSession.date).getDay() + 6) % 7) + 1,
                          ),
                          durationMinutes: 60,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonStyles.outline}
                      >
                        Add next session to Google
                      </a>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    The .ics file works with Apple Calendar, Outlook and Google Calendar (Settings →
                    Import). Re-download it whenever you change your plan to refresh the sessions.
                  </p>
                </div>
              </Reveal>
            </Section>

            <Section>
              <Container className="px-0">
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-subtle p-4">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Core training days and created sessions share this calendar. Immersion still
                    keeps its own linear order, so you can run both at once.
                  </p>
                </div>
              </Container>
            </Section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "tap relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-subtle",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform duration-300 [transition-timing-function:var(--ease-ios)]",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
