"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { INTENT_LABEL, lessonMatchesFilter, type Intent } from "@ms/core";
import { Glass, Icon } from "@/components/ui";
import type { LessonLite, ProgressRow, ResourceInfo, SectionLite } from "@/lib/loaders/training";
import type { BoardData } from "@/lib/loaders/selfguided";
import { dayTypeShort, lessonLabel, lessonName } from "@/components/training/model";
import { IntentTag } from "./parts";
import { DaySheet } from "./DaySheet";

type Status = "all" | "progress" | "todo" | "done";
const STATUS: [Status, string][] = [
  ["all", "All"],
  ["progress", "In progress"],
  ["todo", "Not started"],
  ["done", "Completed"],
];

export interface CurriculumProps {
  slug: string;
  mode: "immersion" | "self_guided";
  sections: SectionLite[];
  lessons: LessonLite[];
  progress: ProgressRow[];
  resources: ResourceInfo[];
  board: BoardData | null;
  currentId: string | null;
  nextId: string | null;
  lessonWord: string;
  sectionWord: string;
  lockedProgram: boolean;
  /** Immersion order lock applies (enrolled in Immersion). */
  orderLocked: boolean;
  dayHref: (l: LessonLite) => string;
}

/**
 * The legacy level-page curriculum (L5/L8): phase tabs (with % or day counts) and a day search
 * in a sticky sub-bar, one phase at a time as a bordered list of day rows, the phase plan PDF.
 * Searching or filtering lists every matching phase in order (legacy Program hub).
 * Day rows carry completion, partial progress, repeat counts and a notes/repeat sheet.
 */
