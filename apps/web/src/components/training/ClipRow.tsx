"use client";

import type { Clip } from "@ms/core";
import { DayGlyph, type DayType } from "@/components/graphics";
import { clock } from "./model";

/** A step's demo clips as a compact horizontal row: small 16:9 thumb, title, duration, state. */
export function ClipRow({ clips, playingId, nextId, glyph, onPlay, label }: { clips: Clip[]; playingId?: string | null; nextId?: string | null; glyph: DayType; onPlay: (id: string) => void; label: string }) {
  if (!clips.length) return null;
  return (
    <ul className="trn-clips" aria-label={label} data-single={clips.length === 1 ? "" : undefined}>
      {clips.map((c, i) => {
        const playing = c.providerId === playingId;
        const upNext = !playing && c.providerId === nextId;
        return (
          <li key={c.providerId + i}>
            <button type="button" className="trn-clip" data-playing={playing ? "" : undefined} onClick={() => onPlay(c.providerId)} aria-label={`Play ${c.title.trim()}`}>
              <span className="trn-clip-th">
                {c.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailUrl} alt="" loading="lazy" />
                ) : (
                  <DayGlyph type={glyph} size={22} tone="mono" title="" />
                )}
                {c.durationSeconds ? <span className="trn-clip-dur lq-num">{clock(c.durationSeconds)}</span> : null}
              </span>
              <span className="trn-clip-txt">
                <span className="lq-t15 trn-clip-t">{c.title.trim()}</span>
                <span className="lq-t13 trn-clip-s" data-on={playing ? "" : undefined}>
                  {playing ? (
                    <>
                      <span className="trn-eq" aria-hidden>
                        <i />
                        <i />
                        <i />
                      </span>
                      Playing
                    </>
                  ) : upNext ? (
                    "Up next"
                  ) : (
                    `Clip ${i + 1} of ${clips.length}`
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
