"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { saveVideoPositionAction } from "@/lib/actions/discover";

type VimeoLike = {
  ready: () => Promise<void>;
  on: (e: string, cb: (d: { seconds: number; duration: number }) => void) => void;
  setCurrentTime: (s: number) => Promise<number>;
  destroy: () => Promise<void>;
};

/**
 * Inline Vimeo player (privacy hash supported) that remembers where the member stopped:
 * resumes at `resumeAt`, saves the position every ~15 s, on pause and when closed (Continue watching).
 */
export function LibraryPlayer({ id, providerId, hash, title, resumeAt = 0, poster }: { id: string; providerId: string; hash: string | null; title: string; resumeAt?: number; /** Shown (with the title) until the player is ready, never a grey box. */ poster?: ReactNode }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const last = useRef({ seconds: resumeAt, duration: 0, saved: 0 });
  const src = `https://player.vimeo.com/video/${providerId}?${new URLSearchParams({
    ...(hash ? { h: hash } : {}),
    autoplay: "1",
    title: "0",
    byline: "0",
    portrait: "0",
    dnt: "1",
  })}`;

  useEffect(() => {
    if (!frame.current) return;
    let alive = true;
    let player: VimeoLike | null = null;
    const save = () => {
      const { seconds, duration, saved } = last.current;
      if (seconds < 5 || Math.abs(seconds - saved) < 3) return;
      last.current.saved = seconds;
      void saveVideoPositionAction(id, Math.floor(seconds), duration ? Math.round(duration) : null);
    };
    void import("@vimeo/player").then(({ default: Player }) => {
      if (!alive || !frame.current) return;
      player = new Player(frame.current) as unknown as VimeoLike;
      void player.ready().then(() => alive && setReady(true), () => {});
      player.on("play", () => alive && setReady(true));
      if (resumeAt > 8) void player.setCurrentTime(resumeAt).catch(() => {});
      player.on("timeupdate", (d) => {
        last.current.seconds = d.seconds;
        last.current.duration = d.duration;
        if (d.seconds - last.current.saved >= 15) save();
      });
      player.on("pause", save);
      player.on("ended", (d) => {
        last.current.seconds = d.duration || last.current.seconds;
        save();
      });
    });
    return () => {
      alive = false;
      save();
      void player?.destroy().catch(() => {});
    };
  }, [id, resumeAt]);

  return (
    <>
      <iframe ref={frame} src={src} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="w1-lib-frame" />
      {poster && (
        <div className="w1-lib-poster2" data-ready={ready ? "" : undefined} aria-hidden>
          {poster}
          <span className="w1-lib-poster2-cap">{title}</span>
        </div>
      )}
    </>
  );
}
