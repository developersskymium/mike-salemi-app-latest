import type { Metadata } from "next";
import { headers } from "next/headers";
import { PlanScreen } from "@/components/plan/PlanScreen";
import { loadNotifications } from "@/lib/loaders/notifications";
import { loadSchedule } from "@/lib/loaders/plan";
import { loadLessonCatalog, loadPlan } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Plan" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

export default async function PlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const d = typeof sp.d === "string" && ISO.test(sp.d) ? sp.d : undefined;
  const plan = typeof sp.plan === "string" && UUID.test(sp.plan) ? sp.plan : undefined;
  const [raw, catalog, schedule, n, h] = await Promise.all([loadPlan(d), loadLessonCatalog(), loadSchedule(), loadNotifications(), headers()]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  return (
    <PlanScreen
      raw={raw}
      catalog={catalog}
      schedule={schedule}
      n={n}
      anchor={d ?? raw.today}
      view={sp.view === "month" ? "month" : "week"}
      build={sp.build === "1"}
      selectedId={plan}
      origin={origin}
    />
  );
}
