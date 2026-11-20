import type { Metadata } from "next";
import { SettingsView } from "@/components/you/SettingsView";
import { SubPage } from "@/components/you/SubPage";
import { loadNotifications } from "@/lib/loaders/notifications";
import { loadSettings } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  const [d, n] = await Promise.all([loadSettings(), loadNotifications()]);
  return <SubPage title="Settings" back="/you"><SettingsView d={d} n={n} /></SubPage>;
}
