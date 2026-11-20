import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FirstSessions } from "@/components/shop/FirstSessions";
import { loadShop } from "@/lib/loaders/shop";

export const metadata: Metadata = { title: "Your first 3 sessions" };

export default async function Page() {
  const d = await loadShop();
  if (!d.enabled && !d.isAdmin) notFound();
  return <FirstSessions unlocked={d.ownsBell || d.isAdmin} />;
}
