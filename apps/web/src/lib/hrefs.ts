import { opensAsCourse } from "./course-types";

/*
 * Final URLs for programs and lessons (D11). Links go straight to the page that renders, never through
 * a redirect: courses and tools open their journey home (`/course`) and the course player
 * (`/course/<lesson id>`); experiences open their own pages; day programs open the day player
 * (`/learn`) or the Self-Guided day (`/guide`). The redirects in the program/learn pages stay as a
 * safety net for old links.
 */

const EXPERIENCE_TYPES = new Set(["coaching", "live", "challenge", "retreat"]);

/** A program's home page. */
export function programHref(slug: string, type?: string | null): string {
  if (opensAsCourse(type)) return `/programs/${slug}/course`;
  if (type === "coaching") return "/coaching";
  if (EXPERIENCE_TYPES.has(type ?? "")) return `/experiences/programs/${slug}`;
  return `/programs/${slug}`;
}

/** One lesson: the course player for courses, the day player (or Self-Guided day) for day programs. */
export function lessonHrefOf(
  slug: string,
  lessonId: string | null | undefined,
  opts: { type?: string | null; mode?: string | null; key?: string | null } = {},
): string {
  if (!lessonId) return programHref(slug, opts.type);
  if (opensAsCourse(opts.type)) return `/programs/${slug}/course/${lessonId}`;
  return `/programs/${slug}/${opts.mode === "self_guided" ? "guide" : "learn"}/${encodeURIComponent(opts.key ?? lessonId)}`;
}
