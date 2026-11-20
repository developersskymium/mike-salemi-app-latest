import "server-only";
import {
  getLesson, getProgram, getIntakeForm, intakeHistory, mtkPlans, myTrainingProfile, prefillIntake, programIntake,
  type DB, type IntakeAnswers, type IntakeForm, type IntakeResult, type Prefill, type TrainingProfile,
} from "@ms/api";
import { MTK_SLUG, type MtkPathId, type MtkPlanDay, type VideoRef } from "@ms/core";
import { coverFor, type Cover } from "@/lib/covers";
import { resolveJourney, type JourneyConfig } from "@/lib/journey";
import { fixture, MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ shapes */

export interface CourseProgram {
  id: string;
  slug: string;
  name: string;
  type: string;
  tagline: string | null;
  summary: string | null;
  description: string | null;
  highlights: string[];
  image: string | null;
  access: string;
  isFree: boolean;
  level: string | null;
  instructor: string;
  /** Signature journey (programs.meta.journey over the defaults in lib/journey). */
  journey: JourneyConfig;
  /** Text-free cover with focal points (lib/covers). */
  cover: Cover;
}

export interface CourseLessonNode {
  id: string;
  key: string | null;
  title: string;
  sectionId: string;
  /** Has a video (▶) or is a reading/download lesson (document icon). */
  video: boolean;
  done: boolean;
  minutes: number | null;
}

export interface CourseSectionNode {
  id: string;
  title: string;
  position: number;
  /** Group name (`sections.subtitle`), null for ungrouped courses. */
  group: string | null;
  lessons: CourseLessonNode[];
}

export interface CourseGroup {
  name: string;
  sections: CourseSectionNode[];
}

export interface CourseStep {
  id: string;
  title: string;
  required: boolean;
  done: boolean;
  video: VideoRef | null;
  poster: string | null;
  clips: (VideoRef & { title: string })[];
  body: string | null;
  description: string | null;
  attachments: { title: string; url: string; kind?: string | null }[];
}

export interface CourseLesson {
  id: string;
  title: string;
  sectionId: string;
  isIntro: boolean;
  steps: CourseStep[];
  /** Saved video positions by video provider id (cross-device resume). */
  videoSeconds: Record<string, number>;
}

export interface CourseMtk {
  assessmentDone: boolean;
  /** The active plan, when the member made one. */
  plan: { version: number; lessonIds: string[]; days: MtkPlanDay[] } | null;
  /** Intake focus path, for "On your path" section dots when there is no plan. */
  pathBucket: MtkPathId | null;
}

export interface CourseIntro {
  sectionId: string;
  lessonId: string;
  title: string;
}

/** Everything the course player needs; `lesson` is filled for the active lesson. */
export interface CourseData {
  program: CourseProgram;
  /** Outline only (no access): overview + "choose access". */
  locked: boolean;
  intro: CourseIntro | null;
  groups: CourseGroup[];
  enrolled: boolean;
  /** Last lesson the member opened (any device). */
  lastLessonId: string | null;
  intake: { key: string; done: boolean } | null;
  mtk: CourseMtk | null;
}

export interface CoursePageData extends CourseData {
  /** "intro" or a lesson id. */
  activeId: string;
  lesson: CourseLesson | null;
}

type Json = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : null);

export const INTRO = "intro";

/** First section flagged `meta.intro` (W5) or the imported "Home" page at the top: the course introduction, never counted. */
function introSection<T extends { title: string; position: number; meta?: unknown }>(sections: T[]): T | null {
  const flagged = sections.find((s) => (s.meta as Json | null)?.intro === true);
  if (flagged) return flagged;
  const first = [...sections].sort((a, b) => a.position - b.position)[0];
  return first && /^home$/i.test(first.title.trim()) && sections.length > 1 ? first : null;
}

export function groupSections(sections: CourseSectionNode[]): CourseGroup[] {
  const out: CourseGroup[] = [];
  for (const s of sections) {
    const name = s.group?.trim() || "Start Here";
    let g = out.find((x) => x.name === name);
    if (!g) {
      g = { name, sections: [] };
      out.push(g);
    }
    g.sections.push(s);
  }
  return out;
}

