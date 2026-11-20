"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { TABS } from "@/lib/nav";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";
import { useLens } from "../ui/motion";
import { activeTab } from "./nav-state";
import { useShellUser } from "./ShellUser";

/** The wordmark: a swing arc ending in a light point, and the name set wide. */
export function Wordmark({ sub }: { sub?: string }) {
  return (
    <Link href="/today" className="lq-brand">
      <svg className="lq-brand-mark" viewBox="0 0 26 26" aria-hidden>
        <path d="M3 8A10 10 0 0 0 23 8" />
        <circle cx="23" cy="8" r="2.4" />
      </svg>
      <span>
        <span className="lq-brand-name">Mike Salemi</span>
        {sub && <span className="lq-brand-sub">{sub}</span>}
      </span>
    </Link>
  );
}

/**
 * Desktop rail (legacy L0 order): wordmark → resume card → primary nav → extra groups
 * (Unlocked) → more destinations → the member. The active item is lit by a light dash.
 */
export function Sidebar({ resume, extra, more, active: activeProp }: { resume?: ReactNode; extra?: ReactNode; more?: ReactNode; active?: number }) {
  const pathname = usePathname();
  const active = activeProp ?? activeTab(pathname);
  const box = useRef<HTMLElement>(null);
  const lens = useRef<HTMLElement>(null);
  useLens(box, lens, Math.max(0, active), "y");
  const user = useShellUser();

  return (
    <aside className="lq-sidebar" aria-label="Sidebar">
      <Wordmark sub="Kettlebell Lifestyle" />
      {resume && <div className="lq-rail-resume">{resume}</div>}
      <nav ref={box} className="lq-nav" aria-label="Main">
        <i ref={lens} className="lq-lens" aria-hidden style={{ top: `calc(${Math.max(0, active)} * 44px)`, opacity: active < 0 ? 0 : 1 } as CSSProperties} />
        {TABS.map((t, i) => (
          <Link key={t.href} href={t.href} data-lens-item="" aria-current={i === active ? "page" : undefined}>
            <Icon name={t.icon} />
            {t.label}
          </Link>
        ))}
      </nav>
      {extra}
      {more}
      {user && (
        <Link href="/you" className="lq-me lq-press">
          <Avatar name={user.name} src={user.avatarUrl} size="md" />
          <span style={{ minWidth: 0 }}>
            <span className="lq-me-name">{user.name}</span>
            {user.subtitle && <span className="lq-t12 lq-c3" style={{ display: "block", fontWeight: 500 }}>{user.subtitle}</span>}
          </span>
          <Icon name="chevron" size="xs" />
        </Link>
      )}
    </aside>
  );
}

/** A rail group ("Unlocked", "Coming up") with plain links and an optional meta line per item. */
export function SidebarGroup({ title, items }: { title: string; items: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; meta?: string }[] }) {
  return (
    <div className="lq-nav">
      <div className="lq-nav-grp">{title}</div>
      {items.map((it) => (
        <Link key={it.href + it.label} href={it.href} data-meta={it.meta ? "" : undefined}>
          <Icon name={it.icon} />
          <span className="lq-nav-lbl">
            {it.label}
            {it.meta && <small>{it.meta}</small>}
          </span>
        </Link>
      ))}
    </div>
  );
}
