"use client";

import { announceProgress } from "@/components/you/CelebrationHost";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { parseLessonBody, type VideoRef } from "@ms/core";
import { Glass, useToast } from "@/components/ui";
import { completeLessonAction, touchLessonAction, uncompleteLessonAction } from "@/lib/actions/course";
import type { CourseLessonNode, CoursePageData } from "@/lib/loaders/course";
import { CourseNav } from "./CourseNav";
import { CourseVideo } from "./CourseVideo";
import { Arrow, Back, Check, Clipboard, Info, ListTree, Lock, PanelClose, PanelOpen, Spark, X } from "./glyphs";
import { AudioList, Clips, Downloads, Markdown } from "./LessonBody";
import { LessonSidebar, shelfLinks, type ShelfLink } from "@/components/journeys/LessonSidebar";
import { a4lUnits, mtkUnits, unitOf } from "@/components/journeys/units";
import { AudioOnlyToggle, DownloadChips, KeyPoints, LessonNotes, NextCountdown, Reflection, ResumedPill, keyPointsOf, reflectionFor } from "@/components/lesson/LessonExtras";
import "./course.css";
import "../journey/accent.css";

type Mode = "plan" | "full" | null;

const FOCUS_KEY = "crs-focus";

/* Focus mode lives in localStorage; read it as an external store (the server renders it off). */
const focusListeners = new Set<() => void>();
const focusStore = {
  subscribe(cb: () => void) {
    focusListeners.add(cb);
    return () => void focusListeners.delete(cb);
  },
  get() {
    try {
      return window.localStorage.getItem(FOCUS_KEY) === "1";
    } catch {
      return memoryFocus;
    }
  },
  set(on: boolean) {
    memoryFocus = on;
    try {
      window.localStorage.setItem(FOCUS_KEY, on ? "1" : "0");
    } catch {}
    focusListeners.forEach((l) => l());
  },
};
let memoryFocus = false;

/**
 * Course player (legacy Template 2): sticky glass bar · grouped curriculum (300px, own scroll) ·
 * lesson stage (≤760px). Phone: Lessons drawer. Lesson-level complete, last-lesson memory,
 * MTK plan mode, keyboard (← → F /), 95%-watched auto-complete.
 */
/**
 * `slim` (KBL family: MTK, A4L): no curriculum sidebar; a slim week/movement strip on top, the
 * week's lessons in a compact list under the lesson, plus the shared lesson extras (key points,
 * notes, reflection, audio-only, "Next in 5s").
 */
