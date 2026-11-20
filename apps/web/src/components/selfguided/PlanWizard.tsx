"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button, Icon, useToast } from "@/components/ui";
import type { ProgramPageData } from "@/lib/loaders/training";
import type { BoardData } from "@/lib/loaders/selfguided";
import type { TrainingProfile } from "@ms/api";
import { savePlanAction } from "@/lib/actions/selfguided";
import { wizardLevelAction } from "@/lib/actions/wizard";
import { buildWizardPlan, defaultWeekdays, FOCUS_COPY, intentOf, type WizardDay, type WizardFocus } from "./wizardPlan";
import { levelLong, levelOf } from "./level";
import "./wizard.css";

/** A small photo per level on the level choice rows (v4 forms: choices carry a photo, not a box). */
const LEVEL_PHOTOS = [
  { src: "/media/summit/mike-standing.jpg", position: "62% 24%" },
  { src: "/media/summit/mike-deadlift.jpg", position: "50% 30%" },
  { src: "/media/summit/mike-getup.jpg", position: "50% 25%" },
  { src: "/media/summit/mike-press.jpg", position: "50% 25%" },
];

const DATED = ["How", "Level", "Days", "Start", "Focus", "Preview"] as const;
const UNDATED = ["How", "Level", "Preview"] as const;
type StepName = (typeof DATED)[number];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const INTENT_WORD: Record<string, string> = { workout: "Workout", recovery: "Recovery", skill: "Skill", mobility: "Mobility" };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};
const nextMonday = () => {
  const d = new Date();
  d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
  return iso(d);
};
const nice = (s: string, o: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) => new Date(`${s}T12:00:00`).toLocaleDateString("en-US", o);

function daysOf(data: ProgramPageData, board: BoardData | null): WizardDay[] {
  const done = new Set(data.progress.filter((p) => p.complete).map((p) => p.lessonId));
  return data.lessons
    .filter((l) => l.dayNumber != null && !l.pageType)
    .sort((a, b) => a.dayNumber! - b.dayNumber!)
    .map((l) => {
      const ex = board?.lessons[l.id];
      const intent = ex?.intent && ex.intent !== "overview" ? ex.intent : intentOf(l.dayType);
      return { id: l.id, dayNumber: l.dayNumber!, title: l.title, dayType: l.dayType, intent, minutes: ex?.minutes ?? null, done: done.has(l.id) };
    });
}

/**
 * Self-Guided planning wizard (client note, Nov 20): programs like KBL already have day/week plans —
 * pick a level, days per week (and which weekdays), a start date and a focus, preview the schedule
 * generated from the level's real day order and day types, then save it to Plan (save_training_plan).
 */
