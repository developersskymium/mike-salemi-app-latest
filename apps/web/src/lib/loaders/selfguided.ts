import "server-only";
import {
  continuePoints, dayNotes, getLesson, getTrainingSession, getWorkoutTable, sessionPool, smartNextLesson, toPlanItem, trainingHistory, trainingStats,
  type ContinuePoint, type DB, type HistoryRow, type SessionPlanItem, type SmartNextDTO, type TrainingStatsDTO,
} from "@ms/api";
import { lessonIntent, type LessonIntent, type PoolItem, type VideoRef, type WorkoutTable } from "@ms/core";
import { fixture, MOCK, mockable } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import { loadLessonPage, type LessonPageData, type PlayerStep } from "@/lib/loaders/training";

/**
 * Advanced Self-Guided loaders. Preview fixtures (MOCK_DATA=1) live in apps/web/fixtures/selfguided-*.json
 * and were captured from the real functions in rolled-back transactions as the test member.
 */

const slugPart = (s: string | null | undefined) => (s ?? "default").replace(/[^a-z0-9-]/gi, "-").toLowerCase();

/* ------------------------------------------------------------------ board (program page, Self-Guided mode) */

export interface LessonExtra {
  intent: LessonIntent;
  focus: string | null;
  minutes: number | null;
}

export interface BoardData {
  next: SmartNextDTO | null;
  continue: ContinuePoint | null;
  stats: TrainingStatsDTO | null;
  history: HistoryRow[];
  favourites: HistoryRow[];
  notes: Record<string, { body: string; updatedAt: string }>;
  pool: (PoolItem & { ord: number })[];
  lessons: Record<string, LessonExtra>;
  /** Phase blurbs (sections.description). */
  sections: Record<string, { description: string | null }>;
  extras: ProgramExtras;
}

export interface LevelInfo {
  pathId: string;
  key: string | null;
  name: string;
  shortName: string | null;
  tagline: string | null;
  image: string | null;
  phases: { title: string; subtitle: string | null }[];
  days: number;
  lessons: number;
  steps: number;
}

/** Legacy level-page extras: intro video, contributors, past runs, level cards. */
export interface ProgramExtras {
  heroVideo: (VideoRef & { title?: string }) | null;
  contributors: { name: string; credential?: string }[];
  pastRuns: { runNumber: number; startedAt: string | null; archivedAt: string; completed: boolean; lessonsCompleted: number }[];
  levels: LevelInfo[];
}

async function levelsOf(sb: DB, programId: string): Promise<LevelInfo[]> {
  const { data: paths } = await sb.from("program_paths").select("id, key, name, short_name, meta, position").eq("program_id", programId).order("position");
  return Promise.all(
    (paths ?? []).map(async (p) => {
      const m = (p.meta ?? {}) as J;
      const [{ data: secs }, { data: ls }] = await Promise.all([
        sb.from("sections").select("title, subtitle, position").eq("path_id", p.id).order("position"),
        sb.from("lessons").select("id, page_type").eq("path_id", p.id),
      ]);
      const ids = (ls ?? []).map((l) => l.id);
      const { count } = ids.length ? await sb.from("steps").select("id", { count: "exact", head: true }).in("lesson_id", ids) : { count: 0 };
      return {
        pathId: p.id, key: p.key, name: p.name, shortName: p.short_name, tagline: typeof m.tagline === "string" ? m.tagline : null,
        image: typeof m.image === "string" ? m.image : null, phases: (secs ?? []).map((x) => ({ title: x.title, subtitle: x.subtitle })),
        days: (ls ?? []).filter((l) => !l.page_type).length, lessons: (ls ?? []).length, steps: count ?? 0,
      };
    }),
  );
}

