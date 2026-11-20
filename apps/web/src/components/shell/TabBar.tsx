"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TABS } from "@/lib/nav";
import { Icon } from "../ui/Icon";
import { haptic, useLens } from "../ui/motion";
import { activeTab } from "./nav-state";

/** Phone tab bar: floating glass capsule, lens morphs between tabs, compacts while scrolling down. */
export function TabBar({ active: activeProp }: { active?: number }) {
  const pathname = usePathname();
  const active = activeProp ?? activeTab(pathname);
  const box = useRef<HTMLElement>(null);
  const lens = useRef<HTMLElement>(null);
  useLens(box, lens, Math.max(0, active));
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - last) < 8) return;
        setCompact(y > last && y > 120);
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav ref={box} aria-label="Main" className="lq-tabbar lq-glass" data-float="" data-compact={compact ? "" : undefined}>
      <i
        ref={lens}
        className="lq-lens"
        aria-hidden
        style={{ left: `calc(4px + ${Math.max(0, active)} * (100% - 8px) / ${TABS.length})`, opacity: active < 0 ? 0 : 1 } as CSSProperties}
      />
      {TABS.map((t, i) => (
        <Link
          key={t.href}
          href={t.href}
          data-lens-item=""
          aria-current={i === active ? "page" : undefined}
          className="lq-press"
          onClick={() => i !== active && haptic(6)}
        >
          <Icon name={t.icon} size="tab" />
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
