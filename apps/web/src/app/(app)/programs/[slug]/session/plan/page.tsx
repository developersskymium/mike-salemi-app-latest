import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanCreator } from "@/components/selfguided/PlanCreator";
import { loadPlanBuilder } from "@/lib/loaders/selfguided";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Create my plan", description: "Build a personalised multi-week training path from programs you can access." };

/** Legacy Self-Guided plan creator: form, pathway by week, save and schedule, saved plans. */
export default async function PlanCreatorPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadPlanBuilder();
  if (!data) notFound();
  return <PlanCreator data={data} slug={slug} />;
}
