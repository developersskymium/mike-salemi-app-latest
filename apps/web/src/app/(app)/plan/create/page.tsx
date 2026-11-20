import type { Metadata } from "next";
import { PlanCreator } from "@/components/plan/PlanCreator";
import { AmbientBackdrop, IconButton, LargeTitle } from "@/components/ui";
import { PHOTOS } from "@/components/today/photos";
import { loadLessonCatalog, loadPlan } from "@/lib/loaders/today-plan-you";
import "@/components/today/tpy.css";
import "@/components/plan/pln.css";

export const metadata: Metadata = { title: "Create my plan" };

export default async function CreatePlanPage() {
  const [raw, catalog] = await Promise.all([loadPlan(), loadLessonCatalog()]);
  const saved = raw.plans
    .filter((p) => p.source === "ai" || (p.inputs as { kind?: string }).kind === "self_guided")
    .map((p) => ({ id: p.id, name: p.name, sessions: raw.planCounts.find((c) => c.plan_id === p.id)?.total ?? 0 }));
  return (
    <>
      <AmbientBackdrop src={PHOTOS.squat.src} position={PHOTOS.squat.position} fixed />
      <div className="tpy-title">
        <LargeTitle title="Build a path around your life" eyebrow="Plan creator" leading={<IconButton icon="back" label="Back to plan" href="/plan" size="sm" />} />
      </div>
      <p className="pln-lede">Choose the outcome, time and programs. Your plan uses only real lessons already open in your account.</p>
      <PlanCreator catalog={catalog} today={raw.today} saved={saved} />
    </>
  );
}