/** Which lesson a bare course URL opens: `start` → intro; `resume` → last opened → first unfinished → intro on a first visit. */
export function resolveActive(d: CourseData, token: string): string {
  const all = d.groups.flatMap((g) => g.sections.flatMap((s) => s.lessons));
  const valid = (id: string | null | undefined) => Boolean(id) && all.some((l) => l.id === id || l.key === id);
  if (token === "start" || token === INTRO) return d.intro ? INTRO : all[0]?.id ?? INTRO;
  // A link to the intro lesson itself (the "Home" / "Start here" lesson, e.g. from a day-player URL) opens the introduction.
  if (d.intro && token === d.intro.lessonId) return INTRO;
  if (token !== "resume" && valid(token)) return all.find((l) => l.id === token || l.key === token)!.id;
  const anyDone = all.some((l) => l.done);
  if (!anyDone && !d.lastLessonId && d.intro) return INTRO;
  if (valid(d.lastLessonId)) return d.lastLessonId!;
  return (all.find((l) => !l.done) ?? all[0])?.id ?? INTRO;
}

/* ------------------------------------------------------------------ real */

async function realCourse(sb: DB, userId: string, slug: string): Promise<{ data: CourseData; programId: string } | null> {
  const program = await getProgram(sb, slug);
  if (!program) return null;
  const isMtk = slug === MTK_SLUG;

  const [{ data: secRows }, { data: lessonRows }, { data: stepRows }, { data: progress }, { data: lastRows }, { data: enrollRows }, form] = await Promise.all([
    sb.from("sections").select("id, title, subtitle, position, meta").eq("program_id", program.id).is("path_id", null).order("position"),
    sb.from("lessons").select("id, key, title, section_id, position, estimated_minutes").eq("program_id", program.id).order("position"),
    sb.from("steps").select("lesson_id, video_id, is_required").eq("program_id", program.id),
    program.access === "locked" ? Promise.resolve({ data: [] as { lesson_id: string; complete: boolean; total_steps: number }[] }) : sb.rpc("curriculum_progress", { p_program: program.id }),
    sb.from("lesson_positions").select("lesson_id, updated_at, lessons!inner(program_id)").eq("user_id", userId).eq("lessons.program_id", program.id).order("updated_at", { ascending: false }).limit(1),
    sb.from("enrollments").select("id").eq("user_id", userId).eq("program_id", program.id).limit(1),
    programIntake(sb, program.id).catch(() => null),
  ]);

  const sections = secRows ?? [];
  const intro = introSection(sections);
  const done = new Set((progress ?? []).filter((r) => r.complete && r.total_steps > 0).map((r) => r.lesson_id));
  const hasVideo = new Set((stepRows ?? []).filter((s) => s.video_id).map((s) => s.lesson_id));
  const byLessonSection = new Map<string, CourseLessonNode[]>();
  for (const l of lessonRows ?? []) {
    const list = byLessonSection.get(l.section_id) ?? [];
    list.push({ id: l.id, key: l.key, title: l.title, sectionId: l.section_id, video: hasVideo.has(l.id), done: done.has(l.id), minutes: l.estimated_minutes });
    byLessonSection.set(l.section_id, list);
  }
  const introLesson = intro ? byLessonSection.get(intro.id)?.[0] ?? null : null;
  const nodes: CourseSectionNode[] = sections
    .filter((s) => s.id !== intro?.id)
    .map((s) => ({ id: s.id, title: s.title, position: s.position, group: s.subtitle, lessons: byLessonSection.get(s.id) ?? [] }));

  let intake: CourseData["intake"] = null;
  const intakeForm = isMtk ? await getIntakeForm(sb, "mtk-intake").catch(() => null) : form;
  let mtk: CourseMtk | null = null;
  if (intakeForm) {
    const history = await intakeHistory(sb, userId, intakeForm.id).catch(() => []);
    intake = { key: intakeForm.key ?? intakeForm.id, done: history.length > 0 };
    if (isMtk) {
      const plans = await mtkPlans(sb, userId, program.id).catch(() => []);
      const active = plans.find((p) => p.status === "active") ?? null;
      const latest = history[0]?.result as IntakeResult | undefined;
      mtk = {
        assessmentDone: history.length > 0,
        plan: active ? { version: active.version, lessonIds: active.lessonIds, days: active.days } : null,
        pathBucket: (latest?.bucket as MtkPathId | undefined) ?? null,
      };
    }
  } else if (isMtk) {
    mtk = { assessmentDone: false, plan: null, pathBucket: null };
  }

  const image = program.media.find((m) => m.role === "hero")?.url ?? program.media[0]?.url ?? null;
  return {
    programId: program.id,
    data: {
      program: {
        id: program.id, slug: program.slug, name: program.name, type: program.type, tagline: program.tagline, summary: program.summary,
        description: program.description, highlights: program.highlights ?? [], image, access: program.access, isFree: program.isFree,
        level: program.level, instructor: program.instructor ?? "Mike Salemi",
        journey: resolveJourney(program.slug, program.journey),
        cover: coverFor(program.slug, image, program.cover),
      },
      locked: program.access === "locked",
      intro: intro && introLesson ? { sectionId: intro.id, lessonId: introLesson.id, title: introLesson.title } : null,
      groups: groupSections(nodes),
      enrolled: (enrollRows ?? []).length > 0,
      lastLessonId: (lastRows ?? [])[0]?.lesson_id ?? null,
      intake,
      mtk,
    },
  };
}