export function Curriculum(p: CurriculumProps) {
  const { sections, lessons, progress, board, mode } = p;
  const byLesson = useMemo(() => new Map(progress.map((r) => [r.lessonId, r])), [progress]);
  const currentSection = sections.find((s) => lessons.some((l) => l.id === p.currentId && l.sectionId === s.id))?.id ?? sections[0]?.id ?? "";
  const [tab, setTab] = useState(currentSection);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [intent, setIntent] = useState<Intent | "all">("all");
  const [sheet, setSheet] = useState<LessonLite | null>(null);
  const [notes, setNotes] = useState(board?.notes ?? {});
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(board?.stats?.completionsByLesson ?? {}).map(([k, v]) => [k, v.count])),
  );

  const q = query.trim().toLowerCase();
  const filtering = q.length > 0 || status !== "all" || intent !== "all";
  const extra = board?.lessons ?? {};

  const matches = (l: LessonLite) => {
    const pr = byLesson.get(l.id);
    if (status === "done" && !pr?.complete) return false;
    if (status === "progress" && !(pr && pr.doneSteps > 0 && !pr.complete)) return false;
    if (status === "todo" && (pr?.doneSteps ?? 0) > 0) return false;
    if (intent !== "all" && !lessonMatchesFilter(intent, extra[l.id]?.intent ?? "workout")) return false;
    if (q) {
      const sec = sections.find((s) => s.id === l.sectionId);
      const hay = `${l.title} ${l.dayNumber ?? ""} day ${l.dayNumber ?? ""} ${l.dayType ?? ""} ${extra[l.id]?.focus ?? ""} ${sec?.title ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const groups = (filtering ? sections : sections.filter((s) => s.id === tab))
    .map((s) => ({ s, days: lessons.filter((l) => l.sectionId === s.id && (!filtering || matches(l))) }))
    .filter((g) => g.days.length > 0);
  const total = groups.reduce((n, g) => n + g.days.length, 0);

  const pct = (sid: string) => {
    const ls = lessons.filter((l) => l.sectionId === sid);
    const d = ls.filter((l) => byLesson.get(l.id)?.complete).length;
    return ls.length ? Math.round((d / ls.length) * 100) : 0;
  };
  const reset = () => {
    setQuery("");
    setStatus("all");
    setIntent("all");
  };

  return (
    <section className="sg-stack" aria-labelledby="sg-cur-h">
      <div className="sg-sec-h">
        <h2 id="sg-cur-h" className="lq-t22">
          {mode === "self_guided" ? "Start anywhere" : "Curriculum"}
        </h2>
        <span className="lq-t13 lq-c2 sg-num">
          {mode === "self_guided" ? "Every day is open. Pick by phase, type or search." : `${progress.filter((r) => r.complete).length} of ${lessons.length} complete`}
        </span>
      </div>

      <Glass radius="panel" className="sg-tabsbar">
        <div className="sg-tabs" role="toolbar" aria-label={`${p.sectionWord}s`}>
          {sections.map((s) => {
            const n = lessons.filter((l) => l.sectionId === s.id).length;
            const on = !filtering && s.id === tab;
            return (
              <button
                key={s.id}
                type="button"
                className="sg-tab"
                aria-pressed={on}
                data-now={s.id === currentSection ? "" : undefined}
                onClick={() => {
                  reset();
                  setTab(s.id);
                }}
              >
                {s.title}
                <small>{mode === "immersion" && !p.lockedProgram ? `${pct(s.id)}%` : n}</small>
              </button>
            );
          })}
        </div>
        <label className="sg-search">
          <Icon name="search" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search all ${p.lessonWord.toLowerCase()}s`} aria-label={`Search ${p.lessonWord.toLowerCase()}s`} />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <Icon name="close" />
            </button>
          )}
        </label>
      </Glass>

      {!p.lockedProgram && (
        <div className="sg-filters" role="group" aria-label="Filter days">
          {STATUS.map(([v, label]) => (
            <button key={v} type="button" className="sg-chip" aria-pressed={status === v} onClick={() => setStatus(v)}>
              {label}
            </button>
          ))}
          {mode === "self_guided" && (
            <>
              <span className="sg-filters-sep" aria-hidden />
              {(["workout", "recovery", "skill", "mobility"] as Intent[]).map((i) => (
                <button key={i} type="button" className="sg-chip" aria-pressed={intent === i} onClick={() => setIntent(intent === i ? "all" : i)}>
                  {INTENT_LABEL[i]}
                </button>
              ))}
            </>
          )}
          {filtering && (
            <button type="button" className="sg-chip" onClick={reset} style={{ marginLeft: "auto" }}>
              <Icon name="close" /> Reset · {total} {total === 1 ? p.lessonWord.toLowerCase() : `${p.lessonWord.toLowerCase()}s`}
            </button>
          )}
        </div>
      )}

      {groups.length === 0 ? (
        <Glass radius="card" className="sg-empty">
          <p className="lq-t17">{q ? `No ${p.lessonWord.toLowerCase()}s match “${query}”` : "No days match those filters"}</p>
          <p className="lq-t13 lq-c2">Try a different phase or type, or clear the search to see the whole level again.</p>
          <button type="button" className="sg-chip" onClick={reset} aria-pressed="true">
            Reset filters
          </button>
        </Glass>
      ) : (
        groups.map(({ s, days }) => {
          const all = lessons.filter((l) => l.sectionId === s.id);
          const training = all.filter((l) => l.dayNumber != null).length;
          const pages = all.length - training;
          const res = p.resources.find((r) => r.sectionId === s.id);
          const here = s.id === currentSection && mode === "immersion";
          return (
            <div key={s.id} className="sg-phase sg-in">
              <div className="sg-phase-h sg-measure">
                {s.subtitle && <p className="sg-eyebrow">{s.subtitle}</p>}
                <h3 className="lq-t22">
                  {s.title}
                  {here && <span className="sg-here">You&apos;re here</span>}
                </h3>
                {board?.sections[s.id]?.description && <p className="lq-t15 lq-c2">{board.sections[s.id]!.description}</p>}
                <p className="lq-t13 lq-c2 sg-num">
                  {training} training {training === 1 ? "day" : "days"}
                  {pages > 0 ? ` · ${pages} overview and preparation ${pages === 1 ? "page" : "pages"}` : ""} · {pct(s.id)}% complete
                </p>
              </div>
              <Glass radius="card" className="sg-days" role="list" aria-label={`${s.title} days`}>
                {days.map((l) => (
                  <DayRow
                    key={l.id}
                    l={l}
                    p={p}
                    pr={byLesson.get(l.id)}
                    count={counts[l.id] ?? (byLesson.get(l.id)?.complete ? 1 : 0)}
                    hasNote={Boolean(notes[l.id])}
                    onMore={() => setSheet(l)}
                  />
                ))}
              </Glass>
              {res && (
                <Glass as="a" radius="pill" interactive href={res.url} target="_blank" rel="noreferrer" className="sg-dl">
                  <Icon name="down" />
                  Download {s.title} plan
                  <span className="lq-c2" style={{ fontWeight: 500 }}>
                    {res.kind.toUpperCase()}
                  </span>
                </Glass>
              )}
            </div>
          );
        })
      )}

      <DaySheet
        lesson={sheet}
        onClose={() => setSheet(null)}
        href={sheet ? p.dayHref(sheet) : "#"}
        progress={sheet ? byLesson.get(sheet.id) : undefined}
        count={sheet ? counts[sheet.id] ?? (byLesson.get(sheet.id)?.complete ? 1 : 0) : 0}
        note={sheet ? notes[sheet.id]?.body ?? "" : ""}
        extra={sheet ? extra[sheet.id] : undefined}
        lessonWord={p.lessonWord}
        onNote={(id, body) => setNotes((n) => ({ ...n, [id]: { body, updatedAt: new Date().toISOString() } }))}
        onLogged={(id, c) => setCounts((x) => ({ ...x, [id]: c }))}
      />
    </section>
  );
}

