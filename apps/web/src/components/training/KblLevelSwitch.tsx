"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import type { LevelChoice } from "@/lib/loaders/training";
import "./kbl-level.css";

export type { LevelChoice };

/**
 * KBL level switcher. Level I and Level II are a choice, not a ladder: every level is open,
 * keeps its own progress, and switching never resets anything. The intake-recommended level
 * (fallback Level I) carries "Recommended for you".
 *
 * `variant="menu"` (default): a compact chip ("Level I ▾") that opens a small menu, for headers.
 * `variant="cards"`: the levels side by side as two quiet cards, for a program page.
 * `hrefFor` overrides where a level goes (e.g. the program page's `?path=` instead of the resume day).
 */
export function KblLevelSwitch({
  levels,
  currentKey,
  variant = "menu",
  hrefFor,
  className,
}: {
  levels: LevelChoice[];
  currentKey: string | null | undefined;
  variant?: "menu" | "cards";
  hrefFor?: (level: LevelChoice) => string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = levels.find((l) => l.key === currentKey) ?? null;
  const href = (l: LevelChoice) => (hrefFor ? hrefFor(l) : l.href);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (levels.length < 2) return null;

  if (variant === "cards") {
    return (
      <div className={`kls-cards${className ? ` ${className}` : ""}`} role="list" aria-label="Choose your level">
        {levels.map((l) => (
          <LevelRow key={l.key} level={l} href={href(l)} current={l.key === currentKey} card />
        ))}
      </div>
    );
  }

  return (
    <div className={`kls${className ? ` ${className}` : ""}`} ref={root}>
      <button type="button" className="kls-btn lq-press" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((v) => !v)}>
        <span>{current?.shortName ?? "Choose level"}</span>
        <Icon name="chevronDown" size="xs" />
      </button>
      {open && (
        <div className="kls-menu" id={menuId} role="menu" aria-label="Switch level">
          <p className="kls-note">Pick either level any time. Your progress in each is kept.</p>
          {levels.map((l) => (
            <LevelRow key={l.key} level={l} href={href(l)} current={l.key === currentKey} onPick={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  );
}

function LevelRow({ level, href, current, card, onPick }: { level: LevelChoice; href: string; current: boolean; card?: boolean; onPick?: () => void }) {
  const pct = level.total ? Math.round((level.done / level.total) * 100) : 0;
  return (
    <Link
      href={href}
      role={card ? "listitem" : "menuitem"}
      className={card ? "kls-card lq-press" : "kls-item"}
      aria-current={current ? "true" : undefined}
      onClick={onPick}
      prefetch={false}
    >
      <span className="kls-item-t">
        <b>{level.label}</b>
        {level.recommended && <span className="kls-rec">Recommended for you</span>}
      </span>
      <span className="kls-item-m lq-num">
        {level.done > 0 ? `${level.done} of ${level.total} done` : "Not started"}
        {current ? " · You're here" : ""}
      </span>
      <span className="kls-bar" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </span>
    </Link>
  );
}
