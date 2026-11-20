import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AverageDay } from "@/components/selfguided/AverageDay";
import { AVERAGE_VIDEO_IDS } from "@/components/selfguided/averageDay";
import { loadAverageDay } from "@/lib/loaders/selfguided";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "An average day",
  description: "Readiness check, morning routine, warm up, kettlebell prep, workout and stretching in one flow.",
};

/** Legacy Self-Guided "An Average Day" walkthrough (Kettlebell Lifestyle). */
export default async function AverageDayPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadAverageDay(slug, AVERAGE_VIDEO_IDS);
  if (!data || !data.day.form) notFound();
  return <AverageDay data={data} slug={slug} />;
}
