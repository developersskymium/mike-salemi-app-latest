/**
 * Program types that open in their journey home and the shared course player, never in the KBL day
 * player: courses, and tools / free lead magnets that are built from lessons (the Kettlebell Roadmap).
 */
export const COURSE_VIEW_TYPES: ReadonlySet<string> = new Set(["course", "tool"]);

export const opensAsCourse = (type: string | null | undefined) => COURSE_VIEW_TYPES.has(type ?? "");
