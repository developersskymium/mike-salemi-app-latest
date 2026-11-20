"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { haptic } from "@/components/ui/motion";

export type YouTab = "overview" | "achievements" | "history";
const TABS: { id: YouTab | "notifications" | "organization"; label: string; href?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "achievements", label: "Achievements" },
  { id: "history", label: "History" },
  { id: "notifications", label: "Notifications", href: "/you/settings#notifications" },
  { id: "organization", label: "Organization", href: "/you/organization" },
];

/**
 * The legacy account's sticky tab bar (Overview · Achievements · History · Notifications · Organization).
 * The first three switch in place (and keep ?tab= in the URL); the last two open their own pages.
 */
export function YouTabs({ initial, panels }: { initial: YouTab; panels: Record<YouTab, ReactNode> }) {
  const [tab, setTab] = useState<YouTab>(initial);

  useEffect(() => {
    const on = () => {
      const t = new URLSearchParams(window.location.search).get("tab") as YouTab | null;
      if (t && t in panels) setTab(t);
    };
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, [panels]);

  const pick = (t: YouTab) => {
    if (t !== tab) haptic(6);
    setTab(t);
    const u = new URL(window.location.href);
    if (t === "overview") u.searchParams.delete("tab");
    else u.searchParams.set("tab", t);
    window.history.replaceState(null, "", u);
  };

  return (
    <>
      <div className="yu-tabs-wrap">
        <nav className="yu-tabs lq-glass" aria-label="Profile sections">
          <div className="yu-tabs-row" role="tablist">
            {TABS.map((t) =>
              t.href ? (
                <Link key={t.id} href={t.href} className="yu-tab" data-link="">
                  {t.label}
                </Link>
              ) : (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`yu-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`yu-panel-${t.id}`}
                  className="yu-tab"
                  data-on={tab === t.id ? "" : undefined}
                  onClick={() => pick(t.id as YouTab)}
                  onKeyDown={(e) => {
                    const ids: YouTab[] = ["overview", "achievements", "history"];
                    const i = ids.indexOf(tab);
                    if (e.key === "ArrowRight") pick(ids[Math.min(ids.length - 1, i + 1)]!);
                    if (e.key === "ArrowLeft") pick(ids[Math.max(0, i - 1)]!);
                  }}
                >
                  {t.label}
                </button>
              ),
            )}
          </div>
        </nav>
      </div>
      {(Object.keys(panels) as YouTab[]).map((id) => (
        <section key={id} id={`yu-panel-${id}`} role="tabpanel" aria-labelledby={`yu-tab-${id}`} hidden={tab !== id} className="yu-panel" data-on={tab === id ? "" : undefined}>
          {panels[id]}
        </section>
      ))}
    </>
  );
}
