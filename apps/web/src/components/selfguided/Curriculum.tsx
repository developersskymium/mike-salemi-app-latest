"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { INTENT_LABEL, lessonMatchesFilter, type Intent } from "@ms/core";
import { Glass, Icon, type IconName } from "@/components/ui";
import type { LessonLite, ProgressRow, ResourceInfo, SectionLite } from "@/lib/loaders/training";
import type { BoardData } from "@/lib/loaders/selfguided";
import { lessonName } from "@/components/training/model";
import { IntentTag, LevelBadge } from "./parts";
import { levelLong, levelOf, type LevelN } from "./level";
import { DaySheet } from "./DaySheet";
import "./sgprogram.css";

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
  /** Level programs (KBL): the level shown, and the Level I / Level II switch for the Self-Guided day browser. */
  levels?: { id: string; n: LevelN | null; label: string; href: string; current: boolean }[];
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

  const lv: LevelN | null = levelOf(lessons.find((l) => l.key)?.key, p.levels?.find((x) => x.current)?.label);
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

  // Training days only (info pages left out), the same count as the hero, Today, the rail and You.
  const pct = (sid: string) => {
    const all = lessons.filter((l) => l.sectionId === sid);
    const days = all.filter((l) => l.dayNumber != null && !l.pageType);
    const ls = days.length ? days : all;
    const d = ls.filter((l) => byLesson.get(l.id)?.complete).length;
    return ls.length ? Math.round((d / ls.length) * 100) : 0;
  };
  const reset = () => {
    setQuery("");
    setStatus("all");
    setIntent("all");
  };

  const [showAll, setShowAll] = useState(false);
  const FOLD = 11;

  return (
    <section className="cv" aria-labelledby="sg-cur-h">
      <div className="cv-head">
        <h2 id="sg-cur-h" className="lq-d-sm">
          {mode === "self_guided" ? "Start anywhere" : "Curriculum"}
          {lv && (p.levels?.length ?? 0) > 1 && <span className="lq-c3"> · {levelLong(lv)}</span>}
        </h2>
        <span className="lq-t13 lq-c3">{mode === "self_guided" ? "Every day is open. Pick by phase, type or search." : `One ${p.sectionWord.toLowerCase()} at a time · tap a ${p.lessonWord.toLowerCase()} to open it`}</span>
      </div>

      {mode === "self_guided" && (p.levels?.length ?? 0) > 1 && (
        <div className="cv-lvswitch">
          <nav className="cv-lvseg" aria-label="Level">
            {p.levels!.map((x) => (
              <Link key={x.id} href={x.href} scroll={false} replace aria-current={x.current ? "page" : undefined} className="lq-press">
                <LevelBadge n={x.n} />
                {x.n ? levelLong(x.n) : x.label}
                <small>{x.label.split("·")[1]?.trim()}</small>
              </Link>
            ))}
          </nav>
          <span className="cv-lvnote">Each level has its own Day 1 onward. You&apos;re browsing {lv ? levelLong(lv) : "this level"}.</span>
        </div>
      )}

      <div className="cv-bar">
        <div className="cv-tabs" role="toolbar" aria-label={`${p.sectionWord}s`}>
          {sections.map((s) => {
            const n = lessons.filter((l) => l.sectionId === s.id).length;
            const on = !filtering && s.id === tab;
            const v = pct(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className="cv-tab lq-press"
                aria-pressed={on}
                data-now={s.id === currentSection ? "" : undefined}
                onClick={() => {
                  reset();
                  setShowAll(false);
                  setTab(s.id);
                }}
              >
                {mode === "immersion" && !p.lockedProgram && v >= 100 && <Icon name="check" size="xs" />}
                {s.title.replace(/\s+phase$/i, "")}
                <small>{mode === "immersion" && !p.lockedProgram ? `${v}%` : n}</small>
              </button>
            );
          })}
        </div>
        <label className="cv-search">
          <Icon name="search" size="sm" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${p.lessonWord.toLowerCase()}s`} aria-label={`Search ${p.lessonWord.toLowerCase()}s`} />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <Icon name="close" size="xs" />
            </button>
          )}
        </label>
      </div>

      {!p.lockedProgram && mode === "self_guided" && (
        <div className="cv-filters" role="group" aria-label="Filter days">
          <details className="cv-fdrop">
            <summary className="cv-chip" aria-pressed={status !== "all" || intent !== "all"}>
              <Icon name="filter" size="xs" /> Filter
              {status !== "all" || intent !== "all" ? ` · ${[status !== "all" ? STATUS.find(([v]) => v === status)![1] : null, intent !== "all" ? INTENT_LABEL[intent] : null].filter(Boolean).join(", ")}` : ""}
            </summary>
            <div className="cv-fdrop-panel">
              <p>Status</p>
              <div>
                {STATUS.map(([v, label]) => (
                  <button key={v} type="button" className="cv-chip" aria-pressed={status === v} onClick={() => setStatus(v)}>
                    {label}
                  </button>
                ))}
              </div>
              <p>Type</p>
              <div>
                {(["workout", "recovery", "skill", "mobility"] as Intent[]).map((i) => (
                  <button key={i} type="button" className="cv-chip" aria-pressed={intent === i} onClick={() => setIntent(intent === i ? "all" : i)}>
                    {INTENT_LABEL[i]}
                  </button>
                ))}
              </div>
            </div>
          </details>
          {filtering && (
            <button type="button" className="cv-chip" onClick={reset} style={{ marginLeft: "auto" }}>
              <Icon name="close" size="xs" /> Reset · {total} {total === 1 ? p.lessonWord.toLowerCase() : `${p.lessonWord.toLowerCase()}s`}
            </button>
          )}
        </div>
      )}

      {!p.lockedProgram && mode !== "self_guided" && filtering && (
        <div className="cv-filters" role="group" aria-label="Filter days">
          {STATUS.map(([v, label]) => (
            <button key={v} type="button" className="cv-chip" aria-pressed={status === v} onClick={() => setStatus(v)}>
              {label}
            </button>
          ))}
          {filtering && (
            <button type="button" className="cv-chip" onClick={reset} style={{ marginLeft: "auto" }}>
              <Icon name="close" size="xs" /> Reset · {total} {total === 1 ? p.lessonWord.toLowerCase() : `${p.lessonWord.toLowerCase()}s`}
            </button>
          )}
        </div>
      )}

      {groups.length === 0 ? (
        <Glass radius="card" className="cv-empty">
          <p className="lq-t17">{q ? `No ${p.lessonWord.toLowerCase()}s match “${query}”` : "No days match those filters"}</p>
          <p className="lq-t13 lq-c2">Try a different phase or type, or clear the search to see the whole level again.</p>
          <button type="button" className="cv-chip" onClick={reset} aria-pressed="true">
            Reset filters
          </button>
        </Glass>
      ) : (
        groups.map(({ s, days }) => {
          const all = lessons.filter((l) => l.sectionId === s.id);
          const trainingDays = all.filter((l) => l.dayNumber != null);
          const training = trainingDays.length;
          const doneDays = trainingDays.filter((l) => byLesson.get(l.id)?.complete).length;
          const res = p.resources.find((r) => r.sectionId === s.id);
          const here = s.id === currentSection && mode === "immersion";
          const first = trainingDays[0]?.dayNumber;
          const last = trainingDays[trainingDays.length - 1]?.dayNumber;
          const kinds = new Map<string, number>();
          for (const l of trainingDays) {
            const k = extra[l.id]?.intent ?? "workout";
            kinds.set(k, (kinds.get(k) ?? 0) + 1);
          }
          const folded = !filtering && !showAll && days.length > FOLD + 2;
          const visible = folded ? days.slice(0, FOLD) : days;
          const hidden = days.slice(FOLD).filter((l) => l.dayNumber != null);
          const r = 26;
          const c = 2 * Math.PI * r;
          return (
            <div key={s.id} className="cv-phase sg-in">
              <div className="cv-phase-h">
                <div className="cv-phase-t">
                  <p className="lq-eyebrow" data-tone="warm">
                    {[first != null && last != null ? `${p.lessonWord}s ${first}–${last}` : null, s.subtitle].filter(Boolean).join(" · ")}
                  </p>
                  <h3 className="lq-d-md">
                    {s.title}
                    {here && <span className="cv-here">You&apos;re here</span>}
                  </h3>
                  {board?.sections[s.id]?.description && <p className="lq-t15 lq-c2">{board.sections[s.id]!.description}</p>}
                  <div className="cv-kinds">
                    {[...kinds.entries()]
                      .filter(([k]) => k !== "overview")
                      .map(([k, n]) => (
                        <span key={k} className="cv-kind" data-i={k}>
                          <Icon name={KIND_ICON[k] ?? "kettlebell"} size="xs" />
                          {n} {(INTENT_LABEL[k as Intent] ?? k).toLowerCase()} {n === 1 ? "day" : "days"}
                        </span>
                      ))}
                  </div>
                </div>
                {training > 0 && (
                  <div className="cv-phase-ring" role="img" aria-label={`${doneDays} of ${training} ${p.lessonWord.toLowerCase()}s done in ${s.title}`}>
                    <svg viewBox="0 0 64 64" aria-hidden>
                      <circle cx="32" cy="32" r={r} className="cv-ring-t" />
                      <circle cx="32" cy="32" r={r} className="cv-ring-a" strokeDasharray={c} strokeDashoffset={c * (1 - doneDays / training)} transform="rotate(-90 32 32)" />
                    </svg>
                    <b className="lq-num">
                      {doneDays}/{training}
                    </b>
                    <span>
                      {p.lessonWord.toLowerCase()}s in {s.title.replace(/\s+phase$/i, "")}
                    </span>
                  </div>
                )}
              </div>
              <div className="cv-days" role="list" aria-label={`${s.title} days`}>
                {visible.map((l) => (
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
                {folded && (
                  <button type="button" className="cv-more" onClick={() => setShowAll(true)}>
                    Show {hidden.length ? `${p.lessonWord.toLowerCase()}s ${hidden[0]!.dayNumber}–${hidden[hidden.length - 1]!.dayNumber}` : `${days.length - FOLD} more`}
                    <Icon name="chevronDown" size="xs" />
                  </button>
                )}
              </div>
              {res && (
                <a href={res.url} target="_blank" rel="noreferrer" className="cv-dl lq-press">
                  <Icon name="down" size="sm" />
                  Download {s.title} plan
                  <span className="lq-c3">{res.kind.toUpperCase()}</span>
                </a>
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

const KIND_ICON: Record<string, IconName> = { workout: "dumbbell", recovery: "leaf", skill: "compass", mobility: "wind" };

function DayRow({ l, p, pr, count, hasNote, onMore }: { l: LessonLite; p: CurriculumProps; pr: ProgressRow | undefined; count: number; hasNote: boolean; onMore: () => void }) {
  const done = Boolean(pr?.complete);
  const part = !done && (pr?.doneSteps ?? 0) > 0;
  const now = l.id === p.currentId;
  const next = p.mode === "self_guided" && l.id === p.nextId;
  const locked = p.lockedProgram || (p.orderLocked && pr ? !pr.unlocked : false);
  const ex = p.board?.lessons[l.id];
  const isDay = l.dayNumber != null && !l.pageType;
  const label = isDay ? `${p.lessonWord} ${l.dayNumber}` : l.pageType === "transition" ? "Next" : "Guide";
  const lv = isDay && (p.levels?.length ?? 0) > 1 ? levelOf(l.key, p.levels?.find((x) => x.current)?.label) : null;
  const title = isDay ? lessonName(l) + (/day$/i.test(l.dayType ?? "") && !/day$/i.test(lessonName(l)) ? " Day" : "") : l.title;
  const intent = ex?.intent ?? (isDay ? "workout" : "overview");
  const intentWord = isDay ? (intent === "workout" ? "Strength" : INTENT_LABEL[intent]) : "Overview";
  const sub = [pr ? `${pr.totalSteps} ${pr.totalSteps === 1 ? "step" : "steps"}` : null, ex?.minutes ? `${ex.minutes} min` : null, now && part && pr ? `Step ${pr.doneSteps + 1} of ${pr.totalSteps}` : null].filter(Boolean).join(" · ");
  const state = done ? "done" : now ? "now" : next ? "next" : part ? "part" : locked ? "locked" : "todo";
  const right =
    now && !done && p.mode === "immersion" ? (
      <span className="lq-btn cv-go" data-variant="warm" data-size="sm">
        <Icon name="play" size="xs" />
        <span>{part ? "Resume" : "Start"}</span>
      </span>
    ) : next ? (
      <span className="cv-pill" data-tone="next">Up next</span>
    ) : done ? (
      <span className="cv-status">{count > 1 ? `Completed ×${count}` : "Completed"}</span>
    ) : part && pr ? (
      <span className="cv-status lq-num">
        {pr.doneSteps}/{pr.totalSteps}
      </span>
    ) : locked ? (
      <Icon name="lock" size="sm" className="cv-lock" />
    ) : p.mode === "self_guided" ? (
      <IntentTag intent={ex?.intent} />
    ) : null;
  const body = (
    <>
      <span className="cv-dot" data-state={state} aria-hidden>
        {done ? <Icon name="check" size="xs" /> : now ? <Icon name="play" size="xs" /> : !isDay ? <Icon name="info" size="xs" /> : null}
      </span>
      <span className="cv-day-n lq-num">
        <LevelBadge n={lv} />
        {label}
      </span>
      <span className="cv-day-t">
        <b>
          <span>{title}</span>
          {now && !done && p.mode === "immersion" && <span className="cv-here">You&apos;re here</span>}
          {now && p.mode === "self_guided" && !next && part && <span className="cv-pill">Resume</span>}
        </b>
        <span className="cv-day-sub">
          <span className="cv-intent" data-i={intent}>
            <Icon name={KIND_ICON[intent] ?? "info"} size="xs" />
            {intentWord}
          </span>
          {sub && <span>{sub}</span>}
          {!sub && ex?.focus && <span className="cv-focus">{ex.focus}</span>}
        </span>
      </span>
      <span className="cv-day-r">{right}</span>
    </>
  );
  const aria = `${lv ? `${levelLong(lv)}, ` : ""}${isDay ? `${label}, ` : ""}${title}${done ? ", done" : part ? ", in progress" : ""}${count > 1 ? `, completed ${count} times` : ""}${locked ? ", locked" : ""}`;
  return (
    <div role="listitem" className="cv-day" data-state={state} data-locked={locked ? "" : undefined}>
      {p.lockedProgram ? (
        <span className="cv-day-link" aria-label={aria}>
          {body}
        </span>
      ) : (
        <Link href={p.dayHref(l)} className="cv-day-link" aria-label={aria} prefetch={now || next ? true : null}>
          {body}
        </Link>
      )}
      {!p.lockedProgram && (
        <button type="button" className="cv-day-more lq-press" data-note={hasNote ? "" : undefined} aria-label={`Notes and history for ${title}`} onClick={onMore}>
          <Icon name="more" size="sm" />
        </button>
      )}
    </div>
  );
}
