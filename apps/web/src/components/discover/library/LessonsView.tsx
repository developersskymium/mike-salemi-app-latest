"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { CatalogProgram } from "@ms/api";
import { Button, EmptyState, Icon, IconButton } from "@/components/ui";
import type { LibraryPage } from "@/lib/loaders/discover";
import { canOpen, programPhoto } from "../access";
import { ProgramChips, SelectPill } from "./chips";
import { SafeImage } from "./SafeImage";
import { useUrlState } from "./useUrlState";
import { cleanTitle } from "./model";
import "./library.css";

const PAGE = 60;
type S = { q: string; program: string; level: string; section: string };

const fromSp = (sp: Record<string, string | undefined>): S => ({
  q: (sp.q ?? "").slice(0, 80),
  program: sp.program && /^[a-z0-9-]{1,80}$/.test(sp.program) ? sp.program : "all",
  level: sp.level ? sp.level.slice(0, 60) : "all",
  section: sp.section ? sp.section.slice(0, 120) : "all",
});
const toQ = (s: S) => {
  const sp = new URLSearchParams();
  if (s.program !== "all") sp.set("program", s.program);
  if (s.level !== "all") sp.set("level", s.level);
  if (s.section !== "all") sp.set("section", s.section);
  if (s.q.trim()) sp.set("q", s.q.trim());
  return sp.toString();
};