async function extrasOf(sb: DB, userId: string, programId: string, pathId: string | null): Promise<ProgramExtras> {
  const [pathRow, runs, levels] = await Promise.all([
    pathId ? sb.from("program_paths").select("meta").eq("id", pathId).maybeSingle() : Promise.resolve({ data: null }),
    (() => {
      let q = sb.from("run_archive").select("run_number, started_at, archived_at, completed, lessons_completed").eq("user_id", userId).eq("program_id", programId);
      q = pathId ? q.eq("path_id", pathId) : q.is("path_id", null);
      return q.order("run_number", { ascending: false });
    })(),
    levelsOf(sb, programId),
  ]);
  const m = ((pathRow.data as { meta: J } | null)?.meta ?? {}) as J;
  const hv = typeof m.hero_video === "string" ? m.hero_video : null;
  const [pid, hash] = hv ? hv.split("/") : [];
  return {
    heroVideo: pid ? { providerId: pid, privacyHash: hash ?? null, title: "Introduction" } : null,
    contributors: Array.isArray(m.contributors) ? (m.contributors as { name: string; credential?: string }[]) : [],
    pastRuns: (runs.data ?? []).map((r) => ({ runNumber: r.run_number, startedAt: r.started_at, archivedAt: r.archived_at, completed: r.completed, lessonsCompleted: r.lessons_completed })),
    levels,
  };
}

async function realBoard(sb: DB, userId: string, programId: string, pathId: string | null): Promise<BoardData> {
  let lq = sb.from("lessons").select("id, title, day_type, page_type, focus, estimated_minutes, section:sections(title, description, id)").eq("program_id", programId);
  lq = pathId ? lq.eq("path_id", pathId) : lq.is("path_id", null);
  const [next, cont, stats, history, pool, { data: lessonRows }, favs] = await Promise.all([
    smartNextLesson(sb, programId, pathId).catch(() => null),
    continuePoints(sb, programId, 1).catch(() => []),
    trainingStats(sb, programId).catch(() => null),
    trainingHistory(sb, { programId, limit: 30 }).catch(() => []),
    sessionPool(sb, programId, pathId).catch(() => []),
    lq,
    sb.from("training_sessions").select("id").eq("user_id", userId).eq("program_id", programId).eq("favourite", true).order("started_at", { ascending: false }).limit(12),
  ]);
  const rows = (lessonRows ?? []) as unknown as {
    id: string; title: string; day_type: string | null; page_type: string | null; focus: string | null; estimated_minutes: number | null;
    section: { id: string; title: string; description: string | null } | null;
  }[];
  const favIds = new Set((favs.data ?? []).map((f) => f.id));
  const [notes, extras] = await Promise.all([dayNotes(sb, userId, rows.map((r) => r.id)).catch(() => ({})), extrasOf(sb, userId, programId, pathId)]);
  const sections: BoardData["sections"] = {};
  for (const r of rows) if (r.section) sections[r.section.id] = { description: r.section.description };
  return {
    next,
    continue: cont[0] ?? null,
    stats,
    history,
    favourites: history.filter((h) => h.favourite || favIds.has(h.sessionId)),
    notes,
    pool,
    lessons: Object.fromEntries(
      rows.map((r) => [r.id, { intent: lessonIntent(r.day_type, r.page_type, r.title, r.section?.title), focus: r.focus, minutes: r.estimated_minutes }]),
    ),
    sections,
    extras,
  };
}

/** Board data for one program path. Preview fixture: `selfguided-board-<slug>-<path key>` (falls back to `-default`). */
export async function loadBoard(slug: string, pathKey: string | null, programId: string, pathId: string | null): Promise<BoardData | null> {
  if (MOCK) {
    return fixture<BoardData>(`selfguided-board-${slugPart(slug)}-${slugPart(pathKey)}`).catch(() =>
      fixture<BoardData>(`selfguided-board-${slugPart(slug)}-default`).catch(() => null),
    );
  }
  const { supabase, user } = await getUser();
  if (!user) return null;
  return realBoard(supabase, user.id, programId, pathId);
}

/* ------------------------------------------------------------------ hooks for other pages */

/** Continue points across every program (Today, Programs, Library). Fixture: `selfguided-continue`. */
export const loadContinue = mockable("selfguided-continue", async (limit?: number): Promise<ContinuePoint[]> => {
  const { supabase, user } = await getUser();
  if (!user) return [];
  return continuePoints(supabase, null, limit ?? 6).catch(() => []);
});

/** Training passport stats across programs (You). Fixture: `selfguided-stats`. */
export const loadTrainingStats = mockable("selfguided-stats", async (weeks?: number): Promise<TrainingStatsDTO | null> => {
  const { supabase, user } = await getUser();
  if (!user) return null;
  return trainingStats(supabase, null, weeks ?? 26).catch(() => null);
});

