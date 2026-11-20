"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { embedUrl, isWatched, type VideoRef } from "@ms/core";
import { PlayFill } from "./glyphs";

type VimeoPlayer = {
  on: (e: string, cb: (d: { seconds: number; duration: number }) => void) => void;
  setCurrentTime: (s: number) => Promise<number>;
  destroy: () => Promise<void>;
};

export const clock = (s: number) => {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

const remoteOk = (u: string | null | undefined) => Boolean(u && (/^https:\/\/i\.vimeocdn\.com\//.test(u) || u.startsWith("/")));

interface Props {
  video: (VideoRef & { title?: string | null }) | null;
  /** Direct file (legacy host .mp4) when there is no Vimeo video. */
  directUrl?: string | null;
  poster: string | null;
  title: string;
  /** Program artwork for the designed fallback poster. */
  fallbackImage?: string | null;
  /** Small caps label on the fallback ("Lesson 3", "Clip 02"). */
  kicker?: string;
  autoStart?: boolean;
  resumeAt?: number;
  onProgress?: (seconds: number, duration: number) => void;
  /** Crossed 95% (fires once). */
  onWatched?: () => void;
  onEnded?: () => void;
  compact?: boolean;
}

/**
 * 16:9 lesson video. Poster first (no third-party load until play); Vimeo over the Player API for
 * resume, progress and the 95% auto-complete; direct files play natively. When a video has no
 * poster yet, a designed fallback (blurred program artwork, engraved title) — never an empty box.
 */
export function CourseVideo({ video, directUrl, poster, title, fallbackImage, kicker, autoStart, resumeAt = 0, onProgress, onWatched, onEnded, compact }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<VimeoPlayer | null>(null);
  const [playing, setPlaying] = useState(Boolean(autoStart));
  const [progress, setProgress] = useState(0);
  const [askResume, setAskResume] = useState(resumeAt > 8);
  const watched = useRef(false);
  const cb = useRef({ onProgress, onWatched, onEnded });
  useEffect(() => {
    cb.current = { onProgress, onWatched, onEnded };
  });

  const tick = (seconds: number, duration: number) => {
    setProgress(duration ? seconds / duration : 0);
    cb.current.onProgress?.(seconds, duration);
    if (!watched.current && isWatched(seconds, duration)) {
      watched.current = true;
      cb.current.onWatched?.();
    }
  };

  useEffect(() => {
    if (!playing || !video || !frame.current) return;
    let alive = true;
    void import("@vimeo/player").then(({ default: Player }) => {
      if (!alive || !frame.current) return;
      const p = new Player(frame.current) as unknown as VimeoPlayer;
      player.current = p;
      p.on("timeupdate", (d) => tick(d.seconds, d.duration));
      p.on("ended", () => cb.current.onEnded?.());
    });
    return () => {
      alive = false;
      void player.current?.destroy().catch(() => {});
      player.current = null;
    };
  }, [playing, video]);

  const duration = video?.durationSeconds ?? null;
  const [posterFailed, setPosterFailed] = useState(false);
  const hasPoster = remoteOk(poster) && !posterFailed;
  const playable = Boolean(video || directUrl);

  return (
    <div className="crs-video" data-compact={compact ? "" : undefined}>
      {!playing && (
        <div className="crs-video-poster" aria-hidden>
          {hasPoster ? (
            <Image src={poster!} alt="" fill sizes={compact ? "(min-width: 768px) 360px, 100vw" : "(min-width: 1024px) 760px, 100vw"} onError={() => setPosterFailed(true)} />
          ) : (
            <div className="crs-fallback">
              {fallbackImage && <Image src={fallbackImage} alt="" fill sizes="240px" />}
              {kicker && <span className="crs-fallback-k">{kicker}</span>}
              <span className="crs-fallback-t">{title}</span>
            </div>
          )}
        </div>
      )}

      {playing && video && (
        <iframe
          ref={frame}
          src={embedUrl(video, { autoplay: true })}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      )}
      {playing && !video && directUrl && (
        <video
          src={directUrl}
          title={title}
          controls
          autoPlay
          playsInline
          preload="metadata"
          onTimeUpdate={(e) => tick(e.currentTarget.currentTime, e.currentTarget.duration || 0)}
          onEnded={() => cb.current.onEnded?.()}
          onLoadedMetadata={(e) => {
            if (resumeAt > 8 && askResume) e.currentTarget.currentTime = resumeAt;
            setAskResume(false);
          }}
        />
      )}

      {!playing && playable && (
        <button type="button" className="crs-video-cover" aria-label={`Play ${title}`} onClick={() => setPlaying(true)}>
          <span className="crs-play"><PlayFill /></span>
          <span className="crs-video-cap">
            <span className="crs-ellipsis">{hasPoster ? video?.title || title : ""}</span>
            {resumeAt > 8 ? <span>Left off at {clock(resumeAt)}</span> : duration ? <span>{clock(duration)}</span> : null}
          </span>
        </button>
      )}

      {playing && video && askResume && (
        <div className="crs-resume" role="group" aria-label="Resume">
          Left off at {clock(resumeAt)}
          <button
            type="button"
            onClick={() => {
              void player.current?.setCurrentTime(resumeAt).catch(() => {});
              setAskResume(false);
            }}
          >
            Resume
          </button>
          <button type="button" onClick={() => setAskResume(false)}>Start over</button>
        </div>
      )}
      {playing && <span className="crs-video-bar" aria-hidden><i style={{ "--p": progress } as React.CSSProperties} /></span>}
    </div>
  );
}
