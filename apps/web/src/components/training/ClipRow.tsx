"use client";

import { useEffect, useRef } from "react";
import type { Clip } from "@ms/core";
import { Icon } from "@/components/ui";
import { clock } from "./model";

/**
 * A step's clips as poster cards in a horizontal row (original "In this lesson · N clips"):
 * thumbnail, index, duration, a play / playing badge and the title underneath.
 * Pressing a card plays that clip on the stage.
 */
export function ClipCards({ clips, playingId, onPlay }: { clips: Clip[]; playingId?: string | null; onPlay: (id: string) => void }) {
  if (!clips.length) return null;
  return (
    <ul className="kd-clips" aria-label="Clips in this lesson">
      {clips.map((c, i) => (
        <li key={c.providerId + i}>
          <ClipCard clip={c} index={i} active={c.providerId === playingId} onPlay={() => onPlay(c.providerId)} />
        </li>
      ))}
    </ul>
  );
}

function ClipCard({ clip, index, active, onPlay }: { clip: Clip; index: number; active: boolean; onPlay: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);
  return (
    <button ref={ref} type="button" className="kd-clip lq-press" aria-current={active || undefined} onClick={onPlay}>
      <span className="kd-clip-th">
        {clip.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <span className="kd-clip-blank" aria-hidden />
        )}
        <span className="kd-clip-n lq-num">{index + 1}</span>
        {clip.durationSeconds ? <span className="kd-clip-d lq-num">{clock(clip.durationSeconds)}</span> : null}
        <span className="kd-clip-btn" aria-hidden>
          {active ? (
            <span className="kd-eq">
              <i />
              <i />
              <i />
            </span>
          ) : (
            <Icon name="play" size="xs" />
          )}
        </span>
      </span>
      <span className="lq-t13 kd-clip-t">{clip.title.trim()}</span>
    </button>
  );
}
