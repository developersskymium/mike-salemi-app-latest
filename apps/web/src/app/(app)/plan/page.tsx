import type { Metadata } from "next";
import { headers } from "next/headers";
import { PlanScreen } from "@/components/plan/PlanScreen";
import { feedToken } from "@/lib/calendar-feed";
import { MOCK, MOCK_USER } from "@/lib/mock";
import { loadNotifications } from "@/lib/loaders/notifications";
import { loadSchedule, loadTrainingProfile } from "@/lib/loaders/plan";
import { loadLessonCatalog, loadPlan } from "@/lib/loaders/today-plan-you";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Schedule" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const SLUG = /^[a-z0-9-]{2,80}$/;

/** The one schedule. `?program=<slug>` filters it to one program (program schedule screens land here). */
export default async function PlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const d = typeof sp.d === "string" && ISO.test(sp.d) ? sp.d : undefined;
  const plan = typeof sp.plan === "string" && UUID.test(sp.plan) ? sp.plan : undefined;
  const program = typeof sp.program === "string" && SLUG.test(sp.program) ? sp.program : null;
  const [raw, catalog, schedule, n, h, userId, profile] = await Promise.all([
    loadPlan(d), loadLessonCatalog(), loadSchedule(), loadNotifications(), headers(),
    MOCK ? Promise.resolve(MOCK_USER.id) : getUser().then((u) => u.user?.id ?? null),
    loadTrainingProfile().catch(() => null),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const feedUrl = userId ? `${origin}/cal/${feedToken(userId)}.ics` : `${origin}/plan/calendar.ics`;
  return (
    <PlanScreen
      raw={raw} catalog={catalog} schedule={schedule} n={n} anchor={d ?? raw.today} view={sp.view === "month" ? "month" : "week"}
      build={sp.build === "1"} selectedId={plan} origin={origin} program={program} feedUrl={feedUrl} profile={profile}
    />
  );
}
