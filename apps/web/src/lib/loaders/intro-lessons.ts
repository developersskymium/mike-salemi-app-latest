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
