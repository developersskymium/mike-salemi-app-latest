import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, redirect, Link, notFound } from "@tanstack/react-router";
import {
  ArrowRight,
  AudioLines,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardList,
  Lock,
  PartyPopper,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { CHEERS, celebrate, useCheer, useConfetti } from "@/components/celebrate";
import { usePacingNudge } from "@/hooks/use-pacing-nudge";
import { WorkoutTableSheet } from "@/components/workout-table";
import { LessonNotes } from "@/components/lesson-notes";
import { recommendNext } from "@/lib/whats-next";
import { useDayState } from "@/hooks/use-day-state";
import { AutoAdvanceOverlay, AutoAdvanceToggle, useAutoAdvance } from "@/components/auto-advance";
import { ReadinessAssessment, WorkoutCircuitPanel, useDayReadiness } from "@/components/readiness";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isWorkoutDay } from "@/content/workout-table";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import {
  dayLabel,
  courseDays,
  findDay,
  nextDay,
  previousDay,
  type DayLocation,
  type Lesson,
} from "@/content/program";
import { summarise, useProgress, useSetLessonProgress } from "@/hooks/use-progress";
import { useSession } from "@/hooks/use-session";
import { useStructureOverlay } from "@/hooks/use-structure-overlay";
import { cn } from "@/lib/utils";
import { idHue, vimeoEmbed } from "@/lib/vimeo";
import { useVimeoMeta } from "@/hooks/use-vimeo-meta";
import { formatVimeoDuration } from "@/lib/vimeo-meta";
import { ResumePill, useVimeoResume } from "@/components/VimeoPlayer";
import { getOnboardingStatus } from "@/lib/onboarding.functions";
import { DayCompleteScreen, DayStartScreen, useDayGate } from "@/components/day-gates";

