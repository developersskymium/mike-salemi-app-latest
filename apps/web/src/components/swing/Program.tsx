"use client";

import { SWING_PROGRAM, type SwingSession } from "@ms/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { NumberStepper } from "@/components/intake/QuestionShell";
import { Button, Icon } from "@/components/ui";
import type { ProgramRun } from "@/lib/swing";
import { checklistFor } from "./modes";
import { SpeechToggle, useSpeech } from "./Sequence";

type Feel = "easy" | "right" | "hard";
export interface LoggedSet { set_no: number; reps: number; feel: Feel | null }

const SIZES = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40];
const doneSessions = (run: ProgramRun | null) => new Set((run?.sets ?? []).map((s) => s.session));

/** The 2-week program home: bell, the six sessions, what's next. */
export function ProgramHome({
  run,
  suggestedKg,
  neck,
  onStart,
  onLog,
  onExit,
}: {
  run: ProgramRun | null;
  suggestedKg: number;
  neck: boolean;
  onStart: (kg: number) => Promise<ProgramRun | null>;
  onLog: (run: ProgramRun, session: number, sets: LoggedSet[]) => Promise<void>;
  onExit: () => void;
}) {
  const [active, setActive] = useState<ProgramRun | null>(run && !run.finished_at ? run : null);
  const [kgIdx, setKgIdx] = useState(Math.max(0, SIZES.findIndex((s) => s >= suggestedKg)));
  const [playing, setPlaying] = useState<SwingSession | null>(null);
  const [busy, setBusy] = useState(false);
  const done = doneSessions(active);
  const next = SWING_PROGRAM.find((s) => !done.has(s.n)) ?? null;

  if (playing && active)
    return (
      <EmomSession
        session={playing}
        bellKg={active.bell_kg}
        neck={neck}
        onExit={() => setPlaying(null)}
        onSave={async (sets) => {
          await onLog(active, playing.n, sets);
          setActive({ ...active, sets: [...active.sets, ...sets.map((s) => ({ ...s, session: playing.n, created_at: new Date().toISOString() }))] });
          setPlaying(null);
        }}
      />
    );

  return (
    <div className="sw-page sw-prog">
      <button type="button" className="sw-back" onClick={onExit}><Icon name="back" size="xs" /> Swing Set-Up Coach</button>
      <header className="sw-prog-head">
        <h1 className="sw-h1">2-Week Swing Program</h1>
        <p className="sw-body sw-c2">Six sessions on the minute. Do your reps at the top of each minute; the rest of the minute is rest, and the Approach before the next set.</p>
      </header>

      {!active ? (
        <section className="sw-card sw-prog-start" aria-labelledby="sw-bell-h">
          <h2 id="sw-bell-h" className="sw-h2">Your bell for the two weeks</h2>
          <p className="sw-body sw-c2">Mike’s starting point is about 16 kg for men and 8 kg for women. Pick one you can swing 14 times with your best set-up.</p>
          <NumberStepper label="Bell weight" value={kgIdx} min={0} max={SIZES.length - 1} onChange={setKgIdx} format={(i) => `${SIZES[i]} kg`} />
          <div className="sw-actions">
            <Button variant="filled" size="lg" disabled={busy} onClick={async () => { setBusy(true); const r = await onStart(SIZES[kgIdx]!); setBusy(false); if (r) setActive(r); }}>Start the program</Button>
          </div>
        </section>
      ) : (
        <>
          <ol className="sw-sessions" aria-label="Sessions">
            {SWING_PROGRAM.map((s) => {
              const isDone = done.has(s.n);
              const isNext = next?.n === s.n;
              return (
                <li key={s.n} className="sw-session" data-state={isDone ? "done" : isNext ? "next" : undefined}>
                  <span className="sw-session-n">{isDone ? <Icon name="check" size="xs" /> : s.n}</span>
                  <span className="sw-session-body">
                    <b>Session {s.n}</b>
                    <small>{s.sets} sets × {s.reps} swings · {s.sets} min · {active.bell_kg} kg</small>
                  </span>
                  {isNext ? (
                    <Button variant="filled" size="md" icon="play" onClick={() => setPlaying(s)}>Start</Button>
                  ) : (
                    <Button variant="plain" size="sm" onClick={() => setPlaying(s)}>{isDone ? "Again" : "Open"}</Button>
                  )}
                </li>
              );
            })}
          </ol>
          {!next && <p className="sw-body sw-done-note"><b>Two weeks done.</b> Run it again with one more set per session, or move up a bell and start back at session 1.</p>}
          <section className="sw-extras" aria-labelledby="sw-extras-h">
            <h2 id="sw-extras-h" className="sw-h3">When you run it on its own, add</h2>
            <p className="sw-body sw-c2">Goblet squats, reverse hypers and side plank raises: 2–4 sets of 8–12.</p>
          </section>
        </>
      )}
    </div>
  );
}

type Phase = "ready" | "work" | "rest" | "log";

