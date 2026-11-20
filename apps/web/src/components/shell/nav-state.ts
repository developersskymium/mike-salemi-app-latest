import { TABS } from "@/lib/nav";

/** Index of the tab that owns a path, or -1. */
export function activeTab(pathname: string) {
  return TABS.findIndex((t) => pathname === t.href || pathname.startsWith(`${t.href}/`));
}
