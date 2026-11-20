import type { Metadata } from "next";
import { YouScreen } from "@/components/you/YouScreen";
import type { YouTab } from "@/components/you/YouTabs";
import { loadPassport } from "@/lib/loaders/you";

export const metadata: Metadata = { title: "You" };

const TABS: YouTab[] = ["overview", "achievements", "history"];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, d] = await Promise.all([searchParams, loadPassport()]);
  return <YouScreen d={d} tab={TABS.includes(tab as YouTab) ? (tab as YouTab) : "overview"} />;
}