/** On-the-minute timer: reps at the top of each minute, the Approach in the rest, then the log. */
export function EmomSession({ session, bellKg, neck, onExit, onSave }: { session: SwingSession; bellKg: number; neck: boolean; onExit: () => void; onSave: (sets: LoggedSet[]) => Promise<void> }) {
  const speech = useSpeech();
  const [phase, setPhase] = useState<Phase>("ready");
  const [set, setSet] = useState(0);
  const [left, setLeft] = useState(10);
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState<LoggedSet[]>(() => Array.from({ length: session.sets }, (_, i) => ({ set_no: i + 1, reps: session.reps, feel: null })));
  const [saving, setSaving] = useState(false);
  const cues = useMemo(() => checklistFor(neck), [neck]);
  const said = useRef("");
  const say = (key: string, t: string) => {
    if (said.current === key) return;
    said.current = key;
    speech.say(t);
  };

  /** The top of the next minute: first set after the countdown, then each set, then the log. */
  const nextMinute = () => {
    if (phase === "ready") {
      setPhase("work");
      setLeft(60);
    } else if (set + 1 >= session.sets) {
      setPhase("log");
    } else {
      setSet((s) => s + 1);
      setPhase("work");
      setLeft(60);
    }
  };
  const tick = useRef(nextMinute);
  useEffect(() => {
    tick.current = nextMinute;
  });

  useEffect(() => {
    if (phase === "log" || paused) return;
    const t = window.setTimeout(() => (left <= 1 ? tick.current() : setLeft(left - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [left, paused, phase, set, session.sets]);

  useEffect(() => {
    if (phase === "ready") say("ready", `Session ${session.n}. ${session.sets} sets of ${session.reps}. Set up behind the bell.`);
    if (phase === "work") say(`w${set}`, `Set ${set + 1}. ${session.reps} swings. Go.`);
    if (phase === "rest" && left === 10) say(`r${set}`, "Ten seconds. Step up to the bell.");
  });

  if (phase === "log")
    return (
      <div className="sw-focus" data-shell-focus>
        <header className="sw-focus-top">
          <span />
          <p className="sw-focus-title">Session {session.n} · log</p>
          <span />
        </header>
        <section className="sw-panel sw-narrow" aria-labelledby="sw-log-h">
          <h1 id="sw-log-h" className="sw-h1">How did it go?</h1>
          <p className="sw-body sw-c2">Reps done and how each set felt. This shapes your next cycle.</p>
          <ol className="sw-log">
            {log.map((l, i) => (
              <li key={i}>
                <span className="sw-log-n">Set {l.set_no}</span>
                <NumberStepper label={`Set ${l.set_no} reps`} value={l.reps} min={0} max={40} onChange={(v) => setLog((x) => x.map((y, k) => (k === i ? { ...y, reps: v } : y)))} format={(v) => `${v}`} />
                <span className="sw-feel" role="radiogroup" aria-label={`Set ${l.set_no} feel`}>
                  {(["easy", "right", "hard"] as Feel[]).map((f) => (
                    <button key={f} type="button" role="radio" aria-checked={l.feel === f} onClick={() => setLog((x) => x.map((y, k) => (k === i ? { ...y, feel: f } : y)))}>
                      {f === "right" ? "Just right" : f === "easy" ? "Easy" : "Hard"}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ol>
          <div className="sw-actions">
            <Button variant="filled" size="lg" disabled={saving} onClick={async () => { setSaving(true); await onSave(log); setSaving(false); }}>Save session</Button>
            <Button variant="ghost" size="lg" onClick={onExit}>Discard</Button>
          </div>
        </section>
      </div>
    );

  const cue = cues[Math.floor((60 - left) / 4) % cues.length]!;
  const R = 92;
  const C = 2 * Math.PI * R;
  const total = phase === "ready" ? 10 : 60;
  return (
    <div className="sw-focus sw-emom" data-shell-focus data-phase={phase}>
      <header className="sw-focus-top">
        <button type="button" className="sw-icon" aria-label="End the session" onClick={onExit}><Icon name="close" size="sm" /></button>
        <p className="sw-focus-title">Session {session.n} · {bellKg} kg</p>
        <SpeechToggle speech={speech} />
      </header>
      <ol className="sw-seq-track sw-emom-track" aria-label={`Set ${set + 1} of ${session.sets}`}>
        {Array.from({ length: session.sets }, (_, k) => <li key={k} data-s={k < set || (k === set && phase === "rest") ? "done" : k === set && phase === "work" ? "now" : undefined} />)}
      </ol>
      <div className="sw-emom-stage">
        <div className="sw-emom-clock">
          <svg viewBox="0 0 200 200" aria-hidden>
            <circle cx="100" cy="100" r={R} className="sw-ring-track" />
            <circle cx="100" cy="100" r={R} className="sw-ring-arc" strokeDasharray={C} strokeDashoffset={C * (1 - left / total)} />
          </svg>
          <span className="sw-emom-time" role="timer" aria-live="off">{left}</span>
          <span className="sw-emom-unit">seconds</span>
        </div>
        <div className="sw-emom-text" aria-live="polite">
          {phase === "ready" && (<><p className="sw-seq-group">Get ready</p><h2 className="sw-seq-title">Stand 2–3 ft behind the bell</h2><p className="sw-seq-detail">Three belly breaths. Picture the rep. Step up right, then left.</p></>)}
          {phase === "work" && (<><p className="sw-seq-group">Set {set + 1} of {session.sets}</p><h2 className="sw-seq-title">{session.reps} swings</h2><p className="sw-seq-detail">Tap Done when the bell is parked. The rest of the minute is yours.</p></>)}
          {phase === "rest" && (<><p className="sw-seq-group">Rest · the Approach for set {set + 2 <= session.sets ? set + 2 : set + 1}</p><h2 className="sw-seq-title">{cue.cue.charAt(0).toUpperCase() + cue.cue.slice(1)}</h2><p className="sw-seq-detail">{cue.step}</p></>)}
        </div>
      </div>
      <div className="sw-seq-actions">
        <Button variant="secondary" size="md" icon={paused ? "play" : "pause"} onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</Button>
        {phase === "work" && <Button variant="filled" size="md" icon="check" onClick={() => (set + 1 >= session.sets ? setPhase("log") : setPhase("rest"))}>Done</Button>}
        {phase === "ready" && <Button variant="ghost" size="md" onClick={nextMinute}>Start now</Button>}
      </div>
    </div>
  );
}
