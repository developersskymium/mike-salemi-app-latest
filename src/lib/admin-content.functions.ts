import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Tables the hidden content admin is allowed to touch. */
export const ADMIN_TABLES = [
  "programs",
  "program_sections",
  "program_lessons",
  "program_sublessons",
  "sublesson_videos",
  "library_videos",
  "library_video_tags",
  "tags",
  "program_tags",
  "retreats",
  "retreat_itinerary_items",
  "coaching_offerings",
] as const;

export type AdminTable = (typeof ADMIN_TABLES)[number];

/* eslint-disable @typescript-eslint/no-explicit-any */
type LooseClient = { from: (table: string) => any };

function assertTable(table: string): AdminTable {
  if (!(ADMIN_TABLES as readonly string[]).includes(table)) {
    throw new Error(`Table not allowed: ${table}`);
  }
  return table as AdminTable;
}

/** True when the signed-in member holds the admin role. */
export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) return { isAdmin: false };
    return { isAdmin: Boolean(data) };
  });

/** Everything the content admin renders, in one round trip. */
export const getContentGraph = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [
      programs,
      sections,
      lessons,
      sublessons,
      associated,
      library,
      tags,
      programTags,
      videoTags,
      retreats,
      itinerary,
      coaching,
    ] = await Promise.all([
      sb.from("programs").select("*").order("sort_order").order("name"),
      sb.from("program_sections").select("*").order("sequence"),
      sb.from("program_lessons").select("*").order("sequence"),
      sb.from("program_sublessons").select("*").order("sequence"),
      sb.from("sublesson_videos").select("*").order("sequence"),
      sb.from("library_videos").select("*").order("title"),
      sb.from("tags").select("*").order("label"),
      sb.from("program_tags").select("*"),
      sb.from("library_video_tags").select("*"),
      sb.from("retreats").select("*").order("starts_on"),
      sb.from("retreat_itinerary_items").select("*").order("day_number").order("sequence"),
      sb.from("coaching_offerings").select("*").order("name"),
    ]);

    const first = [
      programs,
      sections,
      lessons,
      sublessons,
      associated,
      library,
      tags,
      programTags,
      videoTags,
      retreats,
      itinerary,
      coaching,
    ].find((r) => r.error);
    if (first?.error) throw new Error(first.error.message);

    return {
      programs: programs.data ?? [],
      sections: sections.data ?? [],
      lessons: lessons.data ?? [],
      sublessons: sublessons.data ?? [],
      associatedVideos: associated.data ?? [],
      libraryVideos: library.data ?? [],
      tags: tags.data ?? [],
      programTags: programTags.data ?? [],
      libraryVideoTags: videoTags.data ?? [],
      retreats: retreats.data ?? [],
      itinerary: itinerary.data ?? [],
      coaching: coaching.data ?? [],
    };
  });

/** Insert or update a single content row. RLS restricts this to admins. */
export const saveContentRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: string; values: Record<string, unknown>; id?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const table = assertTable(data.table);
    const sb = context.supabase as unknown as LooseClient;
    const values = { ...data.values } as Record<string, unknown>;
    if (data.id) {
      const { error } = await sb.from(table).update(values).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await sb.from(table).insert(values).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as { id: string }).id };
  });

export const deleteContentRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: string; id: string }) => input)
  .handler(async ({ data, context }) => {
    const table = assertTable(data.table);
    const sb = context.supabase as unknown as LooseClient;
    const { error } = await sb.from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Link/unlink a tag on a program or library video. */
export const setContentTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { scope: "program" | "video"; ownerId: string; tagId: string; attached: boolean }) => input,
  )
  .handler(async ({ data, context }) => {
    const table = data.scope === "program" ? "program_tags" : "library_video_tags";
    const ownerColumn = data.scope === "program" ? "program_id" : "video_id";
    const sb = context.supabase as unknown as LooseClient;
    if (data.attached) {
      const { error } = await sb
        .from(table)
        .upsert({ [ownerColumn]: data.ownerId, tag_id: data.tagId });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb
        .from(table)
        .delete()
        .eq(ownerColumn, data.ownerId)
        .eq("tag_id", data.tagId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
