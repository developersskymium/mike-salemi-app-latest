"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { NextAction, NextRecommendation } from "@ms/core";
import { Button, Icon, IconButton } from "@/components/ui";
import { Completion, LevelEmblem } from "@/components/graphics";
import { markSeenAction } from "@/lib/actions/training";

/**
 * Shown once per member across devices (server `seen_markers`). Offline or in preview the
 * marker falls back to this device's storage so the screen still shows only once here.
 */
export function useSeenOnce(key: string, enabled: boolean) {
  const [show, setShow] = useState(false);
  const check = useCallback(async () => {
    const local = `trn-seen:${key}`;
    const r = await markSeenAction(key);
    if (r.ok) {
      if (r.first) setShow(true);
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
  }, [key]);
  useEffect(() => {
    // The check is async (server marker first); state only changes after it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enabled) void check();
  }, [enabled, check]);
  return [show, () => setShow(false)] as const;
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

/** End of day: the moment, congratulations, what's next (coloured by readiness), stay. */
export function DayEnd({
  onClose, name, kind, entryLabel, dayTitle, steps, next, onAction, levelNumber, certificateHref, offer,
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
}) {
  const heading = kind === "level" ? "Level complete" : kind === "phase" ? "Phase complete" : `${entryLabel} complete`;
  return (
    <Gate label={heading} onClose={onClose}>
      <div className="kd-gate-moment" aria-hidden>
        {kind === "level" && levelNumber ? <LevelEmblem level={levelNumber} size={104} tier="gold" /> : <Completion variant={kind === "day" ? "step" : "milestone"} size={kind === "day" ? 96 : 180} />}
      </div>
      <p className="kd-eyebrow kd-eyebrow-now">{heading}</p>
      <h2 className="lq-t28 kd-gate-title">{name ? `Congratulations, ${name}!` : "Congratulations!"}</h2>
      <p className="lq-t15 lq-c2 kd-gate-body">
        You&apos;ve crushed another day. Every one of the {steps} steps in {dayTitle} is logged.
      </p>
      <div className="kd-gate-next" data-tone={next.tone}>
        <p className="kd-eyebrow kd-eyebrow-now">
          <Icon name="compass" size="xs" />
          {next.eyebrow}
        </p>
        <p className="lq-t15 kd-gate-next-t">{next.title}</p>
        <p className="lq-t13 lq-c2">{next.detail}</p>
      </div>
      {certificateHref ? (
        <Button block icon="sparkle" href={certificateHref}>
          Get your certificate
        </Button>
      ) : (
        <Button block iconAfter="chevron" onClick={() => onAction(next.primary)}>
          {next.primary.label}
        </Button>
      )}
      {next.secondary && !certificateHref && (
        <Button block variant="fill" onClick={() => onAction(next.secondary!)}>
          {next.secondary.label}
        </Button>
      )}
      <button type="button" className="kd-link kd-gate-stay" onClick={onClose}>
        Stay on this day
      </button>
      {offer}
    </Gate>
  );
}