async function realLesson(sb: DB, userId: string, d: CourseData, lessonId: string, isIntro: boolean): Promise<CourseLesson | null> {
  const [found, { data: pos }] = await Promise.all([
    getLesson(sb, lessonId),
    sb.from("lesson_positions").select("video_seconds").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle(),
  ]);
  if (!found || found.lesson.program_id !== d.program.id) return null;
  const doneSteps = new Set<string>();
  if (found.steps.length) {
    const { data: sp } = await sb.from("step_progress").select("step_id").eq("user_id", userId).eq("lesson_id", lessonId);
    for (const r of sp ?? []) doneSteps.add(r.step_id);
  }
  return {
    id: found.lesson.id,
    title: found.lesson.title,
    sectionId: found.lesson.section_id,
    isIntro,
    videoSeconds: ((pos?.video_seconds ?? {}) as Record<string, number>) || {},
    steps: found.steps.map((s, i) => {
      const row = found.stepRows[i]!;
      const m = (row.meta ?? {}) as Json;
      return {
        id: s.id, title: s.title, required: s.isRequired, done: doneSteps.has(s.id),
        video: s.video ?? null, clips: s.clips,
        poster: s.video?.thumbnailUrl ?? str(m.image) ?? null,
        body: row.body, description: row.description,
        attachments: Array.isArray(row.attachments) ? (row.attachments as unknown as CourseStep["attachments"]) : [],
      };
    }),
  };
}

/* ------------------------------------------------------------------ preview fixtures */

interface CourseFixture extends CourseData {
  /** Lesson content snapshots by lesson id (a few per course). */
  lessons: Record<string, CourseLesson>;
}

function fixtureLesson(f: CourseFixture, id: string, isIntro: boolean): CourseLesson | null {
  if (f.lessons[id]) return { ...f.lessons[id]!, isIntro };
  if (isIntro && f.intro) return { id, title: f.intro.title, sectionId: f.intro.sectionId, isIntro, steps: [], videoSeconds: {} };
  const node = f.groups.flatMap((g) => g.sections.flatMap((s) => s.lessons)).find((l) => l.id === id);
  if (!node) return null;
  return { id, title: node.title, sectionId: node.sectionId, isIntro, steps: [], videoSeconds: {} };
}

/** Preview fixtures predate journeys/covers: fill them from the defaults. */
function withJourney(d: CourseData): CourseData {
  const p = d.program as Partial<CourseProgram> & CourseProgram;
  return { ...d, program: { ...p, journey: p.journey ?? resolveJourney(p.slug), cover: p.cover ?? coverFor(p.slug, p.image) } };
}

/**
 * Journey home (`/programs/[slug]/course`): the outline with progress and where to resume, no lesson
 * content. Preview fixtures: `fixtures/course-<slug>.json`.
 */
