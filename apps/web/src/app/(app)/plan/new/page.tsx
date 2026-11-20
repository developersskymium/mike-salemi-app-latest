import type { Metadata } from "next";
import { TemplateGallery } from "@/components/plan/TemplateGallery";
import { AmbientBackdrop, Button, IconButton, LargeTitle } from "@/components/ui";
import { PHOTOS } from "@/components/today/photos";
import { loadPlan } from "@/lib/loaders/today-plan-you";
import { loadTrainingProfile } from "@/lib/loaders/plan";
import { defaultDays } from "@/components/today/dates";
import "@/components/today/tpy.css";

export const metadata: Metadata = { title: "New plan" };

export default async function NewPlanPage() {
  const [raw, profile] = await Promise.all([loadPlan(), loadTrainingProfile().catch(() => null)]);
  const preferredDays = profile?.training_days?.length ? profile.training_days : profile?.days_per_week ? defaultDays(profile.days_per_week) : undefined;
  const goal = raw.goals.find((g) => g.status === "active") ?? null;
  return (
    <>
      <AmbientBackdrop src={PHOTOS.deadlift.src} position={PHOTOS.deadlift.position} fixed />
      <div className="tpy-title">
        <LargeTitle title="Plan my week" eyebrow="Pick a plan. It goes on your training days." leading={<IconButton icon="back" label="Back to plan" href="/plan" size="sm" />} trailing={<Button size="md" variant="glass" icon="sparkle" href="/plan/create">Create my plan</Button>} />
      </div>
      <TemplateGallery templates={raw.templates} goalKind={goal?.kind ?? null} today={raw.today} preferredDays={preferredDays} />
    </>
  );
}
