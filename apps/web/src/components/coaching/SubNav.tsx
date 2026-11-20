"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/coaching", label: "Overview" },
  { href: "/coaching/sessions", label: "Sessions" },
  { href: "/coaching/messages", label: "Messages" },
  { href: "/coaching/zen-savage", label: "Zen Savage" },
];

/** Coaching sub navigation: four quiet tabs; Book and Prep live inside them. */
export function CoachingSubNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  const active = (h: string) => (h === "/coaching" ? path === "/coaching" || path.startsWith("/coaching/book") || path.startsWith("/coaching/prep") : path.startsWith(h));
  return (
    <nav className="co-subnav" aria-label="Coaching">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={active(t.href) ? "page" : undefined} prefetch>
          {t.label}
          {t.href === "/coaching/messages" && unread > 0 && <span className="co-dot" aria-label={`${unread} new`} />}
        </Link>
      ))}
    </nav>
  );
}
