"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Segmented } from "@/components/ui";

export type ExploreTab = "training" | "experiences" | "free";
const OPTIONS = [
  { value: "training", label: "Training" },
  { value: "experiences", label: "Experiences" },
  { value: "free", label: "Free tools" },
] as const;

/** Explore segmented control. Panels are server-rendered; this only switches which is shown (and keeps ?tab= in the URL). */
export function ExploreTabs({ initial, panels }: { initial: ExploreTab; panels: Record<ExploreTab, ReactNode> }) {
  const [tab, setTab] = useState<ExploreTab>(initial);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "training") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
  }, [tab]);
  return (
    <div>
      <Segmented label="Explore" options={OPTIONS} value={tab} onChange={setTab} className="dsc-seg" />
      {(Object.keys(panels) as ExploreTab[]).map((k) => (
        <div key={k} role="region" hidden={k !== tab} className="dsc-panel" aria-label={OPTIONS.find((o) => o.value === k)?.label}>
          {panels[k]}
        </div>
      ))}
    </div>
  );
}
