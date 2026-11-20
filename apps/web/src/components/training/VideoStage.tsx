"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { embedUrl, isWatched, type VideoRef } from "@ms/core";
import { Button, Chip, Icon, IconButton } from "@/components/ui";
import { clock } from "./model";

type VimeoPlayer = {
  on: (e: string, cb: (d: { seconds: number; duration: number; percent: number }) => void) => void;
  off: (e: string) => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  setCurrentTime: (s: number) => Promise<number>;
  destroy: () => Promise<void>;
};

export interface StageProps {
  /** What plays; null renders the poster/children only. */
  video: (VideoRef & { title?: string }) | null;
  poster: string | null;
  title: string;
  /** Top-left label ("Main video", "Clip 2 of 8"). */
  badge?: string;
  /** Start playing as soon as the stage mounts (autoplay-next, clip queue). */
  autoStart?: boolean;
  /** Saved position for "Resume". */
  resumeAt?: number;
  onProgress?: (seconds: number, duration: number) => void;
  /** Crossed 95% (fires once). */
  onWatched?: () => void;
  onEnded?: () => void;
  /** Overlay drawn above the player (Up next countdown). Stays visible in fullscreen. */
  overlay?: ReactNode;
  /** Content when there's no video (readiness, completion moments). */
  children?: ReactNode;
  /** Called with a function that pauses playback (readiness sheet opening). */
  pauseRef?: React.RefObject<(() => void) | null>;
}

/**
 * The video stage. Poster first (no third-party load until the member presses play),
 * then the Vimeo embed (privacy hash supported) driven over the Player API for resume,
 * 95% auto-complete and the playlist. Fullscreen is requested on the stage itself so
 * the "Up next" overlay stays visible.
 */