export function CoursePlayer({ data, mode, slim, nextStep }: { data: CoursePageData; mode: Mode; slim?: "mtk" | "a4l"; nextStep?: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const slug = data.program.slug;
  const groups = data.groups;
  const all = useMemo(() => groups.flatMap((g) => g.sections.flatMap((s) => s.lessons)), [groups]);
  const [done, setDone] = useState(() => new Set(all.filter((l) => l.done).map((l) => l.id)));
  const focus = useSyncExternalStore(focusStore.subscribe, focusStore.get, () => false);
  const [drawer, setDrawer] = useState<"open" | "closing" | null>(null);
  const [busy, setBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const main = useRef<HTMLDivElement>(null);

  const isIntro = data.activeId === "intro";
  const lesson = data.lesson;
  const firstVisit = done.size === 0 && !data.lastLessonId;
  const [overview, setOverview] = useState(firstVisit);

  const planMode = mode === "plan" && Boolean(data.mtk?.plan);
  const planOrder = useMemo(
    () => (planMode ? data.mtk!.plan!.days.flatMap((d) => d.lessonIds.map((id, i) => ({ id, day: d.day, title: d.title, size: d.lessonIds.length, pos: i + 1 }))) : []),
    [planMode, data.mtk],
  );
  const qs = planMode ? "?mode=plan" : mode === "full" ? "?mode=full" : "";
  const href = useCallback((id: string) => `/programs/${slug}/course/${id}${qs}`, [slug, qs]);

  const node: CourseLessonNode | undefined = all.find((l) => l.id === data.activeId);
  const section = groups.flatMap((g) => g.sections).find((s) => s.id === node?.sectionId);
  const groupIdx = groups.findIndex((g) => g.sections.some((s) => s.id === section?.id));
  const group = groups[groupIdx];
  const multi = groups.length > 1;
  const groupLessons = group?.sections.flatMap((s) => s.lessons) ?? [];
  const index = node ? groupLessons.findIndex((l) => l.id === node.id) : -1;
  const planIdx = planMode && node ? planOrder.findIndex((p) => p.id === node.id) : -1;
  const planCtx = planIdx >= 0 ? planOrder[planIdx] : undefined;
  const byId = (id?: string) => (id ? all.find((l) => l.id === id) : undefined);
  const prev = planCtx ? byId(planOrder[planIdx - 1]?.id) : index > 0 ? groupLessons[index - 1] : undefined;
  const next = planCtx ? byId(planOrder[planIdx + 1]?.id) : index >= 0 ? groupLessons[index + 1] : undefined;
  const nextGroup = !planCtx && !next && groupIdx >= 0 ? groups[groupIdx + 1] : undefined;
  const nextGroupFirst = nextGroup?.sections.flatMap((s) => s.lessons).find((l) => !done.has(l.id)) ?? nextGroup?.sections[0]?.lessons[0];
  const firstOpen = all.find((l) => !done.has(l.id)) ?? all[0];
  const isDone = node ? done.has(node.id) : false;
  const [countdown, setCountdown] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const units = useMemo(() => {
    if (!slim) return [];
    const live = { ...data, groups: groups.map((g) => ({ ...g, sections: g.sections.map((s) => ({ ...s, lessons: s.lessons.map((l) => ({ ...l, done: done.has(l.id) })) })) })) };
    const nextOpen = all.find((l) => !done.has(l.id))?.id ?? null;
    return slim === "mtk" ? mtkUnits(live, href, nextOpen, new Set(data.mtk?.plan?.lessonIds ?? [])) : a4lUnits(live, href, nextOpen);
  }, [slim, data, groups, done, all, href]);
  const unit = slim ? unitOf(units, data.activeId) : null;
  const shelf = useMemo<ShelfLink[]>(() => {
    if (!slim) return [];
    const out = shelfLinks(units);
    if (slim === "mtk" && data.mtk?.plan) out.unshift({ id: "plan", label: "My Plan", sub: "Your days", href: "/mtk", icon: "calendarCheck" });
    if (slim === "mtk" && data.intake) out.push({ id: "results", label: "Assessment", sub: data.intake.done ? "Your results" : "2 minutes", href: data.mtk && data.intake.done ? "/mtk/results" : `/intake/${slug}`, icon: "clipboard" });
    out.push({ id: "library", label: "Library", sub: "All videos", href: "/library", icon: "library" });
    return out;
  }, [slim, units, data.mtk, data.intake, slug]);
  const pct = all.length ? Math.round((all.filter((l) => done.has(l.id)).length / all.length) * 100) : 0;

  /* ---------------- persistence: focus, last lesson, cross-device position */
  useEffect(() => {
    if (!lesson) return;
    try {
      window.localStorage.setItem(`course-last-lesson:${slug}`, isIntro ? "intro" : lesson.id);
    } catch {}
    if (!isIntro) void touchLessonAction(lesson.id, lesson.steps[0]?.id ?? null);
  }, [lesson, isIntro, slug]);

  const seconds = useRef<Record<string, number>>({ ...(lesson?.videoSeconds ?? {}) });
  const lastSave = useRef(0);
  const saveSeconds = useCallback(
    (force = false) => {
      if (!lesson || isIntro) return;
      const now = Date.now();
      if (!force && now - lastSave.current < 15000) return;
      lastSave.current = now;
      void touchLessonAction(lesson.id, lesson.steps[0]?.id ?? null, seconds.current);
    },
    [lesson, isIntro],
  );
  useEffect(() => () => saveSeconds(true), [saveSeconds]);

  /* ---------------- complete */
  const markDone = async (via: "button" | "watched") => {
    if (!node || done.has(node.id)) return true;
    setDone((s) => new Set(s).add(node.id));
    const r = await completeLessonAction(data.program.id, node.id, via); announceProgress();
    if (!r.ok && r.code !== "offline") {
      setDone((s) => {
        const n = new Set(s);
        n.delete(node.id);
        return n;
      });
      toast(r.message);
      return false;
    }
    if (!r.ok) toast(r.message);
    return true;
  };

  const go = (id: string) => {
    setDrawer(null);
    router.push(href(id), { scroll: false });
  };

  const primary = async () => {
    if (busy) return;
    if (isIntro) {
      if (data.intro && lesson) void completeLessonAction(data.program.id, data.intro.lessonId, "button");
      if (firstOpen) go(firstOpen.id);
      return;
    }
    setBusy(true);
    const ok = await markDone("button");
    setBusy(false);
    if (!ok) return;
    if (next) go(next.id);
    else if (planCtx) router.push("/mtk");
    else if (nextGroupFirst) {
      toast(`${group?.name ?? "Chapter"} finished`, { tone: "success" });
      go(nextGroupFirst.id);
    } else toast(all.every((l) => done.has(l.id) || l.id === node?.id) ? "Course complete — every lesson is done." : "Lesson complete", { tone: "success" });
  };

  const undo = async () => {
    if (!node) return;
    setDone((s) => {
      const n = new Set(s);
      n.delete(node.id);
      return n;
    });
    const r = await uncompleteLessonAction(node.id);
    if (!r.ok && r.code !== "offline") {
      setDone((s) => new Set(s).add(node.id));
      toast(r.message);
    }
  };

  const onWatched = async () => {
    if (!node || done.has(node.id) || (lesson?.steps.length ?? 0) > 1) return;
    const ok = await markDone("watched");
    if (ok && slim && next) setCountdown(true);
    else if (ok) toast("Marked complete", { tone: "success", action: { label: "Undo", onClick: () => void undo() } });
  };

  const toggleFocus = () => focusStore.set(!focus);
  const closeDrawer = () => {
    setDrawer("closing");
    window.setTimeout(() => setDrawer(null), 240);
  };

  /* ---------------- keyboard: ← → prev/next, F focus, / search, Esc */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        if (e.key === "Escape") t.blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" && (next || nextGroupFirst)) go((next ?? nextGroupFirst)!.id);
      else if (e.key === "ArrowLeft" && prev && !isIntro) go(prev.id);
      else if (e.key === "f" || e.key === "F") toggleFocus();
      else if (e.key === "/") {
        e.preventDefault();
        if (window.matchMedia("(min-width: 1024px)").matches) {
          if (focus) toggleFocus();
          requestAnimationFrame(() => searchRef.current?.focus());
        } else setDrawer("open");
      } else if (e.key === "Escape" && drawer) closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------------- lesson content */
  const steps = lesson?.steps ?? [];
  const main0 = steps[0];
  const parsed = useMemo(() => {
    const body = steps.map((s) => s.body ?? "").filter(Boolean).join("\n\n");
    return parseLessonBody(body, steps.flatMap((s) => s.attachments));
  }, [steps]);
  const clips = useMemo(() => {
    const seen = new Set<string>([main0?.video?.providerId ?? ""]);
    const out: (VideoRef & { title: string })[] = [];
    for (const s of steps) {
      if (s !== main0 && s.video && !seen.has(s.video.providerId)) {
        seen.add(s.video.providerId);
        out.push({ ...s.video, title: s.title });
      }
      for (const c of s.clips) if (!seen.has(c.providerId)) (seen.add(c.providerId), out.push(c));
    }
    for (const c of parsed.clips) if (!seen.has(c.providerId)) (seen.add(c.providerId), out.push(c));
    return out;
  }, [steps, main0, parsed.clips]);
  const hideLeads = useMemo(() => new Set([lesson?.title ?? "", main0?.video?.title ?? "", ...clips.map((c) => c.title)].filter(Boolean)), [lesson, main0, clips]);

  const groupDone = groupLessons.filter((l) => done.has(l.id)).length;
  const primaryLabel = isIntro
    ? { small: done.size ? "Resume the course" : "Begin the course", main: firstOpen?.title ?? "Start", phone: done.size ? "Resume" : "Start training" }
    : next
      ? { small: isDone ? "Next lesson" : "Complete & continue", main: next.title, phone: isDone ? "Next" : "Complete & continue" }
      : planCtx
        ? { small: isDone ? "Plan day finished" : "Complete plan day", main: "Back to My Plan", phone: isDone ? "Plan complete" : "Complete plan" }
        : nextGroupFirst
          ? { small: isDone ? `${group?.name} finished` : `Finish ${group?.name}`, main: `Then ${nextGroup?.name}: ${nextGroupFirst.title}`, phone: isDone ? "Next chapter" : `Finish ${group?.name}` }
          : { small: isDone ? (multi ? `${group?.name} finished` : "Course finished") : multi ? `Finish ${group?.name}` : "Finish course", main: isDone ? "All done" : "Mark this lesson complete", phone: isDone ? "All done" : "Mark complete" };

  /* Fixed controls (client: complete + next always in the same place): sidebar foot on desktop, bottom dock on phone. */
  const nextTarget = next ?? nextGroupFirst;
  const toggleDone = async () => {
    if (busy || !node) return;
    if (isDone) return void undo();
    setBusy(true);
    const ok = await markDone("button");
    setBusy(false);
    if (ok) toast("Marked complete", { tone: "success" });
  };
  const controls = (
    <div className="jsb-ctl">
      <button type="button" className="jsb-ctl-step" disabled={!prev || isIntro} onClick={() => prev && go(prev.id)} aria-label={prev ? `Previous: ${prev.title}` : "No previous lesson"}>
        <Arrow dir="left" />
      </button>
      {isIntro ? (
        <button type="button" className="jsb-ctl-main" data-tone="go" onClick={() => void primary()}>
          <span>{done.size ? "Resume" : "Begin"}</span><Arrow />
        </button>
      ) : (
        <button type="button" className="jsb-ctl-main" data-done={isDone ? "" : undefined} aria-pressed={isDone} aria-busy={busy || undefined} onClick={() => void toggleDone()}>
          <Check /><span>{isDone ? "Completed" : "Mark complete"}</span>
        </button>
      )}
      {planCtx && !next ? (
        <Link href="/mtk" className="jsb-ctl-next"><span>My Plan</span><Arrow /></Link>
      ) : (
        <button type="button" className="jsb-ctl-next" disabled={!nextTarget || isIntro} onClick={() => nextTarget && go(nextTarget.id)} aria-label={nextTarget ? `Next: ${nextTarget.title}` : "No next lesson"}>
          <span>Next</span><Arrow />
        </button>
      )}
    </div>
  );

  const nav = (onPick?: () => void, footer?: ReactNode) => slim ? (
    <LessonSidebar units={units} activeId={data.activeId} program={data.program.name} backHref={planMode ? "/mtk" : `/programs/${slug}/course`} backLabel={planMode ? "My Plan" : `${data.program.name} home`} pct={pct} shelf={shelf} onPick={onPick} footer={footer} />
  ) : (
    <CourseNav data={data} groups={groups} done={done} href={(id) => (id === "start" ? `/programs/${slug}/course/start${qs}` : href(id))} planMode={planMode} onPick={onPick} searchRef={searchRef} />
  );

  const byline = data.program.tagline && /^with /i.test(data.program.tagline) ? data.program.tagline : null;
  const intakeHref = data.intake ? (data.mtk && data.intake.done ? "/mtk/results" : `/intake/${slug}`) : null;

  return (
    <div className="crs" data-shell-focus="" data-jy-theme={data.program.journey.theme} data-focus={focus ? "" : undefined} data-slim={slim ? "" : undefined} data-audio-only={audioOnly ? "" : undefined}>
      <Glass as="header" level="thick" className="crs-bar">
        <div className="crs-bar-row">
          <Link href={planMode ? "/mtk" : `/programs/${slug}/course`} className="crs-ghost" aria-label={planMode ? "Back to My Plan" : `Back to the ${data.program.name} overview`}>
            <Back /><span className="crs-sm">{planMode ? "My Plan" : "Overview"}</span>
          </Link>
          <p className="crs-bar-title crs-ellipsis">{data.program.name}</p>
          <span className="crs-bar-pct crs-num" aria-label={`${pct}% complete`}>{pct}%</span>
          <button type="button" className="crs-ghost" aria-label="About this course" aria-pressed={overview} onClick={() => setOverview((v) => !v)}>
            <Info />
          </button>
          <button type="button" className="crs-ghost crs-only-phone" data-tone="accent" aria-label="Lessons" onClick={() => setDrawer("open")}>
            <ListTree />{slim && <span>Lessons</span>}
          </button>
          <button type="button" className="crs-ghost crs-only-desk" aria-pressed={focus} aria-label={focus ? "Show lessons" : "Focus"} onClick={toggleFocus}>
            {focus ? <PanelOpen /> : <PanelClose />}
            <span className="crs-sm">{focus ? "Lessons" : "Focus"}</span>
          </button>
        </div>
        <span className="crs-line" aria-hidden><i style={{ "--p": pct / 100 } as CSSProperties} /></span>
      </Glass>

      <div className="crs-body">
        <aside className="crs-side" aria-label={slim ? "Lessons" : "Curriculum"} inert={focus || undefined}>{slim ? nav(undefined, lesson ? controls : undefined) : <>{nav()}{lesson && <div className="jsb-foot">{controls}</div>}</>}</aside>

        <main className="crs-main" ref={main} id="main">
          <div className="crs-stage">
            {slim && (
              <button type="button" className="jsb-open" onClick={() => setDrawer("open")}>
                <ListTree />
                <b>{unit?.label ?? "Lessons"}</b>
                <span className="lq-num">{unit ? `${unit.done} of ${unit.total} done` : ""}</span>
                <span style={{ flex: "none", color: "var(--accent)", fontWeight: 650 }}>All lessons</span>
              </button>
            )}
            {planCtx && (
              <div className="crs-banner">
                <b>My Plan · Day {planCtx.day}</b>
                <span className="crs-ellipsis">Lesson {planCtx.pos} of {planCtx.size} · {planCtx.title}</span>
                <Link href="/mtk">View plan</Link>
              </div>
            )}
            {data.mtk && !data.mtk.plan && (
              <div className="crs-banner">
                <Spark />
                <span className="crs-banner-strong">Get a plan built around your strengths and gaps — about 2 minutes.</span>
                <Link href={data.mtk.assessmentDone ? "/mtk/results" : `/intake/${slug}`}>{data.mtk.assessmentDone ? "Finish my plan →" : "Create my personalized plan →"}</Link>
              </div>
            )}

            {overview && (
              <section className="crs-over" aria-labelledby="crs-over-h">
                {data.program.cover && (
                  <figure className="crs-over-art">
                    <Image src={data.program.cover.src} alt={data.program.cover.alt} fill sizes="(min-width: 1024px) 760px, 100vw" priority style={{ objectPosition: data.program.cover.focal }} />
                    {data.program.tagline && !byline && <figcaption>{data.program.tagline}</figcaption>}
                  </figure>
                )}
                <div className="crs-over-top">
                  <div>
                    <p className="crs-eyebrow">{byline ?? `With ${data.program.instructor}`}</p>
                    <h1 id="crs-over-h">{data.program.name}</h1>
                    {data.program.summary && <p className="crs-over-sum">{data.program.summary}</p>}
                  </div>
                  <button type="button" className="crs-ghost" aria-label="Close details" onClick={() => setOverview(false)}><X /></button>
                </div>
                <div className="crs-stats">
                  <span><b>{multi ? groups.length : groups.reduce((n, g) => n + g.sections.length, 0)}</b> {multi ? "chapters" : "sections"}</span>
                  <span><b>{all.length}</b> sessions</span>
                  <span><b>{pct}%</b> complete</span>
                  {intakeHref && (
                    <Link href={intakeHref}><Clipboard />{data.intake?.done ? "Review intake" : "Take the intake"}</Link>
                  )}
                </div>
                {data.program.highlights.length > 0 && (
                  <ul className="crs-ticks">{data.program.highlights.map((h) => <li key={h}><Check />{h}</li>)}</ul>
                )}
              </section>
            )}

            {slug === "men-of-movement" && (overview || isIntro) && <MomPanel />}

            {lesson && (
              <article key={lesson.id} aria-labelledby="crs-title">
                <div className="crs-crumb">
                  {isIntro ? (
                    <b>Start here</b>
                  ) : (
                    <>
                      {multi && group && <b>{group.name}</b>}
                      {section && <span>{multi && group ? "· " : ""}{section.title}</span>}
                      <span className="crs-crumb-n">{index + 1} of {groupLessons.length}</span>
                      {isDone && <span className="crs-crumb-done"><Check />Done</span>}
                    </>
                  )}
                </div>
                <h2 id="crs-title" className="crs-title">{isIntro ? data.intro?.title === "Home" ? `Welcome to ${data.program.name}` : data.intro?.title : lesson.title}</h2>

                {slim && main0?.video && !isIntro && (
                  <div className="crs-tools"><AudioOnlyToggle on={audioOnly} onChange={setAudioOnly} /></div>
                )}
                {(main0?.video || parsed.directVideo) && (
                  <div className="crs-vwrap">
                  {slim && main0?.video && <ResumedPill seconds={lesson.videoSeconds[main0.video.providerId] ?? 0} />}
                  <CourseVideo
                    key={lesson.id}
                    video={main0?.video ?? null}
                    directUrl={parsed.directVideo?.url}
                    poster={main0?.poster ?? null}
                    title={isIntro ? data.program.name : lesson.title}
                    fallbackImage={data.program.cover?.src ?? data.program.image}
                    kicker={isIntro ? "Start here" : group ? `${group.name} · ${index + 1}` : undefined}
                    resumeAt={main0?.video ? lesson.videoSeconds[main0.video.providerId] ?? 0 : 0}
                    onProgress={(s) => {
                      if (main0?.video) seconds.current[main0.video.providerId] = Math.floor(s);
                      saveSeconds();
                    }}
                    onWatched={() => void onWatched()}
                  />
                  </div>
                )}
                {slim && countdown && next && <NextCountdown title={next.title} onGo={() => { setCountdown(false); go(next.id); }} onCancel={() => setCountdown(false)} />}
                {slim && !isIntro && <KeyPoints points={keyPointsOf(parsed.body)} />}

                <AudioList items={parsed.audio} />
                {parsed.body && <Markdown source={parsed.body} hide={hideLeads} />}
                <Clips clips={clips} fallbackImage={data.program.cover?.src ?? data.program.image} />
                {slim ? <DownloadChips items={parsed.files} /> : <Downloads items={parsed.files} />}
                {slim && !isIntro && <LessonNotes key={lesson.id} lessonId={lesson.id} />}

                {lesson && (
                  <div className="jsb-dock" aria-label="Lesson controls">
                    <button type="button" className="jsb-dock-list" aria-label="All lessons" onClick={() => setDrawer("open")}><ListTree /></button>
                    {controls}
                  </div>
                )}
                {slim && isDone && !isIntro && <Reflection key={`r-${lesson.id}`} lessonId={lesson.id} lessonTitle={lesson.title} program={data.program.name} question={reflectionFor(data.program.name, lesson.title)} />}
                {slim && isDone && !isIntro && !next && !planCtx && nextStep}
                <p className="crs-keys" aria-hidden><span><kbd>←</kbd><kbd>→</kbd>Lessons</span><span><kbd>F</kbd>Focus</span><span><kbd>/</kbd>Search</span></p>
              </article>
            )}
            {!lesson && !data.locked && <p className="crs-empty">This lesson isn’t available.</p>}
          </div>
        </main>
      </div>

      {drawer && (
        <div className="crs-drawer" role="dialog" aria-modal="true" aria-label="Lessons" data-closing={drawer === "closing" ? "" : undefined}>
          <button type="button" className="crs-x crs-drawer-scrim" aria-label="Close" onClick={closeDrawer} />
          <div className="crs-drawer-panel">
            <div className="crs-drawer-head">
              <p className="crs-ellipsis">{data.program.name}</p>
              <button type="button" className="crs-ghost" aria-label="Close lessons" onClick={closeDrawer}><X /></button>
            </div>
            {nav(() => setDrawer(null))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Men of Movement preparation: the five pillars and the locked post-retreat module (legacy copy). */
export function MomPanel() {
  return (
    <div className="crs-mom">
      <Glass className="crs-mom-card">
        <p className="crs-eyebrow" data-tone="accent">Retreat preparation</p>
        <h2>Arrive grounded through five pillars</h2>
        <div className="crs-pillars">{["Rotation", "Movement", "Breathwork", "Nature", "Storywork"].map((p) => <span key={p}>{p}</span>)}</div>
        <p>Six foundational practices are included with retreat enrollment. For now, access remains available without an expiry date.</p>
      </Glass>
      <div className="crs-mom-card" data-locked="">
        <span className="crs-lockic"><Lock /></span>
        <h3>Post-retreat integration</h3>
        <p>Content in development. This module will unlock after a future retreat when its material and release rules are confirmed.</p>
      </div>
    </div>
  );
}
