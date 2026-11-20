import { activeHref, NAV } from "@/lib/nav";

/** Index of the primary nav item that owns a path, or -1. */
export function activeTab(pathname: string) {
  const h = activeHref(NAV, pathname);
  return h ? NAV.findIndex((t) => t.href === h) : -1;
}
