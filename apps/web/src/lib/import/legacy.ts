import "server-only";
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** One-time legacy -> v2 content import. Same mapping as the hand-imported courses; inserts only, never deletes. */

const LEGACY_URL = "https://xdhuyzuxutrsexjjtggp.supabase.co";
const LEGACY_KEY = "sb_publishable_Ly74GeV6TLl6oSZQo8U-LQ_ifHYnUUf";

export const LEGACY_PROGRAMS: Record<string, string> = {
  "mastering-the-kettlebell": "354f9cf4-b33f-5a67-ba60-12e191a6933b",
  "athleticism-4-life": "5944a03d-94be-5595-b9da-b212edfdc892",
  "the-training-room": "d9a1d77b-6710-5c8b-9b6d-31e1fbd79cd8",
  "the-path-to-inspired-action": "a2888fdd-4bf5-5624-9e99-ba3d4578ecb4",
};
const A4L = LEGACY_PROGRAMS["athleticism-4-life"];
const TR = LEGACY_PROGRAMS["the-training-room"];

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Counts = Record<string, number>;
export type ImportReport = { program: string; inserted: Counts; skipped: { table: string; id?: string; reason: string }[]; notes: string[] };

export function legacyClient() {
  return createClient(LEGACY_URL, LEGACY_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function pageAll(build: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>) {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function inChunks(ids: string[], fn: (chunk: string[]) => Promise<Row[]>, size = 100) {
  const out: Row[] = [];
  for (let i = 0; i < ids.length; i += size) out.push(...(await fn(ids.slice(i, i + size))));
  return out;
}

type Source = { sections: Row[]; lessons: Row[]; subs: Row[]; clips: Row[] };

async function readSource(src: SupabaseClient, programId: string, onlySection?: (s: Row) => boolean): Promise<Source> {
  let sections = await pageAll((a, b) => src.from("program_sections").select("*").eq("program_id", programId).order("sequence").order("id").range(a, b));
  if (onlySection) sections = sections.filter(onlySection);
  const sids = sections.map((s) => s.id as string);
  const lessons = await inChunks(sids, (c) => pageAll((a, b) => src.from("program_lessons").select("*").in("section_id", c).order("sequence").order("id").range(a, b)));
  const lids = lessons.map((l) => l.id as string);
  const subs = await inChunks(lids, (c) => pageAll((a, b) => src.from("program_sublessons").select("*").in("lesson_id", c).order("sequence").order("id").range(a, b)));
  const slids = subs.map((s) => s.id as string);
  const clips = await inChunks(slids, (c) => pageAll((a, b) => src.from("sublesson_videos").select("*").in("sublesson_id", c).order("sequence").order("id").range(a, b)));
  return { sections, lessons, subs, clips };
}

/** Deterministic UUIDv5-style id so the Q&A copy is safe to rerun. */
export function derivedUuid(seed: string) {
  const h = createHash("sha1").update("ms-import-tr-qa:" + seed).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

/** '1025360330/05a6acba46' -> id + privacy hash; a full URL is not a Vimeo id. */
export function parseVimeo(raw: unknown): { id: string; hash: string | null } | { url: string } | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return { url: v };
  const [id, hash] = v.split("/");
  return /^\d+$/.test(id) ? { id, hash: hash || null } : null;
}

/** Audio / download links out of markdown content. The body itself stays untouched. */
export function extractAttachments(content: string | null | undefined) {
  const out: { kind: "audio" | "file"; title: string; url: string }[] = [];
  if (!content) return out;
  const seen = new Set<string>();
  for (const m of content.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g)) {
    const [, title, url] = m;
    if (seen.has(url)) continue;
    const path = url.split("?")[0].toLowerCase();
    if (/\.(mp3|m4a|wav|aac|ogg)$/.test(path)) out.push({ kind: "audio", title: title.trim() || "Audio", url });
    else if (/\/download\/\d+/.test(path) || /\.(pdf|zip|docx?|xlsx?|pptx?)$/.test(path)) out.push({ kind: "file", title: title.trim() || "Download", url });
    else continue;
    seen.add(url);
  }
  return out;
}

async function insertRows(dst: SupabaseClient, table: string, rows: Row[], onConflict: string, report: ImportReport, size = 150) {
  let n = 0;
  for (let i = 0; i < rows.length; i += size) {
    const { data, error } = await dst.from(table).upsert(rows.slice(i, i + size), { onConflict, ignoreDuplicates: true }).select(onConflict.split(",")[0]);
    if (error) {
      report.skipped.push({ table, reason: error.message });
      continue;
    }
    n += data?.length ?? 0;
  }
  report.inserted[table] = (report.inserted[table] ?? 0) + n;
}

type IdMap = (id: string) => string;

async function writeProgram(dst: SupabaseClient, programId: string, src: Source, report: ImportReport, opts: { map: IdMap; sectionPosition?: (s: Row, i: number) => number; sectionTitle?: (s: Row) => string }) {
  const { map } = opts;
  const secRows = src.sections.map((s, i) => ({
    id: map(s.id), program_id: programId, title: opts.sectionTitle?.(s) ?? s.title, subtitle: s.subtitle ?? null,
    position: opts.sectionPosition ? opts.sectionPosition(s, i) : s.sequence,
  }));
  await insertRows(dst, "sections", secRows, "id", report);

  const lessonRows = src.lessons.map((l) => ({
    id: map(l.id), section_id: map(l.section_id), program_id: programId, title: l.title,
    day_type: l.day_type ?? "general", day_number: l.day_number ?? null, intro: l.intro ?? null, position: l.sequence,
  }));
  await insertRows(dst, "lessons", lessonRows, "id", report);

  // videos: upsert by (provider, provider_id), keep the privacy hash; titles from the sublesson / clip.
  const videoMap = new Map<string, { hash: string | null; title: string }>();
  const note = (raw: unknown, title: string) => {
    const p = parseVimeo(raw);
    if (!p || "url" in p) return;
    const cur = videoMap.get(p.id);
    if (!cur) videoMap.set(p.id, { hash: p.hash, title });
    else if (!cur.hash && p.hash) cur.hash = p.hash;
  };
  for (const s of src.subs) note(s.vimeo_id, s.title);
  for (const c of src.clips) note(c.vimeo_id, c.title || "");
  const videoRows = [...videoMap].map(([id, v]) => ({ provider: "vimeo", provider_id: id, privacy_hash: v.hash, title: v.title }));
  await insertRows(dst, "videos", videoRows, "provider,provider_id", report);

  const ids = [...videoMap.keys()];
  const vid = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await dst.from("videos").select("id,provider_id").eq("provider", "vimeo").in("provider_id", ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const r of data ?? []) vid.set(r.provider_id, r.id);
  }

  const stepRows = src.subs.map((s) => {
    const p = parseVimeo(s.vimeo_id);
    const body = typeof s.content === "string" && s.content !== "" ? s.content : null;
    const attachments: Row[] = extractAttachments(body);
    const meta: Row = {};
    if (p && "url" in p) {
      attachments.push({ kind: "file", title: "Lesson video (legacy host)", url: p.url });
      meta.legacy_video_url = p.url;
    }
    return {
      id: map(s.id), lesson_id: map(s.lesson_id), program_id: programId, title: s.title, kind: s.kind ?? "video",
      video_id: p && "id" in p ? vid.get(p.id) ?? null : null, duration_label: s.duration_label ?? null,
      body, attachments, position: s.sequence ?? 0, meta,
    };
  });
  await insertRows(dst, "steps", stepRows, "id", report);

  // step_videos has no natural unique key: skip (step, position) pairs that already exist.
  const stepIds = [...new Set(src.clips.map((c) => map(c.sublesson_id)))];
  const have = new Set<string>();
  for (let i = 0; i < stepIds.length; i += 100) {
    const { data, error } = await dst.from("step_videos").select("step_id,position").in("step_id", stepIds.slice(i, i + 100));
    if (error) throw new Error(error.message);
    for (const r of data ?? []) have.add(`${r.step_id}:${r.position}`);
  }
  const clipRows: Row[] = [];
  for (const c of src.clips) {
    const p = parseVimeo(c.vimeo_id);
    const stepId = map(c.sublesson_id);
    if (!p || "url" in p || !vid.get(p.id)) { report.skipped.push({ table: "step_videos", id: c.id, reason: "clip has no usable Vimeo id" }); continue; }
    if (have.has(`${stepId}:${c.sequence}`)) continue;
    clipRows.push({ step_id: stepId, video_id: vid.get(p.id), title: c.title || "", position: c.sequence });
  }
  for (let i = 0; i < clipRows.length; i += 150) {
    const { data, error } = await dst.from("step_videos").insert(clipRows.slice(i, i + 150)).select("id");
    if (error) report.skipped.push({ table: "step_videos", reason: error.message });
    else report.inserted.step_videos = (report.inserted.step_videos ?? 0) + (data?.length ?? 0);
  }

  const pv = [...new Set(vid.values())].map((video_id) => ({ program_id: programId, video_id, in_library: true }));
  await insertRows(dst, "program_videos", pv, "program_id,video_id", report);
}

export async function importProgram(dst: SupabaseClient, slug: string): Promise<ImportReport> {
  const report: ImportReport = { program: slug, inserted: {}, skipped: [], notes: [] };
  const src = legacyClient();

  if (slug === "tr-qa") {
    const all = await readSource(src, TR);
    const isQa = (s: Row) => /q\s*&\s*a/i.test(s.title ?? "");
    const picked = all.sections.filter(isQa);
    const section = picked.find((s) => /2025/.test(s.title)) ?? picked[0];
    if (!section) { report.skipped.push({ table: "sections", reason: "no Q & A section found in The Training Room" }); return report; }
    report.notes.push(`copying section "${section.title}" (${section.id})`);
    const data = await readSource(src, TR, (s) => s.id === section.id);
    const { data: last } = await dst.from("sections").select("position").eq("program_id", A4L).order("position", { ascending: false }).limit(1);
    const next = (last?.[0]?.position ?? 0) + 1;
    await writeProgram(dst, A4L, data, report, { map: derivedUuid, sectionPosition: () => next, sectionTitle: () => "Q & A Archives" });
    return report;
  }

  const programId = LEGACY_PROGRAMS[slug];
  if (!programId) throw new Error(`unknown program: ${slug}`);
  const data = await readSource(src, programId);
  report.notes.push(`source: ${data.sections.length} sections, ${data.lessons.length} lessons, ${data.subs.length} sublessons, ${data.clips.length} clips`);
  await writeProgram(dst, programId, data, report, { map: (id) => id });
  return report;
}
