import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MTK_SLUG } from "@ms/core";
import { MtkResults } from "@/components/course/mtk/MtkResults";
import { loadMtkResults } from "@/lib/loaders/mtk";

export const metadata: Metadata = { title: "Your MTK results", description: "Your assessed level, strengths, focus areas and recommended Mastering the Kettlebell lessons." };

/** Results of the latest MTK assessment and the schedule that turns them into My Plan. */
export default async function MtkResultsPage() {
  const data = await loadMtkResults();
  if (!data) redirect("/programs");
  if (!data.assessment) redirect(`/intake/${MTK_SLUG}`);
  return <MtkResults data={data} />;
}
