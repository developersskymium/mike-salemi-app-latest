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

/** Desktop: floating glass sidebar with the five tabs, an optional "Coming up" group and the member. */
export function Sidebar({ extra, active: activeProp }: { extra?: ReactNode; active?: number }) {
  const pathname = usePathname();
  const active = activeProp ?? activeTab(pathname);
  const box = useRef<HTMLElement>(null);
  const lens = useRef<HTMLElement>(null);
  useLens(box, lens, Math.max(0, active), "y");
  const user = useShellUser();

  return (
    <aside className="lq-sidebar lq-glass" aria-label="Sidebar">
      <Link href="/today" className="lq-brand">
        <span className="lq-brand-mark" aria-hidden>
          <Icon name="kettlebell" size="sm" />
        </span>
        <span>
          <span className="lq-t15" style={{ fontWeight: 700, display: "block" }}>
            Mike Salemi
          </span>
          <span className="lq-t11 lq-c2" style={{ fontWeight: 500 }}>
            Kettlebell Lifestyle
          </span>
        </span>
      </Link>
      <nav ref={box} className="lq-nav" aria-label="Main">
        <i ref={lens} className="lq-lens" aria-hidden style={{ top: `calc(${Math.max(0, active)} * 42px)`, opacity: active < 0 ? 0 : 1 } as CSSProperties} />
        {TABS.map((t, i) => (
          <Link key={t.href} href={t.href} data-lens-item="" aria-current={i === active ? "page" : undefined}>
            <Icon name={t.icon} />
            {t.label}
          </Link>
        ))}
      </nav>
      {extra}
      {user && (
        <Link href="/you" className="lq-me lq-press">
          <Avatar name={user.name} src={user.avatarUrl} size="md" variant="solid" />
          <span style={{ minWidth: 0 }}>
            <span className="lq-t15" style={{ fontWeight: 620, display: "block" }}>
              {user.name}
            </span>
            {user.subtitle && <span className="lq-t13 lq-c2">{user.subtitle}</span>}
          </span>
        </Link>
      )}
    </aside>
  );
}

/** A sidebar group ("Coming up") with plain links. */
export function SidebarGroup({ title, items }: { title: string; items: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] }) {
  return (
    <div className="lq-nav">
      <div className="lq-nav-grp">{title}</div>
      {items.map((it) => (
        <Link key={it.href + it.label} href={it.href}>
          <Icon name={it.icon} />
          {it.label}
        </Link>
      ))}
    </div>
  );
}
