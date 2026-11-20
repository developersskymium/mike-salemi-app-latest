import type { Metadata } from "next";
import { YouScreen } from "@/components/you/YouScreen";
import type { YouTab } from "@/components/you/YouTabs";
import { loadPassport } from "@/lib/loaders/you";
import { loadShopAccess } from "@/lib/loaders/shop";
import { loadBadges } from "@/lib/loaders/badges";
import { loadYouExtras } from "@/lib/loaders/you-extras";

export const metadata: Metadata = { title: "You" };

const TABS: YouTab[] = ["overview", "achievements", "history"];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, d, shop, badges, extras] = await Promise.all([
    searchParams,
    loadPassport(),
    loadShopAccess().catch(() => ({ enabled: false, isAdmin: false })),
    loadBadges().catch(() => null),
    loadYouExtras().catch(() => null),
  ]);
  return <YouScreen d={d} shop={shop} badges={badges} extras={extras} tab={TABS.includes(tab as YouTab) ? (tab as YouTab) : "overview"} />;
}
