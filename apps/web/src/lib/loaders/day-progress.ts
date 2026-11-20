import "server-only";
import { cache } from "react";
import { myRewards, type DB } from "@ms/api";
import { createClient } from "@/lib/supabase/server";
import { fixture, MOCK } from "@/lib/mock";

/*
 * ONE source of truth for the numbers members see in several places at once (D09):
 *
 * - Progress through a day program = TRAINING DAYS done / training days in the level. A training day
 *   is a lesson with a day number that is not an info page and not in an intro section ("Start here").
 *   The rail's resume ring, Today (hero, climb, "Your programs"), the program page and You all read
 *   this; percentages are always Math.round(100 · done / total).
 * - The streak = my_rewards.streak_current / streak_best, for the top bar, Today, the program page
 *   and You.
 *
 * Both are wrapped in React `cache()`, so the shell and the page share one read per request.
 */

export interface DaySection {
  id: string;
  title: string;
  position: number;
  /** All (non-intro) lessons in the section. */
  total: number;
  done: number;
  /** Training days in the section. */
  days: number;
  daysDone: number;
}

export interface DayProgress {
  done: number;
  total: number;
  sections: DaySection[];
}

export interface StreakCount {
  current: number;
  best: number;
}

/** Whole-number percent, the same rounding everywhere. */
export const pctOf = (done: number, total: number) => (total > 0 ? Math.round((100 * Math.min(done, total)) / total) : 0);

type LessonRow = { id: string; day_number: number | null; page_type: string | null; sections: { id: string; title: string; position: number; meta: { intro?: boolean | string } | null } | null };

async function realDays(programId: string, pathId: string | null): Promise<DayProgress | null> {
  const sb = (await createClient()) as unknown as DB;
  const { data: rows } = await sb.rpc("curriculum_progress", { p_program: programId, p_path: pathId ?? undefined });
  if (!rows?.length) return null;
  const { data } = await sb.from("lessons").select("id, day_number, page_type, sections(id, title, position, meta)").in("id", rows.map((r) => r.lesson_id));
  const byId = new Map(((data ?? []) as unknown as LessonRow[]).map((l) => [l.id, l]));
  const out = new Map<string, DaySection>();
  let done = 0;
  let total = 0;
  for (const r of rows) {
    const l = byId.get(r.lesson_id);
    const s = l?.sections;
    if (!l || !s) continue;
    const intro = s.meta?.intro === true || s.meta?.intro === "true";
    if (intro) continue;
    const j = out.get(s.id) ?? { id: s.id, title: s.title, position: s.position, total: 0, done: 0, days: 0, daysDone: 0 };
    j.total++;
    if (r.complete) j.done++;
    if (l.day_number != null && !l.page_type) {
      j.days++;
      total++;
      if (r.complete) {
        j.daysDone++;
        done++;
      }
    }
    out.set(s.id, j);
  }
  if (!total) return null;
  return { done, total, sections: [...out.values()].sort((a, b) => a.position - b.position) };
}

/** Preview: the snapshot's journey (today-home.json) is the member's current level. */
async function mockDays(programId: string, pathId: string | null): Promise<DayProgress | null> {
  const raw = await fixture<{
    enrollments: { enrollment_id: string; program_id: string; path_id: string | null }[];
    journey: { enrollmentId: string; sections: { title: string; total: number; done: number; days?: number; daysDone?: number }[] } | null;
  }>("today-home").catch(() => null);
  const e = raw?.enrollments.find((x) => x.program_id === programId && (x.path_id ?? null) === pathId);
  if (!raw?.journey || !e || raw.journey.enrollmentId !== e.enrollment_id) return null;
  const sections = raw.journey.sections.map((s, i) => ({ id: `mock-${i}`, title: s.title, position: i, total: s.total, done: s.done, days: s.days ?? 0, daysDone: s.daysDone ?? 0 }));
  const total = sections.reduce((n, s) => n + s.days, 0);
  return total ? { done: sections.reduce((n, s) => n + s.daysDone, 0), total, sections } : null;
}

/** Training-day progress through one level (program + path). Null when the level has no day lessons. */
export const dayProgress = cache(async (programId: string, pathId: string | null): Promise<DayProgress | null> => {
  try {
    return await (MOCK ? mockDays(programId, pathId) : realDays(programId, pathId));
  } catch {
    return null;
  }
});

interface CountRow {
  program_type: string | null;
  program_id: string;
  path_id: string | null;
  lessons_done: number;
  lessons_total: number;
  completed_at: string | null;
}

/**
 * Day programs count training days, not lessons: `lessons_done` / `lessons_total` of every active
 * day-program enrollment are replaced by its training-day counts, so every screen that reads an
 * enrollment shows the same "23 / 61 days · 38%".
 */
export async function withTrainingDays<E extends CountRow>(rows: E[]): Promise<E[]> {
  return Promise.all(
    rows.map(async (e) => {
      if (e.program_type !== "day_program" || e.completed_at) return e;
      const d = await dayProgress(e.program_id, e.path_id ?? null);
      return d ? { ...e, lessons_done: d.done, lessons_total: d.total } : e;
    }),
  );
}

/** The member's streak (my_rewards), shared by the top bar, Today, the program page and You. */
export const streakCount = cache(async (): Promise<StreakCount> => {
  try {
    if (MOCK) {
      const { rewards: r } = await fixture<{ rewards: { streak_current?: number; streak_best?: number } }>("tpy-rewards");
      return { current: r.streak_current ?? 0, best: r.streak_best ?? 0 };
    }
    const r = await myRewards((await createClient()) as unknown as DB);
    return { current: r.streak_current ?? 0, best: r.streak_best ?? 0 };
  } catch {
    return { current: 0, best: 0 };
  }
});
