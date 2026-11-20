import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JourneyHome } from "@/components/journey/JourneyHome";
import { CourseHome, A4L_SLUG } from "@/components/journeys/CourseHome";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { MTK_SLUG } from "@ms/core";
import { loadCourseOutline } from "@/lib/loaders/course";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCourseOutline(slug);
  return data ? { title: data.program.name, description: data.program.journey.promise } : { title: "Program" };
}

/**
 * Journey home for a course-type program: its signature navigation, categorisation, progress and
 * planned self-guided path (MTK skill tree, A4L training blocks, Working-In series, The Path's ten
 * weeks, Men of Movement's five pillars, free step ladders, the Roadmap's four camps).
 * Lessons open in the shared course player at `./[lesson]`.
 */
export default async function JourneyPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadCourseOutline(slug);
  if (!data) notFound();
  if (slug === MTK_SLUG || slug === A4L_SLUG) return <CourseHome data={data} offer={<OfferSlot placement="program_page" />} />;
  return <JourneyHome data={data} />;
}
