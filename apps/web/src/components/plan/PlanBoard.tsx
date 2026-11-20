"use client";

import type { WeekEntry } from "@ms/api";
import { addDays, type IsoDate } from "@ms/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type DragEvent } from "react";
import { useBrowserValue } from "@/lib/hooks/clock";
import { DayGlyph } from "@/components/graphics";
import { Button, Glass, Icon, IconButton, Segmented, Sheet, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { addLessonToDay, moveItem, removeItem, setItemDone, skipItem, type ActionResult } from "@/lib/actions/today-plan-you";
import type { LessonCatalog, MemberPlan } from "@/lib/loaders/today-plan-you";
import { dayNum, dayShort, fmt, longDay, monthGrid, monthName, startOfWeek, weekDates, weekRange } from "@/components/today/dates";
import { dayTypeOf, entryHref, plural, relDay, splitDayTitle } from "@/components/today/model";
import { LessonPicker, type PickedLesson } from "./LessonPicker";
import "@/components/today/tpy.css";

type View = "week" | "month";
const DRAG_MIME = "application/x-ms-plan";

type Props = {
  today: IsoDate;
  from: IsoDate;
  to: IsoDate;
  anchor: IsoDate;
  initialView: View;
  entries: WeekEntry[];
  plans: MemberPlan[];
  catalog: LessonCatalog;
  build: boolean;
};

const offline = (r: ActionResult<unknown>) => !r.ok && r.error === "offline";

export function PlanBoard(p: Props) {
  const [entries, setEntries] = useState(p.entries);
  const [view, setView] = useState<View>(p.initialView);
  const [week, setWeek] = useState(startOfWeek(p.anchor));
  const [month, setMonth] = useState(p.anchor.slice(0, 7));
  const [picked, setPicked] = useState<IsoDate>(p.anchor);
  // The "Days to place" tray is open on desktop by default (original layout: calendar | tray).
  const [building, setBuilding] = useState(true);
  const [addTo, setAddTo] = useState<IsoDate | null>(null);
  const [open, setOpen] = useState<WeekEntry | null>(null);
  const [over, setOver] = useState<IsoDate | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const byDate = useMemo(() => {
    const m = new Map<IsoDate, WeekEntry[]>();
    for (const e of entries) m.set(e.on_date, [...(m.get(e.on_date) ?? []), e]);
    return m;
  }, [entries]);
  const planName = (id: string | null) => p.plans.find((x) => x.id === id)?.name ?? null;

  /** Navigate within the loaded window; outside it, reload the page around the new date. */
  const goWeek = (ws: IsoDate) => {
    if (ws < p.from || addDays(ws, 6) > p.to) return router.push(`/plan?d=${ws}`);
    setWeek(ws);
  };
  const goMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number) as [number, number];
    const d = new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10);
    const grid = monthGrid(d);
    if (grid[0]! < p.from || grid[41]! > p.to) return router.push(`/plan?d=${d}&view=month`);
    setMonth(d.slice(0, 7));
  };

  /** Optimistic update, server action, revert + explain on failure. */
  const mutate = (next: WeekEntry[], action: () => Promise<ActionResult<unknown>>, ok: string) => {
    const prev = entries;
    setEntries(next);
    start(async () => {
      const r = await action();
      if (r.ok) {
        toast(ok, { tone: "success", icon: "check" });
        return;
      }
      setEntries(prev);
      toast(offline(r) ? "Preview mode can't save changes. They work on the live app." : r.error, { icon: "close" });
    });
  };

  const add = (l: PickedLesson, date: IsoDate) => {
    haptic(8);
    const temp: WeekEntry = {
      kind: "plan", on_date: date, starts_at: null, title: l.title, subtitle: "My plan", plan_id: null, plan_item_id: `temp-${l.id}-${date}`,
      item_kind: "training", lesson_id: l.id, program_id: l.programId, program_name: l.programName, program_slug: l.programSlug,
      ref_id: null, done: false, skipped: false, sort_order: 99,
    };
    mutate([...entries, temp], () => addLessonToDay(l.id, l.title, date), `Added to ${dayShort(date)} ${dayNum(date)}`);
  };
  const move = (itemId: string, date: IsoDate) => {
    const e = entries.find((x) => x.plan_item_id === itemId);
    if (!e || e.on_date === date) return;
    haptic(8);
    mutate(entries.map((x) => (x.plan_item_id === itemId ? { ...x, on_date: date } : x)), () => moveItem(itemId, date), `Moved to ${dayShort(date)} ${dayNum(date)}`);
  };
  const onDrop = (date: IsoDate) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    setDragging(null);
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    const d = JSON.parse(raw) as { type: "lesson"; lesson: PickedLesson } | { type: "item"; id: string };
    if (d.type === "lesson") add(d.lesson, date);
    else move(d.id, date);
  };
  const dropProps = (date: IsoDate) => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (over !== date) setOver(date);
    },
    onDragLeave: (e: DragEvent) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver((o) => (o === date ? null : o));
    },
    onDrop: onDrop(date),
    "data-over": over === date ? "" : undefined,
  });

  // "Build my own" on a phone: open the lesson sheet for today straight away.
  const phone = useBrowserValue(() => !window.matchMedia("(min-width: 1024px)").matches, false);
  const buildKey = p.build && phone ? p.today : null;
  const [builtFor, setBuiltFor] = useState<string | null>(null);
  if (buildKey !== builtFor) {
    setBuiltFor(buildKey);
    if (buildKey) setAddTo(buildKey);
  }

  const days = weekDates(week);
  const defaultProgram = entries.find((e) => e.on_date >= p.today && e.program_id)?.program_id ?? undefined;

  return (
    <div className="tpy-stack">
      <div className="tpy-plan-bar">
        <Segmented<View>
          label="Calendar view"
          value={view}
          onChange={setView}
          size="sm"
          options={[
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          className="tpy-viewseg"
        />
        <div className="tpy-plan-nav">
          <IconButton icon="back" label={view === "week" ? "Previous week" : "Previous month"} size="sm" variant="plain" onClick={() => (view === "week" ? goWeek(addDays(week, -7)) : goMonth(-1))} />
          <button type="button" className="lq-t15 tpy-navlabel" onClick={() => (view === "week" ? goWeek(startOfWeek(p.today)) : setMonth(p.today.slice(0, 7)))} title="Jump to today">
            {view === "week" ? weekRange(week) : monthName(`${month}-01`)}
          </button>
          <IconButton icon="chevron" label={view === "week" ? "Next week" : "Next month"} size="sm" variant="plain" onClick={() => (view === "week" ? goWeek(addDays(week, 7)) : goMonth(1))} />
        </div>
        <Button size="sm" variant={building ? "fill" : "glass"} icon={building ? "check" : "plus"} onClick={() => setBuilding((b) => !b)} className="tpy-desk-inline">
          {building ? "Hide lessons" : "Days to place"}
        </Button>
      </div>

      <div className="tpy-plan-layout" data-build={building ? "" : undefined}>
        {view === "week" ? (
          <div className="tpy-weekgrid" role="list" aria-label={`Week of ${weekRange(week)}`}>
            {days.map((d) => {
              const es = byDate.get(d) ?? [];
              const isToday = d === p.today;
              return (
                <Glass key={d} as="section" radius="card" role="listitem" className="tpy-dayblock tpy-drop" data-today={isToday ? "" : undefined} data-past={d < p.today ? "" : undefined} data-rest={es.length ? undefined : ""} aria-label={`${longDay(d)}${isToday ? ", today" : ""}`} {...dropProps(d)}>
                  <div className="tpy-dayhead" data-today={isToday ? "" : undefined} data-past={d < p.today ? "" : undefined}>
                    <span>
                      <b>{dayShort(d)} {dayNum(d)}</b>
                      {isToday && <span className="lq-t13 lq-ink" style={{ marginLeft: 6, fontWeight: 600 }}>Today</span>}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {!es.length && <span className="lq-t13 lq-c3 tpy-phone">Rest</span>}
                      <IconButton icon="plus" label={`Add a lesson to ${longDay(d)}`} size="sm" variant="plain" iconSize="sm" onClick={() => setAddTo(d)} />
                    </span>
                  </div>
                  {es.length ? (
                    es.map((e) => (
                      <EntryRow
                        key={e.plan_item_id ?? e.ref_id ?? e.title}
                        e={e}
                        today={p.today}
                        dragging={dragging === e.plan_item_id}
                        onOpen={() => setOpen(e)}
                        onDragStart={(ev) => {
                          if (!e.plan_item_id) return;
                          ev.dataTransfer.setData(DRAG_MIME, JSON.stringify({ type: "item", id: e.plan_item_id }));
                          ev.dataTransfer.effectAllowed = "move";
                          setDragging(e.plan_item_id);
                        }}
                        onDragEnd={() => setDragging(null)}
                      />
                    ))
                  ) : (
                    <div className="tpy-empty-day tpy-desk-block">Rest day</div>
                  )}
                </Glass>
              );
            })}
          </div>
        ) : (
          <MonthView month={month} today={p.today} byDate={byDate} picked={picked} setPicked={setPicked} onOpen={setOpen} onAdd={setAddTo} />
        )}

        {building && (
          <Glass as="aside" radius="card" className="tpy-pad tpy-picker-panel tpy-desk-block" aria-label="Lessons to add">
            <div className="tpy-sech"><h3>Days to place</h3><span className="lq-t13 lq-c2">Drag onto a day, or tap to add</span></div>
            <LessonPicker catalog={p.catalog} defaultProgramId={defaultProgram} draggable dragMime={DRAG_MIME} onPick={(l) => add(l, week <= p.today && p.today <= addDays(week, 6) ? p.today : week)} />
          </Glass>
        )}
      </div>

      <Sheet open={addTo !== null} onClose={() => setAddTo(null)} title="Add a lesson" description={addTo ? `${longDay(addTo)} · ${relDay(addTo, p.today)}` : undefined} detents={["large"]} desktop="side">
        {addTo && (
          <LessonPicker
            catalog={p.catalog}
            defaultProgramId={defaultProgram}
            onPick={(l) => {
              add(l, addTo);
              setAddTo(null);
            }}
          />
        )}
      </Sheet>

      <EntrySheet
        entry={open}
        today={p.today}
        planName={open ? planName(open.plan_id) ?? open.subtitle : null}
        onClose={() => setOpen(null)}
        onDone={(e, done) => mutate(entries.map((x) => (x.plan_item_id === e.plan_item_id ? { ...x, done } : x)), () => setItemDone(e.plan_item_id!, done), done ? "Marked done" : "Marked not done")}
        onSkip={(e) => mutate(entries.map((x) => (x.plan_item_id === e.plan_item_id ? { ...x, skipped: !e.skipped } : x)), () => skipItem(e.plan_item_id!, !e.skipped), e.skipped ? "Back on the plan" : "Skipped")}
        onMove={(e, d) => move(e.plan_item_id!, d)}
        onRemove={(e) => mutate(entries.filter((x) => x.plan_item_id !== e.plan_item_id), () => removeItem(e.plan_item_id!), "Removed")}
      />
    </div>
  );
}

function EntryRow({ e, today, dragging, onOpen, onDragStart, onDragEnd }: {
  e: WeekEntry;
  today: IsoDate;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (ev: DragEvent) => void;
  onDragEnd: () => void;
}) {
  const dt = dayTypeOf(null, e.title, e.item_kind);
  const { day, name } = splitDayTitle(e.title);
  const isMissed = e.kind === "plan" && e.on_date < today && !e.done && !e.skipped;
  const isNow = e.on_date === today && !e.done;
  return (
    <button
      type="button"
      className="tpy-entry"
      onClick={onOpen}
      draggable={e.kind === "plan" && !!e.plan_item_id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-dragging={dragging ? "" : undefined}
      data-done={e.done ? "" : undefined}
      data-missed={isMissed ? "" : undefined}
      data-now={isNow ? "" : undefined}
      data-skipped={e.skipped ? "" : undefined}
      aria-label={`${e.title}${e.program_name ? `, ${e.program_name}` : ""}${e.done ? ", done" : isMissed ? ", missed" : e.skipped ? ", skipped" : ""}`}
    >
      <span className="tpy-glyph" data-done={e.done ? "" : undefined} data-now={isNow ? "" : undefined} aria-hidden>
        {e.done ? (
          <Icon name="check" size="sm" />
        ) : e.kind === "coaching" ? (
          <Icon name="people" size="sm" />
        ) : e.kind === "run_session" ? (
          <Icon name="mountain" size="sm" />
        ) : dt ? (
          <DayGlyph type={dt} size={22} tone={isNow ? "accent" : "mono"} />
        ) : (
          <Icon name="kettlebell" size="sm" />
        )}
      </span>
      <span className="tpy-row-main">
        <span className="lq-t15 tpy-entry-t" style={{ fontWeight: 600 }}>{day ? `Day ${day} · ${name}` : name}</span>
        <span className="lq-t13 lq-c2">{e.skipped ? "Skipped" : isMissed ? "Missed" : e.program_name ?? e.subtitle}</span>
      </span>
    </button>
  );
}

function MonthView({ month, today, byDate, picked, setPicked, onOpen, onAdd }: {
  month: string;
  today: IsoDate;
  byDate: Map<IsoDate, WeekEntry[]>;
  picked: IsoDate;
  setPicked: (d: IsoDate) => void;
  onOpen: (e: WeekEntry) => void;
  onAdd: (d: IsoDate) => void;
}) {
  const grid = monthGrid(`${month}-01`);
  const es = byDate.get(picked) ?? [];
  return (
    <div className="tpy-monthwrap">
      <Glass as="section" radius="card" className="tpy-pad" aria-label={monthName(`${month}-01`)}>
        <div className="tpy-month">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="tpy-mh" aria-hidden>{d}</span>)}
          {grid.map((d) => {
            const list = (byDate.get(d) ?? []).filter((e) => e.item_kind !== "rest");
            return (
              <button
                key={d}
                type="button"
                className="tpy-mday"
                data-out={d.slice(0, 7) !== month ? "" : undefined}
                data-today={d === today ? "" : undefined}
                aria-pressed={d === picked}
                aria-label={`${longDay(d)}: ${list.length ? plural(list.length, "session") : "rest"}`}
                onClick={() => setPicked(d)}
              >
                <span>{dayNum(d)}</span>
                <span className="tpy-dots" aria-hidden>
                  {list.slice(0, 3).map((e, i) => (
                    <i key={i} data-k={e.done ? "done" : e.kind !== "plan" ? "event" : e.on_date < today && !e.skipped ? "missed" : undefined} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </Glass>
      <Glass as="section" radius="card" style={{ padding: "10px 6px 6px" }} aria-label={longDay(picked)}>
        <div className="tpy-dayhead">
          <b>{longDay(picked)}</b>
          <IconButton icon="plus" label={`Add a lesson to ${longDay(picked)}`} size="sm" variant="plain" iconSize="sm" onClick={() => onAdd(picked)} />
        </div>
        {es.length ? (
          es.map((e) => <EntryRow key={e.plan_item_id ?? e.ref_id ?? e.title} e={e} today={today} dragging={false} onOpen={() => onOpen(e)} onDragStart={() => {}} onDragEnd={() => {}} />)
        ) : (
          <div className="tpy-empty-day">Nothing planned. A rest day, or add a lesson.</div>
        )}
      </Glass>
    </div>
  );
}

function EntrySheet({ entry, today, planName, onClose, onDone, onSkip, onMove, onRemove }: {
  entry: WeekEntry | null;
  today: IsoDate;
  planName: string | null;
  onClose: () => void;
  onDone: (e: WeekEntry, done: boolean) => void;
  onSkip: (e: WeekEntry) => void;
  onMove: (e: WeekEntry, d: IsoDate) => void;
  onRemove: (e: WeekEntry) => void;
}) {
  const [moveTo, setMoveTo] = useState("");
  const e = entry;
  const isPlan = e?.kind === "plan" && !!e.plan_item_id && !e.plan_item_id.startsWith("temp-");
  const close = () => {
    setMoveTo("");
    onClose();
  };
  return (
    <Sheet
      open={!!e}
      onClose={close}
      title={e ? splitDayTitle(e.title).name : ""}
      description={e ? [e.program_name, `${fmt(e.on_date, { weekday: "long", day: "numeric", month: "short" })} · ${relDay(e.on_date, today)}`].filter(Boolean).join(" · ") : undefined}
      detents={["medium", "large"]}
      footer={e && <Button block icon="play" href={entryHref(e)}>{e.done ? "Open again" : "Open lesson"}</Button>}
    >
      {e && (
        <div style={{ display: "grid", gap: 14 }}>
          {planName && (
            <div className="lq-t13 lq-c2" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Icon name="plan" size="xs" /> On {planName}
              {e.plan_id && <Link href={`/plan/${e.plan_id}`} className="lq-ink" style={{ marginLeft: "auto" }}>View plan</Link>}
            </div>
          )}
          {isPlan && (
            <Glass radius="panel" className="tpy-list" style={{ padding: 0 }}>
              <button type="button" className="tpy-row" onClick={() => { onDone(e, !e.done); close(); }}>
                <span className="tpy-row-icon" aria-hidden><Icon name="check" size="sm" /></span>
                <span className="tpy-row-main"><span className="lq-t15">{e.done ? "Mark as not done" : "Mark as done"}</span></span>
              </button>
              <button type="button" className="tpy-row" onClick={() => { onSkip(e); close(); }}>
                <span className="tpy-row-icon" aria-hidden><Icon name="next" size="sm" /></span>
                <span className="tpy-row-main"><span className="lq-t15">{e.skipped ? "Put back on the plan" : "Skip this session"}</span></span>
              </button>
              <label className="tpy-row" style={{ cursor: "pointer" }}>
                <span className="tpy-row-icon" aria-hidden><Icon name="calendar" size="sm" /></span>
                <span className="tpy-row-main"><span className="lq-t15">Move to</span></span>
                <input
                  type="date"
                  className="tpy-search"
                  style={{ width: "auto", minHeight: 36 }}
                  value={moveTo}
                  min={addDays(today, -14)}
                  aria-label="New date"
                  onChange={(ev) => {
                    setMoveTo(ev.target.value);
                    if (ev.target.value) {
                      onMove(e, ev.target.value);
                      close();
                    }
                  }}
                />
              </label>
              <button type="button" className="tpy-row" onClick={() => { onRemove(e); close(); }}>
                <span className="tpy-row-icon" aria-hidden><Icon name="close" size="sm" /></span>
                <span className="tpy-row-main"><span className="lq-t15">Remove from plan</span></span>
              </button>
            </Glass>
          )}
          {!isPlan && e.kind !== "plan" && <p className="lq-t15 lq-c2">{e.subtitle}</p>}
        </div>
      )}
    </Sheet>
  );
}
