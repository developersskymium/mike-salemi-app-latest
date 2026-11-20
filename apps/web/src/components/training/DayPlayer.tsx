"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isStepOpen, openThrough, recommendNext, stagePlaylist, type ReadinessOutcome, type WorkoutTable as Table } from "@ms/core";
import { AmbientBackdrop, Button, Chip, CompleteButton, Glass, Icon, IconButton, Rings, Sheet, StepSegments, Toggle, haptic, useToast } from "@/components/ui";
import { Completion, DayGlyph, ReadinessDial } from "@/components/graphics";
import type { LessonPageData, PlayerStep } from "@/lib/loaders/training";
import { completeStepAction, savePositionAction, setAutoplayAction, submitReadinessAction } from "@/lib/actions/training";
import { dayGlyph, dayTypeShort, lessonHref, lessonLabel, lessonName, minutesOf } from "./model";
import { UpNext, VideoStage } from "./VideoStage";
import { ClipRow } from "./ClipRow";
import { WorkoutPanel } from "./WorkoutPanel";
import { ReadinessSheet, zonesFor } from "./ReadinessSheet";
import { DayEnd, DayStart, useSeenOnce } from "./DayGates";
import { RestartSheet } from "./RestartSheet";
import "./training.css";

type Readiness = { score: number; band: "green" | "amber" | "red"; name: string; outcome: "workout" | "recovery" | "rest"; tableId: string | null; message: string; answers: Record<string, string>; saved: boolean; prescription?: Table | null };

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

