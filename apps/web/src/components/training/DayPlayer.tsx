"use client";

import { announceProgress } from "@/components/you/CelebrationHost";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isStepOpen, openThrough, recommendNext, stagePlaylist, type NextAction, type ReadinessOutcome, type WorkoutTable as Table } from "@ms/core";
import { Button, CompleteButton, Icon, Sheet, Toggle, haptic, useToast } from "@/components/ui";
import { Completion } from "@/components/graphics";
import type { LessonPageData, PlayerStep } from "@/lib/loaders/training";
import { completeStepAction, savePositionAction, setAutoplayAction, submitReadinessAction, uncompleteStepAction } from "@/lib/actions/training";
import { lessonHref, lessonLabel, lessonName, minutesOf } from "./model";
import { clock, summitPoster } from "./model";
import { UpNext, VideoStage } from "./VideoStage";
import { bandSummary, ReadinessAssessment, WorkoutTablePanel, type Readiness } from "./Readiness";
import { circuitsOf, circuitWord, estimateMinutes } from "./workout";
import { CircuitTable, downloadWorkoutCsv } from "./CircuitTable";
import { WorkoutMode } from "./WorkoutCard";
import { KblLevelSwitch } from "./KblLevelSwitch";
import { MIKE_FACE } from "@/lib/program-photos";
import { DayEnd, DayStart, useSeenOnce } from "./DayGates";
import { Cheer, useCheer, useConfetti } from "./Celebrate";
import { hasNotes, NotesBody } from "./NotesBody";
import { SessionAutoStart } from "@/components/selfguided/SessionAutoStart";
import "./training.css";
import "./day-styles";
import "./day-calm.css";

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };
const CHEERS = ["Nice work.", "Logged. Keep moving.", "That's one down.", "Strong. Next up.", "Locked in."];
type Point = { x: number; y: number } | undefined;

/** Source "Let's Begin" text without its "It's a new day" heading (already on the start screen). */
function letsBeginText(html: string | null | undefined) {
  if (!html) return "";
  const body = html.replace(/<h2[\s\S]*?<\/h2>/i, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!body) return "";
  return body === body.toUpperCase() ? body.charAt(0) + body.slice(1).toLowerCase() : body;
}

/**
 * The Immersion day player (and course lesson player): a full-screen focused view, as in
 * the original app. Top bar (exit, context, step pills, autoplay, Session plan, count, ring);
 * a stage column (edge-to-edge video, step meta with prev / Complete / next, notes and clips,
 * readiness form, today's workout table) and the "Today's sequence" rail; on a phone the
 * sequence sits under the content with a thumb-zone action bar.
 */
