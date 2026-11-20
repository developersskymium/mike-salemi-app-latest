import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanDetailScreen } from "@/components/plan/PlanDetailScreen";
import { loadPlanDetail } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Plan" };

export default async function PlanDetailPage({ params }: { params: Promise<{ plan: string }> }) {
  const { plan } = await params;
  const detail = await loadPlanDetail(plan);
  if (!detail) notFound();
  return <PlanDetailScreen d={detail} />;
}
