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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.rpc as any)("library_videos", {
    p_query: q.query ?? null,
    p_program: q.programId ?? null,
    p_tags: q.tags?.length ? q.tags : null,
    p_limit: q.limit ?? 60,
    p_offset: q.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as LibraryVideo[];
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
