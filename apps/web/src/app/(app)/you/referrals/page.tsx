import type { Metadata } from "next";
import { ReferralsView } from "@/components/you/ReferralsView";
import { SubPage } from "@/components/you/SubPage";
import { loadReferralsV2 } from "@/lib/loaders/you";

export const metadata: Metadata = { title: "Referrals" };

export default async function Page() {
  const d = await loadReferralsV2();
  return (
    <SubPage
      title="Invite friends"
      back="/you"
      eyebrow="Referrals"
      lede={<><b>Bring someone with you.</b> Training holds better when someone else is doing it too. Share your code: you earn points when a friend joins, and more when they commit.</>}
    >
      <ReferralsView d={d} />
    </SubPage>
  );
}
