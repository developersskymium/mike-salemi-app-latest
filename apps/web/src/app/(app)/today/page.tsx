import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RetreatJourney } from "@/components/experiences/RetreatJourney";
import { buildHome } from "@/components/today/buildHome";
import { buildToday } from "@/components/today/buildToday";
import { TodayScreen } from "@/components/today/TodayScreen";
import { fixture, MOCK } from "@/lib/mock";
import { loadHome } from "@/lib/loaders/home";
import { loadToday, type TodayRaw } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Today" };

/** Home dashboard (legacy /home order): hero, your programs, upcoming, start new, retreats, explore next. */
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  // Preview: `?preview=live` uses a real member's enrollments (fixtures/*-live.json), `?preview=new` a new member.
  const [raw, homeRaw] = await Promise.all([
    MOCK && preview === "live" ? fixture<TodayRaw>("tpy-today-live") : loadToday(),
    loadHome(MOCK ? preview : undefined).catch(() => null),
  ]);
  const view = buildToday(raw);
  // First visit with no goal: the goal-setting onboarding (members can skip it once).
  if (view.needsOnboarding) redirect("/onboarding");
  const home = homeRaw ? buildHome(homeRaw, view) : null;
  return <TodayScreen v={view} home={home} homeError={!homeRaw} retreat={<Suspense fallback={null}><RetreatJourney /></Suspense>} />;
}
