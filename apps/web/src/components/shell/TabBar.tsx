"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ADDITIONAL, activeHref, NAV, PHONE_TABS, SHOP, type NavItem } from "@/lib/nav";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";
import { haptic } from "../ui/motion";
import { ThemeSwitch } from "./ThemeSwitch";

/** Everything that isn't a tab, for the More sheet. */
function moreItems(shop: boolean): NavItem[] {
  const tabs = new Set(PHONE_TABS.map((t) => t.href));
  return [...NAV.filter((n) => !tabs.has(n.href)), ...ADDITIONAL, ...(shop ? [SHOP] : [])];
}

/**
 * Phone tab bar: a floating glass capsule (the one place Summit uses glass) with Home, Programs,
 * Profile and More. More opens a sheet with Retreats, Library, Schedule, Tools, Coaching,
 * Referrals (and Shop) plus the appearance switch.
 */
export function TabBar({ active: activeProp, more, shop = false }: { active?: number; more?: ReactNode; shop?: boolean }) {
  const pathname = usePathname();
  const extra = moreItems(shop);
  const forced = activeProp !== undefined && activeProp >= 0 ? PHONE_TABS[activeProp]?.href ?? null : null;
  const on = forced ?? activeHref([...PHONE_TABS, ...extra], pathname);
  const moreOn = !!on && extra.some((x) => x.href === on);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <nav aria-label="Main" className="sm-tabbar">
        {PHONE_TABS.map((t) => (
          <Link key={t.href} href={t.href} prefetch aria-current={on === t.href ? "page" : undefined} className="lq-press" onClick={() => on !== t.href && haptic(6)}>
            <Icon name={t.icon} size="tab" />
            <span>{t.label}</span>
          </Link>
        ))}
        {more ?? (
          <button type="button" className="lq-press" aria-current={moreOn ? "page" : undefined} aria-haspopup="dialog" aria-expanded={open} onClick={() => { haptic(6); setOpen(true); }}>
            <Icon name="grid" size="tab" />
            <span>More</span>
          </button>
        )}
      </nav>
      <Sheet open={open} onClose={() => setOpen(false)} title="More" detents={["medium", "large"]}>
        <nav className="sm-more" aria-label="More">
          {extra.map((it) => (
            <Link key={it.href} href={it.href} prefetch className="sm-more-row lq-press" aria-current={on === it.href ? "page" : undefined}>
              <span className="sm-more-ic">
                <Icon name={it.icon} />
              </span>
              <span className="sm-more-l">{it.label}</span>
              {it.badge && <span className="sm-navlink-badge">{it.badge}</span>}
              {it.meta && <span className="sm-navlink-meta">{it.meta}</span>}
              <Icon name="chevron" size="sm" className="sm-more-chev" />
            </Link>
          ))}
        </nav>
        <div className="sm-more-theme">
          <span className="lq-eyebrow">Appearance</span>
          <ThemeSwitch size="sm" />
        </div>
      </Sheet>
    </>
  );
}
