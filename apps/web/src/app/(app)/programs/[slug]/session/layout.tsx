import type { ReactNode } from "react";
import { guardLesson } from "@/lib/access";

/** Access guard (spec 11): Self-Guided sessions, wizard and plan need access to the program. */
export default async function SessionLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await guardLesson(slug, null);
  return children;
}
