import type { Metadata } from "next";
import { SettingsView } from "@/components/you/SettingsView";
import { SubPage } from "@/components/you/SubPage";
import { loadSettings } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  const d = await loadSettings();
  return <SubPage title="Settings" back="/you"><SettingsView d={d} /></SubPage>;
}
