import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  RefreshCw,
  VideoOff,
} from "lucide-react";
import { vimeoEmbedBare } from "@/lib/vimeo";
import { useVimeoMeta } from "@/hooks/use-vimeo-meta";
import { cn } from "@/lib/utils";


type VimeoPlayerProps = {
  vimeoId: string;
  title: string;
  autoplay?: boolean;
  className?: string;
  /**
   * Stable key for remembering playback position. Usually the lesson id.
   * Omit to disable resume (e.g. short library previews).
   */
  resumeKey?: string;
};

const STORE_PREFIX = "kbl:resume:";
/** Ignore trivial positions and near-finished videos so resume never annoys. */
const MIN_RESUME_SECONDS = 20;
const END_MARGIN_SECONDS = 15;
/** Watching this much of a lesson video counts as watching it. */
const WATCHED_RATIO = 0.95;

function readResume(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STORE_PREFIX + key);
    const value = raw ? Number.parseFloat(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeResume(key: string, seconds: number) {
  try {
    if (seconds < MIN_RESUME_SECONDS) window.localStorage.removeItem(STORE_PREFIX + key);
    else window.localStorage.setItem(STORE_PREFIX + key, String(Math.floor(seconds)));
  } catch {
    /* storage unavailable — playback simply starts from zero next time */
  }
}

export function clearResume(key: string) {
  try {
    window.localStorage.removeItem(STORE_PREFIX + key);
  } catch {
    /* no-op */
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Vimeo embed with resume points.
 *
 * Playback position is tracked over the Vimeo player postMessage API (no extra
 * dependency) and stored locally, so reopening a lesson offers to pick up where
 * the user stopped instead of restarting a 20-minute session.
 */
/**
 * Tracks + restores playback position for a Vimeo iframe.
 * Shared by the library player and the full-bleed immersion stage.
 */
export function useVimeoResume(
  frameRef: React.RefObject<HTMLIFrameElement | null>,
  resumeKey: string | undefined,
  vimeoId: string,
  options?: {
    /**
     * Fires once per video when it is effectively watched (>= 95% or "ended").
     * Used to auto-complete a lesson without making the user hunt for a button.
     */
    onWatched?: () => void;
  },
) {
  const [resumeAt, setResumeAt] = useState(0);
  const [resumed, setResumed] = useState(false);
  const durationRef = useRef(0);
  const watchedRef = useRef(false);
  const playerRef = useRef<any>(null);
  /** Was the video actually playing when we paused it for an overlay? */
  const pausedByUsRef = useRef(false);
  const onWatchedRef = useRef(options?.onWatched);
  onWatchedRef.current = options?.onWatched;

  useEffect(() => {
    if (!resumeKey) return;
    setResumed(false);
    setResumeAt(readResume(resumeKey));
  }, [resumeKey, vimeoId]);

  useEffect(() => {
    if (!resumeKey) return undefined;
    const frame = frameRef.current;
    if (!frame) return undefined;
    watchedRef.current = false;
    durationRef.current = 0;

    let disposed = false;
    let player: any;

    function markWatched() {
      if (watchedRef.current) return;
      watchedRef.current = true;
      onWatchedRef.current?.();
    }

    // The raw postMessage handshake silently misses the one-shot "ready" event
    // when the iframe loads before the listener attaches, which left videos
    // never reporting their end. The official SDK attaches to a live iframe
    // and replays state, so completion always fires.
    void (async () => {
      const { default: Player } = await import("@vimeo/player");
      if (disposed) return;
      player = new Player(frame);
      playerRef.current = player;

      player.on("timeupdate", (d: { seconds: number; duration: number; percent: number }) => {
        durationRef.current = d.duration || durationRef.current;
        const nearEnd = d.duration > 0 && d.seconds > d.duration - END_MARGIN_SECONDS;
        writeResume(resumeKey!, nearEnd ? 0 : d.seconds);
        if ((d.percent ?? 0) >= WATCHED_RATIO) markWatched();
      });
      player.on("ended", () => {
        writeResume(resumeKey!, 0);
        markWatched();
      });
    })();

    return () => {
      disposed = true;
      playerRef.current = null;
      try {
        player?.unload?.();
        player?.destroy?.();
      } catch {
        /* iframe already gone */
      }
    };
  }, [frameRef, resumeKey, vimeoId]);



  function seek() {
    const win = frameRef.current?.contentWindow;
    if (win) {
      win.postMessage(JSON.stringify({ method: "setCurrentTime", value: resumeAt }), "*");
      win.postMessage(JSON.stringify({ method: "play" }), "*");
    }
    setResumed(true);
  }

  function dismiss() {
    if (resumeKey) clearResume(resumeKey);
    setResumed(true);
  }

  /**
   * Pause for an overlay (e.g. the readiness assessment popup). Vimeo keeps the
   * playhead where it is, so `resumePlayback` picks up on the exact frame.
   */
  const pausePlayback = useCallback(() => {
    const player = playerRef.current;
    const apply = (wasPlaying: boolean) => {
      pausedByUsRef.current = wasPlaying;
      if (wasPlaying) void player?.pause?.()?.catch?.(() => {});
    };
    if (player?.getPaused) {
      void player
        .getPaused()
        .then((paused: boolean) => apply(!paused))
        .catch(() => apply(true));
      return;
    }
    pausedByUsRef.current = true;
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ method: "pause" }), "*");
  }, [frameRef]);

  /** Resume exactly where the pause happened — only if we were the ones who paused. */
  const resumePlayback = useCallback(() => {
    if (!pausedByUsRef.current) return;
    pausedByUsRef.current = false;
    const player = playerRef.current;
    if (player?.play) {
      void player.play()?.catch?.(() => {});
      return;
    }
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ method: "play" }), "*");
  }, [frameRef]);

  return {
    resumeAt,
    show: Boolean(resumeKey) && !resumed && resumeAt >= MIN_RESUME_SECONDS,
    seek,
    dismiss,
    pausePlayback,
    resumePlayback,
  };
}

