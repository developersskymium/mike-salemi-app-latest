import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LockedDay } from "@/components/training/LockedDay";
import { SelfGuidedDay } from "@/components/training/SelfGuidedDay";
import { loadLessonPage } from "@/lib/loaders/training";
import { opensAsCourse } from "@/lib/course-types";

type Props = { params: Promise<{ slug: string; lesson: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lesson } = await params;
  const data = await loadLessonPage(slug, decodeURIComponent(lesson));
  return { title: data ? `${data.lesson.title} · ${data.program.name}` : "Day" };
}

/** Self-Guided day: every step on one page, no locks. */
export default async function GuidePage({ params }: Props) {
  const { slug, lesson } = await params;
  const data = await loadLessonPage(slug, decodeURIComponent(lesson));
  if (!data) notFound();
  if (opensAsCourse(data.program.type)) redirect(`/programs/${slug}/course/${data.lesson.id}`);
  if (!data.state.access) return <LockedDay data={data} reason="access" />;
  return <SelfGuidedDay key={data.lesson.id} data={data} />;
}
