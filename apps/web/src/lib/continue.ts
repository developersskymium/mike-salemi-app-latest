/**
 * What "Continue training" points at (Today hero, Today's next action, the rail's resume card).
 *
 * The member's main training program comes first: day programs (Kettlebell Lifestyle) before courses,
 * most recent first within each. Tool programs and free lead magnets (the Kettlebell Roadmap) never
 * take the spot, and an enrollment whose "up next" is still an intro lesson (the "Home" / "Start here"
 * sections flagged `sections.meta.intro` in 0015) only leads when nothing else is in progress.
 */

export interface ContinueRow {
  program_type: string | null;
  current_lesson_id: string | null;
  current_section_title: string | null;
  last_active_at: string | null;
  completed_at: string | null;
}

const TYPE_RANK: Record<string, number> = { day_program: 0, course: 1 };
/** Never the "continue" pick: tools and lead magnets built from lessons. */
const NOT_CONTINUE = new Set(["tool"]);

/**
 * Intro check. With the flagged lesson ids from the database use them; without (preview fixtures)
 * fall back to the flagged sections' shared title, "Home".
 */
export function introCheck(introLessonIds?: readonly string[] | null) {
  const ids = introLessonIds ? new Set(introLessonIds) : null;
  return (e: ContinueRow) => (ids ? ids.has(e.current_lesson_id ?? "") : (e.current_section_title ?? "").trim().toLowerCase() === "home");
}

/** Active enrollments in "continue" order (tools left out). */
export function continueOrder<E extends ContinueRow>(rows: readonly E[], introLessonIds?: readonly string[] | null): E[] {
  const isIntro = introCheck(introLessonIds);
  return rows
    .filter((e) => !e.completed_at && !NOT_CONTINUE.has(e.program_type ?? ""))
    .map((e) => ({ e, intro: isIntro(e) ? 1 : 0, rank: TYPE_RANK[e.program_type ?? ""] ?? 2 }))
    .sort((a, b) => a.intro - b.intro || a.rank - b.rank || (b.e.last_active_at ?? "").localeCompare(a.e.last_active_at ?? ""))
    .map((x) => x.e);
}

/** The enrollment "Continue training" opens, or undefined. */
export function pickContinue<E extends ContinueRow>(rows: readonly E[], introLessonIds?: readonly string[] | null): E | undefined {
  return continueOrder(rows, introLessonIds)[0];
}
