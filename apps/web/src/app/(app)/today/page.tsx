import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildToday } from "@/components/today/buildToday";
import { TodayScreen } from "@/components/today/TodayScreen";
import { loadToday } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const view = buildToday(await loadToday());
  // First visit with no goal: the goal-setting onboarding (members can skip it once).
  if (view.needsOnboarding) redirect("/onboarding");
  return <TodayScreen v={view} />;
}
