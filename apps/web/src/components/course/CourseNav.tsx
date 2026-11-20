"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { sectionInPath } from "@ms/core";
import type { CourseGroup, CourseLessonNode, CoursePageData } from "@/lib/loaders/course";
import { Check, Chevron, Doc, PlayFill, Search, Spark, X } from "./glyphs";

/** Open groups/sections and search survive lesson-to-lesson navigation (the page re-renders per lesson). */
const memory = new Map<string, { groups: Set<string>; sections: Set<string>; q: string; scroll: number }>();
export function navMemory(slug: string) {
  let m = memory.get(slug);
  if (!m) memory.set(slug, (m = { groups: new Set(), sections: new Set(), q: "", scroll: 0 }));
  return m;
}

export interface NavProps {
  data: CoursePageData;
  groups: CourseGroup[];
  done: Set<string>;
  href: (id: string) => string;
  planMode: boolean;
  onPick?: () => void;
  /** Focus the search field on mount (keyboard "/"). */
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function CourseNav({ data, groups, done, href, planMode, onPick, searchRef }: NavProps) {
  const slug = data.program.slug;
  const mem = navMemory(slug);
  const [q, setQ] = useState(mem.q);
  const [openG, setOpenG] = useState<Set<string>>(() => new Set(mem.groups));
  const [openS, setOpenS] = useState<Set<string>>(() => new Set(mem.sections));
  const list = useRef<HTMLDivElement>(null);

  const all = useMemo(() => groups.flatMap((g) => g.sections.flatMap((s) => s.lessons)), [groups]);
  const activeId = data.activeId;
  const activeSection = groups.flatMap((g) => g.sections).find((s) => s.lessons.some((l) => l.id === activeId));
  const activeGroup = groups.find((g) => g.sections.some((s) => s.id === activeSection?.id));
  const multi = groups.length > 1;
  const planIds = useMemo(() => new Set(data.mtk?.plan?.lessonIds ?? []), [data.mtk]);
  const bucket = !data.mtk?.plan ? data.mtk?.pathBucket ?? null : null;

  // The active group and section open themselves.
  useEffect(() => {
    if (activeGroup) setOpenG((s) => (s.has(activeGroup.name) ? s : new Set(s).add(activeGroup.name)));
    if (activeSection) setOpenS((s) => (s.has(activeSection.id) ? s : new Set(s).add(activeSection.id)));
  }, [activeGroup, activeSection]);
  useEffect(() => {
    mem.groups = openG;
    mem.sections = openS;
    mem.q = q;
  }, [openG, openS, q, mem]);

  // Keep the scroll position, and bring the current lesson into view the first time.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    if (mem.scroll) el.scrollTop = mem.scroll;
    const cur = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (cur) {
      const r = cur.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      if (r.top < b.top + 40 || r.bottom > b.bottom - 40) cur.scrollIntoView({ block: "center" });
    }
    const save = () => (mem.scroll = el.scrollTop);
    el.addEventListener("scroll", save, { passive: true });
    return () => el.removeEventListener("scroll", save);
  }, [mem]);

  const total = all.length;
  const doneN = all.filter((l) => done.has(l.id)).length;
  const pct = total ? Math.round((doneN / total) * 100) : 0;
  const query = q.trim().toLowerCase();
  const matches = query
    ? groups.flatMap((g) =>
        g.sections.flatMap((s) =>
          s.lessons.filter((l) => l.title.toLowerCase().includes(query) || s.title.toLowerCase().includes(query)).map((l) => ({ l, s, g })),
        ),
      )
    : [];

  const toggle = (set: Set<string>, key: string) => {
    const n = new Set(set);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    return n;
  };

  const row = (l: CourseLessonNode, sub?: string) => {
    const current = l.id === activeId;
    const isDone = done.has(l.id);
    return (
      <li key={l.id}>
        <Link
          href={href(l.id)}
          prefetch={false}
          scroll={false}
          className="crs-lrow"
          aria-current={current ? "page" : undefined}
          data-done={isDone ? "" : undefined}
          onClick={onPick}
        >
          <span className="crs-lrow-ic" aria-hidden>{isDone ? <Check /> : l.video ? <PlayFill /> : <Doc />}</span>
          <span className="crs-lrow-main">
            <span className="crs-ellipsis">{highlight(l.title, query)}</span>
            {sub && <small>{sub}</small>}
          </span>
          {isDone && <span className="lq-sr">Done</span>}
          {planIds.has(l.id) && <span className="crs-dot" title="Recommended for you" aria-label="Recommended for you" />}
        </Link>
      </li>
    );
  };

  return (
    <div className="crs-nav">
      <div className="crs-nav-head">
        <div className="crs-prog">
          <span>Progress</span>
          <span className="crs-num"><b>{pct}%</b> · {doneN}/{total}</span>
        </div>
        {/* Signature: chapter strata. Width = lessons in the chapter; fill = done. Tap jumps to its next lesson. */}
        <div className="crs-strata" role="list" aria-label="Chapters">
          {groups.map((g) => {
            const ls = g.sections.flatMap((s) => s.lessons);
            const d = ls.filter((l) => done.has(l.id)).length;
            const nextL = ls.find((l) => !done.has(l.id)) ?? ls[0];
            return (
              <Link
                key={g.name}
                role="listitem"
                href={nextL ? href(nextL.id) : "#"}
                prefetch={false}
                scroll={false}
                onClick={onPick}
                className="crs-x"
                data-now={g === activeGroup ? "" : undefined}
                title={`${g.name} · ${d}/${ls.length}`}
                aria-label={`${g.name}, ${d} of ${ls.length} done`}
                style={{ "--w": Math.max(1, ls.length), "--p": ls.length ? d / ls.length : 0 } as CSSProperties}
              >
                <i />
              </Link>
            );
          })}
        </div>
        {multi && activeGroup && (
          <div className="crs-strata-cap">
            <span><b>{activeGroup.name}</b></span>
            <span className="crs-num">
              {activeGroup.sections.flatMap((s) => s.lessons).filter((l) => done.has(l.id)).length}/{activeGroup.sections.flatMap((s) => s.lessons).length}
            </span>
          </div>
        )}
        <label className="crs-search">
          <Search />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search lessons" />
          {q ? (
            <button type="button" className="crs-x" onClick={() => setQ("")} aria-label="Clear search"><X width={14} height={14} /></button>
          ) : (
            <kbd aria-hidden className="crs-only-desk">/</kbd>
          )}
        </label>
      </div>

      <div className="crs-nav-list" ref={list}>
        {query ? (
          matches.length ? (
            <ul className="crs-lessons" data-flat="">
              {matches.slice(0, 80).map(({ l, s, g }) => row(l, [multi ? g.name : null, s.title].filter(Boolean).join(" · ")))}
            </ul>
          ) : (
            <p className="crs-empty">Nothing matches “{q}”.</p>
          )
        ) : (
          <>
            {data.mtk && (
              <div className="crs-mtk">
                <div className="crs-mtk-switch" role="tablist" aria-label="Curriculum view">
                  {planMode ? <span aria-current="true">My Plan</span> : <Link href="/mtk">My Plan</Link>}
                  {planMode ? <Link href={`/programs/${slug}/course/${activeId === "intro" ? "resume" : activeId}?mode=full`}>Full Curriculum</Link> : <span aria-current="true">Full Curriculum</span>}
                </div>
                {data.mtk.plan ? (
                  <p className="crs-mtk-note"><span className="crs-dot" /> {data.mtk.plan.lessonIds.length} lessons recommended for you</p>
                ) : (
                  <p className="crs-mtk-note">
                    <Link href={data.mtk.assessmentDone ? "/mtk/results" : `/intake/${slug}`}>{data.mtk.assessmentDone ? "Finish my plan →" : "Create my personalized plan →"}</Link>
                  </p>
                )}
              </div>
            )}

            {data.intro && (
              <Link href={href("start")} prefetch={false} scroll={false} className="crs-start" aria-current={activeId === "intro" ? "page" : undefined} onClick={onPick}>
                <Spark /> Start here <small>Not counted</small>
              </Link>
            )}

            {groups.map((g, gi) => {
              const ls = g.sections.flatMap((s) => s.lessons);
              const gd = ls.filter((l) => done.has(l.id)).length;
              const gOpen = !multi || openG.has(g.name);
              const sections = (
                <div className="crs-group-body" data-flat={multi ? undefined : ""}>
                  {g.sections.map((s) => {
                    const sOpen = openS.has(s.id);
                    const sd = s.lessons.filter((l) => done.has(l.id)).length;
                    return (
                      <div key={s.id} className="crs-sec" data-now={s.id === activeSection?.id ? "" : undefined}>
                        <button type="button" className="crs-x crs-srow" aria-expanded={sOpen} onClick={() => setOpenS((x) => toggle(x, s.id))}>
                          <Chevron className="crs-chev" />
                          <span className="crs-srow-t crs-ellipsis">{s.title}</span>
                          {bucket && sectionInPath(bucket, s.position) && <span className="crs-dot" title="On your path" aria-label="On your path" />}
                          <span className="crs-count" data-done={sd === s.lessons.length && sd > 0 ? "" : undefined}>{sd}/{s.lessons.length}</span>
                        </button>
                        {sOpen && <ul className="crs-lessons">{s.lessons.map((l) => row(l))}</ul>}
                      </div>
                    );
                  })}
                </div>
              );
              if (!multi) return <div key={g.name}>{sections}</div>;
              return (
                <div key={g.name} className="crs-group" data-now={g === activeGroup ? "" : undefined}>
                  <button type="button" className="crs-x crs-grow" aria-expanded={gOpen} onClick={() => setOpenG((x) => toggle(x, g.name))}>
                    <span className="crs-grow-n">{String(gi + 1).padStart(2, "0")}</span>
                    <span className="crs-grow-t crs-ellipsis">{g.name}</span>
                    <span className="crs-count" data-done={gd === ls.length && gd > 0 ? "" : undefined}>{gd}/{ls.length}</span>
                    <Chevron className="crs-chev" />
                  </button>
                  {gOpen && sections}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
