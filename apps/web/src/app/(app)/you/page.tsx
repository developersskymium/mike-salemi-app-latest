import type { Metadata } from "next";
import { PlanSavings } from "@/components/access/PlanSavings";
import { YouScreen } from "@/components/you/YouScreen";
import type { YouTab } from "@/components/you/YouTabs";
import { loadPassport } from "@/lib/loaders/you";
import { loadShopAccess } from "@/lib/loaders/shop";
import { loadBadges } from "@/lib/loaders/badges";
import { loadYouExtras } from "@/lib/loaders/you-extras";
import { loadSavedLists } from "@/lib/loaders/saved-lists";

export const metadata: Metadata = { title: "You" };

const TABS: YouTab[] = ["overview", "achievements", "history"];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, d, shop, badges, extras, lists] = await Promise.all([
    searchParams,
    loadPassport(),
    loadShopAccess().catch(() => ({ enabled: false, isAdmin: false })),
    loadBadges().catch(() => null),
    loadYouExtras().catch(() => null),
    loadSavedLists(),
  ]);
  const t = TABS.includes(tab as YouTab) ? (tab as YouTab) : "overview";
  return (
    <>
      <YouScreen d={d} shop={shop} badges={badges} extras={extras} lists={lists} tab={t} />
      {t === "overview" && (
        <div style={{ maxWidth: 1240, margin: "32px auto 0" }}>
          <PlanSavings />
        </div>
      )}
    </>
  );
}
