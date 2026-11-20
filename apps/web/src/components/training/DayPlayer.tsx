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
import { summitPoster } from "./model";
import { UpNext, VideoStage } from "./VideoStage";
import { ClipCards } from "./ClipRow";
import { bandSummary, ReadinessAssessment, WorkoutTablePanel, type Readiness } from "./Readiness";
import { circuitsOf, circuitWord, estimateMinutes } from "./workout";
import { MIKE_FACE } from "@/lib/program-photos";
import { DayEnd, DayStart, useSeenOnce } from "./DayGates";
import { Cheer, useCheer, useConfetti } from "./Celebrate";
import { SessionAutoStart } from "@/components/selfguided/SessionAutoStart";
import "./training.css";
import "./day.css";
import "./day-summit.css";

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
  const stageCol = useRef<HTMLDivElement>(null);
  const readyRef = useRef<HTMLElement>(null);

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
      stageCol.current?.scrollTo({ top: 0, behavior: "smooth" });
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
    if (readinessIdx >= 0 && readinessIdx !== active) go(readinessIdx, { auto: false });
    window.setTimeout(() => readyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), readinessIdx === active ? 0 : 420);
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
  const context = [path?.shortName, section.title, dayLabel].filter(Boolean).join(" · ");
  const minutes = minutesOf(steps.map((s) => s.durationLabel));
  const levelNumber = ROMAN[(path?.shortName ?? "").replace(/^level\s*/i, "")] ?? undefined;
  const isDone = completed.has(step.id);
  const nextIsReadiness = steps[active + 1]?.special === "readiness";
  const clips = playlist.queue;

  /* ---------------------------------------------------------------- Summit day parts */
  const circuits = table ? circuitsOf(table) : [];
  const bandWord = readiness ? (readiness.band === "green" ? "Sharp" : readiness.band === "amber" ? "Steady" : "Low") : null;
  const stageChips = step.special === "workout" && table ? [`${step.title} · ${circuitWord(circuits)}`, ...(readiness ? [`Readiness ${readiness.score} · ${readiness.name}`] : [])] : [];
  const phoneChips: { t: string; tone?: "ok" }[] = step.special === "workout" ? [...(readiness ? [{ t: `Readiness: ${bandWord}`, tone: "ok" as const }] : []), ...(table ? [{ t: circuitWord(circuits) }, { t: `~${estimateMinutes(table)} min` }] : [])] : [];
  const notes = useMemo(() => {
    const title = step.title.trim().toLowerCase();
    const lines =
      step.special === "completion"
        ? []
        : (step.body ?? "")
            .replace(/^NOTES:\s*/i, "")
            .split(/\n+/)
            .map((l) => l.trim())
            .filter((l) => l && l.toLowerCase() !== title);
    return { lines, atts: step.attachments };
  }, [step]);
  const readinessCard =
    workoutDay && form ? (
      readiness ? (
        <section className="kd-card kd-ready-card" aria-label="Today's readiness">
          <p className="kd-eyebrow">Today&apos;s readiness</p>
          <div className="kd-ready-row">
            <MiniRing percent={Math.round((1 - Math.min(1, readiness.score / (form.maxScore || 60))) * 100)} label={String(readiness.score)} size={56} tone={readiness.band === "green" ? "ok" : readiness.band === "amber" ? "warm" : "red"} />
            <div>
              <b className="lq-t17">
                {bandWord} — {readiness.outcome === "workout" ? (readiness.band === "green" ? "full workout" : "modified table") : "recovery"}
              </b>
              <p className="lq-t13 lq-c3">{bandSummary(readiness)}</p>
            </div>
          </div>
          <div className="kd-ready-chips">
            <span data-tone="ok">
              <Icon name="check" size="xs" />
              {readiness.name}
            </span>
            {readinessIdx >= 0 && (
              <button type="button" onClick={toReadiness}>
                Retake
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="kd-card kd-ready-card" aria-label="Today's readiness">
          <p className="kd-eyebrow">Today&apos;s readiness</p>
          <b className="lq-t17">Not checked yet</b>
          <p className="lq-t13 lq-c3">Five quick questions pick today&apos;s table: full, modified or recovery.</p>
          <div className="kd-ready-chips">
            <button type="button" onClick={toReadiness}>
              Check in now
            </button>
          </div>
        </section>
      )
    ) : null;
  const nextLocked = Boolean(nextLesson && !nextOpen);
  const afterToday = nextLesson ? (
    <Link href={nextOpen ? lessonHref(program.slug, nextLesson.key, nextLesson.id) : programHref} className="kd-after lq-press" aria-disabled={nextLocked || undefined}>
      <span className="kd-after-h">
        <span>After today</span>
        {nextLocked ? <Icon name="lock" size="xs" /> : <Icon name="arrowRight" size="xs" />}
      </span>
      <b>
        {lessonLabel(nextLesson, word)}
        {nextLesson.dayNumber != null && nextLesson.dayType ? ` · ${nextLesson.dayType}` : ""}
      </b>
      <span className="lq-t13 lq-c3">{nextLocked ? "Unlocks when you finish today" : dayDone ? "Ready when you are" : "Open any time"}</span>
    </Link>
  ) : null;
  const hardRow = table?.rows.find((r) => /row|press|swing|clean|snatch|get.?up|deadlift|squat/i.test(String(r.exercise ?? "")));
  const helpCard =
    hardRow && step.special === "workout" ? (
      <Link href="/explore/mastering-the-kettlebell" className="kd-help lq-press">
        <span className="kd-help-ph">
          <Image src="/media/summit/mike-deadlift.jpg" alt="" fill sizes="64px" style={{ objectPosition: "50% 30%" }} />
        </span>
        <span className="kd-help-t">
          <b>Struggling with the {String(hardRow.exercise).replace(/\(.*?\)/g, "").trim().split(" ").slice(-2).join(" ").toLowerCase()}?</b>
          <span>Mike breaks it down frame by frame in Mastering the Kettlebell.</span>
          <span className="kd-help-cta">
            Watch a preview <Icon name="arrowRight" size="xs" />
          </span>
        </span>
      </Link>
    ) : null;

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
      flush
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
        if (nc) setPending({ kind: "clip", title: nc.title, go: () => setClipId(nc.providerId) });
      }}
      overlay={stageOverlay}
    />
  ) : null;

  const capture = (e: React.PointerEvent) => {
    press.current = { x: e.clientX, y: e.clientY };
  };

  const primary = (block?: boolean, label = "Mark complete") =>
    step.special === "readiness" && !isDone ? (
      <Button block={block} size={block ? "lg" : "md"} icon="steps" onClick={toReadiness}>
        Start assessment
      </Button>
    ) : isDone && nextIsReadiness ? (
      <Button block={block} size={block ? "lg" : "md"} icon="steps" onClick={() => go(active + 1, { auto: false })}>
        Start assessment
      </Button>
    ) : isDone ? (
      <Button key={`${step.id}-done-${rev}`} block={block} size={block ? "lg" : "md"} variant="fill" state="success" onClick={() => void uncomplete(active)} aria-label="Completed. Press to mark not done">
        Completed
      </Button>
    ) : (
      <span className="kd-cta-wrap" onPointerDown={capture}>
        <CompleteButton key={`${step.id}-${rev}`} block={block} size={block ? "lg" : "md"} doneLabel="Completed" onComplete={() => complete(active, "button", press.current)}>
          {label}
        </CompleteButton>
      </span>
    );

  const list = (
    <LessonList
      steps={steps}
      active={active}
      completed={completed}
      open={openNow}
      readinessLabel={readiness ? `Score ${readiness.score} · ${readiness.name}` : null}
      onSelect={(i) => go(i)}
      onToggle={(i, at) => toggle(i, at)}
    />
  );
  const footer = (
    <DayFooter
      word={word}
      slug={program.slug}
      dayDone={dayDone}
      levelDone={endKind === "level"}
      programHref={programHref}
      prev={prevLesson}
      next={nextLesson}
      nextOpen={nextOpen}
    />
  );

  return (
    <div className="kd-day">
      <SessionAutoStart lessonId={lesson.id} />
      {layer}
      <Cheer message={message} />

      {/* ---------------- top bar ---------------- */}
      <header className="kd-top">
        <div className="kd-top-l">
          <Link href={programHref} className="kd-x lq-press" aria-label="Exit day">
            <Icon name="close" size="sm" />
            <span className="kd-x-l">Exit</span>
          </Link>
          <span className="kd-top-p kd-ellipsis">{program.name}</span>
        </div>
        <div className="kd-top-t">
          <p className="kd-eyebrow kd-ellipsis">{context}</p>
          <h1 className="kd-ellipsis">{dayName}{lesson.dayType && /day$/i.test(lesson.dayType) && !/day$/i.test(dayName) && !lesson.pageType ? " Day" : ""}</h1>
        </div>
        <div className="kd-top-a">
          <div className="kd-pills" role="tablist" aria-label="Steps in this day">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Step ${i + 1}: ${s.title}`}
                className="kd-pill"
                data-state={i === active ? "now" : completed.has(s.id) ? "done" : undefined}
                data-locked={!openNow(i) ? "" : undefined}
                disabled={!openNow(i)}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <label className="kd-auto" data-on={autoplay ? "" : undefined}>
            <span className="kd-sm">Autoplay</span>
            <Toggle
              checked={autoplay}
              label="Autoplay next"
              onChange={(v) => {
                setAutoplay(v);
                if (!v && pending?.kind === "step") setPending(null);
                void setAutoplayAction(v);
              }}
            />
          </label>
          {workoutDay && (
            <button type="button" className="kd-plan-btn lq-press" onClick={() => setPlanOpen(true)} aria-label="Session plan">
              <Icon name="clipboard" size="sm" />
              <span className="kd-sm">Session plan</span>
            </button>
          )}
          <span className="kd-count lq-num kd-sm">
            {doneCount}/{steps.length}
          </span>
          <MiniRing percent={percent} />
        </div>
      </header>

      {/* ---------------- body ---------------- */}
      <div className="kd-body">
        <div className="kd-col" ref={stageCol}>
          <div className="kd-colin">
          {stage && (
            <div className="kd-stage-wrap">
              {stage}
              {stageChips.length > 0 && (
                <div className="kd-stage-chips" aria-hidden>
                  {stageChips.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="kd-dashes" aria-hidden>
            {steps.map((s, i) => (
              <i key={s.id} data-state={i === active ? "now" : completed.has(s.id) ? "done" : undefined} />
            ))}
          </div>

          <section className="kd-meta">
            <div className="kd-meta-t">
              <p className="kd-eyebrow kd-eyebrow-now lq-num">
                Step {active + 1} of {steps.length}
                {step.durationLabel ? ` · ${step.durationLabel}` : ""}
              </p>
              <h2 key={step.id} className="kd-meta-title">
                {step.title}
              </h2>
              {(step.description || lesson.focus) && <p className="kd-meta-d">{step.description || lesson.focus}</p>}
              {phoneChips.length > 0 && (
                <div className="kd-meta-chips">
                  {phoneChips.map((c) => (
                    <span key={c.t} data-tone={c.tone}>
                      {c.tone === "ok" && <Icon name="check" size="xs" />}
                      {c.t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="kd-meta-ring" aria-hidden>
              <MiniRing percent={percent} label={`${doneCount}/${steps.length}`} size={52} />
            </span>
            <div className="kd-meta-a">
              <button type="button" className="kd-stepbtn lq-press" aria-label="Previous step" disabled={active === 0} onClick={() => go(active - 1)}>
                <Icon name="back" size="sm" />
              </button>
              {primary()}
              <button type="button" className="kd-stepbtn lq-press" aria-label="Next step" disabled={active >= steps.length - 1 || !openNow(active + 1)} onClick={() => go(active + 1)}>
                <Icon name="chevron" size="sm" />
              </button>
            </div>
          </section>

          {(notes.lines.length > 0 || notes.atts.length > 0 || readinessCard) && (
            <div className="kd-duo" data-single={!readinessCard || !(notes.lines.length || notes.atts.length) ? "" : undefined}>
              {(notes.lines.length > 0 || notes.atts.length > 0) && <MikeNotes lines={notes.lines} attachments={notes.atts} dayLabel={lesson.pageType ? null : dayLabel} />}
              {readinessCard}
            </div>
          )}

          {step.special === "readiness" && form && (
            <section className="kd-sec kd-card kd-in" ref={readyRef} aria-labelledby="kd-ready-h">
              <div className="kd-sec-in">
                <p id="kd-ready-h" className="kd-eyebrow kd-eyebrow-now">
                  Training Readiness Assessment
                </p>
                <p className="lq-t13 lq-c2 kd-sec-sub">Five honest questions about how you woke up today. Your answers set the workout table for this session.</p>
                <ReadinessAssessment
                  form={form}
                  saved={readiness}
                  initial={data.position?.draftAnswers ?? {}}
                  onDraft={(a) => {
                    window.clearTimeout(draftTimer.current);
                    draftTimer.current = window.setTimeout(() => void savePositionAction(lesson.id, { draftAnswers: a }), 600);
                  }}
                  onSubmit={submitReadiness}
                />
              </div>
            </section>
          )}

          {clips.length > 0 && <ClipsSection key={step.id} clips={clips} playingId={clipId ?? playlist.playingClipId} clipActive={Boolean(clipId)} onPlay={(id) => setClipId(id)} />}

          {step.special === "completion" && (
            <section className="kd-sec kd-card kd-done kd-in">
              <Completion key={isDone ? "d" : "t"} variant="step" size={88} animated={isDone} />
              <p className="lq-t17">{step.body || "You've Crushed Another Day"}</p>
              <p className="lq-t13 lq-c2">Mark this step finished to complete today.</p>
            </section>
          )}

          {step.special === "workout" && (form || table) && (
            <section className="kd-in kd-workout" aria-label="Today's workout table">
              <WorkoutTablePanel
                full
                hasForm={Boolean(form)}
                readiness={readiness}
                table={table}
                onGoToAssessment={toReadiness}
                onFinished={isDone ? undefined : () => void complete(active, "button")}
                finishLabel={`Mark ${step.title} complete`}
              />
            </section>
          )}

          {/* phone: the sequence under the content */}
          <div className="kd-phone-list">
            <div className="kd-rail-h">
              <h2 className="lq-d-sm">Today&apos;s sequence</h2>
              <span className="lq-t13 lq-c3 lq-num">
                {doneCount} of {steps.length} done
              </span>
            </div>
            <div className="kd-card kd-list-card">{list}</div>
            {afterToday}
            {helpCard}
            {footer}
          </div>
          </div>
        </div>

        {/* desktop rail */}
        <aside className="kd-rail" aria-label="Today's sequence">
          <div className="kd-rail-h">
            <p className="kd-eyebrow">Today&apos;s sequence</p>
            <h2 className="lq-d-sm lq-num">
              {doneCount} of {steps.length} steps done
            </h2>
            <p className="lq-t13 lq-c3">{lockedOrder ? "Complete each step to unlock the next." : "Every step is open. Go in any order."}</p>
            <span className="kd-rail-bar" aria-hidden>
              <i style={{ width: `${percent}%` }} />
            </span>
          </div>
          <div className="kd-rail-list">
            {list}
            {afterToday}
            {helpCard}
            {footer}
          </div>
        </aside>
      </div>

      {/* phone: thumb-zone actions */}
      <div className="kd-bar lq-glass" data-level="thick">
        <button type="button" className="kd-stepbtn lq-press" aria-label="Previous step" disabled={active === 0} onClick={() => go(active - 1)}>
          <Icon name="back" size="sm" />
        </button>
        <div className="kd-bar-main">{primary(true, `Mark ${step.title} complete`)}</div>
        {dayDone && nextLesson && active >= steps.length - 1 ? (
          <Link href={lessonHref(program.slug, nextLesson.key, nextLesson.id)} className="kd-bar-next lq-press">
            {lessonLabel(nextLesson, word)}
            <Icon name="chevron" size="xs" />
          </Link>
        ) : (
          <button type="button" className="kd-stepbtn lq-press" aria-label="Next step" disabled={active >= steps.length - 1 || !openNow(active + 1)} onClick={() => go(active + 1)}>
            <Icon name="chevron" size="sm" />
          </button>
        )}
      </div>

      {workoutDay && (
        <Sheet open={planOpen} onClose={() => setPlanOpen(false)} title={`Session plan · ${dayLabel}`} description={`${[path?.shortName, section.title].filter(Boolean).join(" · ")} · The workout from your KBL program.`} detents={["large"]}>
          <div className="kd-plan">
            {form && (
              <ReadinessAssessment
                form={form}
                saved={readiness}
                initial={data.position?.draftAnswers ?? {}}
                onDraft={(a) => {
                  window.clearTimeout(draftTimer.current);
                  draftTimer.current = window.setTimeout(() => void savePositionAction(lesson.id, { draftAnswers: a }), 600);
                }}
                onSubmit={submitReadiness}
              />
            )}
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


function MiniRing({ percent, label, size = 34, tone }: { percent: number; label?: string; size?: number; tone?: "ok" | "warm" | "red" }) {
  const stroke = size > 40 ? 5 : 3.5;
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

function LessonList({
  steps, active, completed, open, readinessLabel, onSelect, onToggle,
}: {
  steps: PlayerStep[];
  active: number;
  completed: Set<string>;
  open: (i: number) => boolean;
  readinessLabel: string | null;
  onSelect: (i: number) => void;
  onToggle: (i: number, at?: Point) => void;
}) {
  return (
    <ol className="kd-list">
      {steps.map((s, i) => {
        const done = completed.has(s.id);
        const unlocked = open(i);
        const now = i === active;
        const clips = stagePlaylist(s, null).queue.length;
        return (
          <li key={s.id} data-now={now ? "" : undefined} data-done={done ? "" : undefined} data-locked={!unlocked ? "" : undefined}>
            <button type="button" className="kd-li" disabled={!unlocked} aria-current={now ? "step" : undefined} onClick={() => onSelect(i)}>
              <span className="kd-li-n" aria-hidden>
                {done ? (
                  <svg viewBox="0 0 24 24" className="lq-icon lq-check" data-size="xs" data-draw="">
                    <path d="M5.5 12.5 10 17l8.5-9.5" />
                  </svg>
                ) : unlocked ? (
                  <span className="lq-num">{i + 1}</span>
                ) : (
                  <Icon name="lock" size="xs" />
                )}
              </span>
              <span className="kd-li-t">
                <span className="lq-t15 kd-ellipsis">{s.title}</span>
                <span className="lq-t12 lq-c2 kd-li-m lq-num">
                  {s.special === "readiness" && readinessLabel ? (
                    readinessLabel
                  ) : (
                    <>
                      {s.durationLabel && (
                        <>
                          <Icon name="clock" size="xs" /> {s.durationLabel}
                        </>
                      )}
                      {now && !done ? <span>{`${s.durationLabel ? " · " : ""}in progress`}</span> : clips > 0 && <span>{`${s.durationLabel ? " · " : ""}${clips} clip${clips === 1 ? "" : "s"}`}</span>}
                    </>
                  )}
                </span>
              </span>
              <span className="lq-sr">{done ? "Done" : !unlocked ? "Locked" : now ? "Current step" : ""}</span>
            </button>
            <button
              type="button"
              className="kd-li-check lq-press"
              data-on={done ? "" : undefined}
              disabled={!unlocked}
              aria-label={done ? `Mark ${s.title} not done` : `Mark ${s.title} complete`}
              onClick={(e) => onToggle(i, { x: e.clientX, y: e.clientY })}
            >
              {done ? (
                <span className="kd-li-done">Done</span>
              ) : now ? (
                <span className="kd-li-dot" aria-hidden />
              ) : (
                <svg viewBox="0 0 24 24" className="lq-icon lq-check" data-size="xs" aria-hidden>
                  <path d="M5.5 12.5 10 17l8.5-9.5" />
                </svg>
              )}
            </button>
          </li>
        );
      })}
    </ol>
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
    <div className="kd-foot">
      {dayDone ? (
        <div className="kd-foot-done kd-in">
          <p className="lq-t15 kd-foot-h">
            <Icon name="check" size="sm" />
            {levelDone ? "Level complete" : "Day complete"}
          </p>
          {levelDone && (
            <Button size="md" block href={programHref} iconAfter="chevron">
              Certificate and next steps
            </Button>
          )}
          {next ? (
            <Button size="md" block variant={levelDone ? "fill" : "filled"} href={lessonHref(slug, next.key, next.id)} iconAfter="chevron">
              Start {lessonLabel(next, word)}
            </Button>
          ) : (
            <p className="lq-t13 lq-c2">That&apos;s the end of the program. Outstanding.</p>
          )}
        </div>
      ) : next && nextOpen ? (
        <Link href={lessonHref(slug, next.key, next.id)} className="kd-foot-next">
          <span className="kd-eyebrow">Next</span>
          <span className="lq-t13">
            {lessonLabel(next, word)}
            <Icon name="chevron" size="xs" />
          </span>
        </Link>
      ) : (
        <>
          <p className="kd-eyebrow">Next {word.toLowerCase()} locked</p>
          <p className="lq-t13 lq-c2 kd-foot-lock">
            <Icon name="lock" size="xs" />
            Finish every step to unlock {next ? lessonLabel(next, word) : "the finish line"}.
          </p>
        </>
      )}
      {prev && (
        <Link href={lessonHref(slug, prev.key, prev.id)} className="kd-foot-prev">
          <Icon name="back" size="xs" />
          Back to {lessonLabel(prev, word)}
        </Link>
      )}
    </div>
  );
}

/** Mike's written notes for the step (and its attachments), as the mockup's notes card. */
function MikeNotes({ lines, attachments, dayLabel }: { lines: string[]; attachments: PlayerStep["attachments"]; dayLabel: string | null }) {
  return (
    <section className="kd-card kd-notes-card kd-in" aria-label="Mike's notes">
      <span className="kd-notes-av" aria-hidden>
        <Image src={MIKE_FACE} alt="" width={52} height={52} />
      </span>
      <div className="kd-notes-b">
        <p className="kd-notes-h">
          <b>Mike&apos;s notes</b>
          {dayLabel && <span>{dayLabel}</span>}
        </p>
        {lines.length > 0 && (
          <div className="kd-notes">
            {lines.map((l, i) => (
              <p key={i} className="lq-t15">
                {l}
              </p>
            ))}
          </div>
        )}
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
      </div>
    </section>
  );
}

/** "In this lesson": the step's clips (plays through automatically). */
function ClipsSection({ clips, playingId, clipActive, onPlay }: { clips: PlayerStep["clips"]; playingId?: string | null; clipActive: boolean; onPlay: (id: string | null) => void }) {
  return (
    <section className="kd-clips-sec kd-in" aria-label="Clips in this lesson">
      <div className="kd-clips-h">
        <h3 className="lq-d-sm">
          In this lesson <span className="kd-count-chip lq-num">{clips.length} clip{clips.length === 1 ? "" : "s"}</span>
        </h3>
        {clipActive ? (
          <button type="button" className="kd-link" onClick={() => onPlay(null)}>
            <Icon name="repeat" size="xs" />
            Back to lesson
          </button>
        ) : (
          <span className="lq-t13 lq-c3 kd-auto-note">
            <Icon name="repeat" size="xs" /> Plays through automatically
          </span>
        )}
      </div>
      <ClipCards clips={clips} playingId={playingId} onPlay={(id) => onPlay(id)} />
    </section>
  );
}

export type { PlayerStep };
