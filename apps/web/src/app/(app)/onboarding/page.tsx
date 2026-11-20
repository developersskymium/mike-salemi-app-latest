import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/today/OnboardingFlow";
import { loadOnboarding } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Set your goal" };

export default async function OnboardingPage() {
  const data = await loadOnboarding();
  if (!data) redirect("/plan/new");
  return <OnboardingFlow data={data} />;
}
