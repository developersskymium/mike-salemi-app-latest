"use client";

import { announceProgress } from "@/components/you/CelebrationHost";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { stagePlaylist } from "@ms/core";
import { AmbientBackdrop, Button, CompleteButton, Glass, Icon, IconButton, Sheet, Toggle, useToast } from "@/components/ui";
import { Completion } from "@/components/graphics";
import type { SessionPlayerData, SessionStep } from "@/lib/loaders/selfguided";
import { endSessionAction, favouriteAction, repeatSessionAction, sessionProgressAction } from "@/lib/actions/selfguided";
import { VideoStage, UpNext } from "@/components/training/VideoStage";
import { ClipCards } from "@/components/training/ClipRow";
import { CircuitTable } from "@/components/training/CircuitTable";
import { IntentTag } from "./parts";
import "@/components/training/day.css";
import "./selfguided.css";

const SLOT = { warmup: "Warm-up", main: "Main", stretch: "Stretch" } as const;

/**
 * Quick / custom / library session player. Reuses the day player's stage, clip cards and
 * circuit table. Progress (done items, active item, video seconds) saves to the session for
 * cross-device resume; finishing logs minutes and notes; 95% watched completes an item and
 * auto-advance moves on (toggle).
 */
export function SessionPlayer({ data }: { data: SessionPlayerData }) {
  const { session, steps, program } = data;
  const router = useRouter();
  const toast = useToast();
  const [done, setDone] = useState<Set<string>>(() => new Set(session.progress.done));
  const firstOpen = steps.findIndex((s) => !session.progress.done.includes(s.id));
  const [active, setActive] = useState(() => {
    const a = steps.findIndex((s) => s.id === session.progress.active);
    return a >= 0 ? a : Math.max(0, firstOpen);
  });
  const [clip, setClip] = useState<string | null>(null);
  const [auto, setAuto] = useState(data.autoplayNext);
  const [autoStart, setAutoStart] = useState(false);
  const [upNext, setUpNext] = useState(false);
  const [finish, setFinish] = useState(false);
  const [ended, setEnded] = useState<null | { minutes: number; streak: number }>(session.endedAt ? { minutes: session.minutes ?? 0, streak: 0 } : null);
  const [fav, setFav] = useState(session.favourite);
  const startedAt = useRef(Date.parse(session.startedAt));
  const seconds = useRef<Record<string, number>>({ ...session.progress.seconds });
  const lastSave = useRef(0);
  const step = steps[active]!;
  const pl = stagePlaylist(step, clip);
  const video = clip ? pl.queue.find((c) => c.providerId === clip) ?? null : pl.lead;
  const allDone = steps.every((s) => done.has(s.id));
  const planned = steps.reduce((n, s) => n + s.minutes, 0);

  const save = useCallback(
    (item: string, patch: { done?: boolean; video?: string; seconds?: number }) => void sessionProgressAction(session.id, item, patch),
    [session.id],
  );
  // Remember which item is open (debounced) and flush video position on leave.
  useEffect(() => {
    const t = window.setTimeout(() => save(step.id, {}), 700);
    return () => window.clearTimeout(t);
  }, [step.id, save]);
  useEffect(() => {
    const flush = () => {
      const v = video?.providerId;
      if (v && seconds.current[v]) save(step.id, { video: v, seconds: seconds.current[v] });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [video?.providerId, step.id, save]);

  const go = (i: number, autoplay = false) => {
    if (i < 0 || i >= steps.length) return;
    setClip(null);
    setUpNext(false);
    setAutoStart(autoplay);
    setActive(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const complete = (s: SessionStep, auto = false) => {
    if (done.has(s.id)) return;
    const next = new Set(done).add(s.id);
    setDone(next);
    save(s.id, { done: true });
    if (steps.every((x) => next.has(x.id))) window.setTimeout(() => setFinish(true), auto ? 600 : 300);
  };

  const onEnded = () => {
    if (pl.nextClip) return setClip(pl.nextClip.providerId);
    complete(step, true);
    if (auto && active < steps.length - 1) setUpNext(true);
  };

  const elapsed = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
  const [minutes, setMinutes] = useState(() => Math.min(180, elapsed > 2 && elapsed < 180 ? elapsed : planned));
  const [notes, setNotes] = useState(session.notes ?? "");
  const [saving, start] = useTransition();

  const end = () =>
    start(async () => {
      const r = await endSessionAction(session.id, minutes, notes.trim() || null, program.slug); announceProgress();
      if (!r.ok && r.code !== "offline") return toast(r.message);
      setEnded({ minutes: r.ok ? r.minutes : minutes, streak: r.ok ? r.streak : 0 });
      toast(r.ok ? "Session logged" : "Saved here. It logs when you're back online.", { tone: "success" });
    });
  const toggleFav = () =>
    start(async () => {
      setFav(!fav);
      const r = await favouriteAction(session.id, !fav);
      if (!r.ok) {
        setFav(fav);
        toast(r.message);
      }
    });
  const again = () =>
    start(async () => {
      const r = await repeatSessionAction(session.id);
      if (!r.ok) return toast(r.message);
      if (r.sessionId) router.push(`/programs/${program.slug}/session/${r.sessionId}`);
    });

  return (
    <div className="sg-page">
      {program.image && <AmbientBackdrop src={program.image} fixed />}
      <Glass radius="panel" className="sg-ctx">
        <div className="sg-ctx-row">
          <IconButton icon="close" label={`Back to ${program.name}`} href={`/programs/${program.slug}?mode=self-guided`} variant="fill" size="sm" iconSize="sm" />
          <div className="sg-ctx-t">
            <p className="lq-t15 sg-ellipsis" style={{ fontWeight: 650 }}>
              {session.title}
            </p>
            <p className="lq-t12 lq-c2 sg-ellipsis sg-num">
              {program.name} · {done.size}/{steps.length} parts · about {planned} min
            </p>
            <span className="sg-ctx-bar" aria-hidden>
              <i style={{ transform: `scaleX(${steps.length ? done.size / steps.length : 0})` }} />
            </span>
          </div>
          <div className="sg-ctx-a">
            <label className="sg-row lq-t12 lq-c2 sg-hide-phone" style={{ gap: 8 }}>
              Autoplay
              <Toggle checked={auto} onChange={setAuto} label="Autoplay next" />
            </label>
            <Button size="sm" variant={allDone ? "filled" : "fill"} icon="check" onClick={() => setFinish(true)}>
              Finish
            </Button>
          </div>
        </div>
      </Glass>

      <div className="sg-player" style={{ marginTop: "var(--s-5)" }}>
        <div className="sg-stack">
          <div className="sg-player-stage">
            <VideoStage
              key={`${step.id}:${video?.providerId ?? "none"}`}
              video={video}
              poster={video?.thumbnailUrl ?? step.poster ?? program.image}
              title={video?.title ?? step.title}
              autoStart={autoStart || Boolean(clip)}
              resumeAt={video ? seconds.current[video.providerId] ?? 0 : 0}
              flush
              onProgress={(s) => {
                if (!video) return;
                seconds.current[video.providerId] = s;
                const now = Date.now();
                if (now - lastSave.current > 15000) {
                  lastSave.current = now;
                  save(step.id, { video: video.providerId, seconds: s });
                }
              }}
              onWatched={() => !clip && complete(step, true)}
              onEnded={onEnded}
              overlay={upNext && steps[active + 1] ? <UpNext title={steps[active + 1]!.title} onGo={() => go(active + 1, true)} onCancel={() => setUpNext(false)} /> : null}
            />
          </div>
          <div className="sg-player-meta">
            <div className="sg-row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <p className="sg-eyebrow sg-num" data-tone="now">
                {SLOT[step.slot]} · part {active + 1} of {steps.length} · {step.minutes} min
              </p>
              <IntentTag intent={step.role === "warmup" ? null : step.role === "workout" ? "workout" : step.role} />
            </div>
            <h2 className="lq-t28">{step.title}</h2>
            {step.lessonTitle && <p className="lq-t13 lq-c2">From {step.lessonTitle}</p>}
          </div>
          <div className="sg-player-actions">
            <IconButton icon="prev" label="Previous part" onClick={() => go(active - 1)} disabled={active === 0} variant="fill" />
            <CompleteButton done={done.has(step.id)} onComplete={() => complete(step)} doneLabel="Done">
              Mark complete
            </CompleteButton>
            <IconButton icon="next" label="Next part" onClick={() => go(active + 1)} disabled={active >= steps.length - 1} variant="fill" />
          </div>
          {pl.queue.length > 0 && (
            <section className="sg-stack" style={{ gap: 8 }}>
              <div className="sg-row" style={{ justifyContent: "space-between" }}>
                <p className="lq-t15" style={{ fontWeight: 650, margin: 0 }}>
                  In this part · {pl.queue.length} clips
                </p>
                {clip && (
                  <button type="button" className="sg-chip" onClick={() => setClip(null)}>
                    Back to the main video
                  </button>
                )}
              </div>
              <ClipCards clips={pl.queue} playingId={clip ?? pl.playingClipId} onPlay={setClip} />
            </section>
          )}
          {step.table && (
            <section className="sg-stack" style={{ gap: 8 }}>
              <p className="lq-t15" style={{ fontWeight: 650, margin: 0 }}>
                Today&apos;s table
              </p>
              <p className="lq-t13 lq-c2" style={{ margin: 0 }}>
                The program&apos;s standard table for this workout. Take the readiness check on the full day for a table matched to how you feel.
              </p>
              <CircuitTable table={step.table} />
            </section>
          )}
          {step.body && (
            <Glass radius="card" className="sg-card">
              {step.body
                .replace(/^NOTES:\s*/i, "")
                .split(/\n+/)
                .map((l) => l.trim())
                .filter(Boolean)
                .slice(0, 24)
                .map((l, i) => (
                  <p key={i} className="lq-t15">
                    {l}
                  </p>
                ))}
            </Glass>
          )}
        </div>

        <aside className="sg-player-rail sg-stack" aria-label="Session parts">
          <ol className="sg-steps lq-glass">
            {steps.map((s, i) => (
              <li key={s.id}>
                <button type="button" className="sg-step" aria-current={i === active ? "step" : undefined} onClick={() => go(i)}>
                  <span className="sg-step-n" data-done={done.has(s.id) ? "" : undefined}>
                    {done.has(s.id) ? <Icon name="check" /> : i + 1}
                  </span>
                  <span className="sg-step-t">
                    <span className="lq-t15 sg-ellipsis" style={{ fontWeight: 600 }}>
                      {s.title}
                    </span>
                    <span className="lq-t12 lq-c2 sg-ellipsis">
                      {SLOT[s.slot]}
                      {s.lessonTitle ? ` · ${s.lessonTitle}` : ""}
                    </span>
                  </span>
                  <span className="lq-t12 lq-c2 sg-num">{s.minutes}′</span>
                </button>
              </li>
            ))}
          </ol>
          <Glass radius="card" className="sg-card">
            <div className="sg-row" style={{ justifyContent: "space-between" }}>
              <span className="lq-t13 lq-c2">Planned</span>
              <b className="lq-t15 sg-num">{planned} min</b>
            </div>
            <div className="sg-row" style={{ justifyContent: "space-between" }}>
              <span className="lq-t13 lq-c2">Started</span>
              <b className="lq-t15 sg-num">{new Date(session.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</b>
            </div>
            <Button variant="glass" size="md" icon="bookmark" onClick={toggleFav} aria-pressed={fav}>
              {fav ? "In your favourites" : "Save as favourite"}
            </Button>
          </Glass>
        </aside>
      </div>

      <Sheet
        open={finish}
        onClose={() => setFinish(false)}
        title={ended ? "Session logged" : "Finish your session"}
        description={ended ? undefined : `${done.size} of ${steps.length} parts done`}
        footer={
          ended ? (
            <div className="sg-stack" style={{ gap: 8 }}>
              <Button block icon="repeat" variant="fill" onClick={again}>
                Do it again another day
              </Button>
              <Button block href={`/programs/${program.slug}?mode=self-guided`}>
                Back to {program.name}
              </Button>
            </div>
          ) : (
            <Button block icon="check" onClick={end} aria-busy={saving || undefined}>
              Log {minutes} minutes
            </Button>
          )
        }
      >
        {ended ? (
          <div className="sg-finish">
            <Completion variant="step" size={96} />
            <h3 className="lq-t22">{ended.minutes} minutes trained</h3>
            {ended.streak > 0 && (
              <p className="lq-t15 lq-c2">
                <Icon name="flame" size="sm" /> {ended.streak} day streak
              </p>
            )}
          </div>
        ) : (
          <div className="sg-stack">
            <div className="sg-finish">
              <p className="lq-t13 lq-c2">Minutes trained</p>
              <div className="sg-stepper">
                <IconButton icon="prev" label="Less" variant="fill" onClick={() => setMinutes((m) => Math.max(1, m - 1))} />
                <b>{minutes}</b>
                <IconButton icon="next" label="More" variant="fill" onClick={() => setMinutes((m) => Math.min(300, m + 1))} />
              </div>
            </div>
            <label className="sg-field">
              <span>Notes (weights, how it felt)</span>
              <textarea className="sg-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} placeholder="16kg for the deadlifts, hips felt open…" />
            </label>
          </div>
        )}
      </Sheet>
    </div>
  );
}
