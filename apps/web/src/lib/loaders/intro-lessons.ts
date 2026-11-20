import "server-only";
import type { DB } from "@ms/api";

/** Lesson ids in intro sections (`sections.meta.intro`, flagged in 0015). Outline rows are public; a failure means "none known". */
export async function introLessonIds(sb: DB): Promise<string[] | null> {
  const db = sb as unknown as {
    from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => PromiseLike<{ data: { lessons: { id: string }[] | null }[] | null; error: unknown }> } };
  };
  try {
    const { data, error } = await db.from("sections").select("lessons(id)").eq("meta->>intro", "true");
    if (error || !data) return null;
    return data.flatMap((s) => (s.lessons ?? []).map((l) => l.id));
  } catch {
    return null;
  }
}

/** Titles that are a program's front page, not a lesson ("Home", "Welcome", "Start here"). */
const INTRO_TITLE = /^\s*(home|welcome|start here|program overview|course overview)\s*$/i;

type NextRow = { program_id: string; path_id?: string | null; current_lesson_id: string | null; current_lesson_title: string | null; current_section_title: string | null };

/**
 * `my_enrollments` keeps the intro lesson ("Home") as "up next" (legacy showed "Start here" first), so Home
 * labelled tiles "Next: Home". Relabel those rows with the first unfinished real lesson (title + section).
 * The id stays the intro lesson's, so Continue ordering (`continueOrder`) is unchanged. Failures keep the row.
 */
export async function labelPastIntro<E extends NextRow>(sb: DB, rows: E[], introIds: readonly string[] | null): Promise<E[]> {
  const intro = new Set(introIds ?? []);
  const isIntro = (id: string | null, title: string | null) => (id != null && intro.has(id)) || (title != null && INTRO_TITLE.test(title));
  const db = sb as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: { lesson_id: string; ord: number; complete: boolean }[] | null }>;
    from: (t: string) => { select: (c: string) => { in: (k: string, v: string[]) => PromiseLike<{ data: { id: string; title: string; sections: { title: string; meta: { intro?: unknown } | null } | null }[] | null }> } };
  };
  return Promise.all(
    rows.map(async (e) => {
      if (!isIntro(e.current_lesson_id, e.current_lesson_title)) return e;
      try {
        const { data: prog } = await db.rpc("curriculum_progress", { p_program: e.program_id, p_path: e.path_id ?? undefined });
        const open = (prog ?? []).filter((r) => !r.complete && !intro.has(r.lesson_id)).sort((a, b) => a.ord - b.ord).slice(0, 6);
        if (!open.length) return e;
        const { data: ls } = await db.from("lessons").select("id, title, sections(title, meta)").in("id", open.map((r) => r.lesson_id));
        const byId = new Map((ls ?? []).map((l) => [l.id, l]));
        const real = open.map((r) => byId.get(r.lesson_id)).find((l) => l && !INTRO_TITLE.test(l.title) && !(l.sections?.meta && String(l.sections.meta.intro) === "true"));
        if (!real) return e;
        return { ...e, current_lesson_title: real.title, current_section_title: real.sections?.title ?? null };
      } catch {
        return e;
      }
    }),
  );
}
