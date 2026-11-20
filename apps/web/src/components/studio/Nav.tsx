"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui";

const GROUPS: { g?: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  { items: [{ href: "/studio", label: "Overview", icon: "compass" }] },
  { g: "Content", items: [
    { href: "/studio/programs", label: "Programs", icon: "programs" },
    { href: "/studio/readiness", label: "Readiness", icon: "steps" },
    { href: "/studio/library", label: "Library", icon: "library" },
    { href: "/studio/home-content", label: "Home content", icon: "home" },
    { href: "/studio/badges", label: "Badges", icon: "medal" },
  ] },
  { g: "Business", items: [
    { href: "/studio/commerce", label: "Commerce", icon: "shop" },
    { href: "/studio/offers", label: "Offers", icon: "sparkle" },
    { href: "/studio/experiences", label: "Experiences", icon: "retreats" },
    { href: "/studio/retreats", label: "Retreats", icon: "mountain" },
    { href: "/studio/coaching", label: "Coaching", icon: "coaching" },
    { href: "/studio/orders", label: "Shop orders", icon: "gift" },
  ] },
  { g: "People", items: [
    { href: "/studio/members", label: "Members", icon: "you" },
    { href: "/studio/organizations", label: "Organizations", icon: "people" },
    { href: "/studio/requests", label: "Account requests", icon: "clipboard" },
  ] },
  { g: "Site", items: [
    { href: "/studio/site", label: "Site copy", icon: "display" },
    { href: "/studio/notices", label: "Notices", icon: "bell" },
    { href: "/studio/emails", label: "Emails", icon: "file" },
    { href: "/studio/settings", label: "Settings", icon: "settings" },
  ] },
  { g: "Design", items: [
    { href: "/studio/design", label: "Design system", icon: "grid" },
  ] },
];

export function StudioNav() {
  const path = usePathname();
  const active = (h: string) => (h === "/studio" ? path === "/studio" : path === h || path.startsWith(h + "/"));
  return (
    <nav className="st-nav" aria-label="Studio">
      {GROUPS.map((grp, i) => (
        <div key={i} style={{ display: "contents" }}>
          {grp.g && <div className="st-nav-g">{grp.g}</div>}
          {grp.items.map((it) => (
            <Link key={it.href} href={it.href} prefetch aria-current={active(it.href) ? "page" : undefined}>
              <Icon name={it.icon} size="sm" />
              {it.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