export function DayPlayer({ data, endOffer }: { data: LessonPageData; endOffer?: ReactNode }) {
  const { program, path, lesson, steps, section, outline, progress, form, tables } = data;
  const router = useRouter();
  const toast = useToast();
  const word = program.lessonLabel || "Day";
  const lockedOrder = data.state.lockedOrder;
  const [now] = useState(() => Date.now());

  /* ---------------------------------------------------------------- progress */
  const [completed, setCompletedState] = useState(() => new Set(data.state.completedSteps));
  const completedRef = useRef(completed);
  const setCompleted = useCallback((next: Set<string> | ((c: Set<string>) => Set<string>)) => {
    const value = typeof next === "function" ? next(completedRef.current) : next;
    completedRef.current = value;
    setCompletedState(value);
  }, []);
  const [rev, setRev] = useState(0);
  const isOpen = useCallback((i: number) => !lockedOrder || isStepOpen(steps, i, completedRef.current), [lockedOrder, steps]);
  const openNow = (i: number) => !lockedOrder || isStepOpen(steps, i, completed);
  const firstOpen = Math.min(openThrough(steps, completed), steps.length - 1);
  const [active, setActive] = useState(() => {
    const saved = data.position?.activeStepId ? steps.findIndex((s) => s.id === data.position!.activeStepId) : -1;
    return saved >= 0 && (!lockedOrder || saved <= firstOpen) ? saved : Math.max(0, firstOpen);
  });
  const step = steps[Math.min(active, steps.length - 1)]!;
  const dayDone = steps.length > 0 && steps.every((s) => !s.isRequired || completed.has(s.id));
  const doneCount = steps.filter((s) => completed.has(s.id)).length;
  const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  // Undoing an earlier step returns playback to the furthest open step.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lockedOrder && active > firstOpen) setActive(Math.max(0, firstOpen));
  }, [lockedOrder, active, firstOpen]);

  /* ---------------------------------------------------------------- readiness */
  const [readiness, setReadiness] = useState<Readiness | null>(() =>
    data.readiness
      ? { score: data.readiness.score, band: data.readiness.band, name: data.readiness.bandName, outcome: data.readiness.outcome, tableId: data.readiness.tableId, message: form?.bands.find((b) => b.name === data.readiness!.bandName)?.message ?? "", answers: data.readiness.answers, saved: true, prescription: data.readiness.prescription }
      : null,
  );
  const draftTimer = useRef(0);
  const table: Table | null = readiness
    ? readiness.prescription ?? (readiness.tableId ? tables[readiness.tableId] ?? null : null)
    : !form && lesson.starterTableId
      ? tables[lesson.starterTableId] ?? null
      : null;
  const readinessIdx = steps.findIndex((s) => s.special === "readiness");
  const workoutDay = Boolean(form || lesson.starterTableId || steps.some((s) => s.special === "workout"));
  const [planOpen, setPlanOpen] = useState(false);

  /* ---------------------------------------------------------------- playlist + autoplay */
  const [clipState, setClipState] = useState<{ step: string; id: string | null }>({ step: "", id: null });
  const [autoStart, setAutoStart] = useState(false);
  const [autoplay, setAutoplay] = useState(data.autoplayNext);
  const [pendingState, setPendingState] = useState<null | { step: string; kind: "clip" | "step"; title: string; go: () => void }>(null);
  const clipId = clipState.step === step.id ? clipState.id : null;
  const setClipId = (id: string | null) => setClipState({ step: step.id, id });
  const pending = pendingState && pendingState.step === step.id ? pendingState : null;
  const setPending = (v: null | { kind: "clip" | "step"; title: string; go: () => void }) => setPendingState(v ? { ...v, step: step.id } : null);
  const initialSeconds = data.position?.videoSeconds ?? {};
  const playlist = stagePlaylist(step, clipId);
  const current = clipId ? playlist.queue.find((c) => c.providerId === clipId) ?? null : playlist.lead;
  const videoSeconds = useRef<Record<string, number>>({ ...(data.position?.videoSeconds ?? {}) });
  const lastSave = useRef(0);
  const pauseStage = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const trainRef = useRef<HTMLElement>(null);
  const readyRef = useRef<HTMLDivElement>(null);
  const [retaking, setRetaking] = useState(false);
  const [workoutOn, setWorkoutOn] = useState(false);

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

  /* ---------------------------------------------------------------- gates + celebration */
  const startEligible = !dayDone && doneCount === 0 && !lesson.pageType;
  const [showStart, closeStart] = useSeenOnce(`gate:start:${lesson.id}`, startEligible);
  const [endKind, setEndKind] = useState<null | "day" | "phase" | "level">(null);
  const [certificateId, setCertificateId] = useState<string | null>(data.certificateId);
  const { burst, layer } = useConfetti();
  const { cheer, message } = useCheer();
  const press = useRef<Point>(undefined);

  /* ---------------------------------------------------------------- navigation */
  const go = useCallback(
    (i: number, opts?: { auto?: boolean }) => {
      if (i < 0 || i >= steps.length || !isOpen(i)) return;
      setAutoStart(opts?.auto !== false);
      setActive(i);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      playerRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    },
    [steps, isOpen],
  );

  const ord = outline.findIndex((l) => l.id === lesson.id);
  const prevLesson = ord > 0 ? outline[ord - 1] ?? null : null;
  const nextLesson = ord >= 0 ? outline[ord + 1] ?? null : null;
  const doneIds = useMemo(() => new Set(progress.filter((p) => p.complete).map((p) => p.lessonId)), [progress]);
  const nextOpen = Boolean(nextLesson && (!lockedOrder || dayDone || progress.find((p) => p.lessonId === nextLesson.id)?.unlocked));

  const next = useMemo(() => {
    const left = outline.filter((l) => l.sectionId === section.id && !l.pageType && l.id !== lesson.id && !doneIds.has(l.id)).length;
    return recommendNext({
      next: nextLesson ? { id: nextLesson.id, title: nextLesson.title, pageType: nextLesson.pageType, dayNumber: nextLesson.dayNumber } : null,
      band: readiness?.band ?? null,
      daysLeftInSection: left,
      labels: { lessonLabel: word, sectionLabel: (program.sectionLabel || "Phase").toLowerCase(), pathLabel: path?.kind === "level" ? "level" : "course" },
    });
  }, [outline, section.id, lesson.id, doneIds, nextLesson, readiness, word, program.sectionLabel, path]);

  const programHref = `/programs/${program.slug}${path?.key ? `?path=${path.key}` : ""}`;
  function follow(a: NextAction) {
    if (a.kind === "lesson") {
      const l = outline.find((x) => x.id === a.lessonId);
      router.push(lessonHref(program.slug, l?.key ?? null, a.lessonId, "immersion"));
    } else if (a.kind === "tool") router.push(`/tools/${a.toolSlug}`);
    else if (a.kind === "catalog") router.push("/programs");
    else router.push(programHref);
  }

  /* ---------------------------------------------------------------- complete / undo */
  function finishDay(server?: { section_done?: boolean; path_done?: boolean; certificate_id?: string | null }) {
    const sectionLessons = outline.filter((l) => l.sectionId === section.id);
    const localSection = sectionLessons.every((l) => l.id === lesson.id || doneIds.has(l.id));
    const localPath = outline.every((l) => l.id === lesson.id || doneIds.has(l.id));
    const pathDone = server?.path_done ?? localPath;
    const sectionDone = server?.section_done ?? localSection;
    if (server?.certificate_id) setCertificateId(server.certificate_id);
    haptic(18);
    window.setTimeout(() => setEndKind(pathDone ? "level" : sectionDone ? "phase" : "day"), 700);
  }

  function celebrate(i: number, finished: boolean, at?: Point) {
    burst({ count: finished ? 60 : 22, origin: at });
    cheer(finished ? "Day complete." : CHEERS[i % CHEERS.length]!);
  }

  function toReadiness() {
    if (readinessIdx >= 0 && readinessIdx !== active && isOpen(readinessIdx)) {
      setAutoStart(false);
      setActive(readinessIdx);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => (readyRef.current ?? trainRef.current)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 60);
  }

  async function complete(i: number, via: "button" | "watched" = "button", at?: Point) {
    const s = steps[i];
    if (!s || completedRef.current.has(s.id) || !isOpen(i)) return;
    if (s.special === "readiness") return toReadiness();
    const after = new Set(completedRef.current).add(s.id);
    setCompleted(after);
    const finished = steps.every((x) => !x.isRequired || after.has(x.id));
    celebrate(i, finished, at);
    const r = await completeStepAction(s.id, via); announceProgress();
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
      if (autoplay && steps[n]) setPending({ kind: "step", title: steps[n]!.title, go: () => go(n) });
    } else window.setTimeout(() => go(n, { auto: false }), 460);
  }

  async function uncomplete(i: number) {
    const s = steps[i];
    if (!s || !completedRef.current.has(s.id)) return;
    if (s.special === "readiness") return toReadiness();
    setCompleted((c) => {
      const n = new Set(c);
      n.delete(s.id);
      return n;
    });
    const r = await uncompleteStepAction(s.id);
    if (!r.ok && r.code !== "offline") {
      setCompleted((c) => new Set(c).add(s.id));
      setRev((x) => x + 1);
      toast(r.message);
    }
  }

  const toggle = (i: number, at?: Point) => (completedRef.current.has(steps[i]?.id ?? "") ? void uncomplete(i) : void complete(i, "button", at));

  async function submitReadiness(answers: Record<string, string>, preview: ReadinessOutcome) {
    const local: Readiness = { score: preview.score, band: preview.band, name: preview.name, outcome: preview.outcome, tableId: preview.tableId, message: preview.message, answers, saved: false };
    const before = readiness;
    setReadiness(local);
    const r = await submitReadinessAction(lesson.id, answers); announceProgress();
    if (!r.ok && r.code !== "offline") {
      toast(r.message);
      setReadiness(before);
      return false;
    }
    if (r.ok) setReadiness({ ...local, score: r.result.score, band: r.result.band as Readiness["band"], name: r.result.band_name, outcome: r.result.outcome, tableId: r.result.table_id, message: r.result.message, saved: true });
    toast(r.ok ? "Readiness logged — your workout table is ready." : "Today's table is ready. Your answers save when you're back online.");
    const rStep = steps[readinessIdx];
    if (rStep && !completedRef.current.has(rStep.id)) {
      const after = new Set(completedRef.current).add(rStep.id);
      setCompleted(after);
      const finished = steps.every((x) => !x.isRequired || after.has(x.id));
      celebrate(readinessIdx, finished);
      if (finished) finishDay(r.ok ? r.result : undefined);
    }
    return true;
  }

  /* ---------------------------------------------------------------- keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (planOpen || showStart || endKind) return;
      if (el && (["INPUT", "TEXTAREA", "SELECT", "IFRAME"].includes(el.tagName) || (el as HTMLElement).isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") go(active + 1);
      else if (e.key === "ArrowLeft") go(active - 1);
      else if (e.key.toLowerCase() === "c") toggle(active);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------------------------------------------------------------- view */
  const dayLabel = lessonLabel(lesson, word);
  const dayName = lesson.pageType ? lesson.title : lessonName(lesson);
  // Top-bar eyebrow: level · section · day label, each once and never repeating the title below it
  // (a lesson called "Home" in a section called "Home" read "HOME · HOME / Home"); the program name when nothing is left.
  const context = (() => {
    const seen = new Set([dayName.trim().toLowerCase()]);
    const parts = [path?.shortName, section.title, dayLabel].filter((x): x is string => {
      const k = (x ?? "").trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return (parts.length ? parts : [program.name]).join(" · ");
  })();
  const minutes = minutesOf(steps.map((s) => s.durationLabel));
  const levelNumber = ROMAN[(path?.shortName ?? "").replace(/^level\s*/i, "")] ?? undefined;
  const isDone = completed.has(step.id);

  /* ---------------------------------------------------------------- the day's playlist */
  // Every video of the day in order: each step's main video, then its demo clips. Steps without
  // a video (readiness, completion) stay in the list so it doubles as today's sequence.
  const items = useMemo<PlayItem[]>(() => {
    const out: PlayItem[] = [];
    steps.forEach((s, si) => {
      const pl = stagePlaylist(s, null);
      if (pl.lead) out.push({ key: `${s.id}:lead`, stepIndex: si, clipId: null, title: s.title, kind: "main", thumb: summitPoster(pl.lead.thumbnailUrl ?? s.poster ?? null, s), duration: s.durationLabel ?? (pl.lead.durationSeconds ? clock(pl.lead.durationSeconds) : null) });
      else out.push({ key: `${s.id}:step`, stepIndex: si, clipId: null, title: s.title, kind: s.special === "readiness" ? "readiness" : s.special === "completion" ? "finish" : "main", thumb: null, duration: s.durationLabel });
      for (const c of pl.queue) out.push({ key: `${s.id}:${c.providerId}`, stepIndex: si, clipId: c.providerId, title: c.title, kind: "demo", thumb: c.thumbnailUrl ?? null, duration: c.durationSeconds ? clock(c.durationSeconds) : null });
    });
    return out;
  }, [steps]);
  const nowKey = clipId ? `${step.id}:${clipId}` : items.find((it) => it.stepIndex === active && it.clipId === null)?.key ?? "";
  const nowIndex = Math.max(0, items.findIndex((it) => it.key === nowKey));

  const scrollToPlayer = useCallback(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    playerRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  const play = useCallback(
    (it: PlayItem, opts?: { scroll?: boolean }) => {
      if (!isOpen(it.stepIndex)) {
        const blocker = steps.findIndex((s, i) => i < it.stepIndex && s.isRequired && !completedRef.current.has(s.id));
        toast(blocker >= 0 ? `Finish “${steps[blocker]!.title}” first.` : "This step opens when you finish the one before.");
        return;
      }
      setPendingState(null);
      setAutoStart(true);
      setActive(it.stepIndex);
      setClipState({ step: steps[it.stepIndex]!.id, id: it.clipId });
      if (opts?.scroll !== false) scrollToPlayer();
    },
    [isOpen, steps, toast, scrollToPlayer],
  );

  /** Exercise name → its demo clip anywhere in today's playlist. */
  const demoFor = useCallback(
    (exercise: string) => {
      const n = norm(exercise);
      if (!n) return null;
      const hit =
        items.find((it) => it.kind === "demo" && norm(it.title) === n) ??
        items.find((it) => it.kind === "demo" && (norm(it.title).startsWith(n) || n.startsWith(norm(it.title))));
      return hit ? () => play(hit) : null;
    },
    [items, play],
  );

  /* ---------------------------------------------------------------- view parts */
  const circuits = table ? circuitsOf(table) : [];
  const bandWord = readiness ? (readiness.band === "green" ? "Sharp" : readiness.band === "amber" ? "Steady" : "Low") : null;
  const notes = useMemo(() => {
    const body = step.special === "completion" ? null : step.body;
    return { body, has: hasNotes(body, step.title), atts: step.attachments };
  }, [step]);
  const week = lesson.dayNumber != null && !lesson.pageType ? Math.ceil(lesson.dayNumber / 7) : null;
  const eyebrow = week ? `Week ${week} · ${dayLabel}` : context;
  const showTable = workoutDay && Boolean(form || table);
  const tableReady = Boolean(table && (!form || (readiness && readiness.outcome === "workout")));
  const workoutStep = step.special === "workout";
  const prevOpen = Boolean(prevLesson);
  const nextHref = nextLesson ? lessonHref(program.slug, nextLesson.key, nextLesson.id) : null;

  const endCtx = useMemo(() => {
    const days = outline.filter((l) => l.dayNumber != null && !l.pageType);
    const isDone = (id: string) => id === lesson.id || doneIds.has(id);
    const secDays = days.filter((l) => l.sectionId === section.id);
    const nx = nextLesson;
    const nxType = nx?.dayType ?? "";
    const photo = /recovery/i.test(nxType) ? "/media/summit/working-in.jpg" : /skill/i.test(nxType) ? "/media/summit/mike-getup.jpg" : "/media/summit/mike-windmill.jpg";
    const tomorrow = new Date(now + 86400000).toLocaleDateString("en-US", { weekday: "short" });
    return {
      context: [path?.shortName, section.title].filter(Boolean).join(" · "),
      dayNumber: lesson.dayNumber ?? null,
      dayName: lesson.pageType ? lesson.title : lessonName(lesson),
      minutes,
      levelDays: days.length ? { done: days.filter((l) => isDone(l.id)).length, total: days.length } : null,
      phase: secDays.length ? { title: section.title.replace(/\s+phase$/i, ""), done: secDays.filter((l) => isDone(l.id)).length, total: secDays.length } : null,
      upNext: nx ? { eyebrow: `Tomorrow · ${tomorrow}`, title: `${lessonLabel(nx, word)}${nx.dayNumber != null && nxType ? ` · ${nxType.replace(/\s+day$/i, "")}` : ""}`, sub: [section.title, nxType].filter(Boolean).join(" · "), photo } : null,
      getReady: program.slug === "kettlebell-lifestyle" && nx ? { eyebrow: `Get ready for ${lessonLabel(nx, word)}`, title: "Mike's technique breakdowns, step by step — from Mastering the Kettlebell.", href: "/explore/mastering-the-kettlebell", cta: "Preview" } : null,
      homeHref: "/today",
    };
  }, [outline, lesson, doneIds, section, nextLesson, path, minutes, word, program.slug, now]);

  const stageOverlay = pending ? (
    <UpNext
      key={pending.title + pending.kind}
      title={pending.title}
      seconds={pending.kind === "clip" ? 5 : 6}
      onGo={() => {
        const g = pending.go;
        setPending(null);
        g();
      }}
      onCancel={() => setPending(null)}
    />
  ) : null;

  const stage = current ? (
    <VideoStage
      key={`${step.id}:${clipId ?? "lead"}`}
      video={current}
      poster={summitPoster(current.thumbnailUrl ?? step.poster ?? null, step)}
      title={current.title ?? step.title}
      autoStart={(autoStart || Boolean(clipId)) && !showStart}
      resumeAt={initialSeconds[current.providerId] ?? 0}
      pauseRef={pauseStage}
      onProgress={(s) => {
        videoSeconds.current[current.providerId] = Math.floor(s);
        saveSeconds();
      }}
      onWatched={() => {
        saveSeconds(true);
        if (!playlist.nextClip) {
          if (isDone) {
            if (autoplay && steps[active + 1] && isOpen(active + 1)) setPending({ kind: "step", title: steps[active + 1]!.title, go: () => go(active + 1) });
          } else void complete(active, "watched");
        }
      }}
      onEnded={() => {
        const nc = playlist.nextClip;
        if (nc && autoplay) setPending({ kind: "clip", title: nc.title, go: () => setClipId(nc.providerId) });
      }}
      overlay={stageOverlay}
    />
  ) : (
    <div className="kd-stage kc-still">
      {step.special === "completion" ? (
        <div className="kc-still-in">
          <Completion key={isDone ? "d" : "t"} variant="step" size={72} animated={isDone} />
          <p className="kc-still-t">{step.body || "You've crushed another day"}</p>
          <p className="kc-still-s">{isDone ? "Day complete. Nicely done." : "Mark this step finished to complete today."}</p>
        </div>
      ) : (
        <>
          <Image src={summitPoster(step.poster, step) ?? "/media/summit/working-in.jpg"} alt="" fill sizes="(min-width: 1024px) 860px, 100vw" className="kc-still-img" />
          <div className="kc-still-in kc-still-photo">
            <p className="kc-still-e">{step.special === "readiness" ? "Readiness check" : `Step ${active + 1}`}</p>
            <p className="kc-still-t">{step.title}</p>
            <p className="kc-still-s">{step.special === "readiness" ? (readiness ? `Score ${readiness.score} · ${readiness.name}` : "Five quick questions pick today's table.") : step.description || "Follow the notes below."}</p>
          </div>
        </>
      )}
    </div>
  );

  const capture = (e: React.PointerEvent) => {
    press.current = { x: e.clientX, y: e.clientY };
  };

  /** The one primary action for where the member is in the day. */
  const primary = (block?: boolean) => {
    const size = block ? "lg" : "md";
    if (dayDone && active >= steps.length - 1)
      return nextHref ? (
        <Button block={block} size={size} href={nextHref} iconAfter="chevron">
          Start {lessonLabel(nextLesson!, word)}
        </Button>
      ) : (
        <Button block={block} size={size} href={programHref} iconAfter="chevron">
          Back to the program
        </Button>
      );
    if (step.special === "readiness" && !isDone)
      return (
        <Button block={block} size={size} icon="steps" onClick={toReadiness}>
          Start readiness check
        </Button>
      );
    if (workoutStep && !isDone && tableReady && table)
      return (
        <Button block={block} size={size} icon="timer" onClick={() => setWorkoutOn(true)}>
          Start workout
        </Button>
      );
    if (isDone) {
      const n = steps[active + 1];
      return n ? (
        <Button block={block} size={size} variant="filled" iconAfter="chevron" disabled={!openNow(active + 1)} onClick={() => go(active + 1)}>
          {n.special === "readiness" ? "Start readiness check" : `Next: ${n.title}`}
        </Button>
      ) : (
        <Button block={block} size={size} variant="fill" state="success" onClick={() => void uncomplete(active)} aria-label="Completed. Press to mark not done">
          Completed
        </Button>
      );
    }
    return (
      <span className="kd-cta-wrap" onPointerDown={capture}>
        <CompleteButton key={`${step.id}-${rev}`} block={block} size={size} doneLabel="Done" onComplete={() => complete(active, "button", press.current)}>
          {steps[active + 1] ? "Done · continue" : "Finish the day"}
        </CompleteButton>
      </span>
    );
  };

  const moreItems: MoreItem[] = [
    ...(workoutDay ? [{ label: "Session plan", icon: "clipboard" as const, onSelect: () => setPlanOpen(true) }] : []),
    ...(workoutStep && !isDone && tableReady ? [{ label: `Mark ${step.title} done`, icon: "check" as const, onSelect: () => void complete(active, "button") }] : []),
    ...(isDone && step.special !== "readiness" ? [{ label: "Mark this step not done", icon: "repeat" as const, onSelect: () => void uncomplete(active) }] : []),
    ...(table && tableReady ? [{ label: "Download table (CSV)", icon: "down" as const, onSelect: () => downloadWorkoutCsv(table) }] : []),
    { label: "Program overview", icon: "grid" as const, href: programHref },
  ];

  const readinessBlock = showTable && form ? (
    readiness && !retaking ? (
      <div className="kc-ready">
        <MiniRing percent={Math.round((1 - Math.min(1, readiness.score / (form.maxScore || 60))) * 100)} label={String(readiness.score)} size={44} tone={readiness.band === "green" ? "ok" : readiness.band === "amber" ? "warm" : "red"} />
        <div className="kc-ready-t">
          <b>
            Readiness {readiness.score} · {bandWord} — {readiness.outcome === "workout" ? (readiness.band === "green" ? "full table" : readiness.name) : "recovery"}
          </b>
          <span>{bandSummary(readiness)}</span>
        </div>
        <button type="button" className="kc-link" onClick={() => setRetaking(true)}>
          Retake
        </button>
      </div>
    ) : (
      <div className="kc-assess" ref={readyRef}>
        <div className="kc-assess-h">
          <b>{retaking ? "Retake today's readiness check" : "Readiness check"}</b>
          <span>Five honest questions about how you woke up today. Your answers pick today&apos;s table.</span>
        </div>
        <ReadinessAssessment
          form={form}
          saved={null}
          initial={retaking ? readiness?.answers ?? {} : data.position?.draftAnswers ?? {}}
          onDraft={(a) => {
            window.clearTimeout(draftTimer.current);
            draftTimer.current = window.setTimeout(() => void savePositionAction(lesson.id, { draftAnswers: a }), 600);
          }}
          onSubmit={async (a, preview) => {
            const ok = await submitReadiness(a, preview);
            if (ok) setRetaking(false);
            return ok;
          }}
        />
        {retaking && (
          <button type="button" className="kc-link" onClick={() => setRetaking(false)}>
            Keep today&apos;s result
          </button>
        )}
      </div>
    )
  ) : null;

  return (
    <div className="kd-day kc-day">
      <SessionAutoStart lessonId={lesson.id} />
      {layer}
      <Cheer message={message} />

      <div className="kc-scroll" ref={scrollRef}>
        {/* ---------------- slim header ---------------- */}
        <header className="kc-top">
          <Link href={programHref} className="kc-icon lq-press" aria-label={`Back to ${program.name}`}>
            <Icon name="back" size="sm" />
          </Link>
          <div className="kc-top-t">
            <div className="kc-top-e">
              <span className="lq-num">{eyebrow}</span>
              {data.levels && data.levels.length > 1 && path?.key ? <KblLevelSwitch levels={data.levels} currentKey={path.key} /> : path?.shortName ? <span className="kc-top-lvl">{path.shortName}</span> : null}
            </div>
            <h1 className="kc-ellipsis">{dayName}</h1>
          </div>
          <div className="kc-top-a">
            <span className="kc-count lq-num" aria-label={`${doneCount} of ${steps.length} steps done`}>
              {doneCount}/{steps.length}
            </span>
            <DayNav
              prev={prevOpen && prevLesson ? { href: lessonHref(program.slug, prevLesson.key, prevLesson.id), label: lessonLabel(prevLesson, word) } : null}
              next={nextLesson ? { href: nextOpen ? nextHref! : null, label: lessonLabel(nextLesson, word) } : null}
            />
            <MoreMenu items={moreItems} />
          </div>
        </header>

        <main className="kc-main">
          {/* ---------------- player + playlist ---------------- */}
          <div className="kc-hero">
            <div className="kc-player" ref={playerRef}>
              {stage}
            </div>
            <Playlist
              items={items}
              nowKey={nowKey}
              nowIndex={nowIndex}
              completed={completed}
              steps={steps}
              open={openNow}
              autoplay={autoplay}
              onAutoplay={(v) => {
                setAutoplay(v);
                if (!v && pending) setPending(null);
                void setAutoplayAction(v);
              }}
              onPlay={(it) => play(it, { scroll: false })}
              onStep={(d) => {
                const it = items[nowIndex + d];
                if (it) play(it, { scroll: false });
              }}
            />
          </div>

          {/* ---------------- where you are + the one action ---------------- */}
          <section className="kc-now" aria-live="polite">
            <div className="kc-now-t">
              <p className="kc-eyebrow lq-num">
                Step {active + 1} of {steps.length}
                {step.durationLabel ? ` · ${step.durationLabel}` : ""}
                {clipId && current?.title ? ` · Demo: ${current.title}` : ""}
              </p>
              <h2 key={step.id}>{step.title}</h2>
              {(step.description || (active === 0 && lesson.focus)) && <p className="kc-now-d">{step.description || lesson.focus}</p>}
            </div>
            <div className="kc-now-a">{primary()}</div>
          </section>

          {/* ---------------- readiness → table ---------------- */}
          {showTable && (
            <section className="kc-card kc-train" ref={trainRef} aria-labelledby="kc-train-h">
              <header className="kc-train-h">
                <div>
                  <p className="kc-eyebrow">Today&apos;s workout</p>
                  <h2 id="kc-train-h">{table && tableReady ? (table.title && !/^chart|table/i.test(table.title) ? table.title : step.special === "workout" ? step.title : "Workout table") : form && !readiness ? "Check in first" : "Workout table"}</h2>
                </div>
                {table && tableReady && (
                  <div className="kc-train-meta lq-num">
                    <span>{circuitWord(circuits)}</span>
                    <span>~{estimateMinutes(table)} min</span>
                  </div>
                )}
              </header>
              {readinessBlock}
              {table && tableReady ? (
                <>
                  <CircuitTable table={table} csv={false} demoFor={demoFor} />
                  <p className="kc-legend">
                    <span>
                      <i data-dir="down" aria-hidden /> Rest, then the next move
                    </span>
                    <span>
                      <i data-dir="up" aria-hidden /> Rest, then repeat the circuit
                    </span>
                    <span className="kc-legend-tip">
                      <Icon name="play" size="xs" /> Tap an exercise to watch its demo
                    </span>
                  </p>
                </>
              ) : readiness && readiness.outcome !== "workout" ? (
                <div className="kc-quiet" role="status">
                  <b>{readiness.name}</b>
                  <span>{readiness.message || "Rest is training too. Today's plan is gentler: follow the recovery videos above."}</span>
                </div>
              ) : form && !readiness ? (
                <div className="kc-quiet kc-quiet-lock">
                  <Icon name="lock" size="xs" />
                  <span>Your table appears here when you finish the check-in.</span>
                </div>
              ) : null}
            </section>
          )}

          {/* ---------------- Mike's notes ---------------- */}
          {(notes.has || notes.atts.length > 0) && <MikeNotes body={notes.has ? notes.body : null} title={step.title} attachments={notes.atts} />}

          {/* ---------------- day footer ---------------- */}
          <DayFooter word={word} slug={program.slug} dayDone={dayDone} levelDone={endKind === "level"} programHref={programHref} prev={prevLesson} next={nextLesson} nextOpen={nextOpen} />
        </main>
      </div>

      {/* phone: the one action in the thumb zone */}
      <div className="kc-bar">{primary(true)}</div>

      {workoutOn && table && <WorkoutMode table={table} onClose={() => setWorkoutOn(false)} onFinished={isDone ? undefined : () => void complete(active, "button")} finishLabel={`Mark ${step.title} complete`} />}

      {workoutDay && (
        <Sheet open={planOpen} onClose={() => setPlanOpen(false)} title={`Session plan · ${dayLabel}`} description={`${[path?.shortName, section.title].filter(Boolean).join(" · ")} · The workout from your KBL program.`} detents={["large"]}>
          <div className="kd-plan">
            {form || table ? (
              <WorkoutTablePanel hasForm={Boolean(form)} readiness={readiness} table={table} />
            ) : (
              <p className="lq-t15">Follow this session&apos;s video and written instructions. No separate workout table is included for this session.</p>
            )}
          </div>
        </Sheet>
      )}

      {showStart && (
        <DayStart onClose={closeStart} name={data.firstName} context={context} intro={letsBeginText(lesson.intro) || lesson.focus || ""} entryLabel={dayLabel} steps={steps.length} minutes={minutes} />
      )}
      {endKind && (
        <DayEnd
          onClose={() => setEndKind(null)}
          name={data.firstName}
          kind={endKind}
          entryLabel={dayLabel}
          dayTitle={dayName}
          steps={steps.length}
          next={next}
          onAction={follow}
          levelNumber={levelNumber}
          certificateHref={endKind === "level" && certificateId ? `/you/certificates/${certificateId}` : null}
          offer={endOffer}
          ctx={endCtx}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

type PlayItem = {
  key: string;
  stepIndex: number;
  clipId: string | null;
  title: string;
  kind: "main" | "demo" | "readiness" | "finish";
  thumb: string | null;
  duration: string | null;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\balt\.?\b/g, "alternating")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function MiniRing({ percent, label, size = 34, tone }: { percent: number; label?: string; size?: number; tone?: "ok" | "warm" | "red" }) {
  const stroke = size > 40 ? 4 : 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <span className="kd-ring" role="img" aria-label={label ? label : `${p}% of today done`} style={{ width: size, height: size }} data-tone={tone}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="kd-ring-track" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} className="kd-ring-arc" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c - (p / 100) * c} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="lq-num" data-big={size > 40 ? "" : undefined}>{label ?? ""}</span>
    </span>
  );
}

/**
 * Today's videos: a column beside the player on desktop, a strip under it on a phone. Every
 * item loads into the one player; now-playing, done ticks, locks, prev/next and autoplay.
 */
function Playlist({
  items, nowKey, nowIndex, completed, steps, open, autoplay, onAutoplay, onPlay, onStep,
}: {
  items: PlayItem[];
  nowKey: string;
  nowIndex: number;
  completed: Set<string>;
  steps: PlayerStep[];
  open: (i: number) => boolean;
  autoplay: boolean;
  onAutoplay: (v: boolean) => void;
  onPlay: (it: PlayItem) => void;
  onStep: (d: -1 | 1) => void;
}) {
  const list = useRef<HTMLOListElement>(null);
  // Keep the playing item in view inside the list (never scrolls the page).
  useEffect(() => {
    const el = list.current;
    const row = el?.querySelector<HTMLElement>("[data-now]");
    if (!el || !row) return;
    const horizontal = el.scrollWidth > el.clientWidth + 4 && getComputedStyle(el).overflowX !== "visible";
    const r = row.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    if (horizontal) {
      if (r.left < box.left || r.right > box.right) el.scrollTo({ left: el.scrollLeft + r.left - box.left - 16, behavior: "smooth" });
    } else if (r.top < box.top || r.bottom > box.bottom) el.scrollTo({ top: el.scrollTop + r.top - box.top - 8, behavior: "smooth" });
  }, [nowKey]);
  const videos = items.filter((it) => it.kind === "main" || it.kind === "demo").length;
  return (
    <aside className="kc-pl" aria-label="Today's videos">
      <div className="kc-pl-in">
        <div className="kc-pl-h">
          <div>
            <b>Today&apos;s videos</b>
            <span className="lq-num">
              {nowIndex + 1} of {items.length} · {videos} videos
            </span>
          </div>
          <div className="kc-pl-a">
            <label className="kc-auto">
              <span>Autoplay</span>
              <Toggle checked={autoplay} label="Autoplay next video" onChange={onAutoplay} />
            </label>
            <button type="button" className="kc-icon kc-icon-sm lq-press" aria-label="Previous video" disabled={nowIndex <= 0} onClick={() => onStep(-1)}>
              <Icon name="back" size="xs" />
            </button>
            <button type="button" className="kc-icon kc-icon-sm lq-press" aria-label="Next video" disabled={nowIndex >= items.length - 1} onClick={() => onStep(1)}>
              <Icon name="chevron" size="xs" />
            </button>
          </div>
        </div>
        <ol className="kc-pl-list" ref={list}>
          {items.map((it) => {
            const s = steps[it.stepIndex]!;
            const done = completed.has(s.id);
            const locked = !open(it.stepIndex);
            const now = it.key === nowKey;
            return (
              <li key={it.key} data-now={now ? "" : undefined} data-kind={it.kind}>
                <button type="button" className="kc-pl-item" aria-current={now ? "true" : undefined} data-locked={locked ? "" : undefined} onClick={() => onPlay(it)}>
                  <span className="kc-pl-th">
                    {it.thumb ? <Image src={it.thumb} alt="" fill sizes="160px" /> : <Icon name={it.kind === "readiness" ? "steps" : it.kind === "finish" ? "flag" : "play"} size="sm" />}
                    {now && <span className="kc-pl-eq" aria-hidden><i /><i /><i /></span>}
                    {it.duration && !now && <span className="kc-pl-dur lq-num">{it.duration}</span>}
                  </span>
                  <span className="kc-pl-t">
                    <span className="kc-pl-k">
                      {it.kind === "demo" ? "Demo" : `Step ${it.stepIndex + 1}`}
                      {now ? " · Playing" : ""}
                    </span>
                    <span className="kc-pl-n">{it.title}</span>
                  </span>
                  <span className="kc-pl-s" aria-hidden>
                    {locked ? <Icon name="lock" size="xs" /> : done && it.kind !== "demo" ? <Icon name="check" size="xs" /> : null}
                  </span>
                  <span className="lq-sr">{locked ? "Locked" : done ? "Done" : ""}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

function DayNav({ prev, next }: { prev: { href: string; label: string } | null; next: { href: string | null; label: string } | null }) {
  return (
    <div className="kc-daynav">
      {prev ? (
        <Link href={prev.href} className="kc-icon lq-press" aria-label={`Previous: ${prev.label}`} title={prev.label}>
          <Icon name="back" size="xs" />
        </Link>
      ) : (
        <span className="kc-icon" aria-hidden data-off="" />
      )}
      {next?.href ? (
        <Link href={next.href} className="kc-icon lq-press" aria-label={`Next: ${next.label}`} title={next.label}>
          <Icon name="chevron" size="xs" />
        </Link>
      ) : (
        <span className="kc-icon" data-off="" title={next ? `${next.label} unlocks when you finish today` : undefined} aria-label={next ? `${next.label} is locked` : undefined}>
          {next ? <Icon name="lock" size="xs" /> : <Icon name="chevron" size="xs" />}
        </span>
      )}
    </div>
  );
}

type MoreItem = { label: string; icon: "clipboard" | "check" | "repeat" | "down" | "grid"; onSelect?: () => void; href?: string };

/** Secondary actions behind ⋯. */
function MoreMenu({ items }: { items: MoreItem[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="kc-more" ref={root}>
      <button type="button" className="kc-icon lq-press" aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon name="more" size="sm" />
      </button>
      {open && (
        <div className="kc-menu" role="menu">
          {items.map((it) =>
            it.href ? (
              <Link key={it.label} href={it.href} role="menuitem" className="kc-menu-i" onClick={() => setOpen(false)}>
                <Icon name={it.icon} size="xs" />
                {it.label}
              </Link>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className="kc-menu-i"
                onClick={() => {
                  setOpen(false);
                  it.onSelect?.();
                }}
              >
                <Icon name={it.icon} size="xs" />
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function DayFooter({
  word, slug, dayDone, levelDone, programHref, prev, next, nextOpen,
}: {
  word: string;
  slug: string;
  dayDone: boolean;
  levelDone: boolean;
  programHref: string;
  prev: LessonPageData["outline"][number] | null;
  next: LessonPageData["outline"][number] | null;
  nextOpen: boolean;
}) {
  return (
    <nav className="kc-foot" aria-label="Days">
      {prev ? (
        <Link href={lessonHref(slug, prev.key, prev.id)} className="kc-foot-c lq-press">
          <span className="kc-eyebrow">Previous</span>
          <b>{lessonLabel(prev, word)}{prev.dayNumber != null && prev.dayType ? ` · ${prev.dayType.replace(/\s+day$/i, "")}` : ""}</b>
        </Link>
      ) : (
        <span />
      )}
      {levelDone ? (
        <Link href={programHref} className="kc-foot-c kc-foot-n lq-press">
          <span className="kc-eyebrow">Level complete</span>
          <b>Certificate and next steps</b>
        </Link>
      ) : next ? (
        nextOpen ? (
          <Link href={lessonHref(slug, next.key, next.id)} className="kc-foot-c kc-foot-n lq-press">
            <span className="kc-eyebrow">{dayDone ? "Up next" : "Next"}</span>
            <b>{lessonLabel(next, word)}{next.dayNumber != null && next.dayType ? ` · ${next.dayType.replace(/\s+day$/i, "")}` : ""}</b>
          </Link>
        ) : (
          <div className="kc-foot-c kc-foot-n" data-locked="">
            <span className="kc-eyebrow">
              <Icon name="lock" size="xs" /> Next
            </span>
            <b>{lessonLabel(next, word)}</b>
            <span className="kc-foot-s">Unlocks when you finish today</span>
          </div>
        )
      ) : (
        <div className="kc-foot-c kc-foot-n">
          <span className="kc-eyebrow">The end</span>
          <b>That&apos;s the whole program. Outstanding.</b>
        </div>
      )}
    </nav>
  );
}

/** Mike's written notes for the step (and its attachments). */
function MikeNotes({ body, title, attachments }: { body: string | null; title: string; attachments: PlayerStep["attachments"] }) {
  return (
    <section className="kc-card kc-notes" aria-label="Mike's notes">
      <p className="kc-notes-h">
        <span className="kc-notes-av" aria-hidden>
          <Image src={MIKE_FACE} alt="" width={28} height={28} />
        </span>
        <b>Mike&apos;s notes</b>
      </p>
      <NotesBody body={body} title={title} />
      {attachments.length > 0 && (
        <div className="kd-atts">
          {attachments.map((a) => (
            <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="kd-att lq-press">
              <Icon name="down" size="xs" />
              {a.title}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

export type { PlayerStep };
