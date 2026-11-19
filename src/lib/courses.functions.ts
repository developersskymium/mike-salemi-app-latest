import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Id of the section holding the source "home" page, shown as a course introduction outside curriculum counts. */
export function introSectionId(meta: unknown): string | null {
  return ((meta ?? {}) as { introSectionId?: string }).introSectionId ?? null;
}

/** Published courses stored in the database (imported content). */
export const listCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data, error }, { data: entitlements, error: entitlementError }] = await Promise.all([
      context.supabase
        .from("programs")
        .select("id, slug, name, summary, description, type, category, level, included_in_subscription, price_cents, hero_image_url, meta, program_sections(id, program_lessons(id))")
        .eq("status", "published")
        .order("sort_order")
        .order("name"),
      context.supabase.from("entitlements").select("product_id").eq("user_id", context.userId).eq("status", "active"),
    ]);
    if (error) throw new Error(error.message);
    if (entitlementError) throw new Error(entitlementError.message);
    const owned = new Set((entitlements ?? []).map((row) => row.product_id));
    return (data ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      description: p.description,
      type: p.type as string,
      category: p.category,
      level: p.level,
      included: p.included_in_subscription,
      owned: owned.has(p.id) || owned.has(`program-${p.id}`),
      access: p.included_in_subscription ? "included" as const : owned.has(p.id) || owned.has(`program-${p.id}`) ? "owned" as const : "locked" as const,
      priceCents: p.price_cents,
      image: p.hero_image_url,
      instructor: ((p.meta ?? {}) as { instructor?: string }).instructor ?? null,
      highlights: ((p.meta ?? {}) as { highlights?: string[] }).highlights ?? [],
      badge: ((p.meta ?? {}) as { badge?: string }).badge || null,
      offer: ((p.meta ?? {}) as { offer?: string }).offer || null,
      catalogGroup: ((p.meta ?? {}) as { catalogGroup?: string }).catalogGroup || null,
      featured: Boolean(((p.meta ?? {}) as { featured?: boolean }).featured),
      ctaLabel: ((p.meta ?? {}) as { ctaLabel?: string }).ctaLabel || null,
      sectionCount: p.program_sections.filter((s) => s.id !== introSectionId(p.meta)).length,
      lessonCount: p.program_sections
        .filter((s) => s.id !== introSectionId(p.meta))
        .reduce((total, section) => total + section.program_lessons.length, 0),
    }));
  });

export const getCourse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ slug: z.string().trim().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const [{ data: program, error }, { data: entitlements }] = await Promise.all([
      sb
        .from("programs")
        .select("id, slug, name, summary, description, type, category, level, included_in_subscription, price_cents, hero_image_url, meta")
        .eq("slug", data.slug)
        .maybeSingle(),
      sb.from("entitlements").select("product_id").eq("user_id", context.userId).eq("status", "active"),
    ]);

    if (error) throw new Error(error.message);
    if (!program) return null;

    const owned = new Set((entitlements ?? []).map((row) => row.product_id));
    const access = program.included_in_subscription 
      ? "included" as const 
      : (owned.has(program.id) || owned.has(`program-${program.id}`)) 
        ? "owned" as const 
        : "locked" as const;

    const { data: sections } = await sb
      .from("program_sections")
      .select("id, title, subtitle, sequence")
      .eq("program_id", program.id)
      .order("sequence");

    const sectionIds = (sections ?? []).map((s) => s.id);
    const { data: lessons } = sectionIds.length
      ? await sb
          .from("program_lessons")
          .select("id, section_id, title, sequence")
          .in("section_id", sectionIds)
          .order("sequence")
      : { data: [] };
    const lessonIds = (lessons ?? []).map((l) => l.id);
    const { data: subs } = lessonIds.length
      ? await sb
          .from("program_sublessons")
          .select("id, lesson_id, vimeo_id, content, sequence")
          .in("lesson_id", lessonIds)
          .order("sequence")
      : { data: [] };
    const subIds = (subs ?? []).map((s) => s.id);
    const { data: extras } = subIds.length
      ? await sb
          .from("sublesson_videos")
          .select("sublesson_id, title, vimeo_id, sequence")
          .in("sublesson_id", subIds)
          .order("sequence")
      : { data: [] };

    return {
      slug: program.slug,
      id: program.id,
      name: program.name,
      summary: program.summary,
      description: program.description,
      type: program.type,
      category: program.category,
      level: program.level,
      included: program.included_in_subscription,
      priceCents: program.price_cents,
      access,
      image: program.hero_image_url,
      instructor: ((program.meta ?? {}) as { instructor?: string }).instructor ?? null,
      highlights: ((program.meta ?? {}) as { highlights?: string[] }).highlights ?? [],
      introSectionId: introSectionId(program.meta),
      sections: (sections ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        sequence: s.sequence,
        group: s.subtitle ?? null,
        lessons: (lessons ?? [])
          .filter((l) => l.section_id === s.id)
          .map((l) => {
            const sub = (subs ?? []).find((x) => x.lesson_id === l.id);
            return {
              id: l.id,
              title: l.title,
              vimeoId: sub?.vimeo_id ?? null,
              content: sub?.content ?? "",
              extraVideos: (extras ?? [])
                .filter((e) => e.sublesson_id === sub?.id)
                .map((e) => ({ title: e.title, vimeoId: e.vimeo_id })),
            };
          }),
      })),
    };
  });

export const getProgramLessonProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ programId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("program_lesson_progress")
      .select("lesson_id, completed_at")
      .eq("user_id", context.userId)
      .eq("program_id", data.programId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setProgramLessonProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ programId: z.string().uuid(), lessonId: z.string().uuid(), completed: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.completed) {
      const { error } = await context.supabase.from("program_lesson_progress").upsert(
        { user_id: context.userId, program_id: data.programId, lesson_id: data.lessonId, completed_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" },
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("program_lesson_progress").delete().eq("user_id", context.userId).eq("lesson_id", data.lessonId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Per-program completion summary for the signed-in member (home dashboard). */
export const getMyCourseProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("program_lesson_progress")
      .select("program_id, completed_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const map: Record<string, { completed: number; lastAt: string }> = {};
    for (const r of rows ?? []) {
      const cur = map[r.program_id] ?? { completed: 0, lastAt: r.completed_at };
      cur.completed += 1;
      if (r.completed_at > cur.lastAt) cur.lastAt = r.completed_at;
      map[r.program_id] = cur;
    }
    return map;
  });

/** Every lesson across published programs, for the cross-program Library. */
export const listProgramLessonsIndex = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("programs")
      .select("slug, name, meta, program_sections(id, title, program_lessons(id, title))")
      .eq("status", "published")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []).flatMap((p) =>
      p.program_sections.filter((s) => s.id !== introSectionId(p.meta)).flatMap((s) =>
        s.program_lessons.map((l) => ({ id: l.id, title: l.title, section: s.title, program: p.name, slug: p.slug })),
      ),
    );
  });
