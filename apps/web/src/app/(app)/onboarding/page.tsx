import type { Metadata } from "next";
import { loadOnboardingStart } from "@/lib/settings/loader";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { programCover, surfacePhoto } from "@/lib/photos";
import { programPhoto } from "@/lib/program-photos";

export const metadata: Metadata = { title: "Welcome" };

const SLUGS = ["kettlebell-lifestyle", "working-in", "mastering-the-kettlebell", "athleticism-4-life", "the-path-to-inspired-action", "free-6-video-kettlebell-mini-series"];
const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/onboarding") ? n : null);

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, d] = await Promise.all([searchParams, loadOnboardingStart()]);
  const hero = surfacePhoto("authHero");
  const photos: Record<string, { src: string; position: string; alt: string }> = { __hero: { src: hero.src, position: hero.focal, alt: hero.alt } };
  for (const s of SLUGS) {
    const c = programCover(s);
    photos[s] = c ? { src: c.src, position: c.focal, alt: c.alt } : programPhoto(s);
  }
  return <Onboarding firstName={d.firstName} initial={d.profile} next={safe(next)} photos={photos} />;
}
