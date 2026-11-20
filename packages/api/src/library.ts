import type { DB } from "./client";

export interface LibraryVideo {
  id: string;
  provider: string;
  provider_id: string;
  privacy_hash: string | null;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  level: string | null;
  category: string | null;
  programs: { id: string; name: string; slug: string }[];
  tags: { namespace: string; slug: string; name: string }[];
  saved: boolean;
  total_count: number;
}

export interface LibraryQuery {
  query?: string | null;
  programId?: string | null;
  /** Tag slugs or names (or "namespace:slug"); a video must carry all of them. */
  tags?: string[] | null;
  limit?: number;
  offset?: number;
}

/** Videos the member can watch (via any accessible program), with programs, tags and saved flag. */
export async function libraryVideos(sb: DB, q: LibraryQuery = {}) {
  const { data, error } = await sb.rpc("library_videos", {
    p_query: q.query ?? undefined,
    p_program: q.programId ?? undefined,
    p_tags: q.tags?.length ? q.tags : undefined,
    p_limit: q.limit ?? 60,
    p_offset: q.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as LibraryVideo[];
  return { videos: rows, total: rows[0]?.total_count ?? 0 };
}

/** Library filter facets: tags grouped by namespace. */
export async function libraryTags(sb: DB) {
  const { data, error } = await sb.from("tags").select("namespace, slug, name").order("namespace").order("name");
  if (error) throw new Error(error.message);
  const out: Record<string, { slug: string; name: string }[]> = {};
  for (const t of data ?? []) (out[t.namespace] ??= []).push({ slug: t.slug, name: t.name });
  return out;
}

// ---------------------------------------------------------------- saves
/** Saves or un-saves a video; returns the new saved state. */
export async function toggleSave(sb: DB, userId: string, videoId: string): Promise<boolean> {
  const { data: existing } = await sb
    .from("saved_videos")
    .select("video_id")
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .maybeSingle();
  if (existing) {
    const { error } = await sb.from("saved_videos").delete().eq("user_id", userId).eq("video_id", videoId);
    if (error) throw new Error(error.message);
    return false;
  }
  const { error } = await sb.from("saved_videos").insert({ user_id: userId, video_id: videoId });
  if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
  return true;
}

export async function savedVideos(sb: DB, userId: string) {
  const { data, error } = await sb
    .from("saved_videos")
    .select("created_at, videos(id, provider, provider_id, privacy_hash, title, duration_seconds, thumbnail_url, level, category)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ---------------------------------------------------------------- collections
export async function listCollections(sb: DB, userId: string) {
  const { data, error } = await sb
    .from("collections")
    .select("id, name, created_at, collection_items(count)")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    created_at: c.created_at,
    count: (c.collection_items as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function getCollection(sb: DB, collectionId: string) {
  const { data, error } = await sb
    .from("collections")
    .select("id, name, created_at, collection_items(position, videos(id, provider, provider_id, privacy_hash, title, duration_seconds, thumbnail_url, level, category))")
    .eq("id", collectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, collection_items: [...(data.collection_items ?? [])].sort((a, b) => a.position - b.position) };
}

export async function createCollection(sb: DB, userId: string, name: string) {
  const { data, error } = await sb.from("collections").insert({ user_id: userId, name: name.trim() }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function renameCollection(sb: DB, collectionId: string, name: string) {
  const { error } = await sb.from("collections").update({ name: name.trim() }).eq("id", collectionId);
  if (error) throw new Error(error.message);
}

export async function deleteCollection(sb: DB, collectionId: string) {
  const { error } = await sb.from("collections").delete().eq("id", collectionId);
  if (error) throw new Error(error.message);
}

export async function addToCollection(sb: DB, collectionId: string, videoId: string) {
  const { data: last } = await sb
    .from("collection_items")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await sb
    .from("collection_items")
    .upsert({ collection_id: collectionId, video_id: videoId, position: (last?.position ?? 0) + 1 }, { onConflict: "collection_id,video_id" });
  if (error) throw new Error(error.message);
}

export async function removeFromCollection(sb: DB, collectionId: string, videoId: string) {
  const { error } = await sb.from("collection_items").delete().eq("collection_id", collectionId).eq("video_id", videoId);
  if (error) throw new Error(error.message);
}

/** Reorder: pass video ids in the new order. */
export async function reorderCollection(sb: DB, collectionId: string, videoIds: string[]) {
  for (const [i, videoId] of videoIds.entries()) {
    const { error } = await sb
      .from("collection_items")
      .update({ position: i + 1 })
      .eq("collection_id", collectionId)
      .eq("video_id", videoId);
    if (error) throw new Error(error.message);
  }
}

// ---------------------------------------------------------------- index (Library page)
type UntypedRpc = { rpc: (f: string, a?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };
const rpc = (sb: DB, fn: string, args?: Record<string, unknown>) => (sb as unknown as UntypedRpc).rpc(fn, args);

/** Compact library row (keys kept short: the whole index ships to the page once). */
export interface LibraryIndexVideo {
  id: string;
  /** title */
  t: string;
  /** Vimeo id and privacy hash */
  p: string;
  h: string | null;
  /** thumbnail url */
  th: string | null;
  /** duration seconds */
  d: number | null;
  /** tag keys "namespace:slug" */
  g: string[];
  /** program ids */
  pr: string[];
  /** saved by the member */
  s: boolean;
  /** used in a training day ("In the program") */
  ip: boolean;
  /** program order rank (program, section, lesson, step) */
  o: number;
}

export interface LibraryIndex {
  videos: LibraryIndexVideo[];
  tags: { key: string; ns: string; slug: string; name: string }[];
  programs: { id: string; slug: string; name: string }[];
  /** Lessons across every program the member can open: id, title, section, program id, path id. */
  lessons: { id: string; t: string; sec: string; pr: string; path: string | null }[];
}

/** Everything the Library page needs in one call. See `library_index` in 0016_w1_home_library.sql. */
export async function libraryIndex(sb: DB): Promise<LibraryIndex> {
  const { data, error } = await rpc(sb, "library_index");
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Partial<LibraryIndex>;
  return { videos: d.videos ?? [], tags: d.tags ?? [], programs: d.programs ?? [], lessons: d.lessons ?? [] };
}

export interface ContinueWatching {
  video_id: string;
  title: string;
  provider_id: string;
  privacy_hash: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  seconds: number;
  updated_at: string;
  /** Set when the position comes from a program lesson. */
  lesson_id: string | null;
  lesson_title: string | null;
  program_slug: string | null;
  program_name: string | null;
}

/** Videos started but not finished (library plays and program lessons), most recent first. */
export async function continueWatching(sb: DB, limit = 12): Promise<ContinueWatching[]> {
  const { data, error } = await rpc(sb, "library_continue", { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContinueWatching[];
}

/** Stores the member's playback position for a library video (own row; RLS checks access). */
export async function saveVideoPosition(sb: DB, userId: string, videoId: string, seconds: number, duration: number | null) {
  const table = (sb as unknown as { from: (t: string) => { upsert: (v: unknown, o: unknown) => PromiseLike<{ error: { message: string } | null }> } }).from("video_positions");
  const { error } = await table.upsert(
    { user_id: userId, video_id: videoId, seconds: Math.max(0, Math.floor(seconds)), duration: duration && duration > 0 ? Math.round(duration) : null, updated_at: new Date().toISOString() },
    { onConflict: "user_id,video_id" },
  );
  if (error) throw new Error(error.message);
}
