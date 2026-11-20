import type { ReactNode } from "react";
import { guardLesson } from "@/lib/access";

/** Access guard (spec 11): no access → the program's sales sheet; the intro and first lesson stay watchable. */
export default async function CourseLessonLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string; lesson: string }> }) {
  const { slug, lesson } = await params;
  await guardLesson(slug, lesson);
  return children;
}
