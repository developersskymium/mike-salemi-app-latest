"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui";
import type { Unit } from "./units";
import "./journeys.css";

const unitHref = (u: Unit) => {
  const cards = u.rows.flatMap((r) => r.cards).filter((c) => !c.external);
  return (cards.find((c) => c.status === "next") ?? cards.find((c) => c.status !== "done") ?? cards[0])?.href ?? null;
};

/** Slim top navigator on a lesson page: prev / unit chips (week, movement) / next. */
export function LessonStrip({ units, unitId, prevHref, nextHref }: { units: Unit[]; unitId: string | null; prevHref: string | null; nextHref: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>("[aria-current='true']");
    if (el && box.current) box.current.scrollLeft = el.offsetLeft - box.current.clientWidth / 2 + el.clientWidth / 2;
  }, [unitId]);
  return (
    <nav className="jls" aria-label="Lessons">
      {prevHref ? <Link href={prevHref} scroll={false} className="jls-step" aria-label="Previous lesson"><Icon name="arrowLeft" size="xs" /></Link> : <span className="jls-step" aria-disabled="true"><Icon name="arrowLeft" size="xs" /></span>}
      <div className="jls-chips" ref={box}>
        {units.map((u) => {
          const h = unitHref(u);
          if (!h) return null;
          const done = u.total > 0 && u.done >= u.total;
          return (
            <Link key={u.id} href={h} scroll={false} prefetch={false} className="jls-chip" aria-current={u.id === unitId ? "true" : undefined}>
              {done && <Icon name="check" size="xs" />}
              {u.label}
            </Link>
          );
        })}
      </div>
      {nextHref ? <Link href={nextHref} scroll={false} className="jls-step" aria-label="Next lesson"><Icon name="arrowRight" size="xs" /></Link> : <span className="jls-step" aria-disabled="true"><Icon name="arrowRight" size="xs" /></span>}
    </nav>
  );
}

/** Compact list of the current unit's lessons, under the player. */
export function UnitList({ unit, activeId }: { unit: Unit | null; activeId: string }) {
  if (!unit) return null;
  const cards = unit.rows.flatMap((r) => r.cards).filter((c) => !c.external);
  return (
    <section className="jll" aria-label={`${unit.label} lessons`}>
      <div className="jll-h"><b>{unit.label}</b><span className="lq-num">{unit.done} of {unit.total} done</span></div>
      <ol>
        {cards.map((c, i) => (
          <li key={`${c.id}-${i}`}>
            <Link href={c.href} scroll={false} prefetch={false} aria-current={c.id === activeId ? "page" : undefined} data-done={c.status === "done" ? "" : undefined}>
              <span className="jll-ic lq-num" aria-hidden>{c.status === "done" ? <Icon name="check" size="xs" /> : i + 1}</span>
              <span className="jll-t">{c.title}</span>
              {c.meta && <span className="jll-m">{c.meta}</span>}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