function DayRow({ l, p, pr, count, hasNote, onMore }: { l: LessonLite; p: CurriculumProps; pr: ProgressRow | undefined; count: number; hasNote: boolean; onMore: () => void }) {
  const done = Boolean(pr?.complete);
  const part = !done && (pr?.doneSteps ?? 0) > 0;
  const now = l.id === p.currentId;
  const next = p.mode === "self_guided" && l.id === p.nextId;
  const locked = p.lockedProgram || (p.orderLocked && pr ? !pr.unlocked : false);
  const ex = p.board?.lessons[l.id];
  const badge = l.dayNumber != null ? String(l.dayNumber) : l.pageType === "transition" ? "→" : "i";
  const title = l.pageType || l.dayNumber == null ? l.title : `${lessonLabel(l, p.lessonWord)} · ${lessonName(l)}`;
  const sub = [l.dayType && l.dayNumber != null ? dayTypeShort(l.dayType) : null, ex?.minutes ? `${ex.minutes} min` : null, pr ? `${pr.totalSteps} ${pr.totalSteps === 1 ? "step" : "steps"}` : null]
    .filter(Boolean)
    .join(" · ");
  const body = (
    <>
      <span className="sg-badge" data-state={done ? "done" : now || next ? "now" : part ? "part" : undefined} aria-hidden>
        {done ? <Icon name="check" /> : locked ? <Icon name="lock" /> : badge}
        {count > 1 && <span className="sg-badge-rep">×{count}</span>}
      </span>
      <span className="sg-day-t">
        <b>
          <span>{title}</span>
          {now && !done && p.mode === "immersion" && <span className="sg-pill" data-tone="now">{part ? "Resume" : "Up next"}</span>}
          {next && <span className="sg-pill" data-tone="now">Up next</span>}
          {now && p.mode === "self_guided" && !next && part && <span className="sg-pill" data-tone="soft">Resume</span>}
        </b>
        <span className="sg-day-sub">
          {sub || ex?.focus || ""}
          {sub && ex?.focus ? <span className="lq-c3"> · {ex.focus}</span> : null}
        </span>
      </span>
      <span className="sg-day-r">
        {p.mode === "immersion" && pr ? (
          <>
            <span>
              {pr.doneSteps}/{pr.totalSteps}
            </span>
            <span className="sg-day-bar" aria-hidden>
              <i style={{ width: `${pr.totalSteps ? (pr.doneSteps / pr.totalSteps) * 100 : 0}%` }} />
            </span>
          </>
        ) : (
          ex && <IntentTag intent={ex.intent} />
        )}
      </span>
    </>
  );
  const aria = `${title}${done ? ", done" : part ? ", in progress" : ""}${count > 1 ? `, completed ${count} times` : ""}${locked ? ", locked" : ""}`;
  return (
    <div role="listitem" className="sg-day" data-locked={locked ? "" : undefined}>
      {p.lockedProgram ? (
        <span className="sg-day-link" aria-label={aria}>
          {body}
        </span>
      ) : (
        <Link href={p.dayHref(l)} className="sg-day-link" aria-label={aria} prefetch={false}>
          {body}
        </Link>
      )}
      {!p.lockedProgram && (
        <button type="button" className="sg-day-more" data-note={hasNote ? "" : undefined} aria-label={`Notes and history for ${title}`} onClick={onMore}>
          <Icon name="more" size="sm" />
        </button>
      )}
    </div>
  );
}
