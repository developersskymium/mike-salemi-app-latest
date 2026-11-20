"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LibraryIndex } from "@ms/api";
import { Icon } from "@/components/ui";
import { LibraryHeader, SearchField } from "./chips";
import { VideoPoster } from "./VideoPoster";
import { cleanTitle, clock, figureFor, posterOf, primaryMove, tokenMatches } from "./model";
import "./library.css";

/** Exercise index A–Z: every exercise video by name, each row a demo you can open. */
export function ExercisesView({ index }: { index: LibraryIndex }) {
  const [q, setQ] = useState("");
  const progs = useMemo(() => new Map(index.programs.map((p) => [p.id, p.name])), [index.programs]);
  const items = useMemo(() => {
    const seen = new Set<string>();
    return index.videos
      .map((v) => ({ v, title: cleanTitle(v.t) }))
      .filter(({ title }) => (seen.has(title.toLowerCase()) ? false : (seen.add(title.toLowerCase()), true)))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [index.videos]);
  const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = tokens.length ? items.filter(({ title }) => tokens.every((t) => tokenMatches(title.toLowerCase(), t))) : items;
  const letters = useMemo(() => {
    const m = new Map<string, typeof shown>();
    for (const x of shown) {
      const l = /[a-z]/i.test(x.title[0] ?? "") ? x.title[0]!.toUpperCase() : "#";
      m.set(l, [...(m.get(l) ?? []), x]);
    }
    return [...m];
  }, [shown]);

  return (
    <div className="w1-lib l2">
      <LibraryHeader tab="exercises">
        <SearchField value={q} onChange={setQ} placeholder="Find an exercise" label="Find an exercise" />
      </LibraryHeader>
      <div className="l2-toolbar l2-toolbar-az">
        <p className="l2-count lq-t13 lq-c2" aria-live="polite">
          <strong className="lq-num">{shown.length}</strong> {shown.length === 1 ? "exercise" : "exercises"}
        </p>
        <nav className="l2-az" aria-label="Jump to letter">
          {letters.map(([l]) => (
            <a key={l} href={`#ex-${l}`} className="lq-t13">{l}</a>
          ))}
        </nav>
      </div>
      {letters.length === 0 && <p className="lq-t15 lq-c2 l2-none">No exercises match “{q.trim()}”. Try a shorter word.</p>}
      {letters.map(([l, list]) => (
        <section key={l} id={`ex-${l}`} className="w1-lib-group" aria-label={l}>
          <h2 className="lq-t20 w1-lib-grouph">{l} <span className="lq-t13 lq-c2 lq-num">{list.length}</span></h2>
          <ul className="w1-lib-lessongrid">
            {list.map(({ v, title }) => (
              <li key={v.id}>
                <Link href={`/library/${v.id}`} className="w1-lib-lesson lq-press">
                  <span className="w1-lib-lthumb">
                    <VideoPoster {...posterOf(v)} move={figureFor(primaryMove(v))} seed={v.id} figure={56} sizes="124px" />
                    <span className="w1-lib-lglyph" aria-hidden><Icon name="play" size="xs" /></span>
                  </span>
                  <span className="w1-lib-lessontext">
                    <span className="w1-lib-eyebrow w1-clamp1">{progs.get(v.pr[0] ?? "") ?? "Library"}</span>
                    <span className="lq-t15 w1-clamp2 w1-lib-title">{title}</span>
                    {v.d ? <span className="lq-t12 lq-c2 lq-num">{clock(v.d)}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
