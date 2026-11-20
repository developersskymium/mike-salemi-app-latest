import "server-only";
import {
  getCurriculum, getCurriculumProgress, getForm, getLesson, getPosition, getProgram, getWorkoutTable, latestReadiness, lessonState,
  type DB,
} from "@ms/api";
import type { LearningMode, ReadinessForm, Step, WorkoutTable } from "@ms/core";
import { fixture, MOCK } from "@/lib/mock";
import { lessonHrefOf, programHref } from "@/lib/hrefs";
import { createClient, getUser } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ shared shapes */

export type ProgramInfo = NonNullable<Awaited<ReturnType<typeof getProgram>>>;

export interface PathInfo {
  id: string;
  key: string | null;
  kind: string;
  name: string;
  shortName: string | null;
  description: string | null;
  tagline: string | null;
  image: string | null;
  format: string[];
  outcomes: string[];
  whatsNeeded: string[];
}

export interface SectionLite {
  id: string;
  title: string;
  subtitle: string | null;
  position: number;
}

export interface LessonLite {
  id: string;
  key: string | null;
  sectionId: string;
  title: string;
  pageType: "overview" | "transition" | null;
  dayNumber: number | null;
  dayType: string | null;
  position: number;
}

/** One row of `curriculum_progress` (server truth for done/locked). */
export interface ProgressRow {
  lessonId: string;
  ord: number;
  complete: boolean;
  unlocked: boolean;
  doneSteps: number;
  totalSteps: number;
}

export interface EnrollmentInfo {
  id: string;
  mode: LearningMode;
  pace: string;
  trainingDays: number[];
  runNumber: number;
  startedAt: string;
  completedAt: string | null;
}

export interface ResourceInfo {
  id: string;
  title: string;
  url: string;
  kind: string;
  sectionId: string | null;
}

/* ------------------------------------------------------------------ program page */

export interface ProgramPageData {
  program: ProgramInfo;
  paths: PathInfo[];
  /** The selected level/focus (from `?path=`, else the enrolled one, else the first). */
  path: PathInfo | null;
  sections: SectionLite[];
  lessons: LessonLite[];
  progress: ProgressRow[];
  /** Outline only: the member can't open the steps. */
  locked: boolean;
  enrollment: EnrollmentInfo | null;
  resources: ResourceInfo[];
  certificateId: string | null;
}

type Json = Record<string, unknown>;
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const str = (v: unknown) => (typeof v === "string" ? v : null);

async function realProgramPage(sb: DB, userId: string, slug: string, pathKey: string | null): Promise<ProgramPageData | null> {
  const program = await getProgram(sb, slug);
  if (!program) return null;
  const [{ data: pathRows }, { data: enrollRows }] = await Promise.all([
    sb.from("program_paths").select("*").eq("program_id", program.id).order("position"),
    sb.from("enrollments").select("*").eq("user_id", userId).eq("program_id", program.id),
  ]);
  const paths: PathInfo[] = (pathRows ?? []).map((p) => {
    const m = (p.meta ?? {}) as Json;
    return {
      id: p.id, key: p.key, kind: p.kind, name: p.name, shortName: p.short_name, description: p.description,
      tagline: str(m.tagline), image: str(m.image), format: arr(m.format), outcomes: arr(m.outcomes), whatsNeeded: arr(m.whats_needed),
    };
  });
  const enrolledPathIds = new Set((enrollRows ?? []).map((e) => e.path_id));
  const path =
    // `?path=` carries the level key, or the path id when a level has no key.
    (pathKey ? paths.find((p) => p.key === pathKey || p.id === pathKey) : undefined) ??
    paths.find((p) => enrolledPathIds.has(p.id)) ??
    paths[0] ??
    null;
  const pathId = path?.id ?? null;
  const e = (enrollRows ?? []).find((r) => r.path_id === pathId) ?? null;

  const [curriculum, progress, { data: res }, { data: certs }] = await Promise.all([
    getCurriculum(sb, program.id, pathId),
    program.access === "locked" ? Promise.resolve([]) : getCurriculumProgress(sb, program.id, pathId),
    (() => {
      let q = sb.from("resources").select("*").eq("program_id", program.id).order("position");
      q = pathId ? q.eq("path_id", pathId) : q.is("path_id", null);
      return q;
    })(),
    (() => {
      let q = sb.from("certificates").select("id, run_number").eq("user_id", userId).eq("program_id", program.id);
      q = pathId ? q.eq("path_id", pathId) : q.is("path_id", null);
      return q.order("run_number", { ascending: false }).limit(1);
    })(),
  ]);

  return {
    program,
    paths,
    path,
    sections: curriculum.sections.map((s) => ({ id: s.id, title: s.title, subtitle: s.subtitle ?? null, position: s.position })),
    lessons: curriculum.lessons.map(toLite),
    progress: progress.map(toProgress),
    locked: program.access === "locked" || curriculum.locked,
    enrollment: e ? toEnrollment(e) : null,
    resources: (res ?? []).map((r) => ({ id: r.id, title: r.title, url: r.url, kind: r.kind, sectionId: r.section_id })),
    certificateId: certs?.[0]?.id ?? null,
  };
}

