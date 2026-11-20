import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** One submitted KBL workout-day form, as the admin list shows it. */
export type KblFormEntry = {
  id: string;
  user_id: string;
  member: string;
  course_id: string;
  phase_id: string;
  day_id: string;
  form_id: string | null;
  score: number | null;
  band: string | null;
  band_name: string | null;
  table_id: string | null;
  outcome: string | null;
  answers: Record<string, string>;
  created_at: string;
};

/**
 * Admin-only list of every member's workout-day form entries, newest first.
 * Row security returns other members' rows only to admins.
 */
export const listKblFormEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Only administrators can view form entries.");

    const { data, error } = await context.supabase
      .from("workout_tables")
      .select(
        "id, user_id, course_id, phase_id, day_id, form_id, score, band, band_name, table_id, outcome, answers, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const ids = [...new Set(rows.map((row) => row.user_id))];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      for (const p of profiles ?? []) if (p.display_name) names.set(p.id, p.display_name);
    }

    return rows.map((row) => ({
      ...row,
      answers: (row.answers ?? {}) as Record<string, string>,
      member: names.get(row.user_id) ?? `Member ${row.user_id.slice(0, 8)}`,
    })) as KblFormEntry[];
  });
