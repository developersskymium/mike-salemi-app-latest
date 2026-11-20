"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { parseLessonBody, type VideoRef } from "@ms/core";
import { AudioList, Markdown } from "@/components/course/LessonBody";
import { LessonVideoB } from "@/components/lesson-b/LessonVideoB";
import { KeyPointsB, YourNotes, keyPoints } from "@/components/lesson-b/NotesB";
import { announceProgress } from "@/components/you/CelebrationHost";
import { Icon, useToast } from "@/components/ui";
import { completeLessonAction, touchLessonAction, uncompleteLessonAction } from "@/lib/actions/course";
import { KIND_LABEL, buildChapters, chapterProgress, signatureOf, type SeriesItem } from "@/lib/series";
import type { SeriesLessonData } from "@/lib/loaders/series";
import { SeriesCard } from "./SeriesNavigator";
import "./series.css";
import "../journey/accent.css";

type Clip = VideoRef & { title: string };

/**
 * Lesson view for the journeys-b programs: the player on top with this chapter's lessons as a
 * playlist beside it (desktop) or a strip under it (phone). A lesson's extra videos play in the
 * main player; other lessons open in place and the player scrolls into view. Notes below. Previous · complete / next
 * sit at the foot of the playlist (desktop) or in a fixed bottom bar (phone). Stays mounted between lessons (no flash): only the content changes.
 * Desktop (≥1200): playlist left · lesson centre · "Your notes" right (sticky). 1024–1199: notes under the lesson.
 */
