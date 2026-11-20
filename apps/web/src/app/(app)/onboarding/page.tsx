import type { Metadata } from "next";
import { loadOnboardingStart } from "@/lib/settings/loader";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { surfacePhoto } from "@/lib/photos";
import { SUGGESTABLE } from "@/lib/settings/model";
import { suggestAccess, suggestPhoto } from "@/lib/settings/suggestions";

export const metadata: Metadata = { title: "Welcome" };

const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/onboarding") ? n : null);

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, d, access] = await Promise.all([searchParams, loadOnboardingStart(), suggestAccess().catch(() => ({}))]);
  const hero = surfacePhoto("authHero");
  const photos: Record<string, { src: string; position: string; alt: string }> = { __hero: { src: hero.src, position: hero.focal, alt: hero.alt } };
  for (const s of Object.keys(SUGGESTABLE)) photos[s] = suggestPhoto(s);
  return <Onboarding firstName={d.firstName} initial={d.profile} next={safe(next)} photos={photos} access={access} />;
}