export function VideoStage({ video, poster, title, badge, autoStart, resumeAt = 0, onProgress, onWatched, onEnded, overlay, children, pauseRef }: StageProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<VimeoPlayer | null>(null);
  const [playing, setPlaying] = useState(Boolean(autoStart && video));
  const [showResume, setShowResume] = useState(resumeAt > 8);
  const [t, setT] = useState({ s: 0, d: video?.durationSeconds ?? 0 });
  const [lowRes, setLowRes] = useState(false);
  const watched = useRef(false);
  const cb = useRef({ onProgress, onWatched, onEnded });
  useEffect(() => {
    cb.current = { onProgress, onWatched, onEnded };
  });

  useEffect(() => {
    if (!playing || !frame.current) return;
    let alive = true;
    void import("@vimeo/player").then(({ default: Player }) => {
      if (!alive || !frame.current) return;
      const p = new Player(frame.current) as unknown as VimeoPlayer;
      player.current = p;
      p.on("timeupdate", (d) => {
        setT({ s: d.seconds, d: d.duration });
        cb.current.onProgress?.(d.seconds, d.duration);
        if (!watched.current && isWatched(d.seconds, d.duration)) {
          watched.current = true;
          cb.current.onWatched?.();
        }
      });
      p.on("ended", () => cb.current.onEnded?.());
    });
    return () => {
      alive = false;
      void player.current?.destroy().catch(() => {});
      player.current = null;
    };
  }, [playing]);

  useEffect(() => {
    if (!pauseRef) return;
    pauseRef.current = () => void player.current?.pause().catch(() => {});
  }, [pauseRef]);

  // Keep the overlay visible in fullscreen: promote the stage when Vimeo fullscreened its iframe.
  useEffect(() => {
    if (!overlay) return;
    const fs = document.fullscreenElement;
    if (fs && fs !== wrap.current && wrap.current?.contains(fs)) {
      void Promise.resolve(document.exitFullscreen?.())
        .then(() => wrap.current?.requestFullscreen?.())
        .catch(() => {});
    }
  }, [overlay]);

  const fullscreen = () => {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => {});
  };

  const progress = t.d ? t.s / t.d : 0;

  return (
    <div ref={wrap} className="trn-stage" data-playing={playing ? "" : undefined}>
      {poster && !playing && (
        <div className="trn-stage-poster" data-lowres={lowRes ? "" : undefined}>
          <Image src={poster} alt="" fill sizes="96px" className="trn-stage-poster-bg" aria-hidden />
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 1024px) 900px, 100vw"
            priority
            className="trn-stage-poster-fg"
            onLoad={(e) => {
              // Small artwork stays crisp: shown contained over its own blurred field instead of upscaled.
              const img = e.currentTarget;
              const w = wrap.current?.clientWidth ?? 0;
              if (img.naturalWidth && img.naturalWidth < w * 1.2) setLowRes(true);
            }}
          />
        </div>
      )}
      {!poster && !playing && <div className="trn-stage-blank" aria-hidden />}

      {video && playing && (
        <iframe
          ref={frame}
          className="trn-stage-frame"
          src={embedUrl(video, { autoplay: true, startAt: 0 })}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      )}

      {video && !playing && (
        <>
          <div className="trn-stage-scrim" aria-hidden />
          <button type="button" className="trn-play lq-glass lq-fx lq-press" data-level="clear" data-fx="" aria-label={`Play ${title}`} onClick={() => setPlaying(true)}>
            <Icon name="play" size="lg" />
          </button>
          {badge && (
            <Chip variant="clear" className="trn-stage-badge">
              {badge}
            </Chip>
          )}
          <div className="trn-stage-foot">
            <span className="lq-t15 trn-stage-title">{video.title ?? title}</span>
            {resumeAt > 8 ? <span className="lq-t13 lq-num">Paused at {clock(resumeAt)}</span> : video.durationSeconds ? <span className="lq-t13 lq-num">{clock(video.durationSeconds)}</span> : null}
          </div>
        </>
      )}

      {!video && children}

      {video && playing && showResume && !overlay && (
        <div className="trn-resume lq-glass" data-level="clear-deep">
          <span className="lq-t13">Resume at {clock(resumeAt)}?</span>
          <Button
            size="sm"
            variant="white"
            onClick={() => {
              void player.current?.setCurrentTime(resumeAt).catch(() => {});
              setShowResume(false);
            }}
          >
            Resume
          </Button>
          <IconButton icon="close" label="Start from the beginning" variant="clear" size="sm" iconSize="xs" onClick={() => setShowResume(false)} />
        </div>
      )}

      {video && playing && (
        <>
          <i className="trn-stage-progress" aria-hidden style={{ transform: `scaleX(${progress})` }} />
          <IconButton icon="fullscreen" label="Full screen" variant="clear" size="sm" iconSize="sm" className="trn-stage-fs" onClick={fullscreen} />
        </>
      )}

      {overlay}
    </div>
  );
}

/** "Up next" countdown over the stage. A ring drains over `seconds`; Play now / Cancel. */
export function UpNext({ title, label = "Up next", seconds = 5, onGo, onCancel }: { title: string; label?: string; seconds?: number; onGo: () => void; onCancel: () => void }) {
  const [left, setLeft] = useState(seconds);
  const go = useRef(onGo);
  useEffect(() => {
    go.current = onGo;
  });
  useEffect(() => {
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const l = Math.max(0, seconds - (performance.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0) {
        window.clearInterval(id);
        go.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [seconds]);
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <div className="trn-upnext" role="status" aria-live="polite">
      <div className="trn-upnext-card lq-glass" data-level="clear-deep">
        <button type="button" className="trn-upnext-ring" onClick={onGo} aria-label={`Play ${title} now`}>
          <svg viewBox="0 0 64 64" width={64} height={64} aria-hidden>
            <circle cx="32" cy="32" r={R} className="trn-upnext-track" />
            <circle cx="32" cy="32" r={R} className="trn-upnext-arc" strokeDasharray={C} strokeDashoffset={C * (1 - left / seconds)} transform="rotate(-90 32 32)" />
          </svg>
          <span className="lq-t17 lq-num">{Math.ceil(left)}</span>
        </button>
        <div className="trn-upnext-t">
          <span className="lq-t13">{label}</span>
          <b className="lq-t17 trn-ellipsis">{title}</b>
        </div>
        <div className="trn-upnext-actions">
          <Button size="sm" variant="white" icon="play" onClick={onGo}>
            Play now
          </Button>
          <Button size="sm" variant="plain" className="trn-upnext-cancel" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
