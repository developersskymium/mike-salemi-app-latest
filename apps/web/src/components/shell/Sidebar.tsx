"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { ADDITIONAL, activeHref, NAV, SHOP, type NavItem } from "@/lib/nav";
import type { ShellAccess, ShellResume } from "@/lib/loaders/shell";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";
import { ThemeToggle } from "./ThemeSwitch";
import { useShellUser } from "./ShellUser";

/** The bell mark (Summit wordmark), a solid kettlebell. */
export function BellMark({ color = "#fff" }: { color?: string }) {
  return (
    <svg viewBox="-14 -4 28 36" aria-hidden>
      <path
        d="M-6.8 30.6A12.6 11.4 0 0 1-11.2 15.8C-12.4 10-12.2 3.4-10 1C-8.8-.6-7.6-1.6-5.6-1.8H5.6C7.6-1.6 8.8-.6 10 1C12.2 3.4 12.4 10 11.2 15.8A12.6 11.4 0 0 1 6.8 30.6ZM-8.4 12.5C-9 8-8.8 4.8-7.2 3.2C-6.2 2.2-5 1.6-3.8 1.6H3.8C5 1.6 6.2 2.2 7.2 3.2C8.8 4.8 9 8 8.4 12.5A12.6 11.4 0 0 0-8.4 12.5Z"
        fill={color}
        fillRule="evenodd"
      />
    </svg>
  );
}

/** The wordmark: the bell in an ink tile, MIKE SALEMI, and a small caps line. */
export function Wordmark({ sub = "Kettlebell · Movement", compact }: { sub?: string; compact?: boolean }) {
  return (
    <Link href="/today" className="sm-wordmark" aria-label="Mike Salemi — Home" prefetch>
      <span className="sm-mark">
        <BellMark />
      </span>
      {!compact && (
        <span>
          <b>MIKE SALEMI</b>
          <small>{sub}</small>
        </span>
      )}
    </Link>
  );
}

/** The resume card under the wordmark: photo, "UP NEXT · LEVEL I", day title, meta and a ring. */
export function ResumeCard({ r }: { r: ShellResume }) {
  const R = 19.5;
  const C = 2 * Math.PI * R;
  const pct = Math.round(r.progress * 100);
  return (
    <Link href={r.href} className="sm-resume lq-press" prefetch>
      <span className="sm-resume-photo">
        <Image src={r.photo.src} alt="" fill sizes="232px" style={{ objectPosition: r.photo.position }} />
      </span>
      {r.day && <span className="lq-chip sm-resume-chip" data-level="clear" data-size="sm"><span>{r.day}</span></span>}
      <span className="sm-resume-body">
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="sm-resume-eyebrow">{r.eyebrow}</span>
          <b className="sm-resume-title">{r.title}</b>
          <span className="sm-resume-meta">{r.meta}</span>
        </span>
        <span className="sm-resume-ring" role="img" aria-label={`${pct}% complete`}>
          <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden>
            <circle cx="23" cy="23" r={R} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="5" />
            <circle cx="23" cy="23" r={R} fill="none" stroke="#5DB4F0" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${((C * pct) / 100).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 23 23)" />
          </svg>
          <span>{pct}%</span>
        </span>
      </span>
    </Link>
  );
}

function NavLink({ it, on }: { it: NavItem; on: boolean }) {
  return (
    <Link href={it.href} prefetch aria-current={on ? "page" : undefined} className="sm-navlink">
      <Icon name={it.icon} />
      <span className="sm-navlink-l">{it.label}</span>
      {it.badge && <span className="sm-navlink-badge">{it.badge}</span>}
      {it.meta && <span className="sm-navlink-meta">{it.meta}</span>}
    </Link>
  );
}

/**
 * Desktop rail (the original sidebar, legacy L0): wordmark → resume card → Home, Programs,
 * Retreats, Library, Schedule, Account → "Your access" (program thumbnails) → "Additional"
 * (Tools, Coaching, Referrals, Shop when enabled; collapsible) → the member with the theme toggle.
 */
export function Sidebar({ resume, access = [], shop, extra, more, active: activeProp }: { resume?: ShellResume | null; access?: ShellAccess[]; shop?: boolean; extra?: ReactNode; more?: ReactNode; active?: number }) {
  const pathname = usePathname();
  const additional = shop ? [...ADDITIONAL, SHOP] : ADDITIONAL;
  const forced = activeProp !== undefined && activeProp >= 0 ? NAV[activeProp]?.href ?? null : null;
  const on = forced ?? activeHref([...NAV, ...additional], pathname);
  const user = useShellUser();
  const [open, setOpen] = useState(true);

  return (
    <aside className="sm-rail" aria-label="Sidebar">
      <Wordmark />
      {resume && <ResumeCard r={resume} />}
      <nav className="sm-nav" aria-label="Main">
        {NAV.map((it) => (
          <NavLink key={it.href} it={it} on={on === it.href} />
        ))}
      </nav>
      {access.length > 0 && (
        <div className="sm-navgroup">
          <div className="sm-navgroup-h">Your access</div>
          <nav className="sm-nav sm-access" aria-label="Your access">
            {access.map((a) => {
              const cur = pathname === a.href || pathname.startsWith(`${a.href}/`);
              return (
                <Link key={a.href} href={a.href} prefetch aria-current={cur ? "page" : undefined}>
                  <span className="sm-access-ico">
                    <Image src={a.photo.src} alt="" width={30} height={30} sizes="30px" style={{ objectPosition: a.photo.position }} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="sm-access-t">{a.title}</span>
                    <span className="sm-access-s">{a.sub}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
      {extra}
      <div className="sm-navgroup" data-open={open ? "" : undefined}>
        <button type="button" className="sm-navgroup-h" aria-expanded={open} onClick={() => setOpen(!open)}>
          Additional <Icon name="chevronUp" size="xs" />
        </button>
        {open && (
          <nav className="sm-nav" aria-label="Additional">
            {additional.map((it) => (
              <NavLink key={it.href} it={it} on={on === it.href} />
            ))}
          </nav>
        )}
      </div>
      {more}
      {user && (
        <div className="sm-member">
          <Link href="/you" className="sm-member-link" prefetch>
            <Avatar name={user.name} src={user.avatarUrl} size="md" />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="sm-member-name">{user.name}</span>
              {user.subtitle && <span className="sm-member-sub">{user.subtitle}</span>}
            </span>
          </Link>
          <ThemeToggle />
        </div>
      )}
    </aside>
  );
}

/** A rail group with plain links and an optional meta line per item (kept for older call sites). */
export function SidebarGroup({ title, items }: { title: string; items: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; meta?: string }[] }) {
  return (
    <div className="sm-navgroup">
      <div className="sm-navgroup-h">{title}</div>
      <nav className="sm-nav">
        {items.map((it) => (
          <Link key={it.href + it.label} href={it.href} prefetch className="sm-navlink" style={{ "--x": 0 } as CSSProperties}>
            <Icon name={it.icon} />
            <span className="sm-navlink-l">{it.label}</span>
            {it.meta && <span className="sm-navlink-meta">{it.meta}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
