import type { Metadata } from "next";
import { SavesView } from "@/components/you/SavesView";
import { SubPage } from "@/components/you/SubPage";
import { loadSaves } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "Saves" };

export default async function Page() {
  const d = await loadSaves();
  return <SubPage title="Saves" back="/you"><SavesView d={d} /></SubPage>;
}
