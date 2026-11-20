import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildHome } from "@/components/today/buildHome";
import { buildToday } from "@/components/today/buildToday";
import { TodayScreen } from "@/components/today/TodayScreen";
import { MOCK } from "@/lib/mock";
import { loadHome } from "@/lib/loaders/home";
import { loadToday } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Today" };

/** Home dashboard (legacy /home order): hero, your programs, upcoming, start new, retreats, explore next. */
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  const [raw, homeRaw] = await Promise.all([loadToday(), loadHome(MOCK ? preview : undefined).catch(() => null)]);
  const view = buildToday(raw);
  // First visit with no goal: the goal-setting onboarding (members can skip it once).
  if (view.needsOnboarding) redirect("/onboarding");
  const home = homeRaw ? buildHome(homeRaw, view) : null;
  return <TodayScreen v={view} home={home} homeError={!homeRaw} />;
}
