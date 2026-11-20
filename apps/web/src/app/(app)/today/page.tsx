import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RetreatJourney } from "@/components/experiences/RetreatJourney";
import { FirstWeekHost } from "@/components/onboarding/FirstWeekHost";
import { buildHome } from "@/components/today/buildHome";
import { buildToday } from "@/components/today/buildToday";
import { TodayScreen } from "@/components/today/TodayScreen";
import { fixture, MOCK } from "@/lib/mock";
import { loadHome } from "@/lib/loaders/home";
import { loadToday, type TodayRaw } from "@/lib/loaders/today-plan-you";
import { loadBadges } from "@/lib/loaders/badges";
import { loadMikeNote } from "@/lib/loaders/mike-note";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Today" };

/** Home (calm, spec 11): continue hero, your programs, this week, one offer, latest badge; retreat card only with an application/booking. */
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  // Preview: `?preview=live` uses a real member's enrollments (fixtures/*-live.json), `?preview=new` a new member.
  const [raw, homeRaw, badges, note] = await Promise.all([
    MOCK && preview === "live" ? fixture<TodayRaw>("tpy-today-live") : loadToday(),
    loadHome(MOCK ? preview : undefined).catch(() => null),
    loadBadges().catch(() => null),
    loadMikeNote().catch(() => null),
  ]);
  const view = buildToday(raw);
  // First visit with no goal: the goal-setting onboarding (members can skip it once).
  if (view.needsOnboarding) redirect("/onboarding");
  const home = homeRaw ? buildHome(homeRaw, view) : null;
  const now = requestTime();
  // Latest badge, shown for 48 hours after it is earned (spec 12, Home #9).
  const latest = badges
    ? Object.entries(badges.earned)
        .filter(([, at]) => now - Date.parse(at) < 48 * 3600e3)
        .sort((a, z) => z[1].localeCompare(a[1]))
        .map(([id, at]) => {
          const b = badges.defs.find((d) => d.id === id);
          return b ? { ...b, earned_at: at } : null;
        })
        .find(Boolean) ?? null
    : null;
  return (
    <TodayScreen
      v={view}
      home={home}
      homeError={!homeRaw}
      now={now}
      latestBadge={latest}
      mikeNote={note}
      firstWeek={
        <Suspense fallback={null}>
          <FirstWeekHost />
        </Suspense>
      }
      retreat={
        <Suspense fallback={null}>
          <RetreatJourney />
        </Suspense>
      }
    />
  );
}
