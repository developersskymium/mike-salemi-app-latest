"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui";
import type { Unit, UnitCard } from "./units";
import "./journeys.css";

export interface ShelfLink {
  id: string;
  label: string;
  sub?: string;
  href: string;
  icon?: IconName;
  photo?: { src: string; focal: string };
}

const firstHref = (u: Unit) => {
  const cards = u.rows.flatMap((r) => r.cards).filter((c) => !c.external);
  return (cards.find((c) => c.status === "next") ?? cards.find((c) => c.status !== "done") ?? cards[0])?.href ?? null;
};

/** Units that live in the bottom grid (libraries, bonuses) rather than the lesson path. */
export const isShelf = (u: Unit) => u.group === "Open any time" || /^bonus$/i.test(u.label);

/** Unit cards → bottom-grid links. */
export function shelfLinks(units: Unit[]): ShelfLink[] {
  return units.filter(isShelf).flatMap((u) => {
    const href = firstHref(u);
    if (!href) return [];
    const photo = u.rows.flatMap((r) => r.cards).find((c) => c.art.photo)?.art.photo;
    return [{ id: u.id, label: u.label, sub: `${u.total} ${u.total === 1 ? "video" : "videos"}`, href, photo }];
  });
}

/**
 * Lesson sidebar for MTK and A4L (spec 11 §2, client correction): back to the program, the path as
 * collapsible groups (weeks / movements) with every lesson listed — current highlighted, done ticked,
 * locked shown — and a 2-column grid of small cards at the bottom for bonuses, libraries and tools.
 * Desktop: left column beside the lesson. Phone: the same panel inside the Lessons sheet.
 */
