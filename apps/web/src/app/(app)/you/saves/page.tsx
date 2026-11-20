import type { Metadata } from "next";
import { SavesView, type SaveKind } from "@/components/you/SavesView";
import { SubPage } from "@/components/you/SubPage";
import { loadSavesV2 } from "@/lib/loaders/you";

export const metadata: Metadata = { title: "Saves" };

const KINDS: SaveKind[] = ["all", "tools", "plans", "videos"];

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string; open?: string }> }) {
  const [{ kind, open }, d] = await Promise.all([searchParams, loadSavesV2()]);
  return (
    <SubPage title="Saves" back="/you" eyebrow="Your history">
      <SavesView key={`${kind ?? ""}:${open ?? ""}`} d={d} initialKind={KINDS.includes(kind as SaveKind) ? (kind as SaveKind) : "all"} initialOpen={open} />
    </SubPage>
  );
}
