"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { ADDITIONAL, activeHref, NAV, SHOP, SHOP_ADMIN, type NavItem } from "@/lib/nav";
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

/** The wordmark: the bell in an ink tile and "Mike Salemi" (the brand reads just "Mike Salemi"; `sub` only where a page asks). */
export function Wordmark({ sub, compact }: { sub?: string; compact?: boolean }) {
  return (
    <Link href="/today" className="sm-wordmark" aria-label="Mike Salemi — Home" prefetch>
      <span className="sm-mark">
        <BellMark />
      </span>
      {!compact && (
        <span>
          <b>Mike Salemi</b>
          {sub ? <small>{sub}</small> : null}
        </span>
      )}
    </Link>
  );
}

/** "Up next · Level I" → "Level I" (the progress line's label). */
function levelLabel(eyebrow: string) {
  const m = eyebrow.match(/Level\s+[IVX\d]+/i);
  return m ? m[0] : null;
}

/**
 * The slim resume card under the wordmark (v4): a small thumbnail, "Up next · Day N", the title,
 * a glacier play button and a 3px ember progress line.
 */
export function ResumeCard({ r }: { r: ShellResume }) {
  const pct = Math.round(Math.max(0, Math.min(1, r.progress)) * 100);
  const level = levelLabel(r.eyebrow);
  return (
    <Link href={r.href} className="sm-resume lq-press" prefetch aria-label={`${r.day ? `Up next, ${r.day}: ` : "Up next: "}${r.title}. ${pct}% complete`}>
      <span className="sm-resume-top">
        <span className="sm-resume-th">
          <Image src={r.photo.src} alt="" fill sizes="40px" style={{ objectPosition: r.photo.position }} />
        </span>
        <span className="sm-resume-tx">
          <span className="sm-resume-k">{r.day ? `Up next · ${r.day}` : r.eyebrow}</span>
          <b className="sm-resume-title">{r.title}</b>
        </span>
        <span className="sm-resume-go" aria-hidden>
          <Icon name="play" size="xs" />
        </span>
      </span>
      <span className="sm-resume-pr" aria-hidden>
        <span>{level ?? "Progress"}</span>
        <span className="sm-resume-bar"><i style={{ width: `${pct}%` }} /></span>
        <b>{pct}%</b>
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
 * Desktop rail (its own light surface, a hairline from the body; the current page is a soft accent pill):
 * wordmark → resume card → Home, Programs, Library, Schedule → "Your access" (program thumbnails) →
 * "More" (Retreats, Coaching, Tools, Referrals, Shop when enabled; collapsible) → the member (Account) with the theme toggle.
 */
export function Sidebar({ resume, access = [], shop, shopAdmin, extra, more, active: activeProp }: { resume?: ShellResume | null; access?: ShellAccess[]; shop?: boolean; shopAdmin?: boolean; extra?: ReactNode; more?: ReactNode; active?: number }) {
  const pathname = usePathname();
  const additional = shop ? [...ADDITIONAL, shopAdmin ? SHOP_ADMIN : SHOP] : ADDITIONAL;
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
                <Link key={a.href} href={a.href} prefetch aria-current={cur ? "page" : undefined} title={`${a.title} · ${a.sub}`}>
                  <span className="sm-access-ico">
                    <Image src={a.photo.src} alt="" width={20} height={20} sizes="20px" style={{ objectPosition: a.photo.position }} />
                  </span>
                  <span className="sm-access-t">{a.title}</span>
                  {a.sub === "Completed" ? <Icon name="check" size="sm" className="sm-access-done" label="Completed" /> : <span className="lq-sr">{a.sub}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
      {extra}
      <div className="sm-navgroup" data-open={open ? "" : undefined}>
        <button type="button" className="sm-navgroup-h" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span>More</span> <Icon name="chevronUp" size="xs" />
        </button>
        {open && (
          <nav className="sm-nav" aria-label="More">
            {additional.map((it) => (
              <NavLink key={it.href} it={it} on={on === it.href} />
            ))}
          </nav>
        )}
      </div>
      {more}
      {user && (
        <div className="sm-member">
          <Link href="/you" className="sm-member-link" prefetch aria-current={!on && (pathname === "/you" || pathname.startsWith("/you/")) ? "page" : undefined}>
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
