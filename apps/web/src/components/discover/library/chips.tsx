"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui";

export function ChipBtn({ on, onClick, children, icon }: { on: boolean; onClick: () => void; children: React.ReactNode; icon?: "bookmark" | "kettlebell" }) {
  return (
    <button type="button" className="l2-drop" data-on={on ? "" : undefined} aria-pressed={on} onClick={onClick}>
      {icon && <Icon name={icon} size="xs" />}
      <span>{children}</span>
    </button>
  );
}

export type ProgramOption = { key: string; label: string; n?: number };

/** Program names across the top: "All" first, then every program with content. Always ONE scrollable row with fading edges. */
export function ProgramChips({ options, value, onChange, label = "Program", total }: { options: ProgramOption[]; value: string; onChange: (key: string) => void; label?: string; total?: number }) {
  const row = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const sync = useCallback(() => {
    const el = row.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    sync();
    const el = row.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync]);
  useEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!on || !el) return;
    const left = on.offsetLeft - 24;
    if (on.offsetLeft + on.offsetWidth > el.scrollLeft + el.clientWidth || on.offsetLeft < el.scrollLeft) el.scrollTo({ left: Math.max(0, left) });
  }, [value]);
  return (
    <div className="l2-programs" data-start={edge.start ? "" : undefined} data-end={edge.end ? "" : undefined}>
      <div ref={row} className="l2-programs-track" role="group" aria-label={label} onScroll={sync}>
        <PChip on={value === "all"} onClick={() => onChange("all")} n={total}>All</PChip>
        {options.map((o) => (
          <PChip key={o.key} on={value === o.key} onClick={() => onChange(o.key)} n={o.n}>{o.label}</PChip>
        ))}
      </div>
    </div>
  );
}

function PChip({ on, onClick, n, children }: { on: boolean; onClick: () => void; n?: number; children: ReactNode }) {
  return (
    <button type="button" className="l2-pchip lq-t13" aria-pressed={on} onClick={onClick}>
      <span>{children}</span>
      {n !== undefined && <span className="l2-pchip-n lq-num">{n}</span>}
    </button>
  );
}

/** A filter dropdown: a native select dressed as a consistent button (best phone picker, keyboard and screen-reader friendly). */
export function SelectPill({ label, value, onChange, all, options }: { label: string; value: string; onChange: (v: string) => void; all: string; options: { value: string; label: string }[] }) {
  return (
    <label className="l2-drop" data-on={value !== "all" ? "" : undefined}>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="lq-t13">
        <option value="all">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Icon name="down" size="xs" />
    </label>
  );
}

/** A removable active-filter chip. */
export function ActiveChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <button type="button" className="l2-active lq-t13" onClick={onRemove} aria-label={`Remove filter: ${typeof children === "string" ? children : ""}`}>
      <span>{children}</span>
      <Icon name="close" size="xs" />
    </button>
  );
}

export type LibTab = "videos" | "lessons" | "exercises";
const TABS: { key: LibTab; href: string; label: string }[] = [
  { key: "videos", href: "/library", label: "Videos" },
  { key: "lessons", href: "/library/lessons", label: "All lessons" },
  { key: "exercises", href: "/library/exercises", label: "Exercises A–Z" },
];
const BLURB: Record<LibTab, string> = {
  videos: "Every training video from every program, in one place.",
  lessons: "Every lesson from every program, opened right where it lives.",
  exercises: "Every exercise demo, by name.",
};

/** Shared header for the three library pages: title, one line, the Videos · All lessons · Exercises A–Z tabs, then the search. */
export function LibraryHeader({ tab, children }: { tab: LibTab; children?: ReactNode }) {
  return (
    <header className="l2-head">
      <div className="l2-head-top">
        <div className="l2-head-copy">
          <h1 className="lq-d-sm l2-h1">Library</h1>
          <p className="lq-t15 lq-c2 l2-blurb">{BLURB[tab]}</p>
        </div>
        <nav className="l2-tabs" aria-label="Library sections">
          {TABS.map((t) => (
            <Link key={t.key} href={t.href} className="l2-tab lq-t13" aria-current={t.key === tab ? "page" : undefined} prefetch>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </header>
  );
}

/** The library search field (primary control). */
export function SearchField({ value, onChange, placeholder, label, inputRef, extra, after }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  inputRef?: React.Ref<HTMLInputElement>;
  extra?: React.InputHTMLAttributes<HTMLInputElement>;
  after?: ReactNode;
}) {
  return (
    <div className="l2-searchwrap">
      <label className="l2-search">
        <Icon name="search" size="sm" className="lq-c2" />
        <input ref={inputRef} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} enterKeyHint="search" className="lq-t15" {...extra} />
        {value && (
          <button type="button" className="l2-search-x" aria-label="Clear search" onClick={() => onChange("")}>
            <Icon name="close" size="xs" />
          </button>
        )}
      </label>
      {after}
    </div>
  );
}
