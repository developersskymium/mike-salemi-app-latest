import type { IconName } from "@/components/ui/Icon";

/**
 * Navigation (legacy L0, Summit). Desktop rail: the primary list, "Your access", "Additional".
 * Phone: tab bar Home / Programs / Profile / More (More opens a sheet with the rest).
 * The same lists drive the phone apps later.
 */
export type NavItem = { href: string; label: string; icon: IconName; badge?: string; meta?: string; /** Extra path prefixes this item owns. */ match?: string[] };

export const NAV: readonly NavItem[] = [
  { href: "/today", label: "Home", icon: "home", match: ["/onboarding"] },
  { href: "/programs", label: "Programs", icon: "programs", match: ["/mtk", "/intake"] },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/plan", label: "Schedule", icon: "plan" },
] as const;

/** The quieter second group ("More" on the rail and in the phone sheet). Account lives on the member
 *  row at the bottom of the rail (and the Profile tab on phones), so it is not repeated here. */
export const ADDITIONAL: readonly NavItem[] = [
  { href: "/experiences", label: "Retreats", icon: "retreats" },
  { href: "/coaching", label: "Coaching", icon: "coaching" },
  { href: "/tools", label: "Tools", icon: "tools" },
  { href: "/you/referrals", label: "Referrals", icon: "gift" },
] as const;

/** Shown in "Additional" when the shop is enabled (site_settings.shop.enabled), and always to admins. */
export const SHOP: NavItem = { href: "/shop", label: "Shop", icon: "shop" };
/** The Shop link as admins see it while the shop is still off for members. */
export const SHOP_ADMIN: NavItem = { ...SHOP, badge: "Admin" };

/** Phone tab bar (More is a button that opens the sheet). */
export const PHONE_TABS: readonly NavItem[] = [
  { href: "/today", label: "Home", icon: "home", match: ["/onboarding"] },
  { href: "/programs", label: "Programs", icon: "programs", match: ["/mtk", "/intake"] },
  { href: "/you", label: "Profile", icon: "account" },
] as const;

/** Kept for older imports: the primary list. */
export const TABS = NAV;
export type TabIcon = IconName;

const owns = (it: NavItem, path: string) => [it.href, ...(it.match ?? [])].some((h) => path === h || path.startsWith(`${h}/`));

/** The most specific item that owns a path (e.g. /you/referrals → Referrals, not Account). */
export function activeHref(items: readonly NavItem[], path: string): string | null {
  let best: NavItem | null = null;
  for (const it of items) if (owns(it, path) && (!best || it.href.length > best.href.length)) best = it;
  return best?.href ?? null;
}