function toLite(l: { id: string; key?: string | null; sectionId: string; title: string; pageType: "overview" | "transition" | null; dayNumber?: number | null; dayType?: string | null; position: number }): LessonLite {
  return { id: l.id, key: l.key ?? null, sectionId: l.sectionId, title: l.title, pageType: l.pageType, dayNumber: l.dayNumber ?? null, dayType: l.dayType ?? null, position: l.position };
}
function toProgress(r: { lesson_id: string; ord: number; complete: boolean; unlocked: boolean; done_steps: number; total_steps: number }): ProgressRow {
  return { lessonId: r.lesson_id, ord: r.ord, complete: r.complete, unlocked: r.unlocked, doneSteps: r.done_steps, totalSteps: r.total_steps };
}
function toEnrollment(e: { id: string; mode: LearningMode; pace: string; training_days: number[]; run_number: number; started_at: string; completed_at: string | null }): EnrollmentInfo {
  return { id: e.id, mode: e.mode, pace: e.pace, trainingDays: e.training_days, runNumber: e.run_number, startedAt: e.started_at, completedAt: e.completed_at };
}

const fixtureSlug = (s: string | null | undefined) => (s ?? "default").replace(/[^a-z0-9-]/gi, "-").toLowerCase();

/** Program page. In preview mode reads `fixtures/training-program-<slug>-<path>.json`. */
export async function loadProgramPage(slug: string, pathKey: string | null): Promise<ProgramPageData | null> {
  if (MOCK) {
    try {
      return await fixture<ProgramPageData>(`training-program-${fixtureSlug(slug)}-${fixtureSlug(pathKey ?? "default")}`);
    } catch {
      return fixture<ProgramPageData>(`training-program-${fixtureSlug(slug)}-default`).catch(() => null);
    }
  }
  const { supabase, user } = await getUser();
  if (!user) return null;
  return realProgramPage(supabase, user.id, slug, pathKey);
}

/* ------------------------------------------------------------------ day / lesson player */

export interface Attachment {
  title: string;
  url: string;
  kind?: string;
}

export interface PlayerStep extends Step {
  body: string | null;
  description: string | null;
  durationLabel: string | null;
  attachments: Attachment[];
  /** Poster for the stage (video thumbnail or step image). */
  poster: string | null;
}

export interface LessonDetail {
  id: string;
  key: string | null;
  title: string;
  pageType: "overview" | "transition" | null;
  dayNumber: number | null;
  dayType: string | null;
  formId: string | null;
  starterTableId: string | null;
  focus: string | null;
  intro: string | null;
  estimatedMinutes: number | null;
  /** The "Let's begin" artwork, when the source had one. */
  image: string | null;
}

export interface LessonStateInfo {
  access: boolean;
  lockedOrder: boolean;
  unlocked: boolean;
  openThrough: number;
  completedSteps: string[];
  done: boolean;
  /** A free taste for a member without access (lesson_state.preview): watch only, nothing is saved. */
  preview?: boolean;
}

export interface ReadinessSaved {
  score: number;
  band: "green" | "amber" | "red";
  bandName: string;
  outcome: "workout" | "recovery" | "rest";
  tableId: string | null;
  answers: Record<string, string>;
  createdAt: string;
  /** Snapshot of the prescribed table when it was taken. */
  prescription: WorkoutTable | null;
}