/** Recent history across programs (You). Fixture: `selfguided-history`. */
export const loadHistory = mockable("selfguided-history", async (limit?: number): Promise<HistoryRow[]> => {
  const { supabase, user } = await getUser();
  if (!user) return [];
  return trainingHistory(supabase, { limit: limit ?? 20 }).catch(() => []);
});

/* ------------------------------------------------------------------ session player */

export interface SessionStep {
  /** Plan item id: the step id, or the video id for library sessions. */
  id: string;
  stepId: string | null;
  lessonId: string | null;
  lessonKey: string | null;
  lessonTitle: string | null;
  title: string;
  role: SessionPlanItem["role"];
  slot: SessionPlanItem["slot"];
  minutes: number;
  video: (VideoRef & { title?: string }) | null;
  clips: (VideoRef & { title: string })[];
  poster: string | null;
  body: string | null;
  special: string | null;
  /** Default prescription for workout steps (form default table or starter table). */
  table: WorkoutTable | null;
}

export interface SessionPlayerData {
  session: {
    id: string;
    title: string;
    source: string;
    intent: string | null;
    startedAt: string;
    endedAt: string | null;
    minutes: number | null;
    plannedMinutes: number | null;
    notes: string | null;
    favourite: boolean;
    progress: { done: string[]; active: string | null; seconds: Record<string, number> };
  };
  program: { id: string; slug: string; name: string; image: string | null };
  steps: SessionStep[];
  autoplayNext: boolean;
}

type J = Record<string, unknown>;

async function realSession(sb: DB, userId: string, slug: string, id: string): Promise<SessionPlayerData | null> {
  const row = await getTrainingSession(sb, id);
  if (!row || row.user_id !== userId) return null;
  const { data: prog } = await sb.from("programs").select("id, slug, name, program_media(url, position)").eq("id", row.program_id).maybeSingle();
  if (!prog || prog.slug !== slug) return null;
  const plan = (Array.isArray(row.plan) ? row.plan : []) as J[];
  const items = plan.map(toPlanItem);
  const steps: SessionStep[] = await Promise.all(
    items.map(async (it): Promise<SessionStep> => {
      if (it.stepId) {
        const { data: st } = await sb.from("steps").select("lesson_id").eq("id", it.stepId).maybeSingle();
        const found = st ? await getLesson(sb, st.lesson_id) : null;
        const i = found ? found.steps.findIndex((s) => s.id === it.stepId) : -1;
        const step = i >= 0 ? (found!.steps[i] as PlayerStep | undefined) : undefined;
        const raw = i >= 0 ? found!.stepRows[i] : undefined;
        let table: WorkoutTable | null = null;
        if (raw?.special === "workout" && found) {
          const l = found.lesson;
          let tid = l.starter_table_id;
          if (!tid && l.form_id) tid = (await sb.from("forms").select("default_table_id").eq("id", l.form_id).maybeSingle()).data?.default_table_id ?? null;
          if (tid) table = await getWorkoutTable(sb, tid);
        }
        return {
          id: it.stepId, stepId: it.stepId, lessonId: found?.lesson.id ?? null, lessonKey: found?.lesson.key ?? it.lessonKey ?? null,
          lessonTitle: found?.lesson.title ?? it.lessonTitle ?? null, title: it.title, role: it.role, slot: it.slot, minutes: it.minutes,
          video: step?.video ?? null, clips: step?.clips ?? [], poster: step?.video?.thumbnailUrl ?? step?.clips[0]?.thumbnailUrl ?? null,
          body: raw?.body ?? null, special: raw?.special ?? null, table,
        };
      }
      const { data: v } = await sb.from("videos").select("provider_id, privacy_hash, title, duration_seconds, thumbnail_url").eq("id", it.videoId!).maybeSingle();
      return {
        id: it.videoId!, stepId: null, lessonId: null, lessonKey: null, lessonTitle: null, title: it.title, role: it.role, slot: it.slot, minutes: it.minutes,
        video: v ? { providerId: v.provider_id, privacyHash: v.privacy_hash, title: v.title, durationSeconds: v.duration_seconds, thumbnailUrl: v.thumbnail_url } : null,
        clips: [], poster: v?.thumbnail_url ?? null, body: null, special: null, table: null,
      };
    }),
  );
  const { data: profile } = await sb.from("profiles").select("preferences").eq("id", userId).maybeSingle();
  const prefs = (profile?.preferences ?? {}) as J;
  const pr = (row.progress ?? {}) as J;
  const media = [...((prog.program_media ?? []) as { url: string; position: number }[])].sort((a, b) => a.position - b.position);
  return {
    session: {
      id: row.id, title: row.title, source: row.source, intent: row.intent, startedAt: row.started_at, endedAt: row.ended_at, minutes: row.minutes,
      plannedMinutes: row.planned_minutes, notes: row.notes, favourite: row.favourite,
      progress: { done: Array.isArray(pr.done) ? (pr.done as string[]) : [], active: typeof pr.active === "string" ? pr.active : null, seconds: (pr.seconds ?? {}) as Record<string, number> },
    },
    program: { id: prog.id, slug: prog.slug, name: prog.name, image: media[0]?.url ?? null },
    steps,
    autoplayNext: prefs.autoplayNext !== false,
  };
}

