"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { CatalogProgram } from "@ms/api";
import { Button, EmptyState, Icon } from "@/components/ui";
import type { LibraryPage } from "@/lib/loaders/discover";
import { lessonHrefOf } from "@/lib/hrefs";
import { canOpen, programPhoto } from "../access";
import { ActiveChip, LibraryHeader, ProgramChips, SearchField, SelectPill } from "./chips";
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
    <div className="w1-lib l2">
      <LibraryHeader tab="lessons">
        <SearchField value={s.q} onChange={(q) => set({ q })} inputRef={search} placeholder="Search lessons" label="Search lessons" />
      </LibraryHeader>

      <ProgramChips
        options={withLessons.map((p) => ({ key: p.slug, label: p.name, n: lessons.filter((l) => l.pr === p.id).length }))}
        total={lessons.length}
        value={s.program}
        onChange={(program) => set({ program, level: "all", section: "all" })}
      />

      <div className="l2-toolbar">
        <p className="l2-count lq-t13 lq-c2 w1-clamp1" aria-live="polite">
          <strong className="lq-num">{rows.length}</strong> {rows.length === 1 ? "lesson" : "lessons"}
          {program ? ` in ${program.name}` : ""}
        </p>
        <div className="l2-filters" role="group" aria-label="Filters">
          {levelOpts.length > 0 && <SelectPill label="Level" value={level} onChange={(v) => set({ level: v, section: "all" })} all="Level" options={levelOpts} />}
          {sectionOpts.length > 1 && <SelectPill label="Section" value={section} onChange={(v) => set({ section: v })} all="Section" options={sectionOpts} />}
        </div>
      </div>
      {filtered && (
        <div className="l2-activerow" role="group" aria-label="Active filters">
          {program && <ActiveChip onRemove={() => set({ program: "all", level: "all", section: "all" })}>{program.name}</ActiveChip>}
          {level !== "all" && <ActiveChip onRemove={() => set({ level: "all", section: "all" })}>{levelOpts.find((o) => o.value === level)?.label ?? "Level"}</ActiveChip>}
          {section !== "all" && <ActiveChip onRemove={() => set({ section: "all" })}>{section}</ActiveChip>}
          {q && <ActiveChip onRemove={() => set({ q: "" })}>{`“${s.q.trim()}”`}</ActiveChip>}
          <button type="button" className="l2-clearall lq-t13" onClick={() => set({ q: "", program: "all", level: "all", section: "all" })}>Clear all</button>
        </div>
      )}

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
                  <Link href={p ? lessonHrefOf(p.slug, l.id, { type: c?.type }) : "/programs"} className="w1-lib-lesson lq-press" data-locked={locked ? "" : undefined}>
                    <span className="w1-lib-lthumb">
                      {photo && <SafeImage src={photo.src} alt="" fill sizes="(min-width: 640px) 160px, 112px" priority={i < 6} style={{ objectPosition: photo.position }} fallback={null} />}
                      <span className="w1-lib-lglyph" aria-hidden><Icon name={locked ? "lock" : "play"} size="xs" /></span>
                    </span>
                    <span className="w1-lib-lessontext">
                      <span className="w1-lib-eyebrow w1-clamp1">{p?.name ?? "Program"}</span>
                      <span className="lq-t15 w1-clamp2 w1-lib-title">{cleanTitle(l.t)}</span>
                      <span className="lq-t12 lq-c2 w1-clamp1">{[path, l.sec].filter(Boolean).join(" · ")}</span>
                    </span>
                    {locked ? (
                      <span className="w1-lib-lock lq-t11"><Icon name="lock" size="xs" /> Buy</span>
                    ) : null}
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