export async function loadCourseOutline(slug: string): Promise<(CourseData & { resumeId: string }) | null> {
  if (MOCK) {
    const f = await fixture<CourseFixture>(`course-${slug}`).catch(() => null);
    if (!f) return null;
    const { lessons: _l, ...raw } = f;
    const data = withJourney(raw);
    return { ...data, resumeId: resolveActive(data, "resume") };
  }
  const { supabase, user } = await getUser();
  if (!user) return null;
  const course = await realCourse(supabase, user.id, slug);
  if (!course) return null;
  return { ...course.data, resumeId: resolveActive(course.data, "resume") };
}

/**
 * Course player data. `token` is a lesson id/key, `start` (introduction) or `resume`.
 * Preview fixtures: `fixtures/course-<slug>.json`.
 */
export async function loadCoursePage(slug: string, token: string): Promise<CoursePageData | null> {
  if (MOCK) {
    const f = await fixture<CourseFixture>(`course-${slug}`).catch(() => null);
    if (!f) return null;
    const { lessons: _l, ...raw } = f;
    const data = withJourney(raw);
    const activeId = resolveActive(data, token);
    const isIntro = activeId === INTRO;
    const lesson = data.locked ? null : fixtureLesson(f, isIntro ? data.intro?.lessonId ?? "" : activeId, isIntro);
    return { ...data, activeId, lesson };
  }
  const { supabase, user } = await getUser();
  if (!user) return null;
  const course = await realCourse(supabase, user.id, slug);
  if (!course) return null;
  const { data } = course;
  const activeId = resolveActive(data, token);
  const isIntro = activeId === INTRO;
  const lessonId = isIntro ? data.intro?.lessonId : activeId;
  const lesson = data.locked || !lessonId ? null : await realLesson(supabase, user.id, data, lessonId, isIntro);
  return { ...data, activeId, lesson };
}

/* ------------------------------------------------------------------ program intake */

export interface IntakeAttempt {
  id: string;
  answers: Record<string, string | string[]>;
  result: IntakeResult;
  createdAt: string;
}

export interface IntakePageData {
  program: { id: string; slug: string; name: string; image: string | null; type: string };
  form: IntakeForm;
  /** kbl = Kettlebell Lifestyle 13-step intake (level result), mtk = MTK assessment (results page), program = "Your program approach". */
  kind: "kbl" | "mtk" | "program";
  latest: IntakeAttempt | null;
  attempts: number;
  /** The attempt before the latest one (to notice a retake that changed the recommendation). */
  previousResult?: IntakeResult | null;
  /** Answers prefilled from the member's training profile (+ earlier intakes); only the rest is asked. */
  prefill?: Prefill | null;
}

/** Program intake by program slug. Preview fixtures: `fixtures/intake-<slug>.json` + `fixtures/training-profile.json`. */
export async function loadIntakePage(slug: string): Promise<IntakePageData | null> {
  if (MOCK) {
    const d = await fixture<IntakePageData>(`intake-${slug}`).catch(() => null);
    if (!d) return null;
    const profile = await fixture<TrainingProfile>("training-profile").catch(() => ({}));
    return { ...d, prefill: prefillIntake(d.form, profile, d.latest?.answers as IntakeAnswers | undefined) };
  }
  const { supabase: sb, user } = await getUser();
  if (!user) return null;
  const program = await getProgram(sb, slug);
  if (!program) return null;
  const form = slug === MTK_SLUG ? await getIntakeForm(sb, "mtk-intake") : await programIntake(sb, program.id);
  if (!form) return null;
  const [history, profile] = await Promise.all([intakeHistory(sb, user.id, form.id), myTrainingProfile(sb, user.id).catch(() => ({}) as TrainingProfile)]);
  const h = history[0];
  return {
    prefill: prefillIntake(form, profile, (h?.answers ?? null) as IntakeAnswers | null),
    program: {
      id: program.id, slug: program.slug, name: program.name, type: program.type,
      image: coverFor(program.slug, program.media.find((m) => m.role === "hero")?.url ?? program.media[0]?.url ?? null, program.cover).src,
    },
    form,
    kind: form.key === "kbl-intake" ? "kbl" : form.key === "mtk-intake" ? "mtk" : "program",
    latest: h ? { id: h.id, answers: (h.answers ?? {}) as IntakeAttempt["answers"], result: (h.result ?? {}) as IntakeResult, createdAt: h.created_at } : null,
    attempts: history.length,
    previousResult: history[1] ? ((history[1].result ?? {}) as IntakeResult) : null,
  };
}

