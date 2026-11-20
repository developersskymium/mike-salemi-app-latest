import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JourneyHome } from "@/components/journey/JourneyHome";
import { CourseHome, A4L_SLUG } from "@/components/journeys/CourseHome";
import { PairsWellWith } from "@/components/access/PairsWellWith";
import { ProgramBadges } from "@/components/badges/ProgramBadges";
import { MtkSchedule } from "@/components/journeys/MtkSchedule";
import { loadMtkPlan } from "@/lib/loaders/mtk";
import { MTK_SLUG } from "@ms/core";
import { loadCourseOutline } from "@/lib/loaders/course";
import { SeriesHome } from "@/components/series/SeriesHome";
import { ChooseNextStep } from "@/components/access/ChooseNextStep";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { loadSeriesHome } from "@/lib/loaders/series";
import { isSeries } from "@/lib/series";

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
  // Working-In, The Path, Men of Movement prep and the free series: chapters strip + card grid (journeys-b).
  if (isSeries(slug)) {
    const home = await loadSeriesHome(slug);
    if (!home) notFound();
    return (
      <SeriesHome
        home={home}
        offer={home.data.program.journey.next ? undefined : <PairsWellWith program={slug} />}
        badges={<ProgramBadges slug={slug} />}
        finish={<ChooseNextStep program={slug} />}
      />
    );
  }
  const data = await loadCourseOutline(slug);
  if (!data) notFound();
  if (slug === MTK_SLUG || slug === A4L_SLUG) {
    const mtkPlan = slug === MTK_SLUG && data.mtk?.plan ? await loadMtkPlan().catch(() => null) : null;
    const schedule = mtkPlan?.plan ? <MtkSchedule planId={mtkPlan.plan.id} perWeek={Number((mtkPlan.plan.schedule as { daysPerWeek?: number } | null)?.daysPerWeek ?? 3)} /> : null;
    return <CourseHome data={data} offer={<PairsWellWith program={slug} />} badges={<ProgramBadges slug={slug} />} schedule={schedule} />;
  }
  return <JourneyHome data={data} />;
}