/** Quick/custom/library session player. Preview fixture: `selfguided-session`. */
export async function loadSessionPlayer(slug: string, id: string): Promise<SessionPlayerData | null> {
  if (MOCK) return fixture<SessionPlayerData>("selfguided-session").catch(() => null);
  const { supabase, user } = await getUser();
  if (!user) return null;
  return realSession(supabase, user.id, slug, id);
}

/* ------------------------------------------------------------------ plan builder (legacy "creator") */

export interface PlanBuilderData {
  programs: {
    id: string;
    slug: string;
    name: string;
    rotate: boolean;
    image: string | null;
    lessons: { id: string; title: string; intent: LessonIntent; done: boolean; sectionTitle: string | null; minutes: number | null }[];
  }[];
  saved: { id: string; name: string; startsOn: string; sessions: number; done: number; createdAt: string; overview: string | null }[];
  today: string;
}

async function realPlanBuilder(sb: DB, userId: string): Promise<PlanBuilderData> {
  const [{ data: states }, { data: plans }] = await Promise.all([
    sb.rpc("program_access_states"),
    sb.from("member_plans").select("id, name, starts_on, created_at, overview, inputs, plan_items(id, done_at)").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(12),
  ]);
  const open = new Set((states ?? []).filter((s) => s.state !== "locked").map((s) => s.program_id));
  const { data: progs } = await sb
    .from("programs")
    .select("id, slug, name, type, position, program_media(url, position), lessons(id, title, day_type, page_type, estimated_minutes, path_id, section:sections(title, position), position)")
    .in("id", [...open])
    .in("type", ["day_program", "course"])
    .order("position");
  const programs: PlanBuilderData["programs"] = [];
  for (const p of (progs ?? []) as unknown as {
    id: string; slug: string; name: string; type: string; program_media: { url: string; position: number }[];
    lessons: { id: string; title: string; day_type: string | null; page_type: string | null; estimated_minutes: number | null; path_id: string | null; position: number; section: { title: string; position: number } | null }[];
  }[]) {
    if (!p.lessons.length) continue;
    const ids = p.lessons.map((l) => l.id);
    const { data: prog } = await sb.rpc("curriculum_progress", { p_program: p.id });
    const done = new Set((prog ?? []).filter((r) => r.complete).map((r) => r.lesson_id));
    // Level programs: the first path only (the member's level is picked on the program page).
    const firstPath = p.lessons.map((l) => l.path_id).find(Boolean) ?? null;
    const lessons = p.lessons
      .filter((l) => !firstPath || l.path_id === firstPath)
      .sort((a, b) => (a.section?.position ?? 0) - (b.section?.position ?? 0) || a.position - b.position)
      .map((l) => ({
        id: l.id, title: l.title, intent: lessonIntent(l.day_type, l.page_type, l.title, l.section?.title), done: done.has(l.id),
        sectionTitle: l.section?.title ?? null, minutes: l.estimated_minutes,
      }));
    void ids;
    programs.push({
      id: p.id, slug: p.slug, name: p.name, rotate: p.type === "day_program",
      image: [...p.program_media].sort((a, b) => a.position - b.position)[0]?.url ?? null, lessons,
    });
  }
  const saved = ((plans ?? []) as unknown as { id: string; name: string; starts_on: string; created_at: string; overview: string | null; inputs: J; plan_items: { done_at: string | null }[] }[])
    .filter((p) => (p.inputs as J)?.kind === "self_guided")
    .map((p) => ({ id: p.id, name: p.name, startsOn: p.starts_on, sessions: p.plan_items.length, done: p.plan_items.filter((i) => i.done_at).length, createdAt: p.created_at, overview: p.overview }));
  return { programs, saved, today: new Date().toISOString().slice(0, 10) };
}

