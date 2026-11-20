import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { DayPlayer } from "@/components/training/DayPlayer";
import { LockedDay } from "@/components/training/LockedDay";
import { loadLessonPage } from "@/lib/loaders/training";

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
  if (!data) notFound();
  if (!data.state.access) return <LockedDay data={data} reason="access" />;
  if (data.state.lockedOrder && !data.state.unlocked) return <LockedDay data={data} />;
  return (
    <DayPlayer
      key={data.lesson.id}
      data={data}
      endOffer={<OfferSlot placement="day_complete" variant="compact" />}
    />
  );
}
