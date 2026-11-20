import type { Metadata } from "next";
import { ReferralsView } from "@/components/you/ReferralsView";
import { SubPage } from "@/components/you/SubPage";
import { loadReferrals } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Referrals" };

export default async function Page() {
  const d = await loadReferrals();
  return <SubPage title="Invite friends" back="/you" eyebrow="Train together"><ReferralsView d={d} /></SubPage>;
}
