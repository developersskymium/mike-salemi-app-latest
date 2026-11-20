import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MTK_SLUG } from "@ms/core";
import { MtkPlan } from "@/components/course/mtk/MtkPlan";
import { loadMtkPlan } from "@/lib/loaders/mtk";

export const metadata: Metadata = { title: "My MTK Plan", description: "Your personalised day-by-day path through Mastering the Kettlebell." };

/** My Plan. No plan yet: finish it from the results, or take the assessment first. */
export default async function MtkPlanPage() {
  const data = await loadMtkPlan();
  if (!data) redirect("/programs");
  if (!data.plan) redirect(data.assessmentDone ? "/mtk/results" : `/intake/${MTK_SLUG}`);
  return <MtkPlan data={data} />;
}