/** The Immersion day player and course lesson player (same shell). */
export function DayPlayer({ data, endOffer }: { data: LessonPageData; endOffer?: ReactNode }) {
  const { program, path, lesson, steps, section, outline, progress, form, tables } = data;
  const router = useRouter();
  const toast = useToast();
  const word = program.lessonLabel || "Day";
  const lockedOrder = data.state.lockedOrder;

  /* ---------------------------------------------------------------- progress */
  const [completed, setCompletedState] = useState(() => new Set(data.state.completedSteps));
  const completedRef = useRef(completed);
  const setCompleted = useCallback((next: Set<string> | ((c: Set<string>) => Set<string>)) => {
    const value = typeof next === "function" ? next(completedRef.current) : next;
    completedRef.current = value;
    setCompletedState(value);
  }, []);
  const [rev, setRev] = useState(0);
  // Reads the latest completions so deferred moves (after a completion, from "Up next") see them.
  const isOpen = useCallback((i: number) => !lockedOrder || isStepOpen(steps, i, completedRef.current), [lockedOrder, steps]);
  const openNow = (i: number) => !lockedOrder || isStepOpen(steps, i, completed);
  const firstOpen = Math.min(openThrough(steps, completed), steps.length - 1);
  const [active, setActive] = useState(() => {
    const saved = data.position?.activeStepId ? steps.findIndex((s) => s.id === data.position!.activeStepId) : -1;
    return saved >= 0 && (!lockedOrder || saved <= firstOpen) ? saved : Math.max(0, firstOpen);
  });
  const step = steps[active]!;
  const dayDone = steps.length > 0 && steps.every((s) => !s.isRequired || completed.has(s.id));
  const doneCount = steps.filter((s) => completed.has(s.id)).length;

  /* ---------------------------------------------------------------- readiness */
  const [readiness, setReadiness] = useState<Readiness | null>(() =>
    data.readiness
      ? { score: data.readiness.score, band: data.readiness.band, name: data.readiness.bandName, outcome: data.readiness.outcome, tableId: data.readiness.tableId, message: form?.bands.find((b) => b.name === data.readiness!.bandName)?.message ?? "", answers: data.readiness.answers, saved: true, prescription: data.readiness.prescription }
      : null,
  );
  const [readyOpen, setReadyOpen] = useState(false);
  const draftTimer = useRef(0);
  const table: Table | null = readiness
    ? readiness.prescription ?? (readiness.tableId ? tables[readiness.tableId] ?? null : null)
    : !form && lesson.starterTableId
      ? tables[lesson.starterTableId] ?? null
      : null;

  /* ---------------------------------------------------------------- playlist + autoplay */
  const [clipState, setClipState] = useState<{ step: string; id: string | null }>({ step: "", id: null });
  const [autoStart, setAutoStart] = useState(false);
  const [autoplay, setAutoplay] = useState(data.autoplayNext);
  const [pendingState, setPendingState] = useState<null | { step: string; kind: "clip" | "step"; title: string; go: () => void }>(null);
  const [progressState, setProgressState] = useState({ step: "", p: 0 });
  // Clip, "Up next" and video progress belong to the step they were set on.
  const clipId = clipState.step === step.id ? clipState.id : null;
  const setClipId = (id: string | null) => setClipState({ step: step.id, id });
  const pending = pendingState && pendingState.step === step.id ? pendingState : null;
  const setPending = (v: null | { kind: "clip" | "step"; title: string; go: () => void }) => setPendingState(v ? { ...v, step: step.id } : null);
  const videoP = progressState.step === step.id ? progressState.p : 0;
  const setVideoP = (p: number) => setProgressState({ step: step.id, p });
  const initialSeconds = data.position?.videoSeconds ?? {};
  const playlist = stagePlaylist(step, clipId);
  const current = clipId ? playlist.queue.find((c) => c.providerId === clipId) ?? null : playlist.lead;
  const videoSeconds = useRef<Record<string, number>>({ ...(data.position?.videoSeconds ?? {}) });
  const lastSave = useRef(0);
  const pauseStage = useRef<(() => void) | null>(null);

  // Remember the step across devices (debounced).
  useEffect(() => {
    const id = window.setTimeout(() => void savePositionAction(lesson.id, { activeStepId: step.id }), 800);
    return () => window.clearTimeout(id);
  }, [lesson.id, step.id]);

  const saveSeconds = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastSave.current < 15000) return;
      lastSave.current = now;
      void savePositionAction(lesson.id, { videoSeconds: videoSeconds.current });
    },
    [lesson.id],
  );
  useEffect(() => () => saveSeconds(true), [saveSeconds]);

  /* ---------------------------------------------------------------- gates */
  const startEligible = !dayDone && doneCount === 0 && !lesson.pageType;
  const [showStart, closeStart] = useSeenOnce(`gate:start:${lesson.id}`, startEligible);
  const [endKind, setEndKind] = useState<null | "day" | "phase" | "level">(null);
  const [certificateId, setCertificateId] = useState<string | null>(data.certificateId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  /* ---------------------------------------------------------------- navigation */
  const go = useCallback(
    (i: number, opts?: { auto?: boolean }) => {
      if (i < 0 || i >= steps.length || !isOpen(i)) return;
      setAutoStart(Boolean(opts?.auto));
      setActive(i);
      document.querySelector(".trn-player-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
      if (steps[i]!.special === "readiness" && form && !readiness) window.setTimeout(() => setReadyOpen(true), 380);
    },
    [steps, isOpen, form, readiness],
  );

  const ord = outline.findIndex((l) => l.id === lesson.id);
  const prevLesson = ord > 0 ? outline[ord - 1] : null;
  const nextLesson = ord >= 0 ? outline[ord + 1] ?? null : null;
  const doneIds = useMemo(() => new Set(progress.filter((p) => p.complete).map((p) => p.lessonId)), [progress]);

  const next = useMemo(() => {
    const left = outline.filter((l) => l.sectionId === section.id && !l.pageType && l.id !== lesson.id && !doneIds.has(l.id)).length;
    return recommendNext({
      next: nextLesson ? { id: nextLesson.id, title: nextLesson.title, pageType: nextLesson.pageType, dayNumber: nextLesson.dayNumber } : null,
      band: readiness?.band ?? null,
      daysLeftInSection: left,
      labels: { lessonLabel: word, sectionLabel: (program.sectionLabel || "Phase").toLowerCase(), pathLabel: path?.kind === "level" ? "level" : "course" },
    });
  }, [outline, section.id, lesson.id, doneIds, nextLesson, readiness, word, program.sectionLabel, path]);

  function followNext() {
    const a = next.primary;
    if (a.kind === "lesson") {
      const l = outline.find((x) => x.id === a.lessonId);
      router.push(lessonHref(program.slug, l?.key ?? null, a.lessonId, "immersion"));
    } else if (a.kind === "tool") router.push(`/tools/${a.toolSlug}`);
    else router.push(`/programs/${program.slug}${path?.key ? `?path=${path.key}` : ""}`);
  }

  /* ---------------------------------------------------------------- complete */
  function finishDay(server?: { section_done?: boolean; path_done?: boolean; certificate_id?: string | null }) {
    const sectionLessons = outline.filter((l) => l.sectionId === section.id);
    const localSection = sectionLessons.every((l) => l.id === lesson.id || doneIds.has(l.id));
    const localPath = outline.every((l) => l.id === lesson.id || doneIds.has(l.id));
    const pathDone = server?.path_done ?? localPath;
    const sectionDone = server?.section_done ?? localSection;
    if (server?.certificate_id) setCertificateId(server.certificate_id);
    haptic(18);
    window.setTimeout(() => setEndKind(pathDone ? "level" : sectionDone ? "phase" : "day"), 650);
  }

  async function complete(i: number, via: "button" | "watched" = "button") {
    const s = steps[i];
    if (!s || completed.has(s.id)) return;
    if (s.special === "readiness") {
      setReadyOpen(true);
      return;
    }
    const after = new Set(completed).add(s.id);
    setCompleted(after);
    const finished = steps.every((x) => !x.isRequired || after.has(x.id));
    const r = await completeStepAction(s.id, via);
    if (!r.ok && r.code !== "offline") {
      setCompleted((c) => {
        const n = new Set(c);
        n.delete(s.id);
        return n;
      });
      setRev((x) => x + 1);
      toast(r.message);
      return;
    }
    if (!r.ok) toast("Saved here. It syncs when you're back online.", { action: { label: "Retry", onClick: () => void completeStepAction(s.id, via) } });
    if (finished) return finishDay(r.ok ? r.result : undefined);
    const n = i + 1;
    if (via === "watched") {
      if (autoplay && steps[n]) setPending({ kind: "step", title: steps[n]!.title, go: () => go(n, { auto: true }) });
    } else window.setTimeout(() => go(n), 420);
  }

  async function submitReadiness(answers: Record<string, string>, preview: ReadinessOutcome) {
    const local: Readiness = { score: preview.score, band: preview.band, name: preview.name, outcome: preview.outcome, tableId: preview.tableId, message: preview.message, answers, saved: false };
    setReadiness(local);
    const rStep = steps.find((s) => s.special === "readiness");
    const r = await submitReadinessAction(lesson.id, answers);
    if (!r.ok && r.code !== "offline") {
      toast(r.message);
      setReadiness(data.readiness ? readiness : null);
      return false;
    }
    if (r.ok) setReadiness({ ...local, score: r.result.score, band: r.result.band as Readiness["band"], name: r.result.band_name, outcome: r.result.outcome, tableId: r.result.table_id, message: r.result.message, saved: true });
    else toast("Today's table is ready. Your answers save when you're back online.");
    if (rStep) {
      const after = new Set(completed).add(rStep.id);
      setCompleted(after);
      const finished = steps.every((x) => !x.isRequired || after.has(x.id));
      if (finished) finishDay(r.ok ? r.result : undefined);
      else {
        const workoutIdx = steps.findIndex((s) => s.special === "workout");
        const ri = steps.indexOf(rStep);
        window.setTimeout(() => {
          setActive(ri + 1 < steps.length ? ri + 1 : ri);
          if (workoutIdx < 0) setTableOpen(preview.outcome === "workout");
        }, 300);
      }
    }
    return true;
  }

  /* ---------------------------------------------------------------- keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (readyOpen || menuOpen || tableOpen || showStart || endKind) return;
      if (el && (["INPUT", "TEXTAREA", "SELECT", "IFRAME"].includes(el.tagName) || (el as HTMLElement).isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") go(active + 1);
      else if (e.key === "ArrowLeft") go(active - 1);
      else if (e.key.toLowerCase() === "c") void complete(active);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------------------------------------------------------------- view */
  const glyph = dayGlyph(lesson.dayType, lesson.pageType);
  const eyebrow = [lessonLabel(lesson, word), path?.shortName].filter(Boolean).join(", ");
  const dayName = lesson.pageType ? lesson.title : lessonName(lesson);
  const minutes = minutesOf(steps.map((s) => s.durationLabel));
  const minutesLeft = minutesOf(steps.filter((s) => !completed.has(s.id)).map((s) => s.durationLabel));
  const backdrop = step.poster ?? lesson.image ?? program.media[0]?.url ?? null;
  const levelNumber = ROMAN[(path?.shortName ?? "").replace(/^level\s*/i, "")] ?? undefined;
  const programHref = `/programs/${program.slug}${path?.key ? `?path=${path.key}` : ""}`;
  const guideHref = lessonHref(program.slug, lesson.key, lesson.id, "self_guided");
  const isDone = completed.has(step.id);
  const readyStep = step.special === "readiness";
  const workoutStep = step.special === "workout";
  const clips = step.clips ?? [];
  const showTableBeside = workoutStep && Boolean(table);

  const stageOverlay = pending ? (
    <UpNext
      key={pending.title}
      title={pending.title}
      label={pending.kind === "clip" ? "Next clip" : "Next step"}
      onGo={() => {
        const g = pending.go;
        setPending(null);
        g();
      }}
      onCancel={() => setPending(null)}
    />
  ) : null;

  const stageKey = `${step.id}:${clipId ?? "lead"}`;
  const stage = (
    <VideoStage
      key={stageKey}
      video={current}
      poster={current?.thumbnailUrl ?? step.poster ?? lesson.image ?? null}
      title={current?.title ?? step.title}
      badge={clipId ? `Clip ${playlist.queue.findIndex((c) => c.providerId === clipId) + 1} of ${playlist.queue.length}` : clips.length ? "Main video" : undefined}
      autoStart={autoStart || Boolean(clipId)}
      resumeAt={current ? initialSeconds[current.providerId] ?? 0 : 0}
      pauseRef={pauseStage}
      onProgress={(s, d) => {
        if (!current) return;
        videoSeconds.current[current.providerId] = Math.floor(s);
        setVideoP(d ? s / d : 0);
        saveSeconds();
      }}
      onWatched={() => {
        saveSeconds(true);
        if (!playlist.nextClip) void complete(active, "watched");
      }}
      onEnded={() => {
        const nc = playlist.nextClip;
        if (nc) setPending({ kind: "clip", title: nc.title, go: () => setClipId(nc.providerId) });
        else if (isDone && autoplay && steps[active + 1] && isOpen(active + 1)) setPending({ kind: "step", title: steps[active + 1]!.title, go: () => go(active + 1, { auto: true }) });
      }}
      overlay={stageOverlay}
    >
      {readyStep && form ? (
        <div className="trn-stage-inner">
          {readiness ? (
            <>
              <ReadinessDial score={readiness.score} band={readiness.band} max={form.maxScore} zones={zonesFor(form)} size={220} />
              <Button variant="white" size="md" icon="repeat" onClick={() => setReadyOpen(true)}>
                Review answers
              </Button>
            </>
          ) : (
            <>
              <ReadinessDial score={0} max={form.maxScore} zones={zonesFor(form)} size={200} bare animated={false} className="trn-dial-idle" />
              <p className="lq-t17 trn-stage-copy">Five honest questions set today&apos;s workout.</p>
              <Button variant="white" size="md" icon="play" onClick={() => setReadyOpen(true)}>
                Start check-in
              </Button>
            </>
          )}
        </div>
      ) : step.special === "completion" ? (
        <div className="trn-stage-inner">
          <Completion key={isDone ? "done" : "todo"} variant="step" size={150} animated={isDone} />
          <p className="lq-t22 trn-stage-copy">{step.body || "You've crushed another day"}</p>
        </div>
      ) : (
        <div className="trn-stage-inner">
          <DayGlyph type={glyph} size={64} strokeWidth={1.3} tone="mono" className="trn-stage-glyph" />
        </div>
      )}
    </VideoStage>
  );

  const primary = readyStep && !isDone ? (
    <Button block icon="play" onClick={() => setReadyOpen(true)}>
      Start check-in
    </Button>
  ) : (
    <CompleteButton key={`${step.id}-${rev}`} block done={isDone} doneLabel="Completed" onComplete={() => complete(active)}>
      {step.special === "completion" ? "Finish the day" : "Complete step"}
    </CompleteButton>
  );

  const stepList = (
    <ol className="trn-steps" aria-label="Today's steps">
      {steps.map((s, i) => {
        const done = completed.has(s.id);
        const now = i === active;
        const open = openNow(i);
        return (
          <li key={s.id}>
            <button
              type="button"
              className="trn-step"
              data-state={now ? "now" : done ? "done" : !open ? "locked" : undefined}
              aria-current={now ? "step" : undefined}
              disabled={!open}
              onClick={() => go(i)}
            >
              <span className="trn-step-n" aria-hidden>
                {done ? (
                  <svg viewBox="0 0 24 24" className="lq-icon lq-check" data-size="xs" data-draw="">
                    <path d="M5.5 12.5 10 17l8.5-9.5" />
                  </svg>
                ) : !open ? (
                  <Icon name="lock" size="xs" />
                ) : (
                  <span className="lq-num">{i + 1}</span>
                )}
              </span>
              <span className="trn-step-t">
                <span className="lq-t15 trn-ellipsis">{s.title}</span>
                <span className="lq-t13 lq-c2">
                  {now && current && !isDone ? (
                    <span className="trn-eq" aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : null}
                  {s.special === "readiness" && readiness ? `Score ${readiness.score}, ${readiness.name}` : s.durationLabel ?? ""}
                </span>
              </span>
              <span className="lq-sr">{done ? "Done" : !open ? "Locked" : now ? "Current step" : ""}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="trn-player" data-has-side={showTableBeside ? "" : undefined}>
      {backdrop && <AmbientBackdrop key={backdrop} src={backdrop} fixed position="50% 40%" className="trn-ambient" />}

      {/* Desktop rail */}
      <aside className="trn-rail lq-glass" aria-label="Day">
        <div className="trn-rail-head">
          <IconButton icon="back" label={`Back to ${program.name}`} href={programHref} variant="fill" size="sm" iconSize="sm" />
          <div style={{ minWidth: 0 }}>
            <div className="lq-t13 lq-c2 trn-eyebrow trn-ellipsis">{eyebrow}</div>
            <div className="lq-t17 trn-ellipsis">{dayName}</div>
          </div>
        </div>
        <div className="trn-rail-ring">
          <Rings size={56} stroke={8} rings={[{ value: steps.length ? doneCount / steps.length : 0, tone: 1 }]} label={`${doneCount} of ${steps.length} steps`} />
          <div>
            <div className="lq-t17 lq-num">
              {doneCount} of {steps.length} steps
            </div>
            <div className="lq-t13 lq-c2 lq-num">{dayDone ? "Day complete" : minutesLeft ? `About ${minutesLeft} min left` : section.title}</div>
          </div>
        </div>
        {stepList}
        <div className="trn-rail-foot">
          <label className="trn-auto lq-t15">
            <span>Autoplay next</span>
            <Toggle
              checked={autoplay}
              label="Autoplay next"
              onChange={(v) => {
                setAutoplay(v);
                void setAutoplayAction(v);
              }}
            />
          </label>
          <DayLinks slug={program.slug} prev={prevLesson} next={nextLesson} word={word} />
        </div>
      </aside>

      <div className="trn-player-scroll">
        {/* Phone top bar */}
        <header className="trn-bar">
          <IconButton icon="back" label={`Back to ${program.name}`} href={programHref} />
          <div className="trn-bar-t">
            <span className="lq-t13 lq-c2 trn-eyebrow trn-ellipsis">{eyebrow}</span>
            <span className="lq-t15 trn-ellipsis" style={{ fontWeight: 650 }}>
              {dayName}
            </span>
          </div>
          <IconButton icon="more" label="Day options" onClick={() => setMenuOpen(true)} />
        </header>

        <div className="trn-desk-actions">
          {table && !workoutStep && (
            <Button variant="glass" size="sm" icon="steps" onClick={() => setTableOpen(true)}>
              Today&apos;s workout
            </Button>
          )}
          <IconButton icon="more" label="Day options" onClick={() => setMenuOpen(true)} />
        </div>

        <main className="trn-player-main" id="main-player">
          <div className="trn-player-cols">
            <div className="trn-player-primary">
              {stage}

              <StepSegments total={steps.length} done={doneCount} current={active} currentProgress={isDone ? 1 : videoP} className="trn-segs" label={`Step ${active + 1} of ${steps.length}`} />

              <div className="trn-step-head">
                <div style={{ minWidth: 0 }}>
                  <p className="lq-t13 lq-c2 lq-num" style={{ fontWeight: 600 }}>
                    Step {active + 1} of {steps.length}
                    {step.durationLabel ? ` · ${step.durationLabel}` : ""}
                  </p>
                  <h1 key={step.id} className="lq-t28 trn-step-title">
                    {step.title}
                  </h1>
                </div>
                {readiness && (
                  <button type="button" className="trn-chip-btn" onClick={() => setReadyOpen(true)} aria-label={`Readiness ${readiness.score}, ${readiness.name}. Review`}>
                    <Chip score={readiness.score}>{readiness.name}</Chip>
                  </button>
                )}
                <div className="trn-step-cta">{primary}</div>
              </div>

              {playlist.queue.length > 0 && (
                <section className="trn-clips-sec" aria-labelledby="trn-clips-h">
                  <div className="trn-sec-h">
                    <h2 id="trn-clips-h" className="lq-t17">
                      {playlist.queue.length === 1 ? "Also in this step" : "Demo clips"}
                    </h2>
                    {playlist.queue.length > 1 && <span className="lq-t13 lq-c2">Plays in order</span>}
                  </div>
                  <ClipRow clips={playlist.queue} playingId={clipId ?? playlist.playingClipId} nextId={playlist.nextClip?.providerId} glyph={glyph} onPlay={(id) => setClipId(id)} label="Demo clips" />
                </section>
              )}

              {readyStep && readiness && !workoutStep && (
                <Glass radius="card" className="trn-ready-card">
                  <p className="lq-t13 lq-c2 trn-eyebrow">Today&apos;s readiness</p>
                  <p className="lq-t22">{readiness.name}</p>
                  {readiness.message && <p className="lq-t15 lq-c2">{readiness.message}</p>}
                  {!readiness.saved && <p className="lq-t13 lq-c2">Not saved yet. It saves when you&apos;re back online.</p>}
                </Glass>
              )}

              {workoutStep && !table && (
                <WorkoutGate form={Boolean(form)} readiness={readiness} onAssess={() => {
                  const ri = steps.findIndex((s) => s.special === "readiness");
                  if (ri >= 0 && ri !== active) setActive(ri);
                  setReadyOpen(true);
                }} />
              )}

              {step.body && step.special !== "completion" && <Notes body={step.body} />}

              {step.attachments.length > 0 && (
                <Glass radius="card" className="trn-list">
                  {step.attachments.map((a) => (
                    <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="trn-row">
                      <span className="trn-row-ic" aria-hidden>
                        <Icon name="down" size="sm" />
                      </span>
                      <span className="lq-t15 trn-row-t">{a.title}</span>
                    </a>
                  ))}
                </Glass>
              )}

              {/* Phone: the day's steps and day links under the content */}
              <section className="trn-phone-steps" aria-labelledby="trn-steps-h">
                <div className="trn-sec-h">
                  <h2 id="trn-steps-h" className="lq-t17">
                    Today&apos;s steps
                  </h2>
                  <span className="lq-t13 lq-c2 lq-num">
                    {doneCount} of {steps.length}
                    {minutes ? ` · ${minutes} min` : ""}
                  </span>
                </div>
                <Glass radius="card" className="trn-steps-card">
                  {stepList}
                </Glass>
                <DayLinks slug={program.slug} prev={prevLesson} next={nextLesson} word={word} />
              </section>
            </div>

            {showTableBeside && table && (
              <div className="trn-player-side">
                <WorkoutPanel table={table} band={readiness?.name ?? null} score={readiness?.score ?? null} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Phone control bar */}
      <div className="trn-controls lq-glass" data-float="">
        <IconButton icon="prev" label="Previous step" variant="plain" onClick={() => go(active - 1)} disabled={active === 0} />
        <div className="trn-controls-main">{primary}</div>
        <IconButton icon="next" label="Next step" variant="plain" onClick={() => go(active + 1)} disabled={active >= steps.length - 1 || !openNow(active + 1)} />
      </div>

      {form && (
        <ReadinessSheet
          open={readyOpen}
          onClose={() => setReadyOpen(false)}
          form={form}
          initial={data.position?.draftAnswers ?? {}}
          saved={readiness ? { score: readiness.score, name: readiness.name, band: readiness.band, outcome: readiness.outcome, tableId: readiness.tableId, message: readiness.message, answers: readiness.answers } : null}
          onDraft={(a) => {
            window.clearTimeout(draftTimer.current);
            draftTimer.current = window.setTimeout(() => void savePositionAction(lesson.id, { draftAnswers: a }), 600);
          }}
          onSubmit={submitReadiness}
        />
      )}

      <Sheet open={tableOpen} onClose={() => setTableOpen(false)} title="Today's workout" description={readiness ? `Readiness ${readiness.score}: ${readiness.name}` : undefined} detents={["large"]} desktop="side">
        {table ? <WorkoutPanel table={table} band={readiness?.name ?? null} score={readiness?.score ?? null} compact /> : <WorkoutGate form={Boolean(form)} readiness={readiness} onAssess={() => { setTableOpen(false); setReadyOpen(true); }} />}
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={dayName} description={`${section.title}${lesson.dayType ? ` · ${dayTypeShort(lesson.dayType)}` : ""}`} detents={["medium", "large"]} desktop="side">
        <div className="trn-menu">
          <label className="trn-auto lq-t17">
            <span>
              Autoplay next
              <small className="lq-t13 lq-c2">Moves to the next step when a video finishes</small>
            </span>
            <Toggle
              checked={autoplay}
              label="Autoplay next"
              onChange={(v) => {
                setAutoplay(v);
                void setAutoplayAction(v);
              }}
            />
          </label>
          {table && (
            <button type="button" className="trn-row" onClick={() => { setMenuOpen(false); setTableOpen(true); }}>
              <span className="trn-row-ic" aria-hidden><Icon name="steps" size="sm" /></span>
              <span className="lq-t15 trn-row-t">Today&apos;s workout table</span>
              <Icon name="chevron" size="sm" />
            </button>
          )}
          <Link href={guideHref} className="trn-row">
            <span className="trn-row-ic" aria-hidden><Icon name="compass" size="sm" /></span>
            <span className="lq-t15 trn-row-t">Open in Self-Guided</span>
            <Icon name="chevron" size="sm" />
          </Link>
          <Link href={programHref} className="trn-row">
            <span className="trn-row-ic" aria-hidden><Icon name="mountain" size="sm" /></span>
            <span className="lq-t15 trn-row-t">Program map</span>
            <Icon name="chevron" size="sm" />
          </Link>
          <button type="button" className="trn-row" onClick={() => { setMenuOpen(false); setRestartOpen(true); }}>
            <span className="trn-row-ic" aria-hidden><Icon name="repeat" size="sm" /></span>
            <span className="lq-t15 trn-row-t">Restart {path?.shortName ?? "from the beginning"}</span>
            <Icon name="chevron" size="sm" />
          </button>
          <p className="lq-t13 lq-c2 trn-keys">
            Keyboard: <kbd>←</kbd> <kbd>→</kbd> steps, <kbd>C</kbd> complete
          </p>
        </div>
      </Sheet>

      <RestartSheet open={restartOpen} onClose={() => setRestartOpen(false)} programId={program.id} pathId={path?.id ?? null} slug={program.slug} name={path?.shortName ?? program.name} done={doneIds.size} onDone={() => router.push(programHref)} />

      {showStart && (
        <DayStart
          onClose={closeStart}
          name={data.firstName}
          eyebrow={[lessonLabel(lesson, word), section.title, path?.shortName].filter(Boolean).join(" · ")}
          title={dayName}
          glyph={glyph}
          focus={lesson.focus}
          steps={steps.length}
          minutes={minutes}
          image={lesson.image ?? backdrop}
        />
      )}
      {endKind && (
        <DayEnd
          onClose={() => setEndKind(null)}
          name={data.firstName}
          title={endKind === "level" ? `${path?.name ?? program.name}: every phase, every day.` : endKind === "phase" ? `${section.title} is done. The next phase opens now.` : `${lessonLabel(lesson, word)} is in the books.`}
          next={next}
          onNext={followNext}
          kind={endKind}
          levelNumber={levelNumber}
          certificateHref={endKind === "level" && certificateId ? `/you/certificates/${certificateId}` : null}
          offer={endOffer}
        />
      )}
    </div>
  );
}

function WorkoutGate({ form, readiness, onAssess }: { form: boolean; readiness: Readiness | null; onAssess: () => void }) {
  if (readiness && readiness.outcome !== "workout") {
    return (
      <Glass radius="card" className="trn-gatecard">
        <p className="lq-t13 lq-c2 trn-eyebrow">{readiness.name}</p>
        <p className="lq-t17">{readiness.outcome === "rest" ? "Today is for rest." : "Today is for recovery."}</p>
        {readiness.message && <p className="lq-t15 lq-c2">{readiness.message}</p>}
      </Glass>
    );
  }
  if (!form) {
    return (
      <Glass radius="card" className="trn-gatecard">
        <p className="lq-t15 lq-c2">Follow the video and notes for this session. There&apos;s no separate table today.</p>
      </Glass>
    );
  }
  return (
    <Glass radius="card" className="trn-gatecard" data-locked="">
      <span className="trn-gatecard-ic" aria-hidden>
        <Icon name="lock" size="sm" />
      </span>
      <div>
        <p className="lq-t17">Your table unlocks after the check-in</p>
        <p className="lq-t13 lq-c2">Five quick questions pick the right load for today.</p>
      </div>
      <Button size="md" icon="play" onClick={onAssess}>
        Start check-in
      </Button>
    </Glass>
  );
}

function Notes({ body }: { body: string }) {
  const paras = body
    .replace(/^NOTES:\s*/i, "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paras.length) return null;
  const long = paras.length > 4;
  const content = paras.map((p, i) =>
    /:$/.test(p) || (p.length < 40 && /^[A-Z][^.]*$/.test(p) && i > 0 && paras.length > 6) ? (
      <p key={i} className="lq-t15 trn-notes-li">
        {p.replace(/\*$/, "")}
      </p>
    ) : (
      <p key={i} className="lq-t15">
        {p}
      </p>
    ),
  );
  return (
    <Glass as="section" radius="card" className="trn-notes" aria-label="Notes">
      <p className="lq-t13 lq-c2 trn-eyebrow">Notes</p>
      {long ? (
        <details>
          <summary>
            {content.slice(0, 2)}
            <span className="lq-t15 trn-more">Show all notes</span>
          </summary>
          {content.slice(2)}
        </details>
      ) : (
        content
      )}
    </Glass>
  );
}

function DayLinks({ slug, prev, next, word }: { slug: string; prev: LessonPageData["outline"][number] | null; next: LessonPageData["outline"][number] | null; word: string }) {
  return (
    <nav className="trn-daylinks" aria-label="Other days">
      {prev ? (
        <Link href={lessonHref(slug, prev.key, prev.id)} className="trn-daylink">
          <Icon name="back" size="xs" />
          <span className="lq-t13 trn-ellipsis">{lessonLabel(prev, word)}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={lessonHref(slug, next.key, next.id)} className="trn-daylink" data-next="">
          <span className="lq-t13 trn-ellipsis">{lessonLabel(next, word)}</span>
          <Icon name="chevron" size="xs" />
        </Link>
      )}
    </nav>
  );
}

export type { PlayerStep };
