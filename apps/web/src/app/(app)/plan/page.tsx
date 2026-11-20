import type { Metadata } from "next";
import { PlanScreen } from "@/components/plan/PlanScreen";
import { loadLessonCatalog, loadPlan } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Plan" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function PlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const d = typeof sp.d === "string" && ISO.test(sp.d) ? sp.d : undefined;
  const [raw, catalog] = await Promise.all([loadPlan(d), loadLessonCatalog()]);
  return <PlanScreen raw={raw} catalog={catalog} anchor={d ?? raw.today} view={sp.view === "month" ? "month" : "week"} build={sp.build === "1"} />;
}