export function PlanWizard({ data, board, onDone, profile }: { data: ProgramPageData; board: BoardData | null; onDone?: () => void; profile?: TrainingProfile | null }) {
  // Prefilled from the training profile (spec 11 #1): the member's training weekdays / days a week.
  const profDays = profile?.training_days?.length ? profile.training_days : profile?.days_per_week ? defaultWeekdays(Math.min(6, profile.days_per_week)) : null;
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [pathKey, setPathKey] = useState<string | null>(data.path?.key ?? null);
  const [levelDays, setLevelDays] = useState<Record<string, WizardDay[]>>(() => ({ [data.path?.key ?? ""]: daysOf(data, board) }));
  const [loading, startLoad] = useTransition();
  // Preferred days come first (client: "take preferences into account"); the enrollment's days only fill in when there's no profile.
  const [perWeek, setPerWeek] = useState(() => profDays?.length ?? (data.enrollment?.trainingDays.length || 3));
  const [weekdays, setWeekdays] = useState<number[]>(() => profDays ?? (data.enrollment?.trainingDays.length ? data.enrollment.trainingDays : defaultWeekdays(3)));
  /** "On a schedule" (dated, on your days) or "No dates — just the order". */
  const [mode, setMode] = useState<"dated" | "undated">("dated");
  const STEPS: readonly StepName[] = mode === "dated" ? DATED : UNDATED;
  const [start, setStart] = useState(() => plus(1));
  const [from, setFrom] = useState<"next" | "first">("next");
  const [focus, setFocus] = useState<WizardFocus>("balanced");
  const [saving, startSave] = useTransition();
  /** After saving: the plan's page and the first session (D20: a clear next step, not a spinner). */
  const [saved, setSaved] = useState<{ planHref: string; count: number } | null>(null);
  const [allWeeks, setAllWeeks] = useState(false);

  const days = levelDays[pathKey ?? ""] ?? [];
  // Level I and Level II both start at Day 1: name the level wherever a day is named.
  const lvPath = data.paths.length > 1 ? data.paths.find((x) => (x.key ?? null) === pathKey) : null;
  const lvN = lvPath ? levelOf(null, lvPath.name) : null;
  const lvWord = lvN ? `${levelLong(lvN)} · ` : "";
  const firstOpen = days.find((d) => !d.done) ?? null;
  const fromDays = from === "next" && firstOpen ? days.filter((d) => d.dayNumber >= firstOpen.dayNumber) : days;
  const plan = useMemo(() => buildWizardPlan({ days: fromDays, weekdays, start, focus }), [fromDays, weekdays, start, focus]);
  const ordered = useMemo(() => fromDays.map((d, i) => ({ date: plus(i), day: d, kind: d.intent === "recovery" ? ("recovery" as const) : ("training" as const) })), [fromDays]);
  const level = data.paths.find((p) => p.key === pathKey) ?? data.path;
  const levelName = level?.shortName ?? data.program.name;
  const weeks = plan.items.length ? plan.items[plan.items.length - 1]!.week : 0;

  function pickLevel(key: string | null) {
    setPathKey(key);
    if (levelDays[key ?? ""]) return;
    startLoad(async () => {
      const r = await wizardLevelAction(data.program.slug, key);
      if (!r.ok) {
        toast(r.message);
        setPathKey(data.path?.key ?? null);
        return;
      }
      setLevelDays((m) => ({ ...m, [key ?? ""]: r.days }));
    });
  }

  function setCount(n: number) {
    setPerWeek(n);
    setWeekdays(defaultWeekdays(n));
  }

  function toggleDay(d: number) {
    const next = weekdays.includes(d) ? weekdays.filter((x) => x !== d) : [...weekdays, d];
    setWeekdays(next);
    setPerWeek(next.length);
  }

  function save() {
    if (mode === "undated") {
      if (!ordered.length) return;
      const name = `${data.program.name} · ${levelName} · in order`;
      startSave(async () => {
        const r = await savePlanAction(
          name,
          { kind: "self_guided", source: "wizard", undated: true, program: data.program.slug, path: pathKey, from, overview: `${ordered.length} sessions in Mike's order, no dates. Do the next one whenever you're ready.` },
          ordered.map((i) => ({ date: i.date, lessonId: i.day.id, kind: i.kind, note: "Next in Mike's order." })),
        );
        if (!r.ok) return void toast(r.message);
        toast(`Saved — ${ordered.length} sessions in order, no dates.`, { tone: "success" });
        setSaved({ planHref: "/plan", count: ordered.length });
      });
      return;
    }
    if (!plan.items.length) return;
    const name = `${data.program.name} · ${levelName} · ${perWeek}×/week`;
    const overview = `${plan.items.length} sessions over ${weeks} week${weeks === 1 ? "" : "s"}, ${perWeek} a week (${ORDER.filter((d) => weekdays.includes(d)).map((d) => WD[d]).join(", ")}), from ${nice(start, { month: "short", day: "numeric" })}. ${FOCUS_COPY[focus].line}`;
    startSave(async () => {
      const r = await savePlanAction(
        name,
        { kind: "self_guided", source: "wizard", program: data.program.slug, path: pathKey, weekdays, perWeek, start, focus, from, overview },
        plan.items.map((i) => ({ date: i.date, lessonId: i.day.id, kind: i.kind, note: i.note })),
      );
      if (!r.ok) {
        toast(r.message);
        return;
      }
      toast(`Plan saved — ${plan.items.length} sessions are on your schedule.`, { tone: "success" });
      setSaved({ planHref: r.planId && r.planId !== "preview" ? `/plan/${r.planId}` : "/plan", count: plan.items.length });
    });
  }

  /** Leave the wizard for a page (closes the program page's sheet first). */
  function go(href: string) {
    onDone?.();
    router.push(href);
  }

  const first = mode === "undated" ? (ordered[0] ? { date: plus(0), day: ordered[0].day } : null) : plan.items[0] ?? null;
  const firstHref = first ? `/programs/${data.program.slug}/session/open?lesson=${first.day.id}&key=${encodeURIComponent(first.day.id)}` : null;
  const firstIsToday = first?.date === plus(0);
  // The preview shows whole weeks: the first three, then "show all" (no box cutting a row in half).
  const weekNumbers = Array.from(new Set(plan.items.map((i) => i.week)));
  const shownWeeks = allWeeks ? weekNumbers : weekNumbers.slice(0, 3);
  const hiddenSessions = plan.items.filter((i) => !shownWeeks.includes(i.week)).length;

  if (saved) {
    return (
      <div className="wz">
        <section className="wz-done" aria-labelledby="wz-done-h" role="status">
          <span className="wz-done-ic" aria-hidden>
            <Icon name="check" />
          </span>
          <h3 id="wz-done-h" className="lq-d-sm">
            {mode === "undated" ? "Your order is ready" : "Your plan is on your schedule"}
          </h3>
          <p className="lq-t15 lq-c2">
            <b className="lq-num">{saved.count}</b> sessions, {mode === "undated" ? "in order, no dates" : `${perWeek} a week`}, {levelName}.
            {first ? ` First up: ${lvWord}Day ${first.day.dayNumber}${mode === "undated" ? "" : `, ${firstIsToday ? "today" : nice(first.date)}`}.` : ""}
          </p>
          <div className="wz-done-a">
            {firstHref && first && firstIsToday ? (
              <>
                <Button size="md" icon="play" onClick={() => go(firstHref)}>
                  Start {lvWord}Day {first.day.dayNumber}
                </Button>
                <Button variant="secondary" size="md" icon="calendar" onClick={() => go(saved.planHref)}>
                  Go to your Schedule
                </Button>
              </>
            ) : (
              <>
                <Button size="md" icon="calendar" iconAfter="chevron" onClick={() => go(saved.planHref)}>
                  Go to your Schedule
                </Button>
                {firstHref && first && (
                  <Button variant="secondary" size="md" icon="play" onClick={() => go(firstHref)}>
                    Start {lvWord}Day {first.day.dayNumber} now
                  </Button>
                )}
              </>
            )}
          </div>
          <button type="button" className="wz-done-edit lq-link" onClick={() => setSaved(null)}>
            Change the plan
          </button>
        </section>
      </div>
    );
  }

  const cur = STEPS[step] ?? "How";
  const canNext = cur === "Days" ? weekdays.length > 0 : cur === "Level" ? days.length > 0 && !loading : true;

  return (
    <div className="wz">
      <ol className="wz-steps" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} data-state={i < step ? "done" : i === step ? "now" : undefined}>
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step} aria-current={i === step ? "step" : undefined}>
              <span className="wz-n">{i < step ? <Icon name="check" size="xs" /> : i + 1}</span>
              <span className="wz-l">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="wz-body" key={step}>
        {cur === "How" && (
          <section aria-labelledby="wz-hh">
            <h3 id="wz-hh" className="lq-d-sm">
              How do you want to follow it?
            </h3>
            <p className="lq-t13 lq-c2">Self-Guided can sit on your calendar, or just keep Mike&apos;s order for you. You can change this later.</p>
            <div className="wz-opts">
              <button type="button" className="wz-opt lq-press" aria-pressed={mode === "dated"} onClick={() => setMode("dated")}>
                <b>On a schedule</b>
                <span>Pick your days. Sessions land on {profDays?.length ? `your training days (${ORDER.filter((d) => weekdays.includes(d)).map((d) => WD[d]).join(", ")})` : "the days you choose"}, one a day.</span>
                <i aria-hidden>{mode === "dated" && <Icon name="check" size="xs" />}</i>
              </button>
              <button type="button" className="wz-opt lq-press" aria-pressed={mode === "undated"} onClick={() => setMode("undated")}>
                <b>No dates, just the order</b>
                <span>We keep Mike&apos;s day-by-day order. Do the next one whenever you&apos;re ready, nothing to fall behind on.</span>
                <i aria-hidden>{mode === "undated" && <Icon name="check" size="xs" />}</i>
              </button>
            </div>
          </section>
        )}

        {cur === "Preview" && mode === "undated" && (
          <section aria-labelledby="wz-hu">
            <h3 id="wz-hu" className="lq-d-sm">
              Your order
            </h3>
            <p className="lq-t13 lq-c2">
              <b className="lq-num">{ordered.length}</b> sessions, {levelName}. No dates: your week shows what&apos;s next, and you do it whenever you&apos;re ready.
            </p>
            <ol className="wz-queue">
              {ordered.slice(0, allWeeks ? undefined : 8).map((i, n) => (
                <li key={i.day.id}>
                  <span className="wz-d lq-num">{n === 0 ? "Next" : `${n + 1}`}</span>
                  <span className="wz-dot" data-i={i.day.intent} aria-hidden />
                  <span className="wz-t">
                    <b>Day {i.day.dayNumber}</b> · {(i.day.dayType ?? "").replace(/\s+day$/i, "") || INTENT_WORD[i.day.intent]}
                  </span>
                </li>
              ))}
            </ol>
            {!allWeeks && ordered.length > 8 && (
              <button type="button" className="wz-more lq-press" onClick={() => setAllWeeks(true)}>
                Show all {ordered.length} sessions
              </button>
            )}
          </section>
        )}

        {cur === "Level" && (
          <section aria-labelledby="wz-h0">
            <h3 id="wz-h0" className="lq-d-sm">
              Which level are you training?
            </h3>
            <p className="lq-t13 lq-c2">Each level is a full day-by-day plan: {data.sections.length} phases, workout, recovery and skill days in Mike&apos;s order.</p>
            <div className="wz-opts">
              {(data.paths.length ? data.paths : [{ id: "only", key: null, name: data.program.name, shortName: null, tagline: data.program.tagline }]).map((p, i) => (
                <button key={p.id} type="button" className="wz-opt lq-press" data-thumb="" aria-pressed={(p.key ?? null) === pathKey} onClick={() => pickLevel(p.key ?? null)}>
                  <span className="wz-th" aria-hidden>
                    <Image src={LEVEL_PHOTOS[i % LEVEL_PHOTOS.length]!.src} alt="" fill sizes="56px" style={{ objectPosition: LEVEL_PHOTOS[i % LEVEL_PHOTOS.length]!.position }} />
                  </span>
                  <b>{p.name}</b>
                  <span>{p.tagline ?? ""}</span>
                  <i aria-hidden>{(p.key ?? null) === pathKey && <Icon name="check" size="xs" />}</i>
                </button>
              ))}
            </div>
            {firstOpen && firstOpen.dayNumber > 1 && (
              <div className="wz-row" role="radiogroup" aria-label="Where to start">
                <button type="button" role="radio" aria-checked={from === "next"} className="wz-chip lq-press" onClick={() => setFrom("next")}>
                  Continue from {lvWord}Day {firstOpen.dayNumber}
                </button>
                <button type="button" role="radio" aria-checked={from === "first"} className="wz-chip lq-press" onClick={() => setFrom("first")}>
                  Start again at Day 1
                </button>
              </div>
            )}
            {loading && <p className="lq-t13 lq-c3">Loading the level…</p>}
          </section>
        )}

        {cur === "Days" && (
          <section aria-labelledby="wz-h1">
            <h3 id="wz-h1" className="lq-d-sm">
              How many days a week?
            </h3>
            <p className="lq-t13 lq-c2">Kettlebell Lifestyle is written for daily practice. Fewer days simply stretch the same plan over more weeks.</p>
            <div className="wz-count" role="radiogroup" aria-label="Days per week">
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={perWeek === n} className="wz-num lq-press" onClick={() => setCount(n)}>
                  <b className="lq-num">{n}</b>
                  <span>days</span>
                </button>
              ))}
            </div>
            <p className="lq-eyebrow wz-sub">Which days</p>
            <div className="wz-week" role="group" aria-label="Training weekdays">
              {ORDER.map((d) => (
                <button key={d} type="button" aria-pressed={weekdays.includes(d)} className="wz-wd lq-press" onClick={() => toggleDay(d)}>
                  {WD[d]!.slice(0, 1)}
                  <span className="lq-sr">{WD[d]}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {cur === "Start" && (
          <section aria-labelledby="wz-h2">
            <h3 id="wz-h2" className="lq-d-sm">
              When do you start?
            </h3>
            <p className="lq-t13 lq-c2">Your first session lands on the first training day on or after this date.</p>
            <div className="wz-row" role="radiogroup" aria-label="Start date">
              {[
                ["Today", plus(0)],
                ["Tomorrow", plus(1)],
                ["Next Monday", nextMonday()],
              ].map(([l, v]) => (
                <button key={l} type="button" role="radio" aria-checked={start === v} className="wz-chip lq-press" onClick={() => setStart(v!)}>
                  {l}
                  <small>{nice(v!, { month: "short", day: "numeric" })}</small>
                </button>
              ))}
            </div>
            <label className="wz-date">
              <span className="lq-t13 lq-c2">Or pick a date</span>
              <input type="date" value={start} min={plus(0)} onChange={(e) => e.target.value && setStart(e.target.value)} />
            </label>
          </section>
        )}

        {cur === "Focus" && (
          <section aria-labelledby="wz-h3">
            <h3 id="wz-h3" className="lq-d-sm">
              What&apos;s the focus?
            </h3>
            <p className="lq-t13 lq-c2">The days always come from the program. Focus decides how workout and recovery days rotate.</p>
            <div className="wz-opts">
              {(Object.keys(FOCUS_COPY) as WizardFocus[]).map((f) => (
                <button key={f} type="button" className="wz-opt lq-press" aria-pressed={focus === f} onClick={() => setFocus(f)}>
                  <b>{FOCUS_COPY[f].title}</b>
                  <span>{FOCUS_COPY[f].line}</span>
                  <i aria-hidden>{focus === f && <Icon name="check" size="xs" />}</i>
                </button>
              ))}
            </div>
          </section>
        )}

        {cur === "Preview" && mode === "dated" && (
          <section aria-labelledby="wz-h4">
            <h3 id="wz-h4" className="lq-d-sm">
              Your schedule
            </h3>
            <p className="lq-t13 lq-c2">
              <b className="lq-num">{plan.items.length}</b> sessions over <b className="lq-num">{weeks}</b> week{weeks === 1 ? "" : "s"} · {levelName}
              {plan.endsOn ? ` · finishes ${nice(plan.endsOn, { month: "short", day: "numeric", year: "numeric" })}` : ""}
              {plan.skipped ? ` · ${plan.skipped} recovery days left open` : ""}
            </p>
            <div className="wz-mix" aria-hidden>
              {plan.items.map((i) => (
                <i key={i.date} data-i={i.day.intent} />
              ))}
            </div>
            <div className="wz-preview">
              {shownWeeks.map((w) => (
                <div key={w} className="wz-wk">
                  <p className="lq-eyebrow">Week {w}</p>
                  <ul>
                    {plan.items
                      .filter((i) => i.week === w)
                      .map((i) => (
                        <li key={i.date}>
                          <span className="wz-d">{nice(i.date)}</span>
                          <span className="wz-dot" data-i={i.day.intent} aria-hidden />
                          <span className="wz-t">
                            <b>{lvWord}Day {i.day.dayNumber}</b> · {(i.day.dayType ?? "").replace(/\s+day$/i, "") || INTENT_WORD[i.day.intent]}
                            {i.day.done && <em> · repeat</em>}
                          </span>
                          {i.note !== "Next in Mike's order." && <span className="wz-why">{i.note}</span>}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
              {hiddenSessions > 0 && (
                <button type="button" className="wz-more lq-press" onClick={() => setAllWeeks(true)}>
                  Show all {weekNumbers.length} weeks <span className="lq-c3">· {hiddenSessions} more sessions</span>
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      <div className="wz-foot">
        {step > 0 ? (
          <Button variant="secondary" size="md" icon="back" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <span className="lq-t12 lq-c3 wz-sum lq-num">
          {mode === "undated" ? `${ordered.length} sessions · in order, no dates` : plan.items.length ? `${plan.items.length} sessions · ${perWeek}/week · from ${nice(start, { month: "short", day: "numeric" })}` : "Pick your days"}
        </span>
        {step < STEPS.length - 1 ? (
          <Button size="md" iconAfter="chevron" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            {step === STEPS.length - 2 ? "Preview" : "Next"}
          </Button>
        ) : (
          <Button size="md" icon="calendar" disabled={mode === "undated" ? !ordered.length : !plan.items.length} aria-busy={saving || undefined} onClick={save}>
            {saving ? "Saving…" : mode === "undated" ? "Save my order" : "Save to my plan"}
          </Button>
        )}
      </div>
    </div>
  );
}