export function LessonSidebar({
  units,
  activeId,
  program,
  backHref,
  backLabel,
  pct,
  shelf,
  onPick,
  footer,
}: {
  units: Unit[];
  activeId: string;
  program: string;
  backHref: string;
  backLabel?: string;
  pct: number;
  shelf: ShelfLink[];
  onPick?: () => void;
  footer?: ReactNode;
}) {
  const path = units.filter((u) => !isShelf(u));
  const activeUnit = units.find((u) => u.rows.some((r) => r.cards.some((c) => c.id === activeId)));
  // A lesson opened from a shelf (e.g. a workout) still shows its list, on top.
  const list = activeUnit && isShelf(activeUnit) ? [activeUnit, ...path] : path;
  const [open, setOpen] = useState<Set<string>>(() => new Set(activeUnit ? [activeUnit.id] : path[0] ? [path[0].id] : []));
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = scroller.current;
    const unit = box?.querySelector<HTMLElement>(".jsb-unit[data-here]");
    const el = box?.querySelector<HTMLElement>("[aria-current='page']");
    if (!box || !unit) return;
    // Show the week/movement heading; only scroll further when the lesson would sit below the fold.
    const top = (unit.querySelector<HTMLElement>(".jsb-group") ?? unit).offsetTop - 6;
    box.scrollTop = el && el.offsetTop + el.offsetHeight - top > box.clientHeight * 0.8 ? el.offsetTop - box.clientHeight / 3 : Math.max(0, top);
  }, [activeId]);

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  let lastGroup: string | undefined;
  return (
    <div className="jsb">
      <div className="jsb-head">
        <Link href={backHref} className="jsb-back" onClick={onPick}>
          <Icon name="arrowLeft" size="xs" />
          <span>{backLabel ?? "Program home"}</span>
        </Link>
        <p className="jsb-name">{program}</p>
        <div className="jsb-prog">
          <span className="jsb-bar" aria-hidden><i style={{ width: `${pct}%` }} /></span>
          <span className="lq-num">{pct}%</span>
        </div>
      </div>

      <div className="jsb-list" ref={scroller}>
        {list.map((u) => {
          const showGroup = u.group && u.group !== lastGroup && !(isShelf(u) && u === activeUnit);
          if (!isShelf(u)) lastGroup = u.group;
          const isOpen = open.has(u.id);
          const complete = u.total > 0 && u.done >= u.total;
          const here = u === activeUnit;
          return (
            <section key={u.id} className="jsb-unit" data-here={here ? "" : undefined}>
              {showGroup && <p className="jsb-group">{u.group}</p>}
              <button type="button" className="jsb-unit-h" aria-expanded={isOpen} onClick={() => toggle(u.id)}>
                <span className="jsb-unit-ic" data-done={complete ? "" : undefined} aria-hidden>
                  {complete ? <Icon name="check" size="xs" /> : <Ring done={u.done} total={u.total} />}
                </span>
                <span className="jsb-unit-t">
                  <b>{u.label}</b>
                  <small className="lq-num">{u.sub && !/^\d+\/\d+$/.test(u.sub) ? `${u.sub} · ` : ""}{u.done}/{u.total}</small>
                </span>
                <Icon name="chevronDown" size="xs" className="jsb-chev" />
              </button>
              {isOpen && (
                <div className="jsb-rows">
                  {u.rows.map((r, ri) =>
                    r.cards.length ? (
                      <div key={ri}>
                        {r.title && <p className="jsb-row-t">{r.title}</p>}
                        <ol>
                          {r.cards.map((c, i) => (
                            <li key={`${c.id}-${i}`}>
                              <LessonRow card={c} n={i + 1} active={c.id === activeId} onPick={onPick} />
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {shelf.length > 0 && (
        <nav className="jsb-shelf" aria-label="Bonuses and resources">
          <p className="jsb-group">Bonuses & resources</p>
          <div className="jsb-grid">
            {shelf.map((s) => (
              <Link key={s.id} href={s.href} prefetch={false} className="jsb-card" onClick={onPick} data-on={activeUnit?.id === s.id ? "" : undefined}>
                <span className="jsb-card-art" aria-hidden>
                  {s.photo ? <Image src={s.photo.src} alt="" fill sizes="44px" style={{ objectFit: "cover", objectPosition: s.photo.focal }} /> : <Icon name={s.icon ?? "grid"} size="sm" />}
                </span>
                <span className="jsb-card-t">
                  <b>{s.label}</b>
                  {s.sub && <small>{s.sub}</small>}
                </span>
              </Link>
            ))}
          </div>
        </nav>
      )}
      {footer && <div className="jsb-foot">{footer}</div>}
    </div>
  );
}

function LessonRow({ card: c, n, active, onPick }: { card: UnitCard; n: number; active: boolean; onPick?: () => void }) {
  const body = (
    <>
      <span className="jsb-ic lq-num" data-s={active ? "current" : c.status} aria-hidden>
        {c.status === "done" ? <Icon name="check" size="xs" /> : c.status === "locked" ? <Icon name="lock" size="xs" /> : active ? <Icon name="play" size="xs" /> : n}
      </span>
      <span className="jsb-t">
        {c.eyebrow && c.eyebrow !== "In your plan" && <small>{c.eyebrow}</small>}
        <span>{c.title}</span>
      </span>
      {c.meta && <span className="jsb-m lq-num">{c.meta}</span>}
    </>
  );
  if (c.external) return <a href={c.href} target="_blank" rel="noreferrer" className="jsb-l">{body}</a>;
  return (
    <Link href={c.href} scroll={false} prefetch={false} className="jsb-l" aria-current={active ? "page" : undefined} data-done={c.status === "done" ? "" : undefined} onClick={onPick}>
      {body}
    </Link>
  );
}

function Ring({ done, total }: { done: number; total: number }) {
  const p = total ? done / total : 0;
  const C = 2 * Math.PI * 8;
  return (
    <svg viewBox="0 0 20 20" width="20" height="20">
      <circle cx="10" cy="10" r="8" fill="none" stroke="var(--line-strong, rgba(0,0,0,.16))" strokeWidth="2" />
      {p > 0 && <circle cx="10" cy="10" r="8" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray={`${C * p} ${C}`} strokeLinecap="round" transform="rotate(-90 10 10)" />}
    </svg>
  );
}
