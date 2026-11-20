import type { ReactNode } from "react";
// The day stylesheets load once for the segment, shared by its loading UI and its page.
import "@/components/training/day-styles";
import { guardLesson } from "@/lib/access";

/** Access guard (spec 11): no access → the program's sales sheet; previews stay watchable. */
export default async function DayLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string; lesson: string }> }) {
  const { slug, lesson } = await params;
  await guardLesson(slug, lesson);
  return children;
}
