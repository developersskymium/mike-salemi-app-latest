import "server-only";
import { loadCourseOutline, loadCoursePage } from "@/lib/loaders/course";
import { loadRetreatJourney } from "@/lib/loaders/experiences";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import type { SeriesMedia } from "@/lib/series";

const EMPTY: SeriesMedia = { thumbs: {}, minutes: {} };

/** Vimeo thumbnails and durations of each lesson's first video (one query; preview mode has none). */
async function lessonMedia(programId: string): Promise<SeriesMedia> {
  if (MOCK) return EMPTY;
  try {
    const { supabase: sb } = await getUser();
    const { data } = await sb
      .from("steps")
      .select("lesson_id, position, videos(thumbnail_url, duration_seconds)")
      .eq("program_id", programId)
      .not("video_id", "is", null)
      .order("position");
    const out: SeriesMedia = { thumbs: {}, minutes: {} };
    for (const r of (data ?? []) as unknown as { lesson_id: string; videos: { thumbnail_url: string | null; duration_seconds: number | null } | null }[]) {
      const v = r.videos;
      if (!v) continue;
      if (v.thumbnail_url && !out.thumbs[r.lesson_id] && /^https:\/\/i\.vimeocdn\.com\//.test(v.thumbnail_url)) out.thumbs[r.lesson_id] = v.thumbnail_url;
      if (v.duration_seconds && !out.minutes[r.lesson_id]) out.minutes[r.lesson_id] = Math.max(1, Math.round(v.duration_seconds / 60));
    }
    return out;
  } catch {
    return EMPTY;
  }
}

/** The member's private note on a lesson (day_notes; notes + reflection), or null. */
async function myNote(lessonId: string): Promise<string | null> {
  if (MOCK) return null;
  try {
    const { supabase: sb, user } = await getUser();
    if (!user) return null;
    const { data } = await sb.from("day_notes").select("body").eq("user_id", user.id).eq("lesson_id", lessonId).maybeSingle();
    return data?.body ?? null;
  } catch {
    return null;
  }
}

/** The member's next retreat start (Men of Movement preparation countdown), or null. */
async function retreatStart(slug: string): Promise<{ startsAt: string; name: string } | null> {
  if (slug !== "men-of-movement") return null;
  const j = await loadRetreatJourney().catch(() => null);
  return j && new Date(j.startsAt).getTime() > Date.now() ? { startsAt: j.startsAt, name: j.name } : null;
}

export async function loadSeriesHome(slug: string) {
  const data = await loadCourseOutline(slug);
  if (!data) return null;
  const [media, retreat] = await Promise.all([lessonMedia(data.program.id), retreatStart(slug)]);
  return { data, media, retreat };
}

export async function loadSeriesLesson(slug: string, token: string) {
  const data = await loadCoursePage(slug, token);
  if (!data) return null;
  const lessonId = data.lesson?.id ?? null;
  const [media, note] = await Promise.all([data.locked ? EMPTY : lessonMedia(data.program.id), lessonId && !data.locked ? myNote(lessonId) : null]);
  return { data, media, note };
}

export type SeriesHomeData = NonNullable<Awaited<ReturnType<typeof loadSeriesHome>>>;
export type SeriesLessonData = NonNullable<Awaited<ReturnType<typeof loadSeriesLesson>>>;
