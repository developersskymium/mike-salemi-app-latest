"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { embedUrl, isWatched, type VideoRef } from "@ms/core";
import { Icon } from "@/components/ui";
import { clock } from "./model";
import { canAutoStart, overlayOpen, startPlayback, unmute } from "./autoplay";

type VimeoPlayer = {
  on: (e: string, cb: (d: { seconds: number; duration: number; percent: number }) => void) => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  setCurrentTime: (s: number) => Promise<number>;
  setMuted: (m: boolean) => Promise<boolean>;
  setVolume: (v: number) => Promise<number>;
  destroy: () => Promise<void>;
};

export interface StageProps {
  /** What plays; null renders the poster/children only. */
  video: (VideoRef & { title?: string }) | null;
  poster: string | null;
  title: string;
  /**
   * Autoplay is on: start as soon as the stage mounts (opening the day, moving between steps,
   * picking an additional video). Waits while the tab is hidden; never starts behind Workout mode.
   * Tries sound first, falls back to muted with a "Tap to unmute" chip.
   */
  autoStart?: boolean;
  /** Saved position for "Resume". */
  resumeAt?: number;
  onProgress?: (seconds: number, duration: number) => void;
  /** Crossed 95% (fires once). */
  onWatched?: () => void;
  onEnded?: () => void;
  /** Overlay drawn above the player (Up next countdown). Stays visible in fullscreen. */
  overlay?: ReactNode;
  /** Content when there's no video. */
  children?: ReactNode;
  /** Called with a function that pauses playback. */
  pauseRef?: React.RefObject<(() => void) | null>;
  /** Edge-to-edge (day player) or a rounded card (Self-Guided). */
  flush?: boolean;
}

/**
 * 16:9 video stage on black. Poster first (no third-party load until play, or straight in
 * when `autoStart`), then the Vimeo embed (privacy hash supported) over the Player API for
 * resume, 95% auto-complete and the playlist. The stage itself goes fullscreen so the
 * "Up next" overlay stays visible.
 */
