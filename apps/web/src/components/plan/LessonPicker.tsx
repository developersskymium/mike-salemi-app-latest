"use client";

import { useMemo, useState, type DragEvent } from "react";
import { DayGlyph } from "@/components/graphics";
import { EmptyState, Icon } from "@/components/ui";
import type { LessonCatalog } from "@/lib/loaders/today-plan-you";
import { dayTypeOf, splitDayTitle } from "@/components/today/model";
import "@/components/today/tpy.css";

export type PickedLesson = { id: string; title: string; programId: string; programSlug: string; programName: string };

/** Lessons from every program the member can open: choose a program, search, then tap (or drag on desktop). */
export function LessonPicker({ catalog, onPick, draggable, dragMime, defaultProgramId }: { catalog: LessonCatalog; onPick: (l: PickedLesson) => void; draggable?: boolean; dragMime?: string; defaultProgramId?: string }) {
  const [pid, setPid] = useState(catalog.programs.find((p) => p.id === defaultProgramId)?.id ?? catalog.programs[0]?.id ?? "");
  const [q, setQ] = useState("");
  const program = catalog.programs.find((p) => p.id === pid);
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = (program?.lessons ?? []).filter((l) => !needle || l.title.toLowerCase().includes(needle) || l.section.toLowerCase().includes(needle));
    const out: { section: string; lessons: typeof list }[] = [];
    for (const l of list) {
      const last = out[out.length - 1];
      if (last && last.section === l.section) last.lessons.push(l);
      else out.push({ section: l.section, lessons: [l] });
    }
    return out;
  }, [program, q]);

  if (!catalog.programs.length) {
    return <EmptyState title="No lessons yet" body="Start a program and its lessons appear here." icon="kettlebell" />;
  }

  return (
    <div className="tpy-picker">
      <label className="lq-sr" htmlFor="tpy-pick-program">Program</label>
      <select id="tpy-pick-program" className="tpy-select" value={pid} onChange={(e) => setPid(e.target.value)}>
        {catalog.programs.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input className="tpy-search" type="search" placeholder="Search lessons" aria-label="Search lessons" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="tpy-picker-list" role="list">
        {groups.map((g) => (
          <div key={g.section} role="group" aria-label={g.section}>
            <div className="tpy-picker-sec">{g.section}</div>
            {g.lessons.map((l) => {
              const pick: PickedLesson = { id: l.id, title: l.title, programId: program!.id, programSlug: program!.slug, programName: program!.name };
              const dt = dayTypeOf(l.dayType, l.title);
              const { day, name } = splitDayTitle(l.title);
              return (
                <button
                  key={l.id}
                  type="button"
                  role="listitem"
                  className="tpy-entry"
                  draggable={draggable}
                  onDragStart={(e: DragEvent) => {
                    if (!dragMime) return;
                    e.dataTransfer.setData(dragMime, JSON.stringify({ type: "lesson", lesson: pick }));
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onPick(pick)}
                  aria-label={`Add ${l.title}`}
                >
                  <span className="tpy-glyph" aria-hidden>{dt ? <DayGlyph type={dt} size={22} tone="mono" /> : <Icon name="play" size="sm" />}</span>
                  <span className="tpy-row-main">
                    <span className="lq-t15" style={{ fontWeight: 600 }}>{day ? `Day ${day} · ${name}` : name}</span>
                  </span>
                  <Icon name="plus" size="sm" className="lq-c3" />
                </button>
              );
            })}
          </div>
        ))}
        {!groups.length && <p className="lq-t15 lq-c2" style={{ padding: 12 }}>No lessons match “{q}”.</p>}
      </div>
    </div>
  );
}
