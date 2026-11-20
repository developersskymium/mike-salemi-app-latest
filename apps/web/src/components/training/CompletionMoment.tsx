"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { MIKE_FACE } from "@/lib/program-photos";

const SECONDS = 5;

/**
 * The day's last step: an enamel day medal with an ember burst and a little confetti, the day in
 * numbers, a word from Mike, and a 5-second countdown that marks the step complete on its own
 * ("Not yet" stops it). Calls `onComplete` at most once.
 */
export function CompletionMoment({
  dayNumber, dayLabel, title, minutes, stepsDone, stepsTotal, readiness, done, canAuto, firstName, onComplete,
}: {
  dayNumber: number | null;
  dayLabel: string;
  title: string;
  minutes: number;
  stepsDone: number;
  stepsTotal: number;
  readiness: string | null;
  done: boolean;
  /** Countdown allowed (step open, not a preview, not already complete). */
  canAuto: boolean;
  firstName: string;
  onComplete: () => void;
}) {
  const [left, setLeft] = useState(SECONDS);
  const [stopped, setStopped] = useState(false);
  const fired = useRef(false);
  const cb = useRef(onComplete);
  useEffect(() => {
    cb.current = onComplete;
  });
  const running = canAuto && !done && !stopped;

  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const remain = Math.max(0, SECONDS - Math.floor((Date.now() - started) / 1000));
      setLeft(remain);
      if (remain <= 0) {
        window.clearInterval(id);
        if (!fired.current) {
          fired.current = true;
          cb.current();
        }
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <section className="kcm kd-card kd-in" data-done={done ? "" : undefined} aria-labelledby="kcm-h">
      <div className="kcm-stage" aria-hidden>
        <span className="kcm-glow" />
        <span className="kcm-rays">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ transform: `rotate(${i * 30}deg)` }} />
          ))}
        </span>
        <span className="kcm-confetti">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ ["--i" as string]: i } as React.CSSProperties} />
          ))}
        </span>
        <svg className="kcm-medal" viewBox="0 0 120 120" width="120" height="120">
          <defs>
            <linearGradient id="kcm-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F6C978" />
              <stop offset=".55" stopColor="#E08A2E" />
              <stop offset="1" stopColor="#B85A16" />
            </linearGradient>
            <radialGradient id="kcm-face" cx=".38" cy=".32" r=".8">
              <stop offset="0" stopColor="#FF8A4C" />
              <stop offset=".6" stopColor="#E3541F" />
              <stop offset="1" stopColor="#A9360F" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="56" fill="url(#kcm-rim)" />
          <circle cx="60" cy="60" r="46" fill="url(#kcm-face)" />
          <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" strokeDasharray="2 4" />
          <path d="M34 44a30 30 0 0 1 40-14" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="5" strokeLinecap="round" />
          {dayNumber != null ? (
            <>
              <text x="60" y="52" textAnchor="middle" fill="#FFE7CF" style={{ font: "700 10px/1 var(--font)", letterSpacing: ".18em" }}>
                DAY
              </text>
              <text x="60" y="80" textAnchor="middle" fill="#fff" style={{ font: "800 30px/1 var(--font-display, var(--font))" }}>
                {dayNumber}
              </text>
            </>
          ) : (
            <path d="M44 61l11 11 22-24" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>

      <p className="kcm-eyebrow">{done ? `${dayLabel} complete` : `${dayLabel} · last step`}</p>
      <h3 id="kcm-h" className="kcm-title">{title}</h3>

      <ul className="kcm-stats lq-num">
        <li>
          <b>{minutes || "—"}</b>
          <span>minutes</span>
        </li>
        <li>
          <b>
            {stepsDone}/{stepsTotal}
          </b>
          <span>steps done</span>
        </li>
        {readiness && (
          <li>
            <b>{readiness}</b>
            <span>readiness</span>
          </li>
        )}
      </ul>

      <div className="kcm-mike">
        <span className="kcm-av">
          <Image src={MIKE_FACE} alt="" width={40} height={40} />
        </span>
        <p>
          <b>Mike</b>
          {firstName ? `Strong work, ${firstName}. ` : "Strong work. "}
          Rest up — the next one builds on today.
        </p>
      </div>

      {done ? (
        <p className="kcm-state" role="status">
          <Icon name="check" size="xs" /> Day saved
        </p>
      ) : running ? (
        <div className="kcm-count" role="status" aria-live="polite">
          <span className="kcm-ring" style={{ ["--p" as string]: (SECONDS - left) / SECONDS } as React.CSSProperties} aria-hidden>
            <span className="lq-num">{left}</span>
          </span>
          <span>Completing in {left}…</span>
          <button type="button" className="kcm-stop lq-press" onClick={() => setStopped(true)}>
            Not yet
          </button>
        </div>
      ) : canAuto ? (
        <p className="kcm-state">Paused. Mark this step complete when you&apos;re ready.</p>
      ) : null}
    </section>
  );
}
