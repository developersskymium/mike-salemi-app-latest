import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ */
/* 1:1 coaching sessions with Mike                                      */
/* ------------------------------------------------------------------ */

export const getCoachingSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("coaching_sessions")
      .select(
        "id, package_id, package_name, scheduled_at, duration_minutes, timezone, focus, meeting_url, coach_notes, price_cents, status, created_at",
      )
      .eq("user_id", context.userId)
      .order("scheduled_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const bookCoachingSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      packageId: string;
      packageName: string;
      scheduledAt: string;
      durationMinutes: number;
      priceCents: number;
      timezone?: string;
      focus?: string;
    }) => {
      if (!input.packageId || !input.scheduledAt) throw new Error("Pick a package and a time.");
      if (Number.isNaN(Date.parse(input.scheduledAt))) throw new Error("That time is not valid.");
      if (input.durationMinutes < 15 || input.durationMinutes > 240) throw new Error("Invalid session length.");
      return {
        ...input,
        focus: input.focus?.slice(0, 1000) ?? "",
        timezone: input.timezone?.slice(0, 80) ?? "",
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("coaching_sessions").insert({
      user_id: context.userId,
      package_id: data.packageId,
      package_name: data.packageName,
      scheduled_at: data.scheduledAt,
      duration_minutes: data.durationMinutes,
      price_cents: data.priceCents,
      timezone: data.timezone || null,
      focus: data.focus || null,
      status: "requested",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelCoachingSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("coaching_sessions")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
