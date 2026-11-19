import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { kblSourceLibrary } from "@/lib/kbl-library";

export type SavedVideoRow = {
  id: string;
  video_id: string;
  title: string | null;
  slug: string | null;
  created_at: string;
};

export const getSavedVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_videos")
      .select("id, video_id, title, slug, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const toggleSavedVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { videoId: string; title?: string; slug?: string; saved: boolean }) => input)
  .handler(async ({ data, context }) => {
    if (!data.saved) {
      const { error } = await context.supabase
        .from("saved_videos")
        .delete()
        .eq("user_id", context.userId)
        .eq("video_id", data.videoId);
      if (error) throw new Error(error.message);
      return { saved: false };
    }

    const { error } = await context.supabase.from("saved_videos").upsert(
      {
        user_id: context.userId,
        video_id: data.videoId,
        title: data.title?.slice(0, 200) ?? null,
        slug: data.slug ?? null,
      },
      { onConflict: "user_id,video_id", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export type DbLibraryVideo = {
  id: string;
  title: string;
  vimeoId: string;
  image: string;
  levels: string[];
  categories: string[];
  tags: string[];
  usedIn: string[];
  programs: string[];
};

/**
 * Global Library from the database. Tags are namespaced by kind:
 * level:*, category:*, topic:*, kbl-day:* (KBL curriculum days) and program:<slug>.
 * A video tagged with one or more programs is only returned when the member has
 * access to at least one of them (included in membership or an active entitlement);
 * videos with no program tag are the open KBL library and stay visible as before.
 */
export const listLibraryVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [videos, programs, entitlements] = await Promise.all([
      sb
        .from("library_videos")
        .select("slug, title, vimeo_id, thumbnail_url, library_video_tags(tags(slug, kind))")
        .eq("status", "published")
        .order("created_at")
        .order("slug"),
      sb.from("programs").select("id, slug, included_in_subscription").eq("status", "published"),
      sb.from("entitlements").select("product_id").eq("user_id", context.userId).eq("status", "active"),
    ]);
    if (videos.error) throw new Error(videos.error.message);
    if (programs.error) throw new Error(programs.error.message);
    if (entitlements.error) throw new Error(entitlements.error.message);

    const owned = new Set((entitlements.data ?? []).map((r) => r.product_id));
    const accessible = new Set(
      (programs.data ?? [])
        .filter((p) => p.included_in_subscription || owned.has(p.id) || owned.has(`program-${p.id}`))
        .map((p) => p.slug),
    );

    const out: DbLibraryVideo[] = [];
    for (const v of videos.data ?? []) {
      const by: Record<string, string[]> = { level: [], category: [], topic: [], "kbl-day": [], program: [] };
      for (const link of v.library_video_tags ?? []) {
        const tag = link.tags as { slug: string; kind: string } | null;
        if (!tag || !by[tag.kind]) continue;
        by[tag.kind].push(tag.slug.slice(tag.kind.length + 1));
      }
      if (by.program.length && !by.program.some((slug) => accessible.has(slug))) continue;
      out.push({
        id: v.slug,
        title: v.title,
        vimeoId: v.vimeo_id,
        image: v.thumbnail_url ?? "",
        levels: by.level,
        categories: by.category,
        tags: by.topic,
        usedIn: by["kbl-day"],
        programs: by.program,
      });
    }
    // Fresh backends can have an empty library. Fall back to the KBL source
    // catalog so the video library is never blank.
    return out.length ? out : kblSourceLibrary();
  });
