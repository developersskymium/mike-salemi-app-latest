import "server-only";
import { cache } from "react";
import type { DB } from "@ms/api";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import type { DayMemory } from "@/components/training/DayMemory";

type Loose = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Latest bell per exercise (account-wide) and this day's feel answer. Empty in preview mode or signed out. */
export const loadDayMemory = cache(async (lessonId: string): Promise<DayMemory> => {
  const empty: DayMemory = { lessonId, weights: {}, feel: null };
  if (MOCK) return empty;
  try {
    const { supabase, user } = await getUser();
    if (!user) return empty;
    const sb = supabase as unknown as DB & Loose;
    const [w, f] = await Promise.all([
      sb.from("exercise_weights").select("exercise_key, kg, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(400),
      sb.from("day_feels").select("feel").eq("user_id", user.id).eq("lesson_id", lessonId).maybeSingle(),
    ]);
    const weights: Record<string, number> = {};
    for (const r of (w.data ?? []) as { exercise_key: string; kg: number | string }[]) if (!(r.exercise_key in weights)) weights[r.exercise_key] = Number(r.kg);
    return { lessonId, weights, feel: ((f.data as { feel?: DayMemory["feel"] } | null)?.feel ?? null) };
  } catch {
    return empty;
  }
});
