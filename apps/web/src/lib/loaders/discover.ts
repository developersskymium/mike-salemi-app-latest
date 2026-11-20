import "server-only";
import {
  getCatalog, getForm, getProgram, libraryTags, libraryVideos, listCollections, listPlans, listTools, myEnrollments, myToolResults, quote,
  type CatalogProgram, type DB, type LibraryVideo, type PricingPlan, type Quote,
} from "@ms/api";
import type { ReadinessForm } from "@ms/core";
import { fixture, MOCK, mockable } from "@/lib/mock";
import { filterVideos, type LibraryQueryInput } from "@/components/discover/filter";

export type { LibraryQueryInput };

/* ------------------------------------------------------------------ types */

export type Enrollment = Awaited<ReturnType<typeof myEnrollments>>[number];
export type ToolCard = { id: string; name: string; tagline: string | null };
export type Facet = { slug: string; name: string };

export type ProgramsTab = { catalog: CatalogProgram[]; enrollments: Enrollment[]; tools: ToolCard[] };

export type LibraryData = {
  videos: LibraryVideo[];
  total: number;
  facets: Record<string, Facet[]>;
  collections: { id: string; name: string; count: number }[];
  programs: { id: string; name: string; slug: string }[];
};

export type VideoPage = { video: LibraryVideo | null; related: LibraryVideo[]; collections: { id: string; name: string; count: number }[] };

export type ToolPage = {
  tool: { id: string; name: string; tagline: string | null; position: number; status: string; config: Record<string, unknown> };
  form: ReadinessForm | null;
  last: { created_at: string; result: Record<string, unknown> } | null;
};

export type OutlineSection = { id: string; title: string; subtitle: string | null; lessonCount: number; lessons: string[] };
export type SalesProgram = NonNullable<Awaited<ReturnType<typeof getProgram>>>;
export type SalesPage = { program: SalesProgram; outline: OutlineSection[]; quote: Quote; plans: PricingPlan[] };
export type Explore = { catalog: CatalogProgram[]; plans: PricingPlan[] };

/* --------------------------------------------------------------- programs */

export const loadProgramsTab = mockable("discover-programs", async (sb: DB): Promise<ProgramsTab> => {
  const [catalog, enrollments, tools] = await Promise.all([getCatalog(sb, { listedOnly: true }), myEnrollments(sb), listTools(sb)]);
  return { catalog, enrollments, tools: tools.map((t) => ({ id: t.id, name: t.name, tagline: t.tagline })) };
});

/* ---------------------------------------------------------------- library */

const realLibrary = async (sb: DB, userId: string, q: LibraryQueryInput): Promise<LibraryData> => {
  const [list, tags, collections, saved] = await Promise.all([
    libraryVideos(sb, { query: q.q || null, tags: q.tags ?? null, programId: q.program ?? null, limit: 90 }),
    libraryTags(sb),
    listCollections(sb, userId),
    q.saved ? sb.from("saved_videos").select("video_id").eq("user_id", userId) : Promise.resolve(null),
  ]);
  let videos = list.videos;
  if (saved) {
    const ids = new Set((saved.data ?? []).map((r) => r.video_id));
    videos = videos.filter((v) => ids.has(v.id));
  }
  const programs = new Map<string, { id: string; name: string; slug: string }>();
  for (const v of list.videos) for (const p of v.programs) programs.set(p.id, p);
  const facets = Object.fromEntries(Object.entries(tags).filter(([ns]) => ns !== "level"));
  return { videos, total: q.saved ? videos.length : list.total, facets, collections, programs: [...programs.values()] };
};

const mockLibrary = mockable("discover-library", realLibrary);

/** Videos the member can watch, filtered on the server; in preview mode the snapshot is filtered here instead. */
export async function loadLibrary(sb: DB, userId: string, q: LibraryQueryInput): Promise<LibraryData> {
  const data = await mockLibrary(sb, userId, q);
  if (!MOCK) return data;
  const videos = filterVideos(data.videos, q);
  return { ...data, videos, total: q.q || q.tags?.length || q.program || q.saved ? videos.length : data.total };
}

