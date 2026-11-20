import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopIndex } from "@/components/shop/ShopIndex";
import { loadSelectorConfig, loadShop } from "@/lib/loaders/shop";

export const metadata: Metadata = { title: "Shop" };

export default async function Page() {
  const [d, selector] = await Promise.all([loadShop(), loadSelectorConfig().catch(() => null)]);
  if (!d.enabled && !d.isAdmin) notFound();
  return <ShopIndex d={d} selector={selector} />;
}
