import type { Metadata } from "next";
import { RewardsScreen } from "@/components/you/RewardsScreen";
import { loadRewards } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Rewards" };

export default async function Page() {
  const d = await loadRewards();
  return <RewardsScreen d={d} />;
}