export function SeriesPlayer({ home, preview = null }: { home: SeriesLessonData; preview?: { href: string } | null }) {
  const { data, media, note } = home;
  const router = useRouter();
  const toast = useToast();
  const slug = data.program.slug;
  const cfg = data.program.journey;
  const sig = signatureOf(slug, cfg.kind);
  const lesson = data.lesson;
  const isIntro = data.activeId === "intro";
  const activeItemId = isIntro ? "start" : data.activeId;

  const [doneOverride, setDoneOverride] = useState<Record<string, boolean>>({});
  const chapters = useMemo(() => {
    const cs = buildChapters(data, media);
    return cs.map((c) => ({ ...c, items: c.items.map((i) => (i.id in doneOverride ? { ...i, done: doneOverride[i.id]! } : i)) }));
  }, [data, media, doneOverride]);
  const flat = chapters.flatMap((c) => c.items);
  const chapterIdx = Math.max(0, chapters.findIndex((c) => c.items.some((i) => i.id === activeItemId)));
  const [viewChapter, setViewChapter] = useState<{ lesson: string; idx: number } | null>(null);
  const shownIdx = viewChapter && viewChapter.lesson === activeItemId ? viewChapter.idx : chapterIdx;
  const chapter = chapters[chapterIdx];
  const shown = chapters[shownIdx] ?? chapter;
  const pos = flat.findIndex((i) => i.id === activeItemId);
  const item: SeriesItem | undefined = flat[pos];
  const prev = pos > 0 ? flat[pos - 1] : undefined;
  const next = pos >= 0 ? flat.slice(pos + 1).find((i) => i.kind !== "welcome") : undefined;
  const isDone = item?.done ?? false;
  const countable = flat.filter((i) => i.kind !== "welcome");
  const pct = countable.length ? countable.filter((i) => i.done).length / countable.length : 0;

  /* ---------------- videos of this lesson: main + clips, played in the one player */
  const steps = useMemo(() => lesson?.steps ?? [], [lesson]);
  const parsed = useMemo(() => parseLessonBody(steps.map((s) => s.body ?? "").filter(Boolean).join("\n\n"), steps.flatMap((s) => s.attachments)), [steps]);
  const videos = useMemo(() => {
    const seen = new Set<string>();
    const out: Clip[] = [];
    const add = (v: VideoRef | null | undefined, title: string) => {
      if (v && !seen.has(v.providerId)) (seen.add(v.providerId), out.push({ ...v, title }));
    };
    for (const s of steps) {
      add(s.video, s === steps[0] ? lesson?.title ?? s.title : s.title);
      for (const c of s.clips) add(c, c.title);
    }
    for (const c of parsed.clips) add(c, c.title);
    return out;
  }, [steps, parsed.clips, lesson]);
  const [clipSel, setClipSel] = useState<{ lesson: string; idx: number; auto: boolean } | null>(null);
  const clipIdx = clipSel && clipSel.lesson === lesson?.id ? clipSel.idx : 0;
  const clip = videos[clipIdx];
  const poster = clipIdx === 0 ? steps[0]?.poster ?? clip?.thumbnailUrl ?? null : clip?.thumbnailUrl ?? null;

  /* ---------------- scroll the player into view when the lesson or clip changes */
  const stage = useRef<HTMLDivElement>(null);
  const toPlayer = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 64 || r.top > window.innerHeight * 0.5) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: window.scrollY + r.top - 76, behavior: reduce ? "auto" : "smooth" });
    }
  }, []);
  // Each lesson mounts fresh (kept scroll position): bring the player into view when it is off screen.
  useEffect(() => {
    toPlayer();
  }, [lesson?.id, toPlayer]);

  /* ---------------- persistence */
  const seconds = useRef<Record<string, number>>({});
  const lastSave = useRef(0);
  useEffect(() => {
    if (!lesson || isIntro) return;
    seconds.current = { ...lesson.videoSeconds };
    try {
      window.localStorage.setItem(`course-last-lesson:${slug}`, lesson.id);
    } catch {}
    void touchLessonAction(lesson.id, lesson.steps[0]?.id ?? null);
  }, [lesson, isIntro, slug]);
  const save = (force = false) => {
    if (!lesson || isIntro) return;
    const now = Date.now();
    if (!force && now - lastSave.current < 15000) return;
    lastSave.current = now;
    void touchLessonAction(lesson.id, lesson.steps[0]?.id ?? null, seconds.current);
  };

  const go = (id: string) => router.push(`/programs/${slug}/course/${id}`, { scroll: false });

  const setDone = (id: string, v: boolean) => setDoneOverride((o) => ({ ...o, [id]: v }));
  const [busy, setBusy] = useState(false);
  const complete = async (via: "button" | "watched") => {
    if (!lesson || isIntro || !item || item.done) return true;
    setDone(item.id, true);
    const r = await completeLessonAction(data.program.id, lesson.id, via);
    announceProgress();
    if (!r.ok && r.code !== "offline") {
      setDone(item.id, false);
      toast(r.message);
      return false;
    }
    return true;
  };
  const primary = async () => {
    if (busy) return;
    if (isIntro) {
      if (data.intro) void completeLessonAction(data.program.id, data.intro.lessonId, "button");
      const firstOpen = countable.find((i) => !i.done) ?? countable[0];
      if (firstOpen) go(firstOpen.id);
      return;
    }
    setBusy(true);
    const ok = await complete("button");
    setBusy(false);
    if (!ok) return;
    if (next) go(next.id);
    else toast(`${data.program.name} complete`, { tone: "success", icon: "check" });
  };
  const markOnly = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await complete("button");
    setBusy(false);
    if (ok && !next) toast(`${data.program.name} complete`, { tone: "success", icon: "check" });
  };
  const undo = async () => {
    if (!item || !lesson) return;
    setDone(item.id, false);
    const r = await uncompleteLessonAction(lesson.id);
    if (!r.ok && r.code !== "offline") {
      setDone(item.id, true);
      toast(r.message);
    }
  };
  // Auto-complete at 90% of the lesson's main video (or of its last clip).
  const onNinety = async () => {
    if (preview || !item || item.done || (clipIdx !== 0 && clipIdx !== videos.length - 1)) return;
    if (await complete("watched")) toast("Marked complete", { tone: "success", action: { label: "Undo", onClick: () => void undo() } });
  };

  /* ---------------- end of video: "Next in 5 s · Cancel" */
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (count === null) return;
    if (count <= 0) {
      setCount(null);
      if (next) go(next.id);
      return;
    }
    const t = window.setTimeout(() => setCount((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line
  }, [count]);
  const onEnded = () => {
    if (clipIdx < videos.length - 1) {
      setClipSel({ lesson: lesson!.id, idx: clipIdx + 1, auto: true });
      return;
    }
    if (next) {
      if (!preview) void complete("watched");
      setCount(5);
    }
  };

  /* ---------------- focus mode and audio-only */
  const [focus, setFocus] = useState(false);
  const talk = sig === "journey" || item?.kind === "call";
  const [audio, setAudio] = useState(false);
  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFocus(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  /* ---------------- keyboard ← → */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" && next) go(next.id);
      if (e.key === "ArrowLeft" && prev) go(prev.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const title = isIntro ? `Welcome to ${data.program.name}` : item?.title ?? lesson?.title ?? "";
  const hide = new Set([lesson?.title ?? "", ...videos.map((v) => v.title)].filter(Boolean));
  const fallback = item?.thumb ?? item?.photo.src ?? data.program.cover.src;
  const playKey = `${lesson?.id}:${clip?.providerId ?? "none"}`;

  /* Fixed controls (client: complete + next always in the same place): foot of the playlist on
     desktop, bottom bar on phone. prev · main · next keep fixed sizes so nothing shifts. */
  const nextChapter = next ? chapters.findIndex((c) => c.items.some((i) => i.id === next.id)) !== chapterIdx : false;
  const programHref = `/programs/${slug}/course`;
  const mainBtn = preview ? (
    <Link href={preview.href} className="srp-ctl-main" data-tone="go"><Icon name="lock" size="xs" /><span>Get full access</span></Link>
  ) : isIntro ? (
    <button type="button" className="srp-ctl-main" data-tone="go" onClick={() => void primary()}>
      <span>{countable.some((i) => i.done) ? "Continue" : "Begin"}</span><Icon name="arrowRight" size="xs" />
    </button>
  ) : !isDone ? (
    <button type="button" className="srp-ctl-main" aria-busy={busy || undefined} disabled={busy} onClick={() => void markOnly()}>
      <Icon name="check" size="xs" /><span>Mark complete</span>
    </button>
  ) : next ? (
    <button type="button" className="srp-ctl-main" data-tone="go" onClick={() => go(next.id)}>
      <span>{nextChapter ? "Next chapter" : "Next lesson"}</span><Icon name="arrowRight" size="xs" />
    </button>
  ) : (
    <Link href={programHref} className="srp-ctl-main" data-done=""><span>Back to program</span></Link>
  );
  const controls = (
    <div className="srp-ctl">
      <button type="button" className="srp-ctl-step" disabled={!prev} onClick={() => prev && go(prev.id)} aria-label={prev ? `Previous: ${prev.title}` : "No previous lesson"}>
        <Icon name="arrowLeft" size="sm" />
      </button>
      {mainBtn}
      <button type="button" className="srp-ctl-step" data-dir="next" disabled={!next} onClick={() => next && go(next.id)} aria-label={next ? `Next: ${next.title}` : "No next lesson"}>
        <Icon name="arrowRight" size="sm" />
      </button>
    </div>
  );

  const chapterItems = chapter?.items.filter((i) => i.kind !== "welcome") ?? [];
  const posInChapter = item ? chapterItems.findIndex((i) => i.id === item.id) : -1;
  const points = keyPoints(parsed.body, hide);
  const question = !lesson || isIntro
    ? null
    : item?.kind === "reflection"
      ? "What came up for you in this week's playwork, and what will you do differently?"
      : sig === "journey"
        ? "What's one thing from this you'll act on before next week?"
        : sig === "pillars"
          ? "What do you want to carry with you to the retreat from this practice?"
          : sig === "practice"
            ? "How did your energy feel before and after this practice?"
            : null;

  return (
    <div className="srp" data-sig={sig} data-jy-theme={cfg.theme} data-focus={focus ? "" : undefined} data-shell-focus={focus ? "" : undefined}>
      <header className="srp-bar">
        <Link href={`/programs/${slug}/course`} className="srp-back" aria-label={`Back to ${data.program.name}`}>
          <Icon name="back" size="xs" />
          <span className="srp-ellipsis">{data.program.name}</span>
        </Link>
        <span className="srp-where srp-ellipsis">
          {isIntro ? "Start here" : `${chapter?.label ?? ""}${posInChapter >= 0 ? ` · ${KIND_LABEL[item!.kind] === "Lesson" ? "Lesson" : KIND_LABEL[item!.kind]} ${posInChapter + 1} of ${chapterItems.length}` : ""}`}
        </span>
        <span className="srp-tools">
          <button type="button" className="lb-toggle srp-only-desk" aria-pressed={focus} onClick={() => setFocus((f) => !f)}>
            <Icon name={focus ? "close" : "fullscreen"} size="xs" />{focus ? "Exit focus" : "Focus"}
          </button>
          <span className="srp-pct lq-num" aria-label={`${Math.round(pct * 100)}% complete`}>
            <span className="sr-prog-bar"><i style={{ "--p": pct } as CSSProperties} /></span>
            {Math.round(pct * 100)}%
          </span>
        </span>
      </header>

      {preview && (
        <div className="srp-preview" role="note">
          <span><b>Free preview</b> · a taste of {data.program.name}. Your progress isn't tracked yet.</span>
          <Link href={preview.href} className="sr-link">Unlock the program</Link>
        </div>
      )}
      <div className="srp-grid">
        <div className="srp-stage" ref={stage}>
          <div className="srp-player">
            {clip || parsed.directVideo ? (
              <LessonVideoB
                key={playKey}
                video={clip ?? null}
                directUrl={clip ? undefined : parsed.directVideo?.url}
                poster={poster}
                title={clip?.title ?? title}
                fallbackImage={fallback}
                kicker={chapter?.label}
                audio={audio}
                autoStart={Boolean(clipSel?.auto && clipSel.lesson === lesson?.id)}
                resumeAt={clip ? lesson?.videoSeconds[clip.providerId] ?? 0 : 0}
                onProgress={(s) => {
                  if (clip) seconds.current[clip.providerId] = Math.floor(s);
                  save();
                }}
                onNinety={() => void onNinety()}
                onEnded={onEnded}
              />
            ) : (
              <div className="srp-novideo" style={{ backgroundImage: `url(${fallback})` }}>
                <span>
                  <Icon name="file" size="sm" />
                  {item ? KIND_LABEL[item.kind] : "Lesson"}
                </span>
              </div>
            )}
            {count !== null && next && (
              <div className="lb-count" role="status">
                <div>
                  <small>Up next</small>
                  <b>{next.title}</b>
                  <span className="lb-count-n lq-num" aria-label={`in ${count} seconds`}>{count}</span>
                  <span className="lb-count-acts">
                    <button type="button" onClick={() => (setCount(null), go(next.id))}>Play now</button>
                    <button type="button" onClick={() => setCount(null)}>Cancel</button>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="srp-head">
            <p className="sr-eyebrow">
              {chapter?.label}
              {item && item.kind !== "lesson" && item.kind !== "welcome" ? ` · ${KIND_LABEL[item.kind]}` : ""}
              {item?.minutes ? ` · ${item.minutes} min` : ""}
            </p>
            <h1 className="srp-title">{title}</h1>
            {clipIdx > 0 && clip && <p className="sr-muted">Now playing: {clip.title}</p>}
            <div className="srp-acts">
              {talk && (clip || parsed.directVideo) && (
                <button type="button" className="lb-toggle" aria-pressed={audio} onClick={() => setAudio((a) => !a)}>
                  <Icon name="speaker" size="xs" />{audio ? "Show video" : "Audio only"}
                </button>
              )}
              {isDone && !isIntro && !preview && (
                <button type="button" className="srp-undo" onClick={() => void undo()}>Mark as not done</button>
              )}
            </div>
          </div>
        </div>

        <aside className="srp-list" aria-label="Playlist">
          <div className="srp-list-in">
          <Link href={programHref} className="srp-home"><Icon name="back" size="xs" /><span className="srp-ellipsis">Program home</span></Link>
          {videos.length > 1 && (
            <div className="srp-sec">
              <p className="srp-sec-h">In this lesson · {videos.length} videos</p>
              <ol className="srp-clips">
                {videos.map((v, i) => (
                  <li key={v.providerId}>
                    <button
                      type="button"
                      className="srp-clip lq-press"
                      aria-current={i === clipIdx ? "true" : undefined}
                      onClick={() => {
                        setClipSel({ lesson: lesson!.id, idx: i, auto: true });
                        requestAnimationFrame(toPlayer);
                      }}
                    >
                      <span className="srp-clip-n lq-num">{i === clipIdx ? <Icon name="play" size="xs" /> : String(i + 1).padStart(2, "0")}</span>
                      <span className="srp-ellipsis2">{v.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="srp-sec">
            {chapters.length > 1 && (
              <div className="srp-chips" role="tablist" aria-label="Chapters">
                {chapters.map((c, i) => {
                  const p = chapterProgress(c);
                  return (
                    <button key={c.key} type="button" role="tab" aria-selected={i === shownIdx} className="srp-chip" data-done={p.total && p.pct >= 1 ? "" : undefined} onClick={() => setViewChapter({ lesson: activeItemId, idx: i })}>
                      {c.short}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="srp-sec-h">{shown?.label} · {shown?.items.filter((i) => i.kind !== "welcome").length ?? 0} {cfg.unit.many}</p>
            {shown && shown.items.length ? (
              <ul className="srp-items">
                {shown.items.map((it) => (
                  <li key={it.id}>
                    <SeriesCard item={it} href={`/programs/${slug}/course/${it.id}`} active={it.id === activeItemId} row />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sr-muted srp-soon"><Icon name="lock" size="xs" /> {shown?.soon ?? "Opening soon"}</p>
            )}
          </div>
          </div>
          <div className="srp-foot">{controls}</div>
        </aside>

        <div className="srp-notes">
          <AudioList items={parsed.audio} />
          {parsed.files.length > 0 && (
            <div className="lb-chips" aria-label="Downloads">
              {parsed.files.map((f) => (
                <a key={f.url} className="lb-chip lq-press" href={f.url} target="_blank" rel="noreferrer" download={f.kind === "link" ? undefined : ""}>
                  <Icon name={f.kind === "link" ? "external" : "download"} size="xs" />
                  <span>{f.title.replace(/\.(pdf|docx?|zip|mp3)$/i, "").replace(/[-_]+/g, " ")}</span>
                </a>
              ))}
            </div>
          )}
          {lesson && !isIntro && <KeyPointsB lessonId={lesson.id} points={points} />}
          {parsed.body && (
            <details className="srp-more" open={points.length === 0}>
              <summary>{points.length ? "Full lesson notes" : "Lesson notes"}</summary>
              <Markdown source={parsed.body} hide={hide} />
            </details>
          )}
        </div>
        {lesson && !isIntro && (
          <aside className="srp-side" aria-label="Your notes">
            <YourNotes key={lesson.id} lessonId={lesson.id} initial={note} question={question} />
          </aside>
        )}
      </div>
      <div className="srp-dock" aria-label="Lesson controls">{controls}</div>
    </div>
  );
}
