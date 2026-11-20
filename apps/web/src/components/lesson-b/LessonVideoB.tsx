"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { embedUrl, type VideoRef } from "@ms/core";
import { clock } from "@/components/course/CourseVideo";
import { PlayFill } from "@/components/course/glyphs";
import "@/components/course/course.css";
import "./lesson-b.css";

type VimeoPlayer = {
  on: (e: string, cb: (d: { seconds: number; duration: number }) => void) => void;
  setCurrentTime: (s: number) => Promise<number>;
  destroy: () => Promise<void>;
};

const remoteOk = (u: string | null | undefined) => Boolean(u && (/^https:\/\/i\.vimeocdn\.com\//.test(u) || u.startsWith("/")));

interface Props {
  video: (VideoRef & { title?: string | null }) | null;
  directUrl?: string | null;
  poster: string | null;
  title: string;
  fallbackImage?: string | null;
  kicker?: string;
  autoStart?: boolean;
  resumeAt?: number;
  /** Audio-only: the picture collapses to a slim bar, sound keeps playing (talk lessons). */
  audio?: boolean;
  onProgress?: (seconds: number, duration: number) => void;
  /** Crossed 90% (fires once). */
  onNinety?: () => void;
  onEnded?: () => void;
}

/**
 * Lesson video for the journeys-b player (spec 12, lesson ideas 4, 5, 9): resumes at the last
 * second by itself ("Resumed at 4:12" for 2 s, with Start over), reports 90% watched, reports the
 * end (for the "Next in 5 s" countdown) and has an audio-only presentation. Poster first: no
 * third-party load until play.
 */
export function LessonVideoB({ video, directUrl, poster, title, fallbackImage, kicker, autoStart, resumeAt = 0, audio, onProgress, onNinety, onEnded }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<VimeoPlayer | null>(null);
  const [playing, setPlaying] = useState(Boolean(autoStart));
  const [progress, setProgress] = useState(0);
  const [resumed, setResumed] = useState<number | null>(null);
  const ninety = useRef(false);
  const cb = useRef({ onProgress, onNinety, onEnded });
  useEffect(() => {
    cb.current = { onProgress, onNinety, onEnded };
  });

  const tick = (seconds: number, duration: number) => {
    setProgress(duration ? seconds / duration : 0);
    cb.current.onProgress?.(seconds, duration);
    if (!ninety.current && duration > 0 && seconds / duration >= 0.9) {
      ninety.current = true;
      cb.current.onNinety?.();
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
      if (resumeAt > 8) {
        void p.setCurrentTime(resumeAt).then(() => alive && setResumed(resumeAt)).catch(() => {});
      }
    });
    return () => {
      alive = false;
      void player.current?.destroy().catch(() => {});
      player.current = null;
    };
  }, [playing, video]);

  useEffect(() => {
    if (resumed === null) return;
    const t = window.setTimeout(() => setResumed(null), 2000);
    return () => window.clearTimeout(t);
  }, [resumed]);

  const [posterFailed, setPosterFailed] = useState(false);
  const hasPoster = remoteOk(poster) && !posterFailed;
  const playable = Boolean(video || directUrl);
  const duration = video?.durationSeconds ?? null;

  return (
    <div className="crs-video lb-video" data-audio={audio ? "" : undefined}>
      {!playing && (
        <div className="crs-video-poster" aria-hidden>
          {hasPoster ? (
            <Image src={poster!} alt="" fill sizes="(min-width: 1024px) 860px, 100vw" onError={() => setPosterFailed(true)} />
          ) : (
            <div className="crs-fallback">
              {fallbackImage && <Image src={fallbackImage} alt="" fill sizes="(min-width: 1024px) 860px, 100vw" />}
              {kicker && <span className="crs-fallback-k">{kicker}</span>}
              <span className="crs-fallback-t">{title}</span>
            </div>
          )}
        </div>
      )}
      {playing && video && (
        <iframe ref={frame} src={embedUrl(video, { autoplay: true })} title={title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
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
            if (resumeAt > 8) {
              e.currentTarget.currentTime = resumeAt;
              setResumed(resumeAt);
            }
          }}
        />
      )}
      {!playing && playable && (
        <button type="button" className="crs-video-cover" aria-label={`Play ${title}`} onClick={() => setPlaying(true)}>
          <span className="crs-play"><PlayFill /></span>
          <span className="crs-video-cap">
            <span className="crs-ellipsis">{audio ? `Listen · ${title}` : hasPoster ? video?.title || title : ""}</span>
            {resumeAt > 8 ? <span>Resumes at {clock(resumeAt)}</span> : duration ? <span>{clock(duration)}</span> : null}
          </span>
        </button>
      )}
      {resumed !== null && (
        <div className="lb-resumed" role="status">
          Resumed at {clock(resumed)}
          <button
            type="button"
            onClick={() => {
              void player.current?.setCurrentTime(0).catch(() => {});
              setResumed(null);
            }}
          >
            Start over
          </button>
        </div>
      )}
      {playing && <span className="crs-video-bar" aria-hidden><i style={{ "--p": progress } as CSSProperties} /></span>}
    </div>
  );
}
