"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { NextRecommendation } from "@ms/core";
import { Button, Icon } from "@/components/ui";
import { Completion, DayGlyph, LevelEmblem, type DayType } from "@/components/graphics";
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

function Gate({ label, children, onClose, image }: { label: string; children: ReactNode; onClose: () => void; image?: string | null }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="trn-gate" role="dialog" aria-modal="true" aria-label={label}>
      {image && (
        <div className="trn-gate-bg" aria-hidden>
          <Image src={image} alt="" fill sizes="96px" />
        </div>
      )}
      <div className="trn-gate-card lq-glass" data-level="thick" tabIndex={-1} ref={(el) => el?.focus({ preventScroll: true })}>
        {children}
      </div>
    </div>
  );
}

export function DayStart({
  onClose, name, eyebrow, title, glyph, focus, steps, minutes, image,
}: { onClose: () => void; name: string; eyebrow: string; title: string; glyph: DayType; focus: string | null; steps: number; minutes: number; image: string | null }) {
  return (
    <Gate label="Start of day" onClose={onClose} image={image}>
      <div className="trn-gate-glyph" aria-hidden>
        <DayGlyph type={glyph} size={56} strokeWidth={1.4} />
      </div>
      <p className="lq-t13 lq-c2 trn-eyebrow">{eyebrow}</p>
      <h2 className="lq-t34 trn-gate-title">{name ? `It's a new day, ${name}.` : "It's a new day."}</h2>
      <p className="lq-t17">{title}</p>
      {focus && <p className="lq-t15 lq-c2 trn-gate-body">{focus}</p>}
      <div className="trn-gate-meta lq-t15">
        <span>
          <Icon name="steps" size="sm" />
          <span className="lq-num">{steps} steps</span>
        </span>
        {minutes > 0 && (
          <span>
            <Icon name="timer" size="sm" />
            <span className="lq-num">About {minutes} min</span>
          </span>
        )}
      </div>
      <Button block icon="play" onClick={onClose} >
        Begin
      </Button>
    </Gate>
  );
}

export function DayEnd({
  onClose, name, title, next, onNext, kind, levelNumber, certificateHref, offer,
}: {
  onClose: () => void;
  name: string;
  title: string;
  next: NextRecommendation;
  onNext: () => void;
  /** day | phase | level: the biggest thing just finished. */
  kind: "day" | "phase" | "level";
  levelNumber?: number;
  certificateHref?: string | null;
  offer?: ReactNode;
}) {
  const heading = kind === "level" ? "Level complete" : kind === "phase" ? "Phase complete" : "Day complete";
  return (
    <Gate label={heading} onClose={onClose}>
      <div className="trn-gate-moment" aria-hidden>
        {kind === "level" && levelNumber ? <LevelEmblem level={levelNumber} size={120} tier="gold" /> : <Completion variant={kind === "day" ? "step" : "milestone"} size={kind === "day" ? 150 : 260} />}
      </div>
      <p className="lq-t13 lq-c2 trn-eyebrow">{heading}</p>
      <h2 className="lq-t34 trn-gate-title">{name ? `Well done, ${name}.` : "Well done."}</h2>
      <p className="lq-t15 lq-c2">{title}</p>
      <div className="trn-next lq-glass">
        <p className="lq-t13 lq-c2 trn-eyebrow">{next.eyebrow}</p>
        <p className="lq-t17">{next.title}</p>
        <p className="lq-t13 lq-c2">{next.detail}</p>
      </div>
      {certificateHref ? (
        <Button block icon="sparkle" href={certificateHref}>
          Get your certificate
        </Button>
      ) : (
        <Button block icon={next.primary.kind === "lesson" ? "play" : "next"} onClick={onNext} >
          {next.primary.label}
        </Button>
      )}
      <Button block variant="plain" onClick={onClose}>
        Stay on this day
      </Button>
      {offer}
    </Gate>
  );
}
