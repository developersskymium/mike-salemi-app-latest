"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { NextAction, NextRecommendation } from "@ms/core";
import Image from "next/image";
import { Button, Icon, IconButton, Tag } from "@/components/ui";
import { CLIMB_LAYERS } from "@/components/signature";
import { MIKE_FACE } from "@/lib/program-photos";
import { LevelEmblem, MovementFigure } from "@/components/graphics";
import { markSeenAction } from "@/lib/actions/training";

/**
 * Shown once per member across devices (server `seen_markers`). Offline or in preview the
 * marker falls back to this device's storage so the screen still shows only once here.
 */
export function useSeenOnce(key: string, enabled: boolean) {
  const [show, setShow] = useState(false);
  const [settled, setSettled] = useState(false);
  const check = useCallback(async () => {
    const local = `trn-seen:${key}`;
    const r = await markSeenAction(key);
    if (r.ok) {
      if (r.first) setShow(true);
      setSettled(true);
      try {
        localStorage.setItem(local, "1");
      } catch {}
      return;
    }
    let seen = false;
    try {
      seen = localStorage.getItem(local) === "1";
      localStorage.setItem(local, "1");
    } catch {}
    if (!seen) setShow(true);
    setSettled(true);
  }, [key]);
  useEffect(() => {
    // The check is async (server marker first); state only changes after it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enabled) void check();
  }, [enabled, check]);
  /** Third value: the check has finished (or isn't needed), so `show` is final for now. */
  return [show, () => setShow(false), settled || !enabled] as const;
}

/** Light, dismissible popup (bottom sheet on a phone, centred card on desktop). */
function Gate({ label, children, onClose }: { label: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="kd-gate" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" className="kd-gate-scrim" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div className="kd-gate-card lq-glass" data-level="thick" data-float="" tabIndex={-1} ref={(el) => el?.focus({ preventScroll: true })}>
        <IconButton icon="close" label="Close" variant="plain" size="sm" iconSize="sm" className="kd-gate-x" onClick={onClose} />
        {children}
      </div>
    </div>
  );
}

/** Start of day: context, "It's a new day, name.", the intro, Steps and Time, Start. */
export function DayStart({
  onClose, name, context, intro, entryLabel, steps, minutes,
}: { onClose: () => void; name: string; context: string; intro: string; entryLabel: string; steps: number; minutes: number }) {
  return (
    <Gate label="Start of day" onClose={onClose}>
      <span className="kd-gate-ic" aria-hidden>
        <Icon name="sun" size="lg" />
      </span>
      <p className="kd-eyebrow kd-eyebrow-now">{context}</p>
      <h2 className="lq-t28 kd-gate-title">{name ? `It's a new day, ${name}.` : "It's a new day."}</h2>
      {intro && <p className="lq-t15 lq-c2 kd-gate-body">{intro}</p>}
      <div className="kd-gate-stats">
        <div>
          <p className="kd-eyebrow">Steps</p>
          <p className="lq-t20 lq-num">{steps}</p>
        </div>
        <div>
          <p className="kd-eyebrow">Time</p>
          <p className="lq-t20 lq-num">
            <Icon name="clock" size="sm" />
            {minutes ? `${minutes} min` : "Flexible"}
          </p>
        </div>
      </div>
      <Button block iconAfter="chevron" onClick={onClose}>
        Start {entryLabel}
      </Button>
      <p className="lq-t13 lq-c2">Press Esc any time to jump straight in.</p>
    </Gate>
  );
}

export interface DayEndContext {
  /** "Level I · Phase 2" */
  context: string;
  dayNumber: number | null;
  /** "Workout III" */
  dayName: string;
  minutes: number;
  /** Days of the level done (after today) and total. */
  levelDays?: { done: number; total: number } | null;
  phase?: { title: string; done: number; total: number } | null;
  /** What comes next (photo card). */
  upNext?: { eyebrow: string; title: string; sub: string; photo: string; position?: string } | null;
  /** Beyond the summit: a progress-tied next step (e.g. Mastering the Kettlebell). */
  getReady?: { eyebrow: string; title: string; href: string; cta: string } | null;
  homeHref?: string;
}

