import type { Metadata } from "next";
import { RewardsScreen } from "@/components/you/RewardsScreen";
import { loadRewardsV2 } from "@/lib/loaders/you";

export const metadata: Metadata = { title: "Rewards" };

export default async function Page() {
  const d = await loadRewardsV2();
  return <RewardsScreen d={d} />;
}
