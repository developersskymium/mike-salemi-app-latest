"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { sessionTimeline, type PhaseSession, type RoadmapMovement } from "@ms/core";
import { Flare } from "@/components/signature/Flare";
import { Button, Icon } from "@/components/ui";
import { finishSessionAction, startSessionAction } from "@/lib/actions/roadmap";
import { Clip } from "./Clip";

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, "0")}`;
const KIND_LABEL = { warmup: "Warm-up", breath: "Breath training", decompress: "Decompression", movement: "Movement" } as const;

/**
 * The phase session follow-along, in the format of Mike's workout video: warm-up and breath videos, then
 * movement blocks on two tracks (Level I / Level II side by side, the member's track marked) with a teaching
 * set, 20 s work intervals and rest blocks, Mike's clip looping as the demo, and a total-time clock.
 */
export function SessionPlayer({ session, movements, preview }: { session: PhaseSession; movements: RoadmapMovement[]; preview?: { at: number; elapsed: number } }) {
  const steps = useMemo(() => sessionTimeline(session), [session]);
  const [phase, setPhase] = useState<"intro" | "play" | "done" | "stopped">(preview ? "play" : "intro");
  const [at, setAt] = useState(preview?.at ?? 0);
  const [left, setLeft] = useState(steps[preview?.at ?? 0]?.seconds ?? 0);
  const [running, setRunning] = useState(!preview);
  const [elapsed, setElapsed] = useState(preview?.elapsed ?? 0);
  const [stopAsk, setStopAsk] = useState(false);
  const id = useRef<string | null>(null);

  const step = steps[at];
  const block = step ? session.blocks[step.block]! : null;
  const remainingTotal = steps.slice(at + 1).reduce((s, x) => s + x.seconds, 0) + left;

  useEffect(() => {
    if (phase !== "play" || !running) return;
    const t = window.setInterval(() => {
      setElapsed((e) => e + 1);
      setLeft((l) => l - 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, running]);

  useEffect(() => {
    if (phase !== "play" || left > 0) return;
    if (at + 1 >= steps.length) {
      setPhase("done");
      void finishSessionAction(id.current, "done", { seconds: elapsed });
      return;
    }
    setAt(at + 1);
    setLeft(steps[at + 1]!.seconds);
  }, [left, at, phase, steps, elapsed]);

  const skipTo = (i: number) => {
    if (i >= steps.length) {
      setPhase("done");
      void finishSessionAction(id.current, "done", { seconds: elapsed });
      return;
    }
    setAt(i);
    setLeft(steps[i]!.seconds);
  };
  const nextBlock = () => {
    const i = steps.findIndex((s, k) => k > at && s.block !== step!.block);
    skipTo(i < 0 ? steps.length : i);
  };
  const begin = async () => {
    setPhase("play");
    setRunning(true);
    const r = await startSessionAction();
    if (r.ok) id.current = r.id;
  };

  const outline = (
    <ol className="rm-outline">
      {session.blocks.map((b, i) => (
        <li key={i} data-on={block && step?.block === i ? "" : undefined} data-done={step && i < step.block ? "" : undefined}>
          <span className="rm-outline-k lq-t12">{KIND_LABEL[b.kind]}</span>
          <span className="lq-t15">{b.kind === "movement" ? (b.track === 1 ? b.level1 : b.level2) : b.title}</span>
          <span className="lq-t12 lq-c2">{mmss(b.seconds)}</span>
        </li>
      ))}
    </ol>
  );

  if (phase === "intro")
    return (
      <div className="rm-page rm-narrow">
        <div className="rm-panel rm-raised">
          <p className="lq-eyebrow" data-tone="accent">Phase {session.phase} session</p>
          <h1 className="lq-d-lg">{session.recovery ? "Recovery day: breath and decompression" : `Today's session, ${Math.round(session.totalSeconds / 60)} minutes`}</h1>
          <p className="lq-lede lq-c2">
            {session.recovery
              ? "Your readiness check today said recover, so this session is breath work and decompression stretches only."
              : "Built the way Mike builds them: warm-up, breath training, your movements on two tracks, then decompression for the spine."}
          </p>
          {outline}
          <ul className="rm-checks" aria-label="Rules this session passed">
            {session.checks.map((c) => <li key={c.rule} data-ok={c.ok ? "" : undefined}><Icon name={c.ok ? "check" : "close"} size="xs" />{c.rule}</li>)}
          </ul>
          <div className="rm-row">
            <Button variant="filled" size="lg" icon="play" onClick={begin}>Start session</Button>
            <Button variant="ghost" size="lg" href="/tools/roadmap">Back to the map</Button>
          </div>
          <p className="lq-t12 lq-c2">Pain, dizziness or shortness of breath ends the session. The stop button is always on screen.</p>
        </div>
      </div>
    );

  if (phase === "done" || phase === "stopped")
    return (
      <div className="rm-page rm-narrow">
        <div className="rm-panel rm-raised rm-result" data-celebrate={phase === "done" ? "" : undefined}>
          {phase === "done" && <span className="rm-flare"><Flare size={120} /></span>}
          <p className="lq-eyebrow" data-tone="warm">{phase === "done" ? "Session done" : "Session stopped"}</p>
          <h1 className="lq-d-lg">{phase === "done" ? `${mmss(elapsed)} of work, logged` : "Good call to stop"}</h1>
          <p className="lq-lede lq-c2">{phase === "done" ? "Practise this week, then re-test the node you're closest to passing." : "Rest. If the pain or dizziness doesn't settle, check in with a professional before training again."}</p>
          <div className="rm-row"><Button variant="filled" size="lg" href="/tools/roadmap" iconAfter="arrowRight">Back to my Roadmap</Button></div>
        </div>
      </div>
    );

  const mv = block?.kind === "movement" ? movements.find((m) => m.key === block.movement) : null;
  const pct = step ? 1 - left / step.seconds : 0;
  return (
    <div className="rm-player" data-shell-focus="">
      <header className="rm-player-bar">
        <Link href="/tools/roadmap" className="rm-icon" aria-label="Leave the session"><Icon name="close" size="sm" /></Link>
        <span className="lq-t13"><b>Phase {session.phase}</b> · {block ? KIND_LABEL[block.kind] : ""}</span>
        <span className="rm-total"><span className="lq-t12 lq-c2">Total time</span><b className="lq-dnum">{mmss(remainingTotal)}</b></span>
      </header>

      <div className="rm-player-main">
        <div className="rm-stage">
          {block && block.kind !== "movement" && step && (
            <div className="rm-video">
              <iframe
                src={`https://player.vimeo.com/video/${block.video.providerId}?${new URLSearchParams({ ...(block.video.hash ? { h: block.video.hash } : {}), dnt: "1", title: "0", byline: "0", portrait: "0", playsinline: "1" })}`}
                title={block.video.title}
                allow="autoplay; fullscreen; picture-in-picture"
              />
            </div>
          )}
          {block?.kind === "movement" && step && (
            <div className="rm-move">
              <div className="rm-move-clip"><Clip clip={mv?.clip ?? null} title={block.title} note={mv?.clipNote} /></div>
              <div className="rm-move-tracks">
                {([1, 2] as const).map((t) => (
                  <div key={t} className="rm-track" data-mine={block.track === t ? "" : undefined}>
                    <span className="lq-t12">Level {t === 1 ? "I" : "II"}{block.track === t ? " · your track" : ""}</span>
                    <b className="lq-d-sm">{t === 1 ? block.level1 : block.level2}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="rm-side">
          {step && (
            <div className="rm-interval" data-kind={step.kind}>
              <span className="rm-ring" style={{ "--p": pct } as React.CSSProperties} aria-hidden />
              <span className="rm-interval-in">
                <span className="lq-t13">{step.kind === "video" ? "Follow the video" : step.label}{step.round ? ` · round ${step.round} of ${block?.kind === "movement" ? block.rounds : ""}` : ""}</span>
                <b className="rm-interval-n lq-dnum" aria-live="off">{mmss(left)}</b>
              </span>
            </div>
          )}
          <div className="rm-controls">
            <Button variant="glass" size="md" icon={running ? "pause" : "play"} onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Resume"}</Button>
            <Button variant="glass" size="md" iconAfter="next" onClick={() => skipTo(at + 1)}>Skip</Button>
            <Button variant="ghost" size="md" onClick={nextBlock}>Next block</Button>
          </div>
          {outline}
          <div className="rm-stop">
            {stopAsk ? (
              <span className="rm-stop-ask">
                <span className="lq-t13">Stop the session?</span>
                <Button variant="ink" size="sm" onClick={() => { setPhase("stopped"); void finishSessionAction(id.current, "stopped", { seconds: elapsed, reason: "pain/dizziness" }); }}>Stop</Button>
                <Button variant="ghost" size="sm" onClick={() => setStopAsk(false)}>Keep going</Button>
              </span>
            ) : (
              <button type="button" className="rm-link rm-link-stop" onClick={() => { setRunning(false); setStopAsk(true); }}><Icon name="info" size="xs" /> Pain or dizziness? Stop</button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
