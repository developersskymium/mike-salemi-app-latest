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
  ] },
  { g: "Business", items: [
    { href: "/studio/commerce", label: "Commerce", icon: "bookmark" },
    { href: "/studio/offers", label: "Offers", icon: "sparkle" },
    { href: "/studio/experiences", label: "Experiences", icon: "mountain" },
  ] },
  { g: "People", items: [
    { href: "/studio/members", label: "Members", icon: "you" },
    { href: "/studio/organizations", label: "Organizations", icon: "people" },
  ] },
  { g: "Site", items: [
    { href: "/studio/site", label: "Site copy", icon: "display" },
    { href: "/studio/notices", label: "Notices", icon: "bell" },
    { href: "/studio/settings", label: "Settings", icon: "settings" },
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
            <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined}>
              <Icon name={it.icon} size="sm" />
              {it.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
