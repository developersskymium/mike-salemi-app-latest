"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DayGlyph, MovementFigure } from "@/components/graphics";
import { Icon } from "@/components/ui";
import type { Unit, UnitCard } from "./units";

/**
 * Navigator (spec 11 §2): a horizontal strip of units across the top (scrollable, current
 * highlighted, completed ticked) and a grid of small cards for the selected unit. Selecting a unit
 * swaps the grid in place (client state: no reload, no scroll jump).
 */
export function Navigator({
  units,
  initialId,
  currentId,
  label,
  aside,
  compact,
}: {
  units: Unit[];
  initialId: string | null;
  /** The unit holding the member's next lesson ("You're here"). */
  currentId?: string | null;
  label: string;
  aside?: ReactNode;
  compact?: boolean;
}) {
  const [sel, setSel] = useState(initialId ?? units[0]?.id ?? null);
  const unit = units.find((u) => u.id === sel) ?? units[0];
  const strip = useRef<HTMLDivElement>(null);

  // Keep the selected tab in view inside the strip (horizontal only; the page never scrolls).
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>("[aria-selected='true']");
    const box = strip.current;
    if (!el || !box) return;
    const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [sel]);

  if (!unit) return null;
  const groups: { name: string | undefined; units: Unit[] }[] = [];
  for (const u of units) {
    const last = groups[groups.length - 1];
    if (last && last.name === u.group) last.units.push(u);
    else groups.push({ name: u.group, units: [u] });
  }

  const move = (d: number) => {
    const i = units.findIndex((u) => u.id === unit.id);
    const n = units[i + d];
    if (n) setSel(n.id);
  };

  return (
    <section className="jn" aria-label={label} data-compact={compact ? "" : undefined}>
      <div className="jn-head">
        <h2 className="jn-h">{label}</h2>
        {aside}
      </div>
      <div className="jn-strip" ref={strip} role="tablist" aria-label={label} onKeyDown={(e) => {
        if (e.key === "ArrowRight") (e.preventDefault(), move(1));
        if (e.key === "ArrowLeft") (e.preventDefault(), move(-1));
      }}>
        {groups.map((g, gi) => (
          <div className="jn-group" key={`${g.name}-${gi}`}>
            {g.name && <span className="jn-group-t">{g.name}</span>}
            <div className="jn-tabs">
              {g.units.map((u) => {
                const done = u.total > 0 && u.done >= u.total;
                const here = u.id === currentId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    role="tab"
                    aria-selected={u.id === unit.id}
                    tabIndex={u.id === unit.id ? 0 : -1}
                    className="jn-tab"
                    data-done={done ? "" : undefined}
                    data-here={here ? "" : undefined}
                    onClick={() => setSel(u.id)}
                  >
                    <span className="jn-tab-t">
                      {done && <Icon name="check" size="xs" />}
                      {u.label}
                    </span>
                    <span className="jn-tab-s lq-num">{here && !done ? "You're here" : u.sub}</span>
                    <i className="jn-tab-bar" aria-hidden><b style={{ width: `${u.total ? Math.round((u.done / u.total) * 100) : 0}%` }} /></i>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="jn-panel" role="tabpanel" aria-label={unit.label} key={unit.id}>
        {unit.blurb && <p className="jn-blurb">{unit.blurb}</p>}
        {unit.rows.map((r, i) =>
          r.cards.length ? (
            <div className="jn-row" key={`${unit.id}-${i}`}>
              {r.title && <p className="jn-row-t">{r.title}</p>}
              <ul className="jn-grid">
                {r.cards.map((c, k) => <Card key={`${c.id}-${k}`} c={c} />)}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </section>
  );
}

const STATUS_LABEL = { done: "Done", next: "Up next", locked: "Locked", open: "" } as const;

function Card({ c }: { c: UnitCard }) {
  const art = (
    <span className="jn-art" data-tile={c.art.photo ? undefined : ""}>
      {c.art.photo ? (
        <Image src={c.art.photo.src} alt="" fill sizes="(min-width: 1024px) 220px, 45vw" style={{ objectPosition: c.art.photo.focal }} />
      ) : c.art.move ? (
        <MovementFigure move={c.art.move} size={64} bare />
      ) : (
        <DayGlyph type={c.art.glyph ?? "overview"} size={34} tone="accent" />
      )}
      {c.status !== "open" && (
        <span className="jn-badge" data-s={c.status}>
          <Icon name={c.status === "done" ? "check" : c.status === "locked" ? "lock" : "play"} size="xs" />
          {c.status === "next" && <span>Up next</span>}
        </span>
      )}
      {c.external && <span className="jn-badge" data-s="file"><Icon name="down" size="xs" /></span>}
    </span>
  );
  const body = (
    <>
      {art}
      <span className="jn-card-b">
        {c.eyebrow && <span className="jn-card-e">{c.eyebrow}</span>}
        <span className="jn-card-t">{c.title}</span>
        {(c.meta || c.status === "done") && <span className="jn-card-m lq-num">{c.status === "done" ? (c.meta ? `${c.meta} · Done` : "Done") : c.meta}</span>}
      </span>
      {c.status !== "open" && <span className="lq-sr">{STATUS_LABEL[c.status]}</span>}
    </>
  );
  return (
    <li>
      {c.external ? (
        <a href={c.href} target="_blank" rel="noreferrer" className="jn-card lq-press" data-kind={c.kind} data-s={c.status}>{body}</a>
      ) : (
        <Link href={c.href} prefetch={false} className="jn-card lq-press" data-kind={c.kind} data-s={c.status}>{body}</Link>
      )}
    </li>
  );
}