export interface LessonPageData {
  program: Pick<ProgramInfo, "id" | "slug" | "name" | "type" | "modes" | "access" | "sectionLabel" | "lessonLabel" | "media">;
  path: Pick<PathInfo, "id" | "key" | "kind" | "name" | "shortName"> | null;
  section: SectionLite;
  lesson: LessonDetail;
  steps: PlayerStep[];
  /** The whole path, for prev/next, the step map and "what's next". */
  outline: LessonLite[];
  sections: SectionLite[];
  progress: ProgressRow[];
  state: LessonStateInfo;
  position: { activeStepId: string | null; videoSeconds: Record<string, number>; draftAnswers: Record<string, string> | null } | null;
  form: ReadinessForm | null;
  /** Every table the form can prescribe (band tables + default) and the lesson's starter table, by id. */
  tables: Record<string, WorkoutTable>;
  readiness: ReadinessSaved | null;
  enrollment: EnrollmentInfo | null;
  autoplayNext: boolean;
  firstName: string;
  certificateId: string | null;
  /**
   * The program's levels (KBL Level I / II) for the level switcher. Levels are a choice, not a
   * ladder: each keeps its own progress, the intake recommends one. Absent for single-path programs.
   */
  levels?: LevelChoice[];
}

/** One selectable level: where it resumes, its own progress, and whether the intake recommends it. */
export interface LevelChoice {
  key: string;
  label: string;
  shortName: string;
  /** Resume point (next unfinished day of that level) or the level's program page. */
  href: string;
  recommended: boolean;
  done: number;
  total: number;
}