export const Route = createFileRoute("/_authenticated/immersion/day/$dayId")({
  beforeLoad: async () => {
    const status = await getOnboardingStatus();
    if (!status.completed) throw redirect({ to: "/onboarding" });
    return { programLevel: status.level };
  },
  loader: ({ params }) => {
    const location = findDay(params.dayId);
    if (!location) throw notFound();
    return { title: location.day.title, intro: location.day.intro };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Unavailable — Mike Salemi App" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `${loaderData.title} — Mike Salemi App` },
        { name: "description", content: loaderData.intro },
        { property: "og:title", content: `${loaderData.title} — Mike Salemi App` },
        { property: "og:description", content: loaderData.intro },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DayRoute,
});

function DayRoute() {
  const { dayId } = Route.useParams();
  const location = findDay(dayId);
  const { user } = useSession();
  const { data, isLoading } = useProgress(Boolean(user));
  const s = summarise(data);
  if (!location) return null;
  // Immersion is strictly linear — you can't skip ahead to a future day.
  if (!isLoading && !s.dayUnlocked(dayId))
    return (
      <LockedDay
        location={location}
        current={courseDays(location.course.id).find(
          (entry) => !s.dayCompletion(entry.day.id).complete,
        )}
      />
    );
  return <DayStage key={dayId} location={location} />;
}

function LockedDay({ location, current }: { location: DayLocation; current?: DayLocation }) {
  const { day, phase, course } = location;
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-muted-foreground">
        <Lock className="h-6 w-6" />
      </span>
      <p className="eyebrow mt-5 text-muted-foreground">
        {course.title} · {phase.label}
      </p>
      <h1 className="display mt-1.5 text-2xl">{dayLabel(day)} is locked</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Immersion runs in order. Finish the days before this one and it opens automatically. Want to
        roam freely? Self-Guided has every day unlocked.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {current && (
          <Link
            to="/immersion/day/$dayId"
            params={{ dayId: current.day.id }}
            className="pressable rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Go to {dayLabel(current.day)}
          </Link>
        )}
        <Link
          to="/self-guided/day/$dayId"
          params={{ dayId: day.id }}
          className="pressable rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold"
        >
          Open in Self-Guided
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Full-page, forced-linear day experience                             */
/* ------------------------------------------------------------------ */

function DayStage({ location }: { location: DayLocation }) {
  const { day, course, phase } = location;
  const { user } = useSession();
  const { data } = useProgress(Boolean(user));
  const s = summarise(data);
  const setProgress = useSetLessonProgress();
  const { burst, ConfettiLayer } = useConfetti();
  const { cheer, Cheer } = useCheer();
  const { recordDayComplete } = usePacingNudge();
  const [planOpen, setPlanOpen] = useState(false);
  const workoutDay = isWorkoutDay(day.type);
  // Lessons authored in the Structure editor override the shipped titles/flags.
  const { lessonsFor } = useStructureOverlay(Boolean(user));
  const lessons = lessonsFor(day);

  /* Start / end of day screens ---------------------------------- */
  const startGate = useDayGate("start", day.id);
  const endGate = useDayGate("end", day.id);
  const firstName = (() => {
    const meta = (user?.user_metadata ?? {}) as { display_name?: string; full_name?: string };
    const raw = meta.display_name || meta.full_name || "";
    return raw.trim().split(/\s+/)[0] || undefined;
  })();
  const dayMinutes = lessons.reduce(
    (total, l) => total + (parseInt(String(l.duration ?? ""), 10) || 0),
    0,
  );

  const done = useCallback((lessonId: string) => s.isLessonDone(day.id, lessonId), [s, day.id]);

  /**
   * The assessment lives in the database, so a day answered on one device
   * shows as completed on the next one — the step is reconciled into Immersion
   * progress as soon as a saved assessment is found.
   */
  const dayReadiness = useDayReadiness(day.id, Boolean(user) && workoutDay);
  const readinessLessonId = lessons.find((l) => l.special === "readiness")?.id;
  const readinessSynced = useRef(false);
  useEffect(() => {
    if (!readinessLessonId || readinessSynced.current) return;
    if (!dayReadiness.complete || done(readinessLessonId)) return;
    readinessSynced.current = true;
    setProgress.mutate({
      phaseId: phase.id,
      dayId: day.id,
      lessonId: readinessLessonId,
      completed: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayReadiness.complete, readinessLessonId, day.id]);

  /** Forced linear: a lesson unlocks only once the one before it is complete. */
  const unlockedThrough = useMemo(() => {
    let i = 0;
    while (i < lessons.length && done(lessons[i].id)) i += 1;
    return i; // index of the first incomplete lesson = furthest unlocked
  }, [lessons, done]);

  const [activeIndex, setActiveIndex] = useState(0);
  const bootstrapped = useRef(false);
  // Playback waits until we know whether the start-of-day screen is coming up.
  const [startGateChecked, setStartGateChecked] = useState(false);
  // Autosaved position for this day, shared across the user's devices.
  const dayState = useDayState(course.id, day.id, Boolean(user));

  // Land the user on their saved step the first time progress resolves.
  useEffect(() => {
    if (bootstrapped.current || !data || dayState.isLoading) return;
    bootstrapped.current = true;
    const savedIndex = dayState.activeLessonId
      ? lessons.findIndex((l) => l.id === dayState.activeLessonId)
      : -1;
    const fallback = Math.min(unlockedThrough, lessons.length - 1);
    setActiveIndex(savedIndex >= 0 ? Math.min(savedIndex, fallback) : fallback);
    if (unlockedThrough === 0) startGate.show();
    setStartGateChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dayState.isLoading, unlockedThrough, lessons.length]);

  // Every step change is written back, debounced.
  useEffect(() => {
    if (!bootstrapped.current) return;
    const lesson = lessons[Math.min(activeIndex, lessons.length - 1)];
    if (lesson) dayState.autosave({ activeLessonId: lesson.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, lessons.length]);

  const active: Lesson = lessons[Math.min(activeIndex, lessons.length - 1)];
  // A lesson can carry extra demo clips; playing one temporarily swaps the stage.
  const [clip, setClip] = useState<{ title: string; vimeoId: string } | null>(null);
  useEffect(() => setClip(null), [active?.id]);
  useEffect(() => {
    // Undoing an earlier step must also return playback to the unlocked step.
    if (bootstrapped.current && activeIndex > unlockedThrough) {
      setActiveIndex(unlockedThrough);
      setClip(null);
    }
  }, [activeIndex, unlockedThrough]);
  const stageVideoId = clip?.vimeoId ?? active?.vimeoId ?? "";
  const stageFrameRef = useRef<HTMLIFrameElement | null>(null);
  const stageWrapRef = useRef<HTMLDivElement | null>(null);
  const stageColumnRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    stageColumnRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [active?.id, clip?.vimeoId]);
  // Watching the video to the end completes the lesson for you — the button
  // stays for people who skim, but nobody gets stuck on a finished video.
  // When a demo clip finishes we auto-advance to the next clip instead, and
  // hand the stage back to the lesson video after the last one.
  const autoCompleteRef = useRef<() => void>(() => {});
  const clipEndedRef = useRef<() => void>(() => {});
  const stageResume = useVimeoResume(
    stageFrameRef,
    clip ? `${active?.id}-${clip.vimeoId}` : active?.id,
    stageVideoId,
    {
      onWatched: () => {
        if (clip) clipEndedRef.current();
        else autoCompleteRef.current();
      },
    },
  );

  /* Readiness assessment popup -------------------------------------- */
  // The assessment never opens by itself when a day is simply reopened: it is
  // requested by moving into the readiness step ("Start assessment"), and stays
  // reachable from the button under the video.
  const [readinessOpen, setReadinessOpen] = useState(false);
  const [readinessRequested, setReadinessRequested] = useState(false);
  const isReadinessStep = active?.special === "readiness";

  // Only after the start-of-day screen is out of the way, so the two popups
  // never stack on top of each other.
  useEffect(() => {
    if (!readinessRequested) return;
    if (!isReadinessStep || dayReadiness.isLoading || startGate.open) return;
    setReadinessRequested(false);
    if (!dayReadiness.complete) setReadinessOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    readinessRequested,
    isReadinessStep,
    startGate.open,
    dayReadiness.isLoading,
    dayReadiness.complete,
  ]);

  useEffect(() => {
    if (!isReadinessStep) setReadinessOpen(false);
  }, [isReadinessStep]);

  // Pause the video underneath while the form is up, resume on the same frame.
  useEffect(() => {
    if (readinessOpen) stageResume.pausePlayback();
    else stageResume.resumePlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readinessOpen]);

  const nextLesson = lessons[Math.min(activeIndex, lessons.length - 1) + 1];
  const nextIsReadiness = nextLesson?.special === "readiness";

  /** Move to a step; landing on the readiness step opens its form. */
  const stepTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(i, lessons.length - 1));
      if (lessons[clamped]?.special === "readiness") setReadinessRequested(true);
      setActiveIndex(clamped);
    },
    [lessons],
  );

  /**
   * Auto-play-next. The countdown is drawn over the player and, if Vimeo put
   * its own iframe into full screen, the wrapper is promoted to the fullscreen
   * element first so the athlete still sees the timer.
   */
  const autoAdvance = useAutoAdvance({
    onAdvance: () => stepTo(activeIndex + 1),

    onCountdownStart: () => {
      const wrap = stageWrapRef.current;
      const current = document.fullscreenElement;
      if (!wrap || !current || current === wrap) return;
      void Promise.resolve(document.exitFullscreen?.())
        .then(() => wrap.requestFullscreen?.())
        .catch(() => {});
    },
  });
  useEffect(() => autoAdvance.cancel(), [active?.id]);

  const clips = active?.associatedVideos ?? [];
  const clipIndex = clip ? clips.findIndex((c) => c.vimeoId === clip.vimeoId) : -1;
  clipEndedRef.current = () => {
    const next = clips[clipIndex + 1];
    setClip(next ? { title: next.title, vimeoId: next.vimeoId } : null);
  };

  const isUnlocked = (i: number) => i <= unlockedThrough || done(lessons[i]?.id ?? "");
  const activeDone = active ? done(active.id) : false;

  const completion = s.dayCompletion(day.id);
  const percent = completion.total ? Math.round((completion.done / completion.total) * 100) : 0;
  const dayComplete = completion.total > 0 && completion.done === completion.total;
  const phaseDone = dayComplete && s.phaseCompletion(phase.id).complete;
  const levelDone = dayComplete && s.courseCompletion(course.id).complete;
  const prevDayLoc = previousDay(day.id);
  const nextDayLoc = nextDay(day.id);
  /** End-of-day guidance: where to go next, coloured by today's readiness result. */
  const trainingDaysLeftInPhase = phase.days.filter(
    (entry) => !entry.pageType && entry.id !== day.id && !s.dayCompletion(entry.id).complete,
  ).length;
  const whatsNext = recommendNext({
    next: nextDayLoc,
    band: dayReadiness.result?.band.id ?? null,
    daysLeftInPhase: trainingDaysLeftInPhase,
  });
  const pendingId = setProgress.isPending ? setProgress.variables?.lessonId : undefined;

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= lessons.length || !isUnlocked(i)) return;
      stepTo(i);
    },
    [lessons.length, unlockedThrough, stepTo],
  );

  function toggle(
    lesson: Lesson,
    index: number,
    completed: boolean,
    event?: { clientX: number; clientY: number },
    /** Finishing by watching hands the move-on to the countdown instead of jumping instantly. */
    options?: { deferAdvance?: boolean },
  ) {
    if (!isUnlocked(index)) return;
    setProgress.mutate({ phaseId: phase.id, dayId: day.id, lessonId: lesson.id, completed });

    if (!completed) return;
    const isLast = completion.done + 1 >= completion.total;
    burst({
      count: isLast ? 60 : 22,
      origin: event ? { x: event.clientX, y: event.clientY } : undefined,
    });
    cheer(isLast ? "Day complete." : CHEERS[index % CHEERS.length]);

    if (isLast) {
      if (!day.pageType) recordDayComplete();
      const phaseLeft = s.phaseCompletion(phase.id).total - s.phaseCompletion(phase.id).done;
      if (phaseLeft > 1) {
        window.setTimeout(() => endGate.show(), 700);
      }
      if (phaseLeft <= 1) {
        const courseLeft = courseDays(course.id).filter(
          (entry) => !s.dayCompletion(entry.day.id).complete,
        ).length;
        if (courseLeft <= 1) {
          celebrate({
            id: `level-${course.id}`,
            eyebrow: "Level complete",
            title: `${course.title} is done`,
            body: "Every phase, every day, every lesson. Your certificate is ready to claim.",
            action: {
              label: "Get your certificate",
              to: "/certificate/$courseId",
              params: { courseId: course.id },
            },
          });
        }
      }
    }
    if ("vibrate" in navigator) navigator.vibrate?.(isLast ? [12, 40, 18] : 10);
    if (isLast) return;
    if (options?.deferAdvance) autoAdvance.start();
    else window.setTimeout(() => stepTo(index + 1), 260);
  }

  autoCompleteRef.current = () => {
    if (!active) return;
    if (activeDone) {
      autoAdvance.start();
      return;
    }
    toggle(active, activeIndex, true, undefined, { deferAdvance: true });
  };

  // Keyboard: ← → move between unlocked lessons, C completes the current one.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA", "IFRAME"].includes(el.tagName)) return;
      if (e.key === "ArrowRight") goTo(activeIndex + 1);
      else if (e.key === "ArrowLeft") goTo(activeIndex - 1);
      else if (e.key.toLowerCase() === "c" && active) toggle(active, activeIndex, !activeDone);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!active) return null;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <Cheer />
      <ConfettiLayer />
      <DayStartScreen
        open={startGate.open}
        onClose={startGate.dismiss}
        dayNumber={day.number}
        entryLabel={dayLabel(day)}
        dayTitle={day.title}
        intro={letsBeginText(day.letsBegin?.html) || day.intro}
        context={`${course.level} · ${phase.name} · ${dayLabel(day)}`}
        lessonCount={lessons.length}
        minutes={dayMinutes || undefined}
        name={firstName}
      />
      <DayCompleteScreen
        open={endGate.open}
        onClose={endGate.dismiss}
        dayNumber={day.number}
        entryLabel={dayLabel(day)}
        dayTitle={day.title}
        name={firstName}
        lessonCount={lessons.length}
        nextDay={
          nextDayLoc
            ? {
                id: nextDayLoc.day.id,
                number: nextDayLoc.day.number,
                label: dayLabel(nextDayLoc.day),
              }
            : null
        }
        recommendation={whatsNext}
      />
      {workoutDay && (
        <WorkoutTableSheet location={location} open={planOpen} onClose={() => setPlanOpen(false)} />
      )}

      {/* ---------------- top bar ---------------- */}
      <header className="relative z-20 shrink-0 border-b border-hairline bg-surface/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-5">
          <Link
            to="/immersion/$courseSlug"
            params={{ courseSlug: course.slug }}
            aria-label="Exit day"
            className="tap grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hairline text-muted-foreground hover:border-primary hover:text-primary"
          >
            <X className="h-4 w-4" />
          </Link>

          <div className="min-w-0">
            <p className="eyebrow truncate text-[0.5625rem] text-primary">
              {course.level} · {phase.name} · {dayLabel(day)}
            </p>
            <h1 className="truncate text-[0.9375rem] font-semibold leading-tight text-foreground">
              {day.title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div
              className="hidden items-center gap-1.5 md:flex"
              role="tablist"
              aria-label="Lessons in this day"
            >
              {lessons.map((l, i) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => goTo(i)}
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Lesson ${i + 1}: ${l.title}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500 [transition-timing-function:var(--ease-spring)]",
                    done(l.id)
                      ? "w-7 bg-success"
                      : i === activeIndex
                        ? "w-7 bg-primary"
                        : "w-3 bg-border",
                    !isUnlocked(i) && "opacity-40",
                  )}
                />
              ))}
            </div>
            <AutoAdvanceToggle enabled={autoAdvance.enabled} onChange={autoAdvance.setEnabled} />
            {workoutDay && (
              <button
                type="button"
                onClick={() => setPlanOpen(true)}
                className="tap inline-flex min-h-9 items-center gap-1.5 rounded-full border border-hairline px-3 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Session plan</span>
              </button>
            )}
            <span className="numeric hidden text-xs font-semibold text-muted-foreground sm:inline">
              {completion.done}/{completion.total}
            </span>
            <MiniRing percent={percent} />
          </div>
        </div>
      </header>

      {/* ---------------- body ---------------- */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_21.5rem]">
        {/* stage column */}
        <div ref={stageColumnRef} className="flex min-h-0 flex-col overflow-y-auto">
          {/*
            Every sub-lesson keeps its video. The Training Readiness Assessment
            plays its briefing video and carries the form underneath it, and the
            workout step keeps its video above the table further down.
          */}
          {stageVideoId ? (
            <div className="relative w-full shrink-0 bg-black">
              <div ref={stageWrapRef} className="relative aspect-video w-full">
                {startGateChecked && !startGate.open ? (
                  <iframe
                    key={`${active.id}-${stageVideoId}`}
                    ref={stageFrameRef}
                    // Playback only starts once the start-of-day screen is closed, so
                    // the video never runs underneath a popup.
                    src={vimeoEmbed(stageVideoId, true)}
                    title={clip?.title ?? active.title}
                    className="h-full w-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-black">
                    <Spinner className="h-5 w-5 text-white/70" />
                  </div>
                )}

                {stageResume.show && autoAdvance.remaining === null && (
                  <ResumePill
                    seconds={stageResume.resumeAt}
                    onResume={stageResume.seek}
                    onDismiss={stageResume.dismiss}
                  />
                )}

                {autoAdvance.remaining !== null && nextLesson && (
                  <AutoAdvanceOverlay
                    remaining={autoAdvance.remaining}
                    total={autoAdvance.total}
                    title={nextLesson.title}
                    onCancel={autoAdvance.cancel}
                    onNow={autoAdvance.advanceNow}
                  />
                )}
              </div>
            </div>
          ) : null}

          {isReadinessStep && (
            <div className="shrink-0 border-b border-hairline bg-surface/40 px-4 py-4 sm:px-6">
              <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {dayReadiness.complete
                    ? "Your readiness answers are saved — today's table is built from them."
                    : "Answer five quick questions to build today's workout table."}
                </p>
                <button
                  type="button"
                  onClick={() => setReadinessOpen(true)}
                  className={cn(buttonStyles.primary, "px-4 py-2.5 text-sm")}
                >
                  <ClipboardList className="h-4 w-4" />
                  {dayReadiness.complete ? "Review assessment" : "Start assessment"}
                </button>
              </div>
            </div>
          )}

          <Dialog open={readinessOpen} onOpenChange={setReadinessOpen}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Training Readiness Assessment</DialogTitle>
                <DialogDescription>
                  Five honest questions about how you woke up today. Your answers set the workout
                  table for this session.
                </DialogDescription>
              </DialogHeader>
              <ReadinessAssessment
                location={location}
                lessonId={active.id}
                onSaved={() => {
                  if (!done(active.id)) {
                    setProgress.mutate({
                      phaseId: phase.id,
                      dayId: day.id,
                      lessonId: active.id,
                      completed: true,
                    });
                  }
                  window.setTimeout(() => setReadinessOpen(false), 700);
                }}
              />
            </DialogContent>
          </Dialog>

          {/* lesson meta + linear controls */}
          <div className="shrink-0 border-t border-hairline bg-surface/60 px-4 py-3 sm:px-5">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="eyebrow text-[0.5625rem] text-primary">
                  Step {activeIndex + 1} of {lessons.length}
                  {active.duration ? ` · ${active.duration}` : ""}
                </p>
                <h2
                  key={active.id}
                  className="animate-blur-in mt-1 truncate text-base font-semibold text-foreground sm:text-lg"
                >
                  {active.title}
                </h2>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
                  {active.description}
                </p>
              </div>

              <div className="hidden items-center gap-2 lg:flex">
                <StepButton
                  dir="prev"
                  disabled={activeIndex === 0}
                  onClick={() => goTo(activeIndex - 1)}
                />
                <button
                  type="button"
                  onClick={(e) =>
                    nextIsReadiness && activeDone
                      ? goTo(activeIndex + 1)
                      : toggle(active, activeIndex, !activeDone, {
                          clientX: e.clientX,
                          clientY: e.clientY,
                        })
                  }
                  disabled={pendingId === active.id}
                  className={cn(
                    activeDone && !nextIsReadiness ? buttonStyles.outline : buttonStyles.primary,
                    "flex-1 px-4 py-2.5 text-sm transition-transform duration-200 [transition-timing-function:var(--ease-spring)] active:scale-[0.97] sm:flex-none",
                  )}
                >
                  {pendingId === active.id ? (
                    <Spinner className="h-4 w-4" />
                  ) : nextIsReadiness ? (
                    <ClipboardList className="h-4 w-4" />
                  ) : (
                    <Check
                      className={cn(
                        "h-4 w-4 transition-transform duration-300",
                        activeDone && "scale-110",
                      )}
                      strokeWidth={3}
                    />
                  )}
                  {nextIsReadiness
                    ? "Start assessment"
                    : activeDone
                      ? "Completed"
                      : "Mark complete"}
                </button>

                <StepButton
                  dir="next"
                  disabled={activeIndex >= lessons.length - 1 || !isUnlocked(activeIndex + 1)}
                  onClick={() => goTo(activeIndex + 1)}
                />
              </div>
            </div>
          </div>

          <LessonDetails lesson={active} clipId={clip?.vimeoId} onPlayClip={setClip} />

          {active.special === "completion" && (
            <div className="animate-step-in border-t border-hairline px-4 py-8 text-center sm:px-6">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
              <p className="mt-3 text-lg font-semibold text-foreground">
                {active.notes || "You've Crushed Another Day"}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Mark this step finished to complete today.
              </p>
            </div>
          )}

          {active.special === "workout" && (
            <div className="animate-step-in border-t border-hairline px-4 py-6 sm:px-6">
              <div className="mx-auto w-full max-w-3xl">
                <p className="eyebrow text-primary">Today's workout table</p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {readinessLessonId
                    ? "Built from the Training Readiness Assessment you completed at the start of today."
                    : "Today's starter table from the program."}
                </p>
                <div className="mt-4">
                  <WorkoutCircuitPanel
                    location={location}
                    lesson={active}
                    onGoToAssessment={() => {
                      const i = lessons.findIndex((l) => l.special === "readiness");
                      if (i >= 0) goTo(i);
                      setReadinessOpen(true);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* mobile lesson rail */}
          <div className="border-t border-hairline pb-[8.5rem] lg:hidden">
            <LessonList
              lessons={lessons}
              activeIndex={activeIndex}
              isUnlocked={isUnlocked}
              done={done}
              pendingId={pendingId}
              onSelect={goTo}
              onToggle={toggle}
            />
            <DayFooter dayComplete={dayComplete} prev={prevDayLoc} next={nextDayLoc} />
          </div>
        </div>

        {/* desktop rail */}
        <aside className="hidden min-h-0 flex-col border-l border-hairline bg-surface/40 lg:flex">
          <div className="shrink-0 border-b border-hairline px-4 py-3">
            <p className="eyebrow text-[0.5625rem] text-primary">Today's sequence</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete each step to unlock the next.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <LessonList
              lessons={lessons}
              activeIndex={activeIndex}
              isUnlocked={isUnlocked}
              done={done}
              pendingId={pendingId}
              onSelect={goTo}
              onToggle={toggle}
            />
          </div>
          <DayFooter dayComplete={dayComplete} prev={prevDayLoc} next={nextDayLoc} />
        </aside>
      </div>

      {/* Sticky thumb-zone actions — mobile only */}
      <MobileActionBar
        activeDone={activeDone}
        pending={pendingId === active.id}
        nextIsReadiness={nextIsReadiness}
        onToggle={(e) =>
          nextIsReadiness && activeDone
            ? goTo(activeIndex + 1)
            : toggle(active, activeIndex, !activeDone, { clientX: e.clientX, clientY: e.clientY })
        }
        dayComplete={dayComplete}
        next={nextDayLoc}
      />
    </div>
  );
}

