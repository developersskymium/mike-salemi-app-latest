import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MTK_SLUG } from "@ms/core";
import { CourseLocked } from "@/components/course/CourseLocked";
import { CoursePlayer } from "@/components/course/CoursePlayer";
import { loadCoursePage } from "@/lib/loaders/course";

type Props = { params: Promise<{ slug: string; lesson: string }>; searchParams: Promise<{ mode?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lesson } = await params;
  const data = await loadCoursePage(slug, decodeURIComponent(lesson));
  if (!data) return { title: "Course" };
  const title = data.activeId === "intro" || !data.lesson ? data.program.name : `${data.lesson.title} · ${data.program.name}`;
  return { title, description: data.program.summary ?? undefined };
}

/**
 * Course player for every course-type program (MTK, Athleticism 4 Life, The Path to Inspired
 * Action, Working-In, Men of Movement preparation, free series). `[lesson]` is a lesson id,
 * `start` (the course introduction) or `resume` (last lesson → first unfinished → introduction).
 * `?mode=plan` follows the member's MTK plan; `?mode=full` is the full curriculum.
 */
export default async function CoursePage({ params, searchParams }: Props) {
  const [{ slug, lesson }, sp] = await Promise.all([params, searchParams]);
  const mode = sp.mode === "plan" || sp.mode === "full" ? sp.mode : null;
  const token = decodeURIComponent(lesson);
  const data = await loadCoursePage(slug, token);
  if (!data) notFound();
  // MTK with a plan: My Plan is the home unless a lesson or the full curriculum was asked for.
  if (slug === MTK_SLUG && token === "resume" && !mode && data.mtk?.plan) redirect("/mtk");
  if (data.locked) return <CourseLocked data={data} />;
  return <CoursePlayer key={`${data.activeId}:${mode ?? ""}`} data={data} mode={mode} />;
}
