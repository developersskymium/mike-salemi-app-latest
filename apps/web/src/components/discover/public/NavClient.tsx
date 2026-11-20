"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui";

/** Sticky bar that is clear over a hero photo and solid chalk once the page scrolls. */
export function NavScroll({ onPhoto, children }: { onPhoto: boolean; children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!onPhoto) return;
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [onPhoto]);
  return (
    <header className="pub-nav" data-over={onPhoto && !scrolled ? "photo" : undefined} data-overlay={onPhoto ? "" : undefined}>
      {children}
    </header>
  );
}

/** Phone menu: the links in a solid sheet under the bar. */
export function NavMenu({ links, signedIn }: { links: { href: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="pub-menu" ref={ref}>
      <button type="button" className="pub-menu-btn" aria-expanded={open} aria-controls="pub-menu" aria-label={open ? "Close menu" : "Menu"} onClick={() => setOpen((o) => !o)}>
        <Icon name={open ? "close" : "menu"} size="sm" />
      </button>
      {open && (
        <div id="pub-menu" className="pub-menu-sheet">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
              <Icon name="chevron" size="xs" />
            </Link>
          ))}
          {!signedIn && (
            <Link href="/signin" onClick={() => setOpen(false)}>
              Sign in
              <Icon name="chevron" size="xs" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