/** All lessons: every lesson of every program, with the same program chips and filters as the Library. */
export function LessonsView({ data, catalog, initial }: { data: LibraryPage; catalog: CatalogProgram[]; initial: Record<string, string | undefined> }) {
  const [s, setS] = useState<S>(() => fromSp(initial));
  const [shown, setShown] = useState(PAGE);
  const search = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<S>) => {
    setS((x) => ({ ...x, ...patch }));
    setShown(PAGE);
  };
  useUrlState("/library/lessons", toQ(s), "q", (search) => {
    setS(fromSp(Object.fromEntries(new URLSearchParams(search))));
    setShown(PAGE);
  });

  const { lessons, programs } = data.index;
  const withLessons = useMemo(() => programs.filter((p) => lessons.some((l) => l.pr === p.id)), [programs, lessons]);
  const pById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);
  const cat = useMemo(() => new Map(catalog.map((c) => [c.slug, c])), [catalog]);
  const program = withLessons.find((p) => p.slug === s.program) ?? null;

  // Level and section options only list what exists inside the chosen program.
  const inProgram = useMemo(() => (program ? lessons.filter((l) => l.pr === program.id) : lessons), [lessons, program]);
  const levelOpts = useMemo(() => [...new Set(inProgram.map((l) => l.path).filter((x): x is string => !!x))].map((id) => ({ value: id, label: data.paths[id] ?? "Level" })), [inProgram, data.paths]);
  const sectionOpts = useMemo(() => [...new Set(inProgram.filter((l) => s.level === "all" || l.path === s.level).map((l) => l.sec).filter(Boolean))].map((x) => ({ value: x, label: x })), [inProgram, s.level]);
  const level = levelOpts.some((o) => o.value === s.level) ? s.level : "all";
  const section = sectionOpts.some((o) => o.value === s.section) ? s.section : "all";

  const q = s.q.trim().toLowerCase();
  const rows = useMemo(
    () =>
      inProgram.filter(
        (l) =>
          (level === "all" || l.path === level) &&
          (section === "all" || l.sec === section) &&
          (!q || `${cleanTitle(l.t)} ${l.sec} ${pById.get(l.pr)?.name ?? ""}`.toLowerCase().includes(q)),
      ),
    [inProgram, level, section, q, pById],
  );
  const filtered = s.q.trim() !== "" || s.program !== "all" || level !== "all" || section !== "all";

  return (
    <div className="w1-lib">
      <header className="w1-lib-head">
        <div className="w1-lib-headcopy">
          <Link href="/library" className="w1-lib-alllink lq-t13 w1-lib-back"><Icon name="back" size="xs" /> Library</Link>
          <h1 className="lq-d-sm w1-lib-h1">All lessons</h1>
        </div>
      </header>

      <ProgramChips options={withLessons.map((p) => ({ key: p.slug, label: p.name }))} value={s.program} onChange={(program) => set({ program, level: "all", section: "all" })} />

      <div className="w1-lib-tools">
        <div className="w1-lib-searchwrap">
          <label className="w1-lib-search">
            <Icon name="search" size="sm" className="lq-c2" />
            <input ref={search} type="search" value={s.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search lessons" aria-label="Search lessons" enterKeyHint="search" className="lq-t15" />
            {s.q && <IconButton icon="close" label="Clear search" variant="plain" size="sm" iconSize="xs" onClick={() => set({ q: "" })} />}
          </label>
        </div>
        {(levelOpts.length > 0 || sectionOpts.length > 1) && (
          <div className="w1-lib-filters" role="group" aria-label="Filters">
            {levelOpts.length > 0 && <SelectPill label="Level" value={level} onChange={(v) => set({ level: v, section: "all" })} all="Any level" options={levelOpts} />}
            {sectionOpts.length > 1 && <SelectPill label="Section" value={section} onChange={(v) => set({ section: v })} all="Any section" options={sectionOpts} />}
          </div>
        )}
      </div>

      <div className="w1-lib-results">
        <p className="lq-t13 lq-c2 w1-clamp1" aria-live="polite">
          <strong className="lq-num w1-lib-n">{rows.length}</strong> {rows.length === 1 ? "lesson" : "lessons"}
          {program ? ` in ${program.name}` : ""}
          {q ? ` matching “${s.q.trim()}”` : ""}
        </p>
        {filtered && (
          <button type="button" className="w1-lib-clear lq-t13" onClick={() => set({ q: "", program: "all", level: "all", section: "all" })}>
            <Icon name="close" size="xs" /> Clear
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No lessons match" body="Try another program, or clear the filters." icon="search" action={<Button variant="glass" size="md" onClick={() => set({ q: "", program: "all", level: "all", section: "all" })}>Clear filters</Button>} />
      ) : (
        <>
          <ul className="w1-lib-lessongrid" aria-label="Lessons">
            {rows.slice(0, shown).map((l, i) => {
              const p = pById.get(l.pr);
              const c = p ? cat.get(p.slug) : undefined;
              const photo = c ? programPhoto(c) : null;
              const locked = c ? !canOpen(c) : false;
              const path = l.path ? data.paths[l.path] : null;
              return (
                <li key={l.id}>
                  <Link href={p ? `/programs/${p.slug}/learn/${l.id}` : "/programs"} className="w1-lib-lesson lq-press" data-locked={locked ? "" : undefined}>
                    <span className="w1-lib-lthumb">
                      {photo && <SafeImage src={photo.src} alt="" fill sizes="(min-width: 640px) 160px, 112px" priority={i < 6} style={{ objectPosition: photo.position }} fallback={null} />}
                      <span className="w1-lib-lglyph" aria-hidden><Icon name={locked ? "lock" : "play"} size="xs" /></span>
                    </span>
                    <span className="w1-lib-lessontext">
                      <span className="w1-lib-eyebrow w1-clamp1">{p?.name ?? "Program"}</span>
                      <span className="lq-t15 w1-clamp2 w1-lib-title">{cleanTitle(l.t)}</span>
                      <span className="lq-t12 lq-c2 w1-clamp1">{[path, l.sec].filter(Boolean).join(" · ")}</span>
                    </span>
                    {locked && <span className="w1-lib-lock lq-t11"><Icon name="lock" size="xs" /> Locked</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          {rows.length > shown && (
            <div className="w1-lib-more">
              <Button variant="glass" size="md" onClick={() => setShown((n) => n + PAGE)}>
                Show more · <span className="lq-num">{rows.length - shown}</span> left
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