/** The floating "left off at 4:12 · Resume" pill. */
export function ResumePill({
  seconds,
  onResume,
  onDismiss,
  className,
}: {
  seconds: number;
  onResume: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div className={cn("animate-fade pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3", className)}>
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-hairline bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground backdrop-blur">
        <span className="text-muted-foreground">Left off at {formatTime(seconds)}</span>
        <button type="button" onClick={onResume} className="tap rounded-full bg-primary px-3 py-1 text-primary-foreground">
          Resume
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="tap rounded-full px-2 py-1 text-muted-foreground hover:text-foreground"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Premium player — official Vimeo SDK + custom iOS-style chrome        */
/* ------------------------------------------------------------------ */

const RATES = [0.75, 1, 1.25, 1.5, 2];

function ControlButton({
  label,
  onClick,
  children,
  size = "sm",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  size?: "sm" | "lg";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-white/90 transition-[transform,background-color,color] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        "hover:bg-white/15 hover:text-white active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70",
        size === "lg" ? "h-11 w-11" : "h-9 w-9",
      )}
    >
      {children}
    </button>
  );
}

export function VimeoPlayer({
  vimeoId,
  title,
  autoplay = false,
  className,
  resumeKey,
  poster,
  onWatched,
}: VimeoPlayerProps & { poster?: string; onWatched?: () => void }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchedRef = useRef(false);
  const onWatchedRef = useRef(onWatched);
  onWatchedRef.current = onWatched;

  const resolvedPoster = useVimeoMeta([vimeoId])?.thumbnail ?? "";
  const [started, setStarted] = useState(autoplay);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [resumeAt, setResumeAt] = useState(0);
  const [resumeHandled, setResumeHandled] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);
  /** Browser refused autoplay outright — the athlete has to tap once. */
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  /** Autoplay only survived because we muted it; offer sound back in one tap. */
  const [autoplayMuted, setAutoplayMuted] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const displaySeconds = scrubbing ?? seconds;
  const progress = duration > 0 ? Math.min(1, displaySeconds / duration) : 0;


  useEffect(() => {
    setPosterLoaded(false);
  }, [vimeoId]);

  /* ---- boot the SDK player once the user starts (or on autoplay) ---- */
  useEffect(() => {
    // `started` is only ever set by a user gesture (or an explicit autoplay
    // prop), so it implies visibility — don't wait on the observer.
    if (!started || !mountRef.current) return undefined;

    let disposed = false;
    let player: any;

    setReady(false);
    setSeconds(0);
    setDuration(0);
    setBuffered(0);
    watchedRef.current = false;
    setResumeHandled(false);
    setAutoplayBlocked(false);
    setAutoplayMuted(false);
    setLoadFailed(false);
    setResumeAt(resumeKey ? readResume(resumeKey) : 0);

    // Build the iframe ourselves and hand it to the SDK. Passing `id` makes the
    // SDK call Vimeo's oEmbed endpoint first, which 403s for the unlisted
    // (privacy-hash) videos in this catalogue — that's why nothing ever loaded.
    const frame = document.createElement("iframe");
    frame.src = vimeoEmbedBare(vimeoId, true);
    frame.title = title;
    frame.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
    frame.setAttribute("allowfullscreen", "");
    frame.setAttribute("frameborder", "0");
    frame.style.cssText = "width:100%;height:100%;border:0;display:block;";
    mountRef.current.replaceChildren(frame);

    void (async () => {
      const { default: Player } = await import("@vimeo/player");
      if (disposed || !mountRef.current) return;
      player = new Player(frame);
      playerRef.current = player;


      const markWatched = () => {
        if (watchedRef.current) return;
        watchedRef.current = true;
        onWatchedRef.current?.();
      };

      player.on("loaded", async () => {
        if (disposed) return;
        setReady(true);
        try {
          setDuration(await player.getDuration());
          setMuted(await player.getMuted());
        } catch {
          /* metadata unavailable */
        }
      });
      player.on("error", () => {
        if (!disposed) setLoadFailed(true);
      });
      player.on("play", () => {
        setPlaying(true);
        setAutoplayBlocked(false);
      });
      player.on("pause", () => setPlaying(false));
      player.on("bufferstart", () => setPlaying(true));
      player.on("volumechange", (d: { volume: number }) => setMuted(d.volume === 0));
      player.on("playbackratechange", (d: { playbackRate: number }) => setRate(d.playbackRate));
      player.on("progress", (d: { percent: number }) => setBuffered(d.percent ?? 0));
      player.on("timeupdate", (d: { seconds: number; duration: number; percent: number }) => {
        setSeconds(d.seconds);
        if (d.duration) setDuration(d.duration);
        if (resumeKey) {
          const nearEnd = d.duration > 0 && d.seconds > d.duration - END_MARGIN_SECONDS;
          writeResume(resumeKey, nearEnd ? 0 : d.seconds);
        }
        if (d.percent >= WATCHED_RATIO) markWatched();
      });
      player.on("ended", () => {
        setPlaying(false);
        if (resumeKey) clearResume(resumeKey);
        markWatched();
      });

      try {
        await player.ready();
        if (!disposed) setReady(true);
      } catch {
        if (!disposed) setLoadFailed(true);
      }

      // Autoplay policies: an unmuted autoplay is refused on most browsers
      // unless the tab has media engagement. Fall back to muted playback (the
      // session keeps flowing, with a one-tap "unmute"), and only if even that
      // is refused do we surface a full play-to-start overlay.
      if (autoplay && !disposed) {
        try {
          await player.play();
        } catch {
          try {
            await player.setMuted(true);
            await player.play();
            if (!disposed) {
              setAutoplayMuted(true);
              setMuted(true);
            }
          } catch {
            if (!disposed) {
              setAutoplayBlocked(true);
              setPlaying(false);
            }
          }
        }
      }
    })();

    return () => {
      disposed = true;
      playerRef.current = null;
      try {
        player?.destroy?.();
      } catch {
        /* already gone */
      }
    };
  }, [started, vimeoId, resumeKey, autoplay, attempt]);

  /* remount from the poster when the video changes */
  useEffect(() => {
    setStarted(autoplay);
    setPlaying(false);
  }, [vimeoId, autoplay]);

  const call = (fn: (p: any) => unknown) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const out = fn(p);
      if (out && typeof (out as Promise<unknown>).catch === "function") {
        (out as Promise<unknown>).catch(() => undefined);
      }
    } catch {
      /* player torn down mid-interaction */
    }
  };

  const toggle = () => call((p) => (playing ? p.pause() : p.play()));
  const seekTo = (value: number) => {
    setSeconds(value);
    call((p) => p.setCurrentTime(Math.max(0, value)));
  };
  const nudge = (delta: number) => seekTo(Math.max(0, Math.min(duration || Infinity, seconds + delta)));

  /* auto-hide the chrome while playing, iOS style */
  const wake = () => {
    setChromeVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (playing && !rateOpen) setChromeVisible(false);
    }, 2600);
  };
  useEffect(() => {
    wake();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, rateOpen]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shellRef.current?.requestFullscreen?.();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const keys = [" ", "k", "ArrowLeft", "ArrowRight", "f", "m"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    wake();
    if (e.key === " " || e.key === "k") started ? toggle() : setStarted(true);
    if (e.key === "ArrowLeft") nudge(-10);
    if (e.key === "ArrowRight") nudge(10);
    if (e.key === "f") toggleFullscreen();
    if (e.key === "m") call((p) => p.setMuted(!muted));
  }

  const showResume = Boolean(resumeKey) && started && ready && !resumeHandled && resumeAt >= MIN_RESUME_SECONDS;

  return (
    <div
      ref={shellRef}
      onMouseMove={wake}
      onTouchStart={wake}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`${title} — video player`}
      className={cn(
        "group/player relative isolate w-full select-none overflow-hidden bg-black outline-none",
        fullscreen ? "h-full rounded-none border-0" : "rounded-2xl border border-hairline shadow-[var(--shadow-float)]",
        className,
      )}
    >
      <div className={cn("relative w-full", fullscreen ? "h-full" : "aspect-video")}>
        {started && (
          <div ref={mountRef} className="pointer-events-none h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />
        )}

        {loadFailed && (
          <div className="absolute inset-0 z-50 grid place-items-center bg-foreground p-6 text-background">
            <div className="max-w-sm text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-background/20 bg-background/10">
                <VideoOff className="h-5 w-5" />
              </span>
              <p className="mt-4 text-base font-semibold">Video access is being updated</p>
              <p className="mt-2 text-sm text-background/70">Retry now, or continue with the lesson notes and resources below.</p>
              <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <RefreshCw className="h-4 w-4" /> Retry video
              </button>
            </div>
          </div>
        )}

        {/* Animated poster: also covers the gap while the player boots. */}
        {(!started || !ready) && (
          <button
            type="button"
            onClick={() => setStarted(true)}
            aria-label={`Play ${title}`}
            tabIndex={started ? -1 : 0}
            className={cn(
              "group/poster absolute inset-0 block h-full w-full overflow-hidden bg-black",
              started && "pointer-events-none",
            )}
          >
            {(poster || resolvedPoster) && (
              <img
                src={poster || resolvedPoster}
                alt=""
                onLoad={() => setPosterLoaded(true)}
                className={cn(
                  "h-full w-full scale-[1.03] object-cover transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                  posterLoaded ? "opacity-100 blur-0" : "opacity-0 blur-md",
                  "group-hover/poster:scale-[1.06]",
                )}
                loading="lazy"
                decoding="async"
              />
            )}

            {/* Shimmer while the thumbnail (or the player) is still arriving. */}
            {(!posterLoaded || (started && !ready)) && (
              <span
                aria-hidden
                className="absolute inset-0 animate-[shimmer-sweep_1.6s_infinite] bg-[linear-gradient(100deg,transparent_20%,rgba(255,255,255,0.08)_45%,rgba(255,255,255,0.16)_50%,rgba(255,255,255,0.08)_55%,transparent_80%)]"
              />
            )}

            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/25" />
            {!started && (
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_40px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/poster:scale-110 group-active/poster:scale-95">
                  <Play className="ml-0.5 h-7 w-7 fill-current" />
                </span>
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 truncate p-4 text-left text-sm font-semibold text-white/95">
              {title}
            </span>
          </button>
        )}
      </div>


      {started && (
        <>
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => {
              wake();
              toggle();
            }}
            className="absolute inset-0 z-10 cursor-default"
          />

          {/* centre state flash */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-20 grid place-items-center transition-opacity duration-300",
              chromeVisible && !playing ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/85 text-primary-foreground backdrop-blur-xl">
              <Play className="ml-0.5 h-7 w-7 fill-current" />
            </span>
          </div>

          {/* Autoplay refused by the browser — one clear tap target. */}
          {autoplayBlocked && !playing && (
            <div className="animate-fade absolute inset-0 z-40 grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
              <div className="text-center">
                <button
                  type="button"
                  aria-label={`Play ${title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    wake();
                    setAutoplayBlocked(false);
                    call((p) => p.play());
                  }}
                  className="tap mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_40px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:scale-105 active:scale-95"
                >
                  <Play className="ml-1 h-9 w-9 fill-current" />
                </button>
                <p className="mt-4 text-sm font-semibold text-white">Tap to play</p>
                <p className="mt-1 text-xs text-white/70">Your browser blocked autoplay for this video.</p>
              </div>
            </div>
          )}

          {/* Autoplay only worked muted — offer sound back without losing flow. */}
          {autoplayMuted && muted && playing && (
            <div className="animate-fade pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center p-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  call((p) => p.setMuted(false));
                  setAutoplayMuted(false);
                }}
                className="tap pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/75 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur"
              >
                <VolumeX className="h-4 w-4" />
                Playing muted — tap for sound
              </button>
            </div>
          )}

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
              chromeVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
            )}
          >
            {/* scrubber */}
            <div className="group/bar relative flex items-center py-2">
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/25 transition-[height] duration-200 group-hover/bar:h-1.5">
                <div className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${buffered * 100}%` }} />
                <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progress * 100}%` }} />
              </div>
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-primary shadow transition-transform duration-200 group-hover/bar:scale-100"
                style={{ left: `${progress * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={Math.max(1, duration)}
                step={0.1}
                value={displaySeconds}
                aria-label="Seek"
                onChange={(e) => setScrubbing(Number(e.target.value))}
                onPointerUp={() => {
                  if (scrubbing !== null) seekTo(scrubbing);
                  setScrubbing(null);
                }}
                onKeyUp={() => {
                  if (scrubbing !== null) seekTo(scrubbing);
                  setScrubbing(null);
                }}
                className="absolute inset-x-0 h-6 w-full cursor-pointer appearance-none bg-transparent opacity-0"
              />
            </div>

            <div className="flex items-center gap-1">
              <ControlButton label={playing ? "Pause" : "Play"} onClick={toggle} size="lg">
                {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
              </ControlButton>
              <ControlButton label="Back 10 seconds" onClick={() => nudge(-10)}>
                <RotateCcw className="h-4 w-4" />
              </ControlButton>
              <ControlButton label="Forward 10 seconds" onClick={() => nudge(10)}>
                <RotateCw className="h-4 w-4" />
              </ControlButton>

              <span className="numeric ml-1 text-xs font-medium tabular-nums text-white/85">
                {formatTime(displaySeconds)} <span className="text-white/45">/ {formatTime(duration)}</span>
              </span>

              <span className="ml-auto flex items-center gap-1">
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Playback speed"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRateOpen((v) => !v);
                    }}
                    className="numeric rounded-full px-2.5 py-1.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/15 active:scale-90"
                  >
                    {rate}×
                  </button>
                  {rateOpen && (
                    <div className="animate-pop absolute bottom-full right-0 mb-2 flex flex-col overflow-hidden rounded-xl bg-black/80 p-1 backdrop-blur-xl">
                      {RATES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRate(r);
                            call((p) => p.setPlaybackRate(r));
                            setRateOpen(false);
                          }}
                          className={cn(
                            "numeric rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                            r === rate ? "bg-primary text-primary-foreground" : "text-white/75 hover:bg-white/10",
                          )}
                        >
                          {r}×
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <ControlButton label={muted ? "Unmute" : "Mute"} onClick={() => call((p) => p.setMuted(!muted))}>
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </ControlButton>
                <ControlButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
                  {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </ControlButton>
              </span>
            </div>
          </div>
        </>
      )}

      {showResume && (
        <div className="z-40">
          <ResumePill
            seconds={resumeAt}
            onResume={() => {
              seekTo(resumeAt);
              call((p) => p.play());
              setResumeHandled(true);
            }}
            onDismiss={() => {
              if (resumeKey) clearResume(resumeKey);
              setResumeHandled(true);
            }}
          />
        </div>
      )}
    </div>
  );
}
