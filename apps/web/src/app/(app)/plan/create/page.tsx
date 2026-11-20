import type { Metadata } from "next";
import { PlanCreator } from "@/components/plan/PlanCreator";
import { AmbientBackdrop, IconButton, LargeTitle } from "@/components/ui";
import { PHOTOS } from "@/components/today/photos";
import { loadLessonCatalog, loadPlan } from "@/lib/loaders/today-plan-you";
import { loadSchedulable, loadTrainingProfile } from "@/lib/loaders/plan";
import { ScheduleProgram } from "@/components/plan/ScheduleProgram";
import { defaultDays } from "@/components/today/dates";
import "@/components/today/tpy.css";
import "@/components/plan/pln.css";

export const metadata: Metadata = { title: "Create my plan" };

export default async function CreatePlanPage() {
  const [raw, catalog, profile, schedulable] = await Promise.all([loadPlan(), loadLessonCatalog(), loadTrainingProfile().catch(() => null), loadSchedulable().catch(() => [])]);
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
      {schedulable.length > 0 && (
        <div className="spg-top">
          {schedulable.map((s) => <ScheduleProgram key={s.slug} program={s} today={raw.today} preferredDays={profile?.training_days?.length ? profile.training_days : profile?.days_per_week ? defaultDays(profile.days_per_week) : []} />)}
        </div>
      )}
      <PlanCreator catalog={catalog} today={raw.today} saved={saved} profile={profile} />
    </>
  );
}
