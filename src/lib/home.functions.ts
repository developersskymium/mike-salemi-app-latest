import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { introSectionId } from "@/lib/courses.functions";

/** Enrollment key for a KBL level (code-defined course), e.g. "kbl:beginner". */
export const kblKey = (courseId: string) => `kbl:${courseId}`;

export type HomeProgram = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  image: string | null;
  access: "included" | "owned" | "locked";
  priceCents: number;
  featured: boolean;
  lessonCount: number;
  completed: number;
  percent: number;
  /** Joined explicitly, or has any progress. */
  enrolled: boolean;
  /** Most recent of: last completed lesson, last opened, joined. */
  lastActivityAt: string | null;
  firstLesson: { id: string; title: string } | null;
  /** Where "Resume" goes: the next lesson after the latest completed one. */
  nextLesson: { id: string; title: string } | null;
};

export type HomeDashboard = {
  programs: HomeProgram[];
  /** KBL levels joined explicitly: courseId → { enrolledAt, lastOpenedAt }. */
  kblEnrollments: Record<string, { enrolledAt: string; lastOpenedAt: string }>;
};

const max = (...values: (string | null | undefined)[]) =>
  values.filter((v): v is string => Boolean(v)).sort().pop() ?? null;

/** Everything the home page needs about the member's programs, in one call. */
export const getHomeDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HomeDashboard> => {
    const sb = context.supabase;
    const [programs, entitlements, progress, enrollments] = await Promise.all([
      sb
        .from("programs")
        .select(
          "id, slug, name, summary, included_in_subscription, price_cents, hero_image_url, meta, sort_order, program_sections(id, sequence, program_lessons(id, title, sequence))",
        )
        .eq("status", "published")
        .order("sort_order")
        .order("name"),
      sb.from("entitlements").select("product_id").eq("user_id", context.userId).eq("status", "active"),
      sb
        .from("program_lesson_progress")
        .select("program_id, lesson_id, completed_at")
        .eq("user_id", context.userId),
      sb
        .from("program_enrollments")
        .select("program_key, enrolled_at, last_opened_at")
        .eq("user_id", context.userId),
    ]);
    if (programs.error) throw new Error(programs.error.message);
    if (progress.error) throw new Error(progress.error.message);
    if (enrollments.error) throw new Error(enrollments.error.message);

    const owned = new Set((entitlements.data ?? []).map((row) => row.product_id));
    type Enrollment = { program_key: string; enrolled_at: string; last_opened_at: string };
    const joined = new Map<string, Enrollment>(
      ((enrollments.data ?? []) as Enrollment[]).map((row) => [row.program_key, row]),
    );
    const doneByProgram = new Map<string, Map<string, string>>();
    for (const row of progress.data ?? []) {
      const map = doneByProgram.get(row.program_id) ?? new Map<string, string>();
      map.set(row.lesson_id, row.completed_at);
      doneByProgram.set(row.program_id, map);
    }

    const result: HomeProgram[] = (programs.data ?? []).map((p) => {
      const intro = introSectionId(p.meta);
      const lessons = [...p.program_sections]
        .filter((s) => s.id !== intro)
        .sort((a, b) => a.sequence - b.sequence)
        .flatMap((s) => [...s.program_lessons].sort((a, b) => a.sequence - b.sequence));
      const done = doneByProgram.get(p.id) ?? new Map<string, string>();
      const completed = lessons.filter((l) => done.has(l.id)).length;

      // Resume after the most recently completed lesson; wrap to the first
      // incomplete one; a finished program resumes at its last lesson.
      let latestIndex = -1;
      let latestAt = "";
      lessons.forEach((l, i) => {
        const at = done.get(l.id);
        if (at && at > latestAt) {
          latestAt = at;
          latestIndex = i;
        }
      });
      const next =
        lessons.slice(latestIndex + 1).find((l) => !done.has(l.id)) ??
        lessons.find((l) => !done.has(l.id)) ??
        (completed ? lessons[lessons.length - 1] : lessons[0]);

      const enrollment = joined.get(p.id);
      const meta = (p.meta ?? {}) as { featured?: boolean };
      const isOwned = owned.has(p.id) || owned.has(`program-${p.id}`);
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        summary: p.summary,
        image: p.hero_image_url,
        access: p.included_in_subscription ? "included" : isOwned ? "owned" : "locked",
        priceCents: p.price_cents,
        featured: Boolean(meta.featured),
        lessonCount: lessons.length,
        completed,
        percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
        enrolled: Boolean(enrollment) || completed > 0,
        lastActivityAt: max(latestAt, enrollment?.last_opened_at, enrollment?.enrolled_at),
        firstLesson: lessons[0] ? { id: lessons[0].id, title: lessons[0].title } : null,
        nextLesson: next ? { id: next.id, title: next.title } : null,
      };
    });

    const kblEnrollments: HomeDashboard["kblEnrollments"] = {};
    for (const row of enrollments.data ?? []) {
      if (row.program_key.startsWith("kbl:")) {
        kblEnrollments[row.program_key.slice(4)] = {
          enrolledAt: row.enrolled_at,
          lastOpenedAt: row.last_opened_at,
        };
      }
    }
    return { programs: result, kblEnrollments };
  });

/** Join a program (idempotent). Opening it again only refreshes last_opened_at. */
export const joinProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ programKey: z.string().trim().min(1).max(80) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const key = data.programKey;
    if (key.startsWith("kbl:")) {
      if (!["kbl:beginner", "kbl:intermediate"].includes(key)) throw new Error("Unknown program.");
    } else {
      const { data: program } = await context.supabase
        .from("programs")
        .select("id, included_in_subscription")
        .eq("id", key)
        .eq("status", "published")
        .maybeSingle();
      if (!program) throw new Error("Unknown program.");
      if (!program.included_in_subscription) {
        const { data: ent } = await context.supabase
          .from("entitlements")
          .select("product_id")
          .eq("user_id", context.userId)
          .eq("status", "active")
          .in("product_id", [key, `program-${key}`]);
        if (!ent?.length) throw new Error("Unlock this program before joining.");
      }
    }
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("program_enrollments")
      .upsert(
        { user_id: context.userId, program_key: key, last_opened_at: now },
        { onConflict: "user_id,program_key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