/** Levels of a program with per-level progress and the intake recommendation (fallback: the first level). */
async function loadLevels(
  sb: DB,
  userId: string,
  program: { id: string; slug: string; type?: string | null },
  current: { pathId: string | null; progress: { lesson_id: string; ord: number; complete: boolean }[] },
  enrollRows: { path_id: string | null; recommended_path_id: string | null }[],
): Promise<LevelChoice[] | undefined> {
  const { data: rows } = await sb.from("program_paths").select("id, key, kind, name, short_name, position").eq("program_id", program.id).eq("kind", "level").order("position");
  const paths = rows ?? [];
  if (paths.length < 2) return undefined;
  let recommendedId = enrollRows.find((e) => e.recommended_path_id)?.recommended_path_id ?? null;
  if (!recommendedId) {
    const { data: form } = await sb.from("intake_forms").select("id").eq("key", "kbl-intake").maybeSingle();
    if (form) {
      const { data: resp } = await sb.from("intake_responses").select("result").eq("user_id", userId).eq("form_id", form.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const r = (resp?.result ?? {}) as Json;
      recommendedId = str(r.path_id) ?? paths.find((p) => p.key && p.key === str(r.path_key))?.id ?? null;
    }
  }
  if (!recommendedId || !paths.some((p) => p.id === recommendedId)) recommendedId = paths[0]!.id;
  const progressOf = await Promise.all(
    paths.map((p) => (p.id === current.pathId ? Promise.resolve(current.progress) : getCurriculumProgress(sb, program.id, p.id).catch(() => []))),
  );
  return paths.map((p, i) => {
    const prog = [...(progressOf[i] ?? [])].sort((a, b) => a.ord - b.ord);
    const resume = prog.find((r) => !r.complete) ?? null;
    const programPage = `${programHref(program.slug, program.type)}?path=${encodeURIComponent(p.key ?? p.id)}`;
    return {
      key: p.key ?? p.id,
      label: p.name,
      shortName: p.short_name ?? p.name,
      href: resume && prog.some((r) => r.complete) ? lessonHrefOf(program.slug, resume.lesson_id, { type: program.type }) : programPage,
      recommended: p.id === recommendedId,
      done: prog.filter((r) => r.complete).length,
      total: prog.length,
    };
  });
}

async function realLessonPage(sb: DB, userId: string, slug: string, lessonKey: string): Promise<LessonPageData | null> {
  const [program, found] = await Promise.all([getProgram(sb, slug), getLesson(sb, lessonKey)]);
  if (!program || !found || found.lesson.program_id !== program.id) return null;
  const l = found.lesson;
  const pathId = l.path_id;
  const sec = l.section as unknown as { id: string; title: string; subtitle: string | null; position: number };

  const [curriculum, progress, stateRaw, pos, form, readinessRow, { data: profile }, { data: enrollRows }, { data: pathRow }, { data: certs }] =
    await Promise.all([
      getCurriculum(sb, program.id, pathId),
      getCurriculumProgress(sb, program.id, pathId).catch(() => []),
      lessonState(sb, l.id),
      getPosition(sb, userId, l.id),
      l.form_id ? getForm(sb, l.form_id) : Promise.resolve(null),
      latestReadiness(sb, userId, l.id),
      sb.from("profiles").select("first_name, display_name, preferences").eq("id", userId).maybeSingle(),
      sb.from("enrollments").select("*").eq("user_id", userId).eq("program_id", program.id),
      pathId ? sb.from("program_paths").select("id, key, kind, name, short_name").eq("id", pathId).maybeSingle() : Promise.resolve({ data: null }),
      (() => {
        let q = sb.from("certificates").select("id").eq("user_id", userId).eq("program_id", program.id);
        q = pathId ? q.eq("path_id", pathId) : q.is("path_id", null);
        return q.order("run_number", { ascending: false }).limit(1);
      })(),
    ]);

  const tableIds = new Set<string>();
  if (form) {
    for (const b of form.bands) if (b.tableId) tableIds.add(b.tableId);
    if (form.defaultTableId) tableIds.add(form.defaultTableId);
  }
  if (l.starter_table_id) tableIds.add(l.starter_table_id);
  const tables: Record<string, WorkoutTable> = {};
  await Promise.all(
    [...tableIds].map(async (id) => {
      const t = await getWorkoutTable(sb, id);
      if (t) tables[id] = t;
    }),
  );

  const levels = await loadLevels(sb, userId, program, { pathId, progress }, enrollRows ?? []).catch(() => undefined);
  const prefs = (profile?.preferences ?? {}) as Json;
  const meta = (l.meta ?? {}) as Json;
  const e = (enrollRows ?? []).find((r) => r.path_id === pathId) ?? null;
  const p = pos as { active_step_id: string | null; video_seconds: unknown; draft_answers: unknown } | null;

  return {
    program: { id: program.id, slug: program.slug, name: program.name, type: program.type, modes: program.modes, access: program.access, sectionLabel: program.sectionLabel, lessonLabel: program.lessonLabel, media: program.media },
    path: pathRow ? { id: pathRow.id, key: pathRow.key, kind: pathRow.kind, name: pathRow.name, shortName: pathRow.short_name } : null,
    section: { id: sec.id, title: sec.title, subtitle: sec.subtitle, position: sec.position },
    lesson: {
      id: l.id, key: l.key, title: l.title, pageType: (l.page_type as LessonDetail["pageType"]) ?? null, dayNumber: l.day_number, dayType: l.day_type,
      formId: l.form_id, starterTableId: l.starter_table_id, focus: l.focus, intro: l.intro, estimatedMinutes: l.estimated_minutes,
      image: str(meta.lets_begin_image),
    },
    steps: found.steps.map((s, i) => {
      const row = found.stepRows[i]!;
      const m = (row.meta ?? {}) as Json;
      return {
        ...s,
        body: row.body,
        description: row.description,
        durationLabel: row.duration_label,
        attachments: Array.isArray(row.attachments) ? (row.attachments as unknown as Attachment[]) : [],
        poster: s.video?.thumbnailUrl ?? s.clips[0]?.thumbnailUrl ?? str(m.image) ?? null,
      };
    }),
    outline: curriculum.lessons.map(toLite),
    sections: curriculum.sections.map((s) => ({ id: s.id, title: s.title, subtitle: s.subtitle ?? null, position: s.position })),
    progress: progress.map(toProgress),
    state: {
      access: Boolean(stateRaw.access), lockedOrder: Boolean(stateRaw.locked_order), unlocked: stateRaw.unlocked !== false,
      openThrough: stateRaw.open_through ?? 0, completedSteps: stateRaw.completed_steps ?? [], done: Boolean(stateRaw.done), preview: Boolean((stateRaw as { preview?: boolean }).preview),
    },
    position: p ? { activeStepId: p.active_step_id, videoSeconds: (p.video_seconds ?? {}) as Record<string, number>, draftAnswers: (p.draft_answers ?? null) as Record<string, string> | null } : null,
    form,
    tables,
    readiness: readinessRow
      ? {
          score: readinessRow.score, band: readinessRow.band as ReadinessSaved["band"], bandName: readinessRow.band_name, outcome: readinessRow.outcome,
          tableId: readinessRow.table_id, answers: (readinessRow.answers ?? {}) as Record<string, string>, createdAt: readinessRow.created_at,
          prescription: (readinessRow.prescription as unknown as WorkoutTable | null) ?? null,
        }
      : null,
    enrollment: e ? toEnrollment(e) : null,
    autoplayNext: prefs.autoplayNext !== false,
    firstName: profile?.first_name || profile?.display_name?.split(/\s+/)[0] || "",
    certificateId: certs?.[0]?.id ?? null,
    levels,
  };
}

/** Preview: links built from enrollments use lesson ids; find the snapshot whose lesson has that id. */
async function mockLessonById(id: string): Promise<LessonPageData | null> {
  const { readdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const names = (await readdir(path.join(process.cwd(), "fixtures")).catch(() => [] as string[])).filter((n) => n.startsWith("training-lesson-") && !n.includes("-ready"));
  for (const n of names) {
    const f = await fixture<LessonPageData>(n.replace(/\.json$/, "")).catch(() => null);
    if (f?.lesson.id === id) return f;
  }
  return null;
}

/** Day / lesson player data. In preview mode reads `fixtures/training-lesson-<lesson key>.json`. */
export async function loadLessonPage(slug: string, lessonKey: string): Promise<LessonPageData | null> {
  if (MOCK) return fixture<LessonPageData>(`training-lesson-${fixtureSlug(lessonKey)}`).catch(() => mockLessonById(lessonKey));
  const { supabase, user } = await getUser();
  if (!user) return null;
  return realLessonPage(supabase, user.id, slug, lessonKey);
}

/* ------------------------------------------------------------------ certificates */

export interface CertificateData {
  id: string;
  name: string;
  program: string;
  programSlug: string | null;
  path: string | null;
  issuedAt: string;
  run: number;
  verifyCode: string;
  /** Days and phases in the path, for the certificate's small print. */
  days: number | null;
  phases: number | null;
  /** Program artwork for the ambient backdrop. */
  image: string | null;
}

/** A member's own certificate. Preview fixture: `training-certificate`. */
export async function loadCertificate(id: string): Promise<CertificateData | null> {
  if (MOCK) return fixture<CertificateData>("training-certificate").catch(() => null);
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data: c } = await supabase
    .from("certificates")
    .select("id, name_on_certificate, issued_at, run_number, verify_code, path_id, program:programs(name, slug, program_media(url, position)), path:program_paths(name, meta)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!c) return null;
  const prog = c.program as unknown as { name: string; slug: string; program_media: { url: string; position: number }[] } | null;
  const path = c.path as unknown as { name: string; meta: Json | null } | null;
  const image = str(path?.meta?.image) ?? [...(prog?.program_media ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null;
  let days: number | null = null;
  let phases: number | null = null;
  if (c.path_id) {
    const [{ count: d }, { count: s }] = await Promise.all([
      supabase.from("lessons").select("id", { count: "exact", head: true }).eq("path_id", c.path_id).not("day_number", "is", null),
      supabase.from("sections").select("id", { count: "exact", head: true }).eq("path_id", c.path_id),
    ]);
    days = d ?? null;
    phases = s ?? null;
  }
  return {
    id: c.id, name: c.name_on_certificate, program: prog?.name ?? "", programSlug: prog?.slug ?? null, path: path?.name ?? null,
    issuedAt: c.issued_at, run: c.run_number, verifyCode: c.verify_code, days, phases, image,
  };
}

export interface VerifiedCertificate {
  name: string;
  program: string;
  path: string | null;
  issuedAt: string;
  run: number;
}

/** Public verification by code (no sign-in). Preview fixture: `training-verify`. */
export async function loadVerification(code: string): Promise<VerifiedCertificate | null> {
  if (MOCK) {
    const v = await fixture<VerifiedCertificate & { code: string }>("training-verify").catch(() => null);
    return v && v.code.toUpperCase() === code.toUpperCase() ? v : null;
  }
  const sb = await createClient();
  const { data } = await sb.rpc("verify_certificate", { p_code: code });
  const v = data as { name?: string; program?: string; path?: string | null; issued_at?: string; run?: number } | null;
  if (!v?.name) return null;
  return { name: v.name, program: v.program ?? "", path: v.path ?? null, issuedAt: v.issued_at ?? "", run: v.run ?? 1 };
}