const realVideo = async (sb: DB, userId: string, id: string): Promise<VideoPage> => {
  const { data: row } = await sb.from("videos").select("id, title").eq("id", id).maybeSingle();
  const collections = await listCollections(sb, userId);
  if (!row) return { video: null, related: [], collections };
  const { videos } = await libraryVideos(sb, { query: row.title, limit: 30 });
  const video = videos.find((v) => v.id === id) ?? null;
  if (!video) return { video: null, related: [], collections };
  const topic = video.tags.find((t) => t.namespace === "topic" && t.slug !== "kettlebell-exercises" && t.slug !== "bodyweight-exercises") ?? video.tags.find((t) => t.namespace === "topic");
  const related = topic ? (await libraryVideos(sb, { tags: [`${topic.namespace}:${topic.slug}`], limit: 13 })).videos.filter((v) => v.id !== id).slice(0, 12) : [];
  return { video, related, collections };
};
export const loadVideo = mockable("discover-video", realVideo);

/* ------------------------------------------------------------------ tools */

export const loadToolsIndex = mockable("discover-programs", async (sb: DB): Promise<Pick<ProgramsTab, "tools">> => {
  const tools = await listTools(sb);
  return { tools: tools.map((t) => ({ id: t.id, name: t.name, tagline: t.tagline })) };
});

export const TOOL_IDS = ["kettlebell-selector", "stretch-test", "readiness-check", "kettlebell-roadmap"] as const;

async function realTool(sb: DB, userId: string, id: string): Promise<ToolPage | null> {
  const { data: tool } = await sb.from("tools").select("*").eq("id", id).eq("status", "published").maybeSingle();
  if (!tool) return null;
  const config = (tool.config ?? {}) as Record<string, unknown>;
  const formId = typeof config.form_id === "string" ? config.form_id : null;
  const [form, results] = await Promise.all([formId ? getForm(sb, formId) : Promise.resolve(null), myToolResults(sb, userId, id, 1)]);
  const last = results[0] ? { created_at: results[0].created_at, result: (results[0].result ?? {}) as Record<string, unknown> } : null;
  return { tool: { ...tool, config }, form, last };
}

export async function loadTool(sb: DB, userId: string, id: string): Promise<ToolPage | null> {
  if (MOCK) return fixture<ToolPage>(`discover-tool-${id}`).catch(() => null);
  return realTool(sb, userId, id);
}

/* ----------------------------------------------------------------- public */

export const loadExplore = mockable("discover-explore", async (sb: DB): Promise<Explore> => {
  const [catalog, plans] = await Promise.all([getCatalog(sb, { listedOnly: true }), listPlans(sb)]);
  return { catalog, plans };
});

export const loadPricing = mockable("discover-pricing", async (sb: DB): Promise<PricingPlan[]> => listPlans(sb));

async function realSales(sb: DB, slug: string): Promise<SalesPage | null> {
  const program = await getProgram(sb, slug);
  if (!program || program.catalogGroup === "hidden") return null;
  const firstPath = program.paths.find((p) => p.kind === "level") ?? program.paths.at(-1) ?? null;
  let sq = sb.from("sections").select("id, title, subtitle, position, lessons(title, position)").eq("program_id", program.id).order("position");
  sq = firstPath ? sq.or(`path_id.eq.${firstPath.id},path_id.is.null`) : sq.is("path_id", null);
  const [{ data: sections }, q, plans] = await Promise.all([sq, quote(sb, "program", program.id), listPlans(sb)]);
  const outline: OutlineSection[] = (sections ?? []).map((s) => {
    const lessons = [...((s.lessons as { title: string; position: number }[] | null) ?? [])].sort((a, b) => a.position - b.position);
    return { id: s.id, title: s.title, subtitle: s.subtitle, lessonCount: lessons.length, lessons: lessons.slice(0, 4).map((l) => l.title) };
  });
  return { program, outline, quote: q, plans };
}

export async function loadSales(sb: DB, slug: string): Promise<SalesPage | null> {
  if (MOCK) return fixture<SalesPage>(`discover-sales-${slug}`).catch(() => null);
  return realSales(sb, slug);
}
