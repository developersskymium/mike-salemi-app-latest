import "server-only";
import { mockable } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import type { ProgramRun, SavedCheck, SetupProfile, SwingHomeData } from "@/lib/swing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/** Everything the Swing Set-Up Coach home needs, in one parallel read (tables from migration 0034). */
export const loadSwingHome = mockable("swing-setup", async (): Promise<SwingHomeData> => {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Not signed in");
  const sb = supabase as Loose;
  const [profile, checks, run, selector, tp] = await Promise.all([
    sb.from("setup_profiles").select("neck_history, bell_type, bell_kg, goal, disclaimer_at").eq("user_id", user.id).maybeSingle(),
    sb.from("setup_checks").select("id, created_at, measures, steps, main_fault, faults").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
    sb.from("swing_program_runs").select("id, bell_kg, started_at, finished_at, swing_program_sets(session, set_no, reps, feel, created_at)").eq("user_id", user.id).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("tool_results").select("answers, result").eq("user_id", user.id).eq("tool_id", "kettlebell-selector").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("training_profiles").select("data").eq("user_id", user.id).maybeSingle(),
  ]);
  const sel = selector.data as { answers?: Record<string, string>; result?: { bells?: { size?: number }[] } } | null;
  const bells = sel?.result?.bells ?? [];
  const working = bells[1]?.size ?? bells[0]?.size ?? null;
  const sex = sel?.answers?.gender === "female" ? "female" : sel?.answers?.gender === "male" ? "male" : null;
  const r = run.data as (Omit<ProgramRun, "sets"> & { swing_program_sets?: ProgramRun["sets"] }) | null;
  return {
    profile: (profile.data as SetupProfile | null) ?? null,
    checks: (checks.data as SavedCheck[] | null) ?? [],
    run: r
      ? {
          id: r.id,
          bell_kg: Number(r.bell_kg),
          started_at: r.started_at,
          finished_at: r.finished_at,
          sets: [...(r.swing_program_sets ?? [])].sort((a, b) => a.session - b.session || a.set_no - b.set_no),
        }
      : null,
    prefill: {
      selectorKg: typeof working === "number" ? Math.round(working) : null,
      sex,
      profileBells: ((tp.data?.data ?? {}) as { bell_weights?: string }).bell_weights ?? null,
    },
  };
});
