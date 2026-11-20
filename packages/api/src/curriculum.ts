import type { Curriculum, LessonWithSteps, Section, Step, VideoRef } from "@ms/core";
import type { DB, Tables } from "./client";

type VideoRow = Pick<Tables<"videos">, "provider_id" | "privacy_hash" | "title" | "duration_seconds" | "thumbnail_url">;
const toVideo = (v: VideoRow | null | undefined): VideoRef | null =>
  v ? { providerId: v.provider_id, privacyHash: v.privacy_hash, title: v.title, durationSeconds: v.duration_seconds, thumbnailUrl: v.thumbnail_url } : null;

type StepRow = Tables<"steps"> & {
  video: VideoRow | null;
  step_videos: { title: string; position: number; video: VideoRow | null }[];
};

export function toStep(s: StepRow): Step {
  return {
    id: s.id,
    lessonId: s.lesson_id,
    key: s.key,
    title: s.title,
    kind: s.kind,
    special: s.special,
    isRequired: s.is_required,
    position: s.position,
    video: toVideo(s.video),
    clips: s.step_videos
      .sort((a, b) => a.position - b.position)
      .flatMap((c) => (c.video ? [{ ...toVideo(c.video)!, title: c.title }] : [])),
  };
}

const VIDEO_COLS = "provider_id, privacy_hash, title, duration_seconds, thumbnail_url";
export const STEP_SELECT = `*, video:videos(${VIDEO_COLS}), step_videos(title, position, video:videos(${VIDEO_COLS}))`;

/**
 * Ordered curriculum for a program path. Steps load only when the member has access
 * (row rules hide them otherwise), so a locked program still returns its outline.
 */
export async function getCurriculum(sb: DB, programId: string, pathId: string | null): Promise<Omit<Curriculum, "program" | "path"> & { locked: boolean }> {
  let sq = sb.from("sections").select("*").eq("program_id", programId).order("position");
  sq = pathId ? sq.eq("path_id", pathId) : sq.is("path_id", null);
  const { data: sections, error } = await sq;
  if (error) throw new Error(`sections: ${error.message}`);
  const sectionIds = (sections ?? []).map((s) => s.id);
  if (!sectionIds.length) return { sections: [], lessons: [], locked: false };

  const [{ data: lessons, error: le }, { data: steps }] = await Promise.all([
    sb.from("lessons").select("*").in("section_id", sectionIds),
    sb.from("steps").select(STEP_SELECT).eq("program_id", programId).order("position"),
  ]);
  if (le) throw new Error(`lessons: ${le.message}`);
  const secPos = new Map((sections ?? []).map((s) => [s.id, s.position]));
  const byLesson = new Map<string, Step[]>();
  for (const s of (steps ?? []) as unknown as StepRow[]) {
    const list = byLesson.get(s.lesson_id) ?? [];
    list.push(toStep(s));
    byLesson.set(s.lesson_id, list);
  }
  const ordered: LessonWithSteps[] = (lessons ?? [])
    .sort((a, b) => (secPos.get(a.section_id)! - secPos.get(b.section_id)!) || a.position - b.position)
    .map((l) => ({
      id: l.id,
      sectionId: l.section_id,
      programId: l.program_id,
      pathId: l.path_id,
      key: l.key,
      title: l.title,
      pageType: (l.page_type as "overview" | "transition" | null) ?? null,
      dayNumber: l.day_number,
      dayType: l.day_type,
      formId: l.form_id,
      starterTableId: l.starter_table_id,
      position: l.position,
      steps: byLesson.get(l.id) ?? [],
    }));
  const mapped: Section[] = (sections ?? []).map((s) => ({
    id: s.id, programId: s.program_id, pathId: s.path_id, key: s.key, title: s.title, subtitle: s.subtitle, position: s.position,
  }));
  return { sections: mapped, lessons: ordered, locked: (steps ?? []).length === 0 && ordered.length > 0 };
}

/** Per-lesson progress and lock state, in order (server-computed, the source of truth for locks). */
export async function getCurriculumProgress(sb: DB, programId: string, pathId: string | null) {
  const { data, error } = await sb.rpc("curriculum_progress", { p_program: programId, p_path: pathId ?? undefined });
  if (error) throw new Error(`progress: ${error.message}`);
  return data ?? [];
}

/** One lesson (by uuid or stable key) with its steps, section and resources. */
export async function getLesson(sb: DB, idOrKey: string) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrKey);
  const { data: lesson, error } = await sb
    .from("lessons")
    .select("*, section:sections(id, title, subtitle, position, path_id)")
    .eq(isUuid ? "id" : "key", idOrKey)
    .maybeSingle();
  if (error) throw new Error(`lesson: ${error.message}`);
  if (!lesson) return null;
  const { data: steps } = await sb.from("steps").select(STEP_SELECT).eq("lesson_id", lesson.id).order("position");
  return { lesson, steps: ((steps ?? []) as unknown as StepRow[]).map(toStep), stepRows: (steps ?? []) as unknown as StepRow[] };
}