/** The day-complete moment (mockup 07): the scene, "Day N, done.", stats, phase progress, what's next, beyond the summit. */
export function DayEnd({
  onClose, name, kind, entryLabel, dayTitle, steps, next, onAction, levelNumber, certificateHref, offer, ctx,
}: {
  onClose: () => void;
  name: string;
  /** day | phase | level: the biggest thing just finished. */
  kind: "day" | "phase" | "level";
  entryLabel: string;
  dayTitle: string;
  steps: number;
  next: NextRecommendation;
  onAction: (a: NextAction) => void;
  levelNumber?: number;
  certificateHref?: string | null;
  offer?: ReactNode;
  ctx?: DayEndContext;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const heading = kind === "level" ? "Level complete" : kind === "phase" ? "Phase complete" : "Day complete";
  const title = kind === "level" ? "Summit reached." : kind === "phase" ? `${ctx?.phase?.title ?? "Phase"}, done.` : ctx?.dayNumber != null ? `Day ${ctx.dayNumber}, done.` : `${entryLabel}, done.`;
  const lede =
    kind === "level"
      ? `Every day of the level is in the bank${name ? `, ${name}` : ""}. That's the summit.`
      : ctx?.dayNumber != null
        ? `${ctx.dayName} is in the bank — ${ctx.dayNumber} ${ctx.dayNumber === 1 ? "day" : "days"} up the mountain.`
        : `You've crushed another day. Every one of the ${steps} steps in ${dayTitle} is logged.`;
  return (
    <div className="kd-end" role="dialog" aria-modal="true" aria-label={heading}>
      <div className="kd-end-in" tabIndex={-1} ref={(el) => el?.focus({ preventScroll: true })}>
        <IconButton icon="close" label="Close" variant="fill" size="sm" iconSize="sm" className="kd-end-x" onClick={onClose} />
        <div className="kd-end-scene" aria-hidden>
          <Tag tone="warm" size="lg" className="kd-end-tag">
            {heading}
          </Tag>
          {kind === "level" && levelNumber ? (
            <span className="kd-end-emblem">
              <LevelEmblem level={levelNumber} size={120} tier="gold" />
            </span>
          ) : (
            <EndScene />
          )}
          <span className="kd-end-confetti">
            {Array.from({ length: 22 }, (_, i) => (
              <i key={i} style={{ ["--x" as string]: `${(i * 37) % 100}%`, ["--d" as string]: `${(i % 7) * 90}ms`, ["--r" as string]: `${(i * 53) % 360}deg` }} data-c={i % 3} />
            ))}
          </span>
        </div>
        {ctx?.context && <p className="lq-eyebrow kd-end-eye" data-tone="accent">{ctx.context}</p>}
        <h2 className="lq-d-xl kd-end-t">{title}</h2>
        <p className="kd-end-lede">{lede}</p>

        <div className="kd-end-stats">
          <div>
            <b className="lq-dnum">
              {steps}/{steps}
            </b>
            <span>steps</span>
          </div>
          <div>
            <b className="lq-dnum">
              {ctx?.minutes || "—"}
              <small>min</small>
            </b>
            <span>trained</span>
          </div>
          {ctx?.levelDays ? (
            <div>
              <b className="lq-dnum kd-end-warm">
                {ctx.levelDays.done}
                <small>/{ctx.levelDays.total}</small>
              </b>
              <span>days up</span>
            </div>
          ) : null}
        </div>

        {ctx?.phase && ctx.phase.total > 0 && (
          <div className="kd-end-card">
            <div className="kd-end-row">
              <b className="lq-d-xs">{ctx.phase.title} progress</b>
              <span className="lq-t13 lq-c3 lq-num">
                <b className="lq-c1">{ctx.phase.done}</b> of {ctx.phase.total} days
              </span>
            </div>
            <div className="kd-end-segs" aria-hidden>
              {Array.from({ length: ctx.phase.total }, (_, i) => (
                <i key={i} data-on={i < ctx.phase!.done ? "" : undefined} data-new={i === ctx.phase!.done - 1 ? "" : undefined} />
              ))}
            </div>
          </div>
        )}

        <p className="lq-eyebrow kd-end-h">What&apos;s next</p>
        <button type="button" className="kd-end-next lq-press" onClick={() => (certificateHref ? (window.location.href = certificateHref) : onAction(next.primary))}>
          {ctx?.upNext ? (
            <>
              <span className="kd-end-next-ph">
                <Image src={ctx.upNext.photo} alt="" fill sizes="120px" style={{ objectPosition: ctx.upNext.position ?? "50% 30%" }} />
              </span>
              <span className="kd-end-next-t">
                <span className="kd-end-pill">{ctx.upNext.eyebrow}</span>
                <b className="lq-d-sm">{ctx.upNext.title}</b>
                <span className="lq-t13 lq-c3">{ctx.upNext.sub}</span>
              </span>
            </>
          ) : (
            <span className="kd-end-next-t">
              <span className="kd-end-pill">{next.eyebrow}</span>
              <b className="lq-d-sm">{next.title}</b>
              <span className="lq-t13 lq-c3">{next.detail}</span>
            </span>
          )}
        </button>
        {ctx?.upNext && next.detail && <p className="lq-t13 lq-c3 kd-end-why">{next.detail}</p>}

        {ctx?.getReady && (
          <a href={ctx.getReady.href} className="kd-end-ready lq-press">
            <span>
              <span className="lq-eyebrow" data-tone="accent">
                {ctx.getReady.eyebrow}
              </span>
              <b>{ctx.getReady.title}</b>
            </span>
            <span className="lq-btn" data-variant="secondary" data-size="sm">
              <span>{ctx.getReady.cta}</span>
            </span>
          </a>
        )}
        {offer}

        <div className="kd-end-links">
          {next.secondary && !certificateHref && (
            <button type="button" className="kd-link" onClick={() => onAction(next.secondary!)}>
              {next.secondary.label}
            </button>
          )}
          <button type="button" className="kd-link" onClick={onClose}>
            Stay on this day
          </button>
          {ctx?.homeHref && (
            <a href={ctx.homeHref} className="kd-link">
              Back to Home
            </a>
          )}
        </div>

        <div className="kd-end-bar">
          {certificateHref ? (
            <Button block size="lg" icon="sparkle" href={certificateHref}>
              Get your certificate
            </Button>
          ) : (
            <Button block size="lg" iconAfter="chevron" onClick={() => onAction(next.primary)}>
              {next.primary.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Flat daytime scene (mockup 07): the Climb's mountain layers, the swinging figure on the trail, Mike cheering from the corner. */
function EndScene() {
  const H = 560;
  // A broad Shasta cone like The Climb (a thin needle read as a different style, D19): long shoulders, a rounded summit.
  const outline = `M0 ${H - 18} C 60 ${H - 26}, 140 ${H - 44}, 220 ${H - 70} C 330 ${H - 110}, 440 ${H - 180}, 540 ${H - 260} C 620 ${H - 330}, 680 ${H - 420}, 730 ${H - 470} C 750 ${H - 486}, 764 ${H - 492}, 780 ${H - 492} C 796 ${H - 492}, 812 ${H - 484}, 832 ${H - 462} C 880 ${H - 400}, 930 ${H - 320}, 1000 ${H - 270}`;
  const a = { W: 1000, H, id: "kd-end", outline };
  return (
    <span className="kd-end-art">
      <svg viewBox={`0 0 1000 ${H}`} preserveAspectRatio="xMidYMax slice">
        {CLIMB_LAYERS.sky(a)}
        {CLIMB_LAYERS.range(a)}
        {CLIMB_LAYERS.mountain(a)}
        {CLIMB_LAYERS.snow(a)}
        {CLIMB_LAYERS.ground(a)}
        {CLIMB_LAYERS.trees(a)}
      </svg>
      <span className="kd-end-mover">
        <MovementFigure move="swing" size={176} animated trace={false} />
      </span>
      <span className="kd-end-fig">
        <Image src={MIKE_FACE} alt="" width={120} height={120} />
      </span>
    </span>
  );
}
