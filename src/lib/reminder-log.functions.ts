import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReminderEventStatus = "sent" | "opened" | "failed" | "snoozed" | "skipped";

export type ReminderEvent = {
  id: string;
  kind: string;
  channel: string;
  title: string;
  body: string | null;
  detail: string | null;
  status: ReminderEventStatus;
  scheduled_for: string | null;
  created_at: string;
  opened_at: string | null;
};

export const listReminderEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reminder_events")
      .select("id, kind, channel, title, body, detail, status, scheduled_for, created_at, opened_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as ReminderEvent[];
  });

export const logReminderEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      kind?: string;
      channel?: string;
      title: string;
      body?: string | null;
      detail?: string | null;
      status?: ReminderEventStatus;
      scheduledFor?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("reminder_events")
      .insert({
        user_id: context.userId,
        kind: data.kind ?? "training",
        channel: data.channel ?? "in_app",
        title: data.title,
        body: data.body ?? null,
        detail: data.detail ?? null,
        status: data.status ?? "sent",
        scheduled_for: data.scheduledFor ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string };
  });

export const markReminderOpened = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reminder_events")
      .update({ status: "opened", opened_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearReminderHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("reminder_events").delete().eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