/** Plan builder. Preview fixture: `selfguided-plan`. */
export const loadPlanBuilder = mockable("selfguided-plan", async (): Promise<PlanBuilderData | null> => {
  const { supabase, user } = await getUser();
  if (!user) return null;
  return realPlanBuilder(supabase, user.id);
});

/* ------------------------------------------------------------------ an average day (legacy self-guided.average-day) */

export const AVERAGE_DAY_KEY = "l1-phase-2-d25";

export interface AverageDayData {
  day: LessonPageData;
  /** Authored blocks around the real day: morning routine and post-training stretching. */
  videos: Record<string, VideoRef & { title: string }>;
}

/** The KBL example day (Level I · Phase II · Workout III) plus the authored routine videos. Fixture: `selfguided-average-day`. */
export async function loadAverageDay(slug: string, providerIds: string[]): Promise<AverageDayData | null> {
  if (MOCK) return fixture<AverageDayData>("selfguided-average-day").catch(() => null);
  const day = await loadLessonPage(slug, AVERAGE_DAY_KEY);
  if (!day) return null;
  const { supabase } = await getUser();
  const { data } = await supabase.from("videos").select("provider_id, privacy_hash, title, duration_seconds, thumbnail_url").in("provider_id", providerIds);
  const videos = Object.fromEntries(
    (data ?? []).map((v) => [v.provider_id, { providerId: v.provider_id, privacyHash: v.privacy_hash, title: v.title, durationSeconds: v.duration_seconds, thumbnailUrl: v.thumbnail_url }]),
  );
  return { day, videos };
}

/* ------------------------------------------------------------------ Self-Guided home (legacy /self-guided) */

export interface SelfGuidedHomeData {
  program: { slug: string; name: string; tagline: string | null };
  levels: LevelInfo[];
  programs: { slug: string; name: string; summary: string | null; image: string | null; lessons: number; sections: number; access: string }[];
}

/** "Train it your way": level cards for a program and every Self-Guided program. Fixture: `selfguided-home`. */
export async function loadSelfGuidedHome(slug: string): Promise<SelfGuidedHomeData | null> {
  if (MOCK) return fixture<SelfGuidedHomeData>("selfguided-home").catch(() => null);
  const { supabase: sb, user } = await getUser();
  if (!user) return null;
  const [{ data: prog }, { data: states }, { data: modes }] = await Promise.all([
    sb.from("programs").select("id, slug, name, tagline").eq("slug", slug).maybeSingle(),
    sb.rpc("program_access_states"),
    sb.from("program_modes").select("program_id").eq("mode", "self_guided"),
  ]);
  if (!prog) return null;
  const ids = (modes ?? []).map((m) => m.program_id);
  const access = new Map<string, string>((states ?? []).map((s: { program_id: string; state: string }) => [s.program_id, s.state] as [string, string]));
  const { data: progs } = await sb
    .from("programs")
    .select("id, slug, name, summary, tagline, position, program_media(url, position), lessons(count), sections(count)")
    .in("id", ids)
    .eq("status", "published")
    .order("position");
  return {
    program: { slug: prog.slug, name: prog.name, tagline: prog.tagline },
    levels: await levelsOf(sb, prog.id),
    programs: ((progs ?? []) as unknown as { id: string; slug: string; name: string; summary: string | null; tagline: string | null; program_media: { url: string; position: number }[]; lessons: { count: number }[]; sections: { count: number }[] }[]).map((p) => ({
      slug: p.slug, name: p.name, summary: p.summary || p.tagline || null,
      image: [...p.program_media].sort((a, b) => a.position - b.position)[0]?.url ?? null,
      lessons: p.lessons[0]?.count ?? 0, sections: p.sections[0]?.count ?? 0, access: access.get(p.id) ?? "locked",
    })),
  };
}