/**
 * Fixed bottom bar so the two actions that matter — finish this step, move to
 * the next day — sit inside thumb reach on a phone.
 */
/** Source "Let's Begin" text (minus its "It's a new day" heading, already shown by the start screen). */
function letsBeginText(html?: string) {
  if (!html) return "";
  const body = html
    .replace(/<h2[\s\S]*?<\/h2>/i, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return body ? body.charAt(0) + body.slice(1).toLowerCase() : "";
}

function MobileActionBar({
  activeDone,
  pending,
  nextIsReadiness = false,
  onToggle,
  dayComplete,
  next,
}: {
  activeDone: boolean;
  pending: boolean;
  nextIsReadiness?: boolean;
  onToggle: (e: { clientX: number; clientY: number }) => void;
  dayComplete: boolean;
  next?: DayLocation;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => onToggle({ clientX: e.clientX, clientY: e.clientY })}
          disabled={pending}
          className={cn(
            activeDone && !nextIsReadiness ? buttonStyles.outline : buttonStyles.primary,
            "min-h-[3.25rem] flex-1 px-4 text-[0.9375rem] transition-transform duration-200 active:scale-[0.97]",
          )}
        >
          {pending ? (
            <Spinner className="h-4 w-4" />
          ) : nextIsReadiness ? (
            <ClipboardList className="h-4 w-4" />
          ) : (
            <Check
              className={cn("h-4 w-4 transition-transform duration-300", activeDone && "scale-110")}
              strokeWidth={3}
            />
          )}
          {nextIsReadiness ? "Start assessment" : activeDone ? "Completed" : "Mark complete"}
        </button>

        {next &&
          (dayComplete ? (
            <Link
              to="/immersion/day/$dayId"
              params={{ dayId: next.day.id }}
              className="tap inline-flex min-h-[3.25rem] shrink-0 items-center gap-2 rounded-xl border-2 border-dashed border-success/70 bg-success/10 px-4 text-[0.9375rem] font-semibold text-success active:scale-[0.97]"
            >
              {dayLabel(next.day)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <span
              aria-disabled
              className="inline-flex min-h-[3.25rem] shrink-0 items-center gap-2 rounded-xl border-2 border-dashed border-hairline px-4 text-[0.9375rem] font-semibold text-muted-foreground opacity-60"
            >
              <Lock className="h-3.5 w-3.5" />
              {dayLabel(next.day)}
            </span>
          ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Notes, embedded plan markers and extra demo clips for the active lesson. */
function LessonDetails({
  lesson,
  clipId,
  onPlayClip,
}: {
  lesson: Lesson;
  clipId?: string;
  onPlayClip: (clip: { title: string; vimeoId: string } | null) => void;
}) {
  const hasNotes = Boolean(lesson.notes || lesson.images?.length || lesson.links?.length);
  const clips = lesson.associatedVideos ?? [];
  if (!hasNotes && !clips.length) return null;

  return (
    <div
      key={lesson.id}
      className="animate-blur-in shrink-0 border-t border-hairline bg-background px-4 py-4 sm:px-5"
    >
      <LessonNotes lesson={lesson} />

      {clips.length > 0 && (
        <div className={cn(hasNotes && "mt-4 border-t border-hairline pt-3")}>
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow text-[0.5625rem] text-muted-foreground">
              In this lesson · {clips.length} clip{clips.length === 1 ? "" : "s"}
            </p>
            {clipId ? (
              <button
                type="button"
                onClick={() => onPlayClip(null)}
                className="tap inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-[0.6875rem] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
              >
                <RotateCcw className="h-3 w-3" />
                Back to lesson
              </button>
            ) : (
              <span className="text-[0.6875rem] text-muted-foreground">
                Plays through automatically
              </span>
            )}
          </div>

          <div className="no-scrollbar mt-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1">
            {clips.map((clip, i) => (
              <ClipCard
                key={clip.vimeoId}
                index={i}
                title={clip.title}
                vimeoId={clip.vimeoId}
                active={clipId === clip.vimeoId}
                onPlay={() => onPlayClip(clip)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Poster-led clip tile — thumbnail, index and a playing state. */
function ClipCard({
  index,
  title,
  vimeoId,
  active,
  onPlay,
}: {
  index: number;
  title: string;
  vimeoId: string;
  active: boolean;
  onPlay: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [failed, setFailed] = useState(false);
  const meta = useVimeoMeta([vimeoId]);
  const poster = meta?.thumbnail ?? "";

  useEffect(() => {
    if (active)
      ref.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onPlay}
      aria-current={active}
      className={cn(
        "tap group w-40 shrink-0 snap-start text-left transition-transform duration-300 [transition-timing-function:var(--ease-spring)] active:scale-[0.97] sm:w-44",
      )}
    >
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-xl border bg-muted transition-colors duration-300",
          active ? "border-primary" : "border-hairline group-hover:border-primary/50",
        )}
      >
        {!failed && poster ? (
          <img
            key={poster}
            src={poster}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-[1.04]",
              active && "scale-[1.04]",
            )}
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, hsl(${idHue(vimeoId)} 40% 32%), hsl(${(idHue(vimeoId) + 40) % 360} 40% 18%))`,
            }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <span className="absolute left-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-md bg-black/55 px-1 text-[0.625rem] font-semibold text-white backdrop-blur-sm">
          {index + 1}
        </span>

        {meta?.duration ? (
          <span className="numeric absolute right-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white backdrop-blur-sm">
            {formatVimeoDuration(meta.duration)}
          </span>
        ) : null}

        <span
          className={cn(
            "absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full transition-all duration-300 [transition-timing-function:var(--ease-spring)]",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-white/90 text-black group-hover:scale-110",
          )}
        >
          {active ? (
            <AudioLines className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 translate-x-[1px] fill-current" />
          )}
        </span>
      </div>

      <p
        className={cn(
          "mt-1.5 line-clamp-2 text-xs font-medium leading-snug transition-colors duration-200",
          active ? "text-primary" : "text-foreground",
        )}
      >
        {title}
      </p>
    </button>
  );
}

function StepButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous step" : "Next step"}
      className="tap grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-hairline text-muted-foreground transition-all duration-200 [transition-timing-function:var(--ease-spring)] hover:border-primary hover:text-primary active:scale-90 disabled:pointer-events-none disabled:opacity-35"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function MiniRing({ percent }: { percent: number }) {
  const size = 34;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={clamped === 100 ? "stroke-success" : "stroke-primary"}
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          style={{ transition: "stroke-dashoffset 700ms var(--ease-spring)" }}
        />
      </svg>
      <span className="numeric absolute inset-0 grid place-content-center text-[0.5625rem] font-semibold text-foreground">
        {clamped}
      </span>
    </div>
  );
}

function LessonList({
  lessons,
  activeIndex,
  isUnlocked,
  done,
  pendingId,
  onSelect,
  onToggle,
}: {
  lessons: Lesson[];
  activeIndex: number;
  isUnlocked: (i: number) => boolean;
  done: (id: string) => boolean;
  pendingId?: string;
  onSelect: (i: number) => void;
  onToggle: (
    lesson: Lesson,
    i: number,
    completed: boolean,
    e?: { clientX: number; clientY: number },
  ) => void;
}) {
  return (
    <ol className="divide-y divide-[color:var(--hairline)]">
      {lessons.map((lesson, i) => {
        const isDone = done(lesson.id);
        const unlocked = isUnlocked(i);
        const isActive = i === activeIndex;
        return (
          <li key={lesson.id} className="relative">
            <button
              type="button"
              onClick={() => onSelect(i)}
              disabled={!unlocked}
              className={cn(
                "grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 pr-13 text-left transition-colors duration-200",
                isActive ? "bg-elevated" : unlocked ? "hover:bg-secondary/60" : "opacity-45",
                !unlocked && "cursor-not-allowed",
              )}
            >
              {isActive && (
                <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden />
              )}
              <span
                className={cn(
                  "numeric grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.6875rem] font-semibold transition-all duration-300 [transition-timing-function:var(--ease-spring)]",
                  isDone
                    ? "bg-success text-success-foreground"
                    : isActive
                      ? "scale-105 bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : unlocked ? (
                  i + 1
                ) : (
                  <Lock className="h-3 w-3" />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-sm font-semibold",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {lesson.title}
                </span>
                {lesson.duration && (
                  <span className="numeric mt-0.5 flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
                    <Clock className="h-3 w-3" /> {lesson.duration}
                  </span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) =>
                onToggle(lesson, i, !isDone, { clientX: e.clientX, clientY: e.clientY })
              }
              disabled={!unlocked || pendingId === lesson.id}
              aria-label={
                isDone ? `Mark ${lesson.title} not done` : `Mark ${lesson.title} complete`
              }
              className={cn(
                "tap absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border transition-all duration-200 [transition-timing-function:var(--ease-spring)] active:scale-90 disabled:opacity-40",
                isDone
                  ? "border-success/50 bg-success/10 text-success"
                  : "border-hairline text-muted-foreground hover:border-primary hover:text-primary",
              )}
            >
              {pendingId === lesson.id ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function DayFooter({
  dayComplete,
  phaseDone,
  levelDone,
  phaseLabel,
  course,
  prev,
  next,
}: {
  dayComplete: boolean;
  phaseDone?: boolean;
  levelDone?: boolean;
  phaseLabel?: string;
  course?: { id: string; level: string; title: string; slug: string };
  prev?: DayLocation;
  next?: DayLocation;
}) {
  return (
    <div className="shrink-0 border-t border-hairline bg-surface/70 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {dayComplete ? (
        <div className="animate-pop">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <PartyPopper className="h-4 w-4" />
            {levelDone ? `${course?.level ?? "Level"} complete` : "Day complete"}
          </p>
          {levelDone ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Claim your certificate, then move up a level or restart this one from day one.
            </p>
          ) : null}

          {levelDone && course && (
            <Link
              to="/immersion/$courseSlug"
              params={{ courseSlug: course.slug }}
              className={cn(buttonStyles.primary, "mt-2 w-full px-4 py-2.5 text-sm")}
            >
              Certificate and next steps <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {next ? (
            <Link
              to="/immersion/day/$dayId"
              params={{ dayId: next.day.id }}
              className={cn(buttonStyles.primary, "mt-2 w-full px-4 py-2.5 text-sm")}
            >
              Start {dayLabel(next.day)} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              That's the end of the program. Outstanding.
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="eyebrow text-[0.5625rem] text-muted-foreground">Next day locked</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" />
            Finish every step to unlock {next ? `${dayLabel(next.day)}` : "the finish line"}.
          </p>
        </>
      )}
      {prev && (
        <Link
          to="/immersion/day/$dayId"
          params={{ dayId: prev.day.id }}
          className="tap mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to {dayLabel(prev.day)}
        </Link>
      )}
    </div>
  );
}
