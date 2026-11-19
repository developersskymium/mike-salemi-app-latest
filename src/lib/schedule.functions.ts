import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ScheduleRow = {
  id: string;
  name: string;
  course_id: string;
  start_date: string;
  fallback_rule: string;
  reminders_enabled: boolean;
  reminder_time: string;
  is_active: boolean;
};

export type ScheduleDayRow = {
  id: string;
  schedule_id: string;
  course_id: string;
  phase_id: string;
  day_id: string;
  scheduled_on: string;
  status: string;
};

export const getSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: schedules, error } = await context.supabase
      .from("schedules")
      .select("id, name, course_id, start_date, fallback_rule, reminders_enabled, reminder_time, is_active")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: days, error: daysError } = await context.supabase
      .from("schedule_days")
      .select("id, schedule_id, course_id, phase_id, day_id, scheduled_on, status")
      .eq("user_id", context.userId)
      .order("scheduled_on", { ascending: true });
    if (daysError) throw new Error(daysError.message);

    return { schedules: schedules ?? [], days: days ?? [] };
  });

export const createSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; courseId: string; startDate: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("schedules")
      .insert({
        user_id: context.userId,
        name: data.name.slice(0, 80) || "My schedule",
        course_id: data.courseId,
        start_date: data.startDate,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const [{ notifyByEmail }, { courses }] = await Promise.all([
      import("@/lib/notify.server"),
      import("@/content/program"),
    ]);
    const course = courses.find((c) => c.id === data.courseId);
    const startLabel = (() => {
      const parsed = new Date(`${data.startDate}T00:00:00`);
      return Number.isNaN(parsed.getTime())
        ? data.startDate
        : parsed.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    })();
    await notifyByEmail({
      supabase: context.supabase,
      userId: context.userId,
      email: context.claims?.email as string | undefined,
      event: {
        kind: "schedule_created",
        scheduleName: data.name.slice(0, 80) || "My schedule",
        startDate: startLabel,
        courseLabel: course?.title ?? data.courseId,
        firstDays: course?.phases?.[0]?.days?.slice(0, 3).map((d: { label?: string; title?: string }) => d.label ?? d.title ?? "").filter(Boolean),
      },
    });

    return row;
  });

export const updateSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      patch: Partial<{
        name: string;
        fallback_rule: string;
        reminders_enabled: boolean;
        reminder_time: string;
        start_date: string;
      }>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("schedules")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("schedules")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const placeScheduleDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      scheduleId: string;
      courseId: string;
      phaseId: string;
      dayId: string;
      scheduledOn: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("schedule_days").upsert(
      {
        schedule_id: data.scheduleId,
        user_id: context.userId,
        course_id: data.courseId,
        phase_id: data.phaseId,
        day_id: data.dayId,
        scheduled_on: data.scheduledOn,
      },
      { onConflict: "schedule_id,day_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeScheduleDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scheduleId: string; dayId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("schedule_days")
      .delete()
      .eq("schedule_id", data.scheduleId)
      .eq("day_id", data.dayId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkPlaceScheduleDays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      scheduleId: string;
      replace: boolean;
      days: { courseId: string; phaseId: string; dayId: string; scheduledOn: string }[];
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (data.replace) {
      const { error } = await context.supabase
        .from("schedule_days")
        .delete()
        .eq("schedule_id", data.scheduleId)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    }
    if (!data.days.length) return { ok: true };
    const { error } = await context.supabase.from("schedule_days").upsert(
      data.days.slice(0, 400).map((d) => ({
        schedule_id: data.scheduleId,
        user_id: context.userId,
        course_id: d.courseId,
        phase_id: d.phaseId,
        day_id: d.dayId,
        scheduled_on: d.scheduledOn,
      })),
      { onConflict: "schedule_id,day_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
