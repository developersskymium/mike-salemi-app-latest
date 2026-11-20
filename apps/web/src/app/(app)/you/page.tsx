import type { Metadata } from "next";
import { PlanSavings } from "@/components/access/PlanSavings";
import { YouScreen } from "@/components/you/YouScreen";
import type { YouTab } from "@/components/you/YouTabs";
import { loadPassport } from "@/lib/loaders/you";
import { loadShopAccess } from "@/lib/loaders/shop";

export const metadata: Metadata = { title: "You" };

const TABS: YouTab[] = ["overview", "achievements", "history"];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, d, shop] = await Promise.all([searchParams, loadPassport(), loadShopAccess().catch(() => ({ enabled: false, isAdmin: false }))]);
  const t = TABS.includes(tab as YouTab) ? (tab as YouTab) : "overview";
  return (
    <>
      <YouScreen d={d} shop={shop} tab={t} />
      {t === "overview" && (
        <div style={{ maxWidth: 1240, margin: "32px auto 0" }}>
          <PlanSavings />
        </div>
      )}
    </>
  );
}
