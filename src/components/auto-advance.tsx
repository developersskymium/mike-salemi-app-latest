import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STORE_KEY = "kbl:auto-advance";
const DEFAULT_SECONDS = 6;

function readPref(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORE_KEY) !== "off";
  } catch {
    return true;
  }
}

/**
 * "Next lesson starts in N" behaviour.
 *
 * The countdown is a real state machine (not a bare timeout) so the number can
 * be painted on top of the video — including while the player is full-screen,
 * where the athlete has no view of the lesson rail.
 */
export function useAutoAdvance(options: {
  onAdvance: () => void;
  seconds?: number;
  /** Called when a countdown starts, so the caller can move the overlay into the fullscreen element. */
  onCountdownStart?: () => void;
  /** Run even when the athlete has switched "Autoplay next" off (e.g. clips inside one step). */
  ignorePreference?: boolean;
}) {
  const total = options.seconds ?? DEFAULT_SECONDS;
  const [enabled, setEnabledState] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cb = useRef(options.onAdvance);
  cb.current = options.onAdvance;
  const startCb = useRef(options.onCountdownStart);
  startCb.current = options.onCountdownStart;

  // localStorage is read after mount so server and client render the same thing.
  useEffect(() => setEnabledState(readPref()), []);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRemaining(null);
  }, []);

  useEffect(() => stop, [stop]);

  const setEnabled = useCallback(
    (value: boolean) => {
      setEnabledState(value);
      try {
        window.localStorage.setItem(STORE_KEY, value ? "on" : "off");
      } catch {
        /* preference simply stays session-only */
      }
      if (!value) stop();
    },
    [stop],
  );

  const ignorePreference = Boolean(options.ignorePreference);
  const start = useCallback(() => {
    if ((!enabled && !ignorePreference) || timer.current) return;
    startCb.current?.();
    setRemaining(total);
    timer.current = setInterval(() => {
      setRemaining((value) => {
        if (value === null) return null;
        if (value <= 1) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          cb.current();
          return null;
        }
        return value - 1;
      });
    }, 1000);
  }, [enabled, ignorePreference, total]);

  const advanceNow = useCallback(() => {
    stop();
    cb.current();
  }, [stop]);

  return { enabled, setEnabled, remaining, total, start, cancel: stop, advanceNow };
}

/** Full-bleed countdown card, sized to stay readable in full-screen playback. */
export function AutoAdvanceOverlay({
  remaining,
  total,
  title,
  onCancel,
  onNow,
}: {
  remaining: number;
  total: number;
  title: string;
  onCancel: () => void;
  onNow: () => void;
}) {
  const pct = Math.max(0, Math.min(1, remaining / total));
  return (
    <div className="animate-fade absolute inset-0 z-30 grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-black/70 p-6 text-center shadow-2xl">
        <p className="eyebrow text-white/60">Up next</p>
        <p className="mt-1.5 line-clamp-2 text-lg font-semibold text-white">{title}</p>
        <div className="mt-5 grid place-items-center">
          <div className="relative grid h-20 w-20 place-items-center">
            <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
              <circle
                cx="20"
                cy="20"
                r="17"
                fill="none"
                stroke="currentColor"
                className="text-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 17}
                strokeDashoffset={(1 - pct) * 2 * Math.PI * 17}
              />
            </svg>
            <span className="numeric text-2xl font-bold text-white">{remaining}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/60">Starting automatically</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onNow}
            className={cn(
              "tap inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground",
            )}
          >
            Play now
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="tap rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
          >
            Stay here
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small pill switch that lets the athlete turn auto-play-next off for good. */
export function AutoAdvanceToggle({
  enabled,
  onChange,
  className,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "tap inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors",
        enabled
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-hairline text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <PlayCircle className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Autoplay next</span>
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          enabled ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-background transition-transform",
            enabled ? "translate-x-[0.875rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
