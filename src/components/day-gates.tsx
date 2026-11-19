import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Clock, Compass, Sunrise, X } from "lucide-react";
import type { NextRecommendation } from "@/lib/whats-next";
import { cn } from "@/lib/utils";

/**
 * Start-of-day and end-of-day screens for Immersion.
 *
 * Both render as a light, dismissible popup: they set the tone for the day and
 * close the loop at the end, without blocking the session. Each one shows at
 * most once per day per device, so returning to a day never nags.
 */

function seenKey(kind: "start" | "end", dayId: string) {
  return `kbl:day-${kind}:${dayId}`;
}

export function hasSeenDayGate(kind: "start" | "end", dayId: string) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(seenKey(kind, dayId)) === "1";
  } catch {
    return true;
  }
}

export function markDayGateSeen(kind: "start" | "end", dayId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(seenKey(kind, dayId), "1");
  } catch {
    /* private mode — the gate simply shows again next visit */
  }
}

/** Tracks whether a gate should be visible, remembering dismissals per day. */
export function useDayGate(kind: "start" | "end", dayId: string) {
  const [open, setOpen] = useState(false);

  const show = useCallback(() => {
    if (hasSeenDayGate(kind, dayId)) return;
    setOpen(true);
  }, [kind, dayId]);

  const dismiss = useCallback(() => {
    markDayGateSeen(kind, dayId);
    setOpen(false);
  }, [kind, dayId]);

  return { open, show, dismiss };
}

function GateShell({
  open,
  onClose,
  children,
  tone = "primary",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  tone?: "primary" | "success";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-foreground/50 backdrop-blur-sm animate-fade"
      />
      <div
        className={cn(
          "relative w-full max-w-md animate-pop overflow-hidden rounded-t-[1.75rem] border border-hairline bg-surface raise sm:rounded-[1.75rem]",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl",
            tone === "success" ? "bg-primary/25" : "bg-primary/15",
          )}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tap absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-subtle hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative px-6 pb-7 pt-9 text-center sm:px-8">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Start of day                                                        */
/* ------------------------------------------------------------------ */

export function DayStartScreen({
  open,
  onClose,
  dayNumber,
  entryLabel,
  dayTitle,
  intro,
  context,
  lessonCount,
  minutes,
  name,
}: {
  open: boolean;
  onClose: () => void;
  dayNumber: number;
  entryLabel?: string;
  dayTitle: string;
  intro?: string;
  context: string;
  lessonCount: number;
  minutes?: number;
  name?: string;
}) {
  return (
    <GateShell open={open} onClose={onClose}>
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Sunrise className="h-7 w-7" />
      </span>
      <p className="eyebrow mt-5 text-primary">{context}</p>
      <h2 className="display mt-2 text-[1.6rem] leading-tight text-foreground">
        {name ? `It's a new day, ${name}.` : "It's a new day."}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {intro ||
          `Day ${dayNumber} — ${dayTitle}. Start with the first step and let the day carry you.`}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-hairline bg-subtle p-3.5 text-left">
          <p className="eyebrow text-muted-foreground">Steps</p>
          <p className="numeric mt-1 text-lg font-semibold text-foreground">{lessonCount}</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-subtle p-3.5 text-left">
          <p className="eyebrow text-muted-foreground">Time</p>
          <p className="numeric mt-1 flex items-center gap-1.5 text-lg font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            {minutes ? `${minutes} min` : "Flexible"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="pressable mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
      >
        Start {entryLabel ?? `Day ${dayNumber}`}
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-3 text-xs text-muted-foreground">Press Esc any time to jump straight in.</p>
    </GateShell>
  );
}

/* ------------------------------------------------------------------ */
/* End of day                                                          */
/* ------------------------------------------------------------------ */

export function DayCompleteScreen({
  open,
  onClose,
  dayNumber,
  entryLabel,
  dayTitle,
  name,
  streak,
  lessonCount,
  nextDay,
  recommendation,
}: {
  open: boolean;
  onClose: () => void;
  dayNumber: number;
  entryLabel?: string;
  dayTitle: string;
  name?: string;
  streak?: number;
  lessonCount: number;
  nextDay?: { id: string; number: number; label?: string } | null;
  recommendation?: NextRecommendation | null;
}) {
  const rec = recommendation;
  return (
    <GateShell open={open} onClose={onClose} tone="success">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground animate-pop">
        <Check className="h-8 w-8" />
      </span>
      <p className="eyebrow mt-5 text-primary">{entryLabel ?? `Day ${dayNumber}`} complete</p>
      <h2 className="display mt-2 text-[1.6rem] leading-tight text-foreground">
        {name ? `Congratulations, ${name}!` : "Congratulations!"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        You've crushed another day. Every one of the {lessonCount} steps in {dayTitle} is logged.
      </p>

      {typeof streak === "number" && streak > 1 && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-hairline bg-subtle px-4 py-1.5 text-xs font-semibold text-foreground">
          <span className="numeric text-primary">{streak}</span> day streak alive
        </p>
      )}

      {rec ? (
        <>
          <div
            className={cn(
              "mt-6 rounded-2xl border p-4 text-left",
              rec.tone === "calm" ? "border-hairline bg-subtle" : "border-primary/25 bg-primary/5",
            )}
          >
            <p className="eyebrow flex items-center gap-1.5 text-primary">
              <Compass className="h-3.5 w-3.5" />
              {rec.eyebrow}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-foreground">{rec.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rec.detail}</p>
          </div>

          <div className="mt-4 space-y-2.5">
            <Link
              to={rec.primary.to}
              params={rec.primary.params}
              onClick={onClose}
              className="pressable inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              {rec.primary.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {rec.secondary ? (
              <Link
                to={rec.secondary.to}
                params={rec.secondary.params}
                onClick={onClose}
                className="pressable inline-flex w-full items-center justify-center rounded-full border border-hairline px-6 py-3 text-sm font-semibold text-foreground"
              >
                {rec.secondary.label}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="tap w-full py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Stay on this day
            </button>
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-2.5">
          {nextDay ? (
            <Link
              to="/immersion/day/$dayId"
              params={{ dayId: nextDay.id }}
              onClick={onClose}
              className="pressable inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Start {nextDay.label ?? `Day ${nextDay.number}`}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="pressable inline-flex w-full items-center justify-center rounded-full border border-hairline px-6 py-3 text-sm font-semibold text-foreground"
          >
            Stay on this day
          </button>
        </div>
      )}
    </GateShell>
  );
}
