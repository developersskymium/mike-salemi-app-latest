import type { Metadata } from "next";
import { PlacementFlow } from "@/components/roadmap/PlacementFlow";
import { Button, EmptyState } from "@/components/ui";
import { loadRoadmap } from "@/lib/loaders/roadmap";
import "@/components/roadmap/roadmap.css";

export const metadata: Metadata = { title: "Find your phase", robots: { index: false } };

type Props = { searchParams: Promise<{ step?: string }> };

/** The placement test (free for every signed-in member). `?step=ready|run` opens later screens (preview). */
export default async function RoadmapTestPage({ searchParams }: Props) {
  const [sp, v] = await Promise.all([searchParams, loadRoadmap().catch(() => null)]);
  if (!v) return <EmptyState title="The test didn't load" body="Check your connection and try again." action={<Button variant="glass" size="md" href="/tools/roadmap/test">Try again</Button>} />;
  const step = sp.step === "ready" || sp.step === "run" ? sp.step : undefined;
  return (
    <div data-shell-focus="">
      <PlacementFlow movements={v.movements} benchmarks={v.benchmarks} bell={v.bell} initialStep={step} />
    </div>
  );
}
