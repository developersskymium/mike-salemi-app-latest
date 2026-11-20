"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { WorkoutRow, WorkoutTable } from "@ms/core";
import { Button, Icon, haptic } from "@/components/ui";
import { CircuitBadge, CircuitTable } from "./CircuitTable";
import { circuitsOf, circuitWord, cleanBreak, clock, estimateMinutes, restUp, timeline, type Phase } from "./workout";
import "./workout.css";

const text = (v: unknown) => (v == null ? "" : String(v));
const tone = (intensity: string) => (/body ?weight/i.test(intensity) ? "bw" : /heavy|hard/i.test(intensity) ? "heavy" : /moderate/i.test(intensity) && !/light/i.test(intensity) ? "mod" : /light.*mod|mod.*light/i.test(intensity) ? "lm" : "light");

/**
 * Today's workout table as the mockup's "Session plan" card: Mike's 7-column table (unchanged
 * data and format) on desktop, superset cards with a Table view toggle on a phone, the rest-arrow
 * legend, Print, and Workout mode (a set/rest timer that follows the table's rows, rounds and rests).
 */
export function WorkoutCard({ table, onRetake, chosenFromReadiness, onFinished, finishLabel }: { table: WorkoutTable; onRetake?: () => void; chosenFromReadiness?: boolean; onFinished?: () => void; finishLabel?: string }) {
  const cs = useMemo(() => circuitsOf(table), [table]);
  const minutes = useMemo(() => estimateMinutes(table), [table]);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [mode, setMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  function print() {
    document.documentElement.setAttribute("data-printing", "workout");
    const done = () => document.documentElement.removeAttribute("data-printing");
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    window.setTimeout(done, 1500);
  }

  return (
    <section className="wk" aria-labelledby={`wk-h-${table.id}`} ref={printRef}>
      <header className="wk-head">
        <div>
          <p className="lq-eyebrow" data-tone="accent">
            Session plan
          </p>
          <h3 id={`wk-h-${table.id}`} className="lq-d-sm">
            <span className="wk-desk">Today&apos;s workout table</span>
            <span className="wk-phone">Today&apos;s workout</span>
          </h3>
        </div>
        <div className="wk-head-a">
          <span className="wk-chip wk-desk-i">
            <Icon name="steps" size="xs" />
            {circuitWord(cs)}
          </span>
          <span className="wk-chip wk-desk-i">
            <Icon name="timer" size="xs" />~{minutes} min
          </span>
          <button type="button" className="wk-link wk-phone-i" onClick={() => setView((v) => (v === "cards" ? "table" : "cards"))}>
            {view === "cards" ? "Table view" : "Card view"}
          </button>
          <Button size="sm" variant="secondary" icon="clipboard" onClick={print} className="wk-desk-i">
            Print
          </Button>
          <Button size="sm" icon="timer" onClick={() => setMode(true)}>
            Workout mode
          </Button>
        </div>
      </header>

      <div className="wk-table" data-view={view}>
        <CircuitTable table={table} />
      </div>
      <div className="wk-cards" data-view={view}>
        {cs.map((c, i) => (
          <article key={c.key} className="wk-c">
            <header>
              <CircuitBadge circuit={c.circuit} icon={c.icon ?? undefined} />
              <b>{c.rows.length > 1 ? `Superset ${cs.slice(0, i + 1).filter((x) => x.rows.length > 1).length}` : `Station ${c.circuit.replace(/^s/i, "") || ""}`.trim()}</b>
              <span className="lq-t12 lq-c3">
                {c.sets} {c.sets === 1 ? "set" : "sets"}
                {c.after ? ` · ${cleanBreak(c.after).replace(/^(\d+\s*\w+)\s+rest.*/i, "$1 rest after")}` : ""}
              </span>
            </header>
            {c.rows.map((r, ri) => (
              <div key={ri} className="wk-move">
                <b>{text(r.exercise)}</b>
                <div className="wk-tags">
                  <span className="wk-tag">
                    {text(r.reps)}
                    {c.sets > 1 ? ` × ${c.sets}` : ""}
                  </span>
                  {r.intensity ? (
                    <span className="wk-tag" data-tone={tone(text(r.intensity))}>
                      {text(r.intensity)}
                    </span>
                  ) : null}
                  {r.rest ? (
                    <span className="wk-tag">
                      <RestArrow row={r} />
                      {text(r.rest)} rest
                    </span>
                  ) : null}
                  {r.tempo ? <span className="wk-tag">{text(r.tempo)}</span> : null}
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>

      <footer className="wk-foot">
        <span className="wk-legend">
          <span>
            <RestArrow row={{ restDir: "down" }} /> Rest, then the next move
          </span>
          <span>
            <RestArrow row={{ restDir: "up" }} /> Rest, then repeat the superset
          </span>
        </span>
        {chosenFromReadiness && (
          <span className="lq-t12 lq-c3">
            Table chosen from your readiness score
            {onRetake && (
              <>
                {" · "}
                <button type="button" className="wk-link" onClick={onRetake}>
                  Retake
                </button>
              </>
            )}
          </span>
        )}
      </footer>
      {mode && <WorkoutMode table={table} onClose={() => setMode(false)} onFinished={onFinished} finishLabel={finishLabel} />}
    </section>
  );
}

function RestArrow({ row }: { row: { restDir?: unknown; restIcon?: unknown } }) {
  const up = restUp(row as WorkoutRow);
  return (
    <svg viewBox="0 0 16 20" className="wk-arrow" data-up={up ? "" : undefined} aria-hidden>
      {up ? <path d="M4 19 V5 M4 5 L1 8 M4 5 L7 8 M4 5 C 4 2, 9 1, 11 4" /> : <path d="M8 1 V17 M8 17 L4 13 M8 17 L12 13" />}
    </svg>
  );
}

/* ================================================================== Workout mode */

function beep(ctx: AudioContext | null, freq = 880, ms = 120) {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000 + 0.02);
  } catch {}
}

/**
 * Set/rest timer that walks Mike's table: every move of every round (timed moves count down,
 * rep moves wait for "Done"), the rest after each move, the "repeat the superset" loop and the
 * breaks between circuits. Pause, skip, back, sound, and the screen stays awake.
 */
export function WorkoutMode({ table, onClose, onFinished, finishLabel = "Mark the workout complete" }: { table: WorkoutTable; onClose: () => void; onFinished?: () => void; finishLabel?: string }) {
  const phases = useMemo(() => timeline(table), [table]);
  const cs = useMemo(() => circuitsOf(table), [table]);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState<number>(() => phases[0]?.secs ?? 0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState(true);
  const [done, setDone] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const p: Phase | undefined = phases[i];
  const timed = p ? p.secs != null : false;

  const go = useCallback(
    (n: number) => {
      if (n >= phases.length) {
        setDone(true);
        setRunning(false);
        haptic(30);
        if (sound) beep(audio.current, 1046, 400);
        return;
      }
      const k = Math.max(0, n);
      setI(k);
      setLeft(phases[k]!.secs ?? 0);
      setElapsed(0);
      haptic(14);
    },
    [phases, sound],
  );

  // Tick.
  useEffect(() => {
    if (!running || done || !p) return;
    const t0 = performance.now();
    const start = left;
    const startEl = elapsed;
    const id = window.setInterval(() => {
      const dt = (performance.now() - t0) / 1000;
      if (p.secs != null) {
        const l = start - dt;
        if (Math.ceil(l) !== Math.ceil(l + 0.25) && Math.ceil(l) <= 3 && Math.ceil(l) > 0 && sound) beep(audio.current, 660, 90);
        if (l <= 0) {
          window.clearInterval(id);
          if (sound) beep(audio.current, 990, 220);
          go(i + 1);
        } else setLeft(l);
      } else setElapsed(startEl + dt);
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, i, done]);

  // Keep the screen awake while the timer runs.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (running && nav.wakeLock) nav.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [running]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", k);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.documentElement.style.overflow = "";
    };
  });

  function toggle() {
    if (!audio.current && typeof window !== "undefined") {
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        audio.current = AC ? new AC() : null;
      } catch {}
    }
    setRunning((r) => !r);
  }

  const workTotal = phases.filter((x) => x.kind === "work").length;
  const workDone = phases.slice(0, i).filter((x) => x.kind === "work").length;
  const nextWork = phases.slice(i + 1).find((x) => x.kind === "work") as Extract<Phase, { kind: "work" }> | undefined;
  const R = 92;
  const C = 2 * Math.PI * R;
  const frac = p && p.secs ? Math.max(0, Math.min(1, left / p.secs)) : 1;
  const ui = (
    <div className="wm" role="dialog" aria-modal="true" aria-label="Workout mode">
      <header className="wm-top">
        <button type="button" className="wm-x lq-press" onClick={onClose} aria-label="Close workout mode">
          <Icon name="close" size="sm" />
        </button>
        <div className="wm-top-t">
          <p>Workout mode</p>
          <b>{table.title.replace(/^\(#\d+\s*/, "").replace(/^\w+\)\s*/, "")}</b>
        </div>
        <button type="button" className="wm-x lq-press" onClick={() => setSound((s) => !s)} aria-label={sound ? "Mute sounds" : "Turn sounds on"} aria-pressed={sound}>
          <Icon name="speaker" size="sm" />
          {!sound && <i className="wm-mute" aria-hidden />}
        </button>
      </header>

      <div className="wm-prog" aria-hidden>
        <i style={{ width: `${(done ? 1 : workDone / Math.max(1, workTotal)) * 100}%` }} />
      </div>

      {done ? (
        <div className="wm-done">
          <span className="wm-done-ic">
            <Icon name="check" size="lg" />
          </span>
          <h2 className="lq-d-lg">Workout done.</h2>
          <p>
            {workTotal} sets across {cs.length} {cs.length === 1 ? "circuit" : "circuits"}. Breathe, then head into your stretching.
          </p>
          {onFinished && (
            <Button
              size="lg"
              icon="check"
              onClick={() => {
                onFinished();
                onClose();
              }}
            >
              {finishLabel}
            </Button>
          )}
          <button type="button" className="wm-link" onClick={onClose}>
            Back to the day
          </button>
        </div>
      ) : p ? (
        <div className="wm-main" data-kind={p.kind}>
          <p className="wm-where">
            {p.circuit.rows.length > 1 ? `Superset ${cs.slice(0, p.ci + 1).filter((c) => c.rows.length > 1).length}` : `Station ${p.circuit.circuit}`} · Round {p.round} of {p.circuit.sets}
          </p>
          <div className="wm-dial">
            <svg viewBox="0 0 200 200" aria-hidden>
              <circle cx="100" cy="100" r={R} className="wm-dial-t" />
              <circle cx="100" cy="100" r={R} className="wm-dial-a" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 100 100)" />
            </svg>
            <div className="wm-dial-c">
              <span className="wm-kind">{p.kind === "work" ? (timed ? "Work" : "Reps") : "Rest"}</span>
              <b className="lq-num" aria-live="off">
                {p.kind === "work" && !timed ? text(p.row.reps) || "Go" : clock(left)}
              </b>
              {p.kind === "work" && !timed && <span className="wm-sw lq-num">{clock(elapsed)}</span>}
            </div>
          </div>
          {p.kind === "work" ? (
            <div className="wm-move">
              <CircuitBadge circuit={p.circuit.circuit} icon={p.circuit.icon ?? undefined} />
              <h2 className="lq-d-md">{text(p.row.exercise)}</h2>
              <div className="wm-tags">
                {p.row.reps ? <span>{text(p.row.reps)}</span> : null}
                {p.row.intensity ? <span>{text(p.row.intensity)}</span> : null}
                {p.row.tempo ? <span>Tempo · {text(p.row.tempo)}</span> : null}
              </div>
            </div>
          ) : (
            <div className="wm-move">
              <h2 className="lq-d-md">{p.label}</h2>
              {p.nextName && <p className="wm-next">Up next · {p.nextName}</p>}
            </div>
          )}
          {p.kind === "work" && nextWork && <p className="wm-next">Then · {text(nextWork.row.exercise)}</p>}
        </div>
      ) : null}

      {!done && (
        <div className="wm-ctl">
          <button type="button" className="wm-btn lq-press" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Back">
            <Icon name="prev" />
          </button>
          {p?.kind === "work" && !timed ? (
            <button type="button" className="wm-go lq-press" onClick={() => go(i + 1)}>
              <Icon name="check" />
              <span>Done</span>
            </button>
          ) : (
            <button type="button" className="wm-go lq-press" onClick={toggle} aria-label={running ? "Pause" : "Start"}>
              <Icon name={running ? "pause" : "play"} />
              <span>{running ? "Pause" : i === 0 && left === (phases[0]?.secs ?? 0) ? "Start" : "Resume"}</span>
            </button>
          )}
          <button type="button" className="wm-btn lq-press" onClick={() => go(i + 1)} aria-label="Skip">
            <Icon name="next" />
          </button>
        </div>
      )}

      {!done && (
        <ol className="wm-list" aria-label="Sets">
          {cs.map((c, ci) => (
            <li key={c.key} data-now={p?.ci === ci ? "" : undefined} data-done={p && p.ci > ci ? "" : undefined}>
              <CircuitBadge circuit={c.circuit} icon={c.icon ?? undefined} />
              <span>
                {c.rows.map((r) => text(r.exercise)).join(" · ")}
                <small>
                  {c.sets} {c.sets === 1 ? "round" : "rounds"}
                </small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
