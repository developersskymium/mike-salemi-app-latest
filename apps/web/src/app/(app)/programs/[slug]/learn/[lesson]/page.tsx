import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { DayPlayer } from "@/components/training/DayPlayer";
import { ChooseNextStep } from "@/components/access/ChooseNextStep";
import { LockedDay } from "@/components/training/LockedDay";
import { loadLessonPage } from "@/lib/loaders/training";
import { loadCourseOutline } from "@/lib/loaders/course";
import { opensAsCourse } from "@/lib/course-types";

type Props = { params: Promise<{ slug: string; lesson: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lesson } = await params;
  const data = await loadLessonPage(slug, decodeURIComponent(lesson));
  return { title: data ? `${data.lesson.title} · ${data.program.name}` : "Day" };
}

/** Immersion day player and course lesson player. Locked days get a friendly way forward. */
export default async function LearnPage({ params }: Props) {
  const { slug, lesson } = await params;
  const data = await loadLessonPage(slug, decodeURIComponent(lesson));
  if (!data) {
    // A course or tool lesson the day loader does not know (e.g. a Roadmap link): open it in the course player.
    const course = await loadCourseOutline(slug);
    if (course && opensAsCourse(course.program.type)) redirect(`/programs/${slug}/course/${encodeURIComponent(lesson)}`);
    notFound();
  }
  // Courses and tools (the Kettlebell Roadmap) open in their journey's course player, not the day player.
  if (opensAsCourse(data.program.type)) redirect(`/programs/${slug}/course/${data.lesson.id}`);
  if (!data.state.access) return <LockedDay data={data} reason="access" />;
  if (data.state.lockedOrder && !data.state.unlocked) return <LockedDay data={data} />;
  return (
    <DayPlayer
      key={data.lesson.id}
      data={data}
      endOffer={<OfferSlot placement="day_complete" variant="compact" />}
      levelOffer={<ChooseNextStep program={slug} />}
    />
  );
}