export function VideoStage({ video, poster, title, autoStart, resumeAt = 0, onProgress, onWatched, onEnded, overlay, children, pauseRef, flush }: StageProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<VimeoPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mutedStart, setMutedStart] = useState(false);
  const started = useRef(false);
  const [showResume, setShowResume] = useState(resumeAt > 8);
  const [progress, setProgress] = useState(0);
  const watched = useRef(false);
  const cb = useRef({ onProgress, onWatched, onEnded });
  useEffect(() => {
    cb.current = { onProgress, onWatched, onEnded };
  });

  // Autoplay: start once per stage (each step / additional video remounts it), only when visible.
  useEffect(() => {
    if (!autoStart || !video || started.current) return;
    const tryStart = () => {
      if (started.current) return;
      if (!canAutoStart({ autoplay: true, hidden: document.visibilityState === "hidden", blocked: overlayOpen() })) return;
      started.current = true;
      setPlaying(true);
    };
    tryStart();
    if (started.current || overlayOpen()) return;
    const onVis = () => {
      if (document.visibilityState === "visible") tryStart();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [autoStart, video]);

  useEffect(() => {
    if (!playing || !frame.current) return;
    let alive = true;
    void import("@vimeo/player").then(({ default: Player }) => {
      if (!alive || !frame.current) return;
      const p = new Player(frame.current) as unknown as VimeoPlayer;
      player.current = p;
      p.on("timeupdate", (d) => {
        setProgress(d.duration ? d.seconds / d.duration : 0);
        cb.current.onProgress?.(d.seconds, d.duration);
        if (!watched.current && isWatched(d.seconds, d.duration)) {
          watched.current = true;
          cb.current.onWatched?.();
        }
      });
      p.on("ended", () => cb.current.onEnded?.());
      // The embed carries autoplay=1; play() makes it explicit and tells us if sound was refused.
      void startPlayback(p).then((how) => {
        if (alive && how === "muted") setMutedStart(true);
      });
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

  return (
    <div ref={wrap} className="kd-stage" data-flush={flush ? "" : undefined} data-playing={playing ? "" : undefined}>
      {poster && !playing && (
        <div className="kd-stage-poster" aria-hidden>
          <Image src={poster} alt="" fill sizes="(min-width: 1024px) 900px, 100vw" />
        </div>
      )}

      {video && playing && (
        <iframe
          ref={frame}
          className="kd-stage-frame"
          src={embedUrl(video, { autoplay: true, startAt: 0 })}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      )}

      {video && !playing && (
        <button type="button" className="kd-stage-cover" aria-label={`Play ${title}`} onClick={() => {
            started.current = true;
            setPlaying(true);
          }}>
          <span className="kd-play lq-press">
            <Icon name="play" size="lg" />
          </span>
          <span className="kd-stage-cap">
            <span className="lq-t15 kd-ellipsis">{video.title ?? title}</span>
            {resumeAt > 8 ? <span className="lq-t13 lq-num">Left off at {clock(resumeAt)}</span> : video.durationSeconds ? <span className="lq-t13 lq-num">{clock(video.durationSeconds)}</span> : null}
          </span>
        </button>
      )}

      {!video && children}

      {video && playing && showResume && !overlay && (
        <ResumePill
          seconds={resumeAt}
          onResume={() => {
            void player.current?.setCurrentTime(resumeAt).catch(() => {});
            setShowResume(false);
          }}
          onDismiss={() => setShowResume(false)}
        />
      )}

      {video && playing && mutedStart && (
        <button
          type="button"
          className="kd-unmute lq-glass lq-press"
          data-level="clear-deep"
          onClick={() => {
            setMutedStart(false);
            if (player.current) void unmute(player.current).catch(() => {});
          }}
        >
          <Icon name="speaker" size="sm" />
          <span className="lq-t13">Tap to unmute</span>
        </button>
      )}

      {video && playing && <i className="kd-stage-progress" aria-hidden style={{ transform: `scaleX(${progress})` }} />}

      {overlay}
    </div>
  );
}

/** "Left off at 1:24 · Resume · Start over", bottom-centre over the player. */
export function ResumePill({ seconds, onResume, onDismiss }: { seconds: number; onResume: () => void; onDismiss: () => void }) {
  return (
    <div className="kd-resume">
      <div className="kd-resume-pill lq-glass" data-level="clear-deep">
        <span className="lq-t13 lq-num">Left off at {clock(seconds)}</span>
        <button type="button" className="kd-resume-go" onClick={onResume}>
          Resume
        </button>
        <button type="button" className="kd-resume-x" onClick={onDismiss}>
          Start over
        </button>
      </div>
    </div>
  );
}

/**
 * "Up next" countdown over the whole player (readable in fullscreen): title, a draining ring
 * with the seconds left, "Starting automatically", Play now / Stay here.
 */
export function UpNext({ title, seconds = 6, onGo, onCancel }: { title: string; seconds?: number; onGo: () => void; onCancel: () => void }) {
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
  const R = 17;
  const C = 2 * Math.PI * R;
  return (
    <div className="kd-upnext" role="status" aria-live="polite">
      <div className="kd-upnext-card">
        <p className="kd-eyebrow kd-upnext-eyebrow">Up next</p>
        <p className="lq-t17 kd-upnext-title">{title}</p>
        <div className="kd-upnext-ring">
          <svg viewBox="0 0 40 40" aria-hidden>
            <circle cx="20" cy="20" r={R} className="kd-upnext-track" />
            <circle cx="20" cy="20" r={R} className="kd-upnext-arc" strokeDasharray={C} strokeDashoffset={C * (1 - left / seconds)} transform="rotate(-90 20 20)" />
          </svg>
          <span className="lq-num">{Math.ceil(left)}</span>
        </div>
        <p className="lq-t13 kd-upnext-sub">Starting automatically</p>
        <div className="kd-upnext-actions">
          <button type="button" className="kd-upnext-go lq-press" onClick={onGo}>
            Play now
            <Icon name="chevron" size="xs" />
          </button>
          <button type="button" className="kd-upnext-stay lq-press" onClick={onCancel}>
            Stay here
          </button>
        </div>
      </div>
    </div>
  );
}
