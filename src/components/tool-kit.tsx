import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock, ListChecks, Pencil } from "lucide-react";
import { CountUp } from "@/components/motion-kit";
import { Skeleton } from "@/components/ui-kit";
import { StepRail } from "@/components/form-kit";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared chrome for every question-driven tool                        */
/* ------------------------------------------------------------------ */

/**
 * Sticky header for a tool question scene: back control, tool name,
 * step counter, segmented rail and a live percentage read-out.
 */
export function ToolStepHeader({
  title,
  step,
  total,
  onBack,
  answeredCount,
}: {
  title: string;
  /** Zero-based index of the current question. */
  step: number;
  total: number;
  /** Called for the in-flow back step; when omitted the control links to /tools. */
  onBack?: () => void;
  answeredCount: number;
}) {
  const percent = Math.round((answeredCount / total) * 100);
  return (
    <div className="glass sticky top-0 z-20 border-b border-hairline">
      <div className="mx-auto w-full max-w-[36rem] px-4 py-3 sm:px-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="tap -ml-1 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Previous question"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to="/tools"
              className="tap -ml-1 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="All tools"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <p className="truncate text-center text-sm font-semibold text-foreground">{title}</p>
          <span className="numeric text-xs text-muted-foreground">
            {Math.min(step + 1, total)}/{total}
          </span>
        </div>
        <div className="mt-3">
          <StepRail total={total} current={step} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Question {Math.min(step + 1, total)} of {total}
          </p>
          <p className="numeric text-[11px] font-semibold text-primary">
            <CountUp value={percent} duration={500} suffix="% complete" />
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Start screen shown before the first question: what the tool measures,
 * how long it takes, and the user's previous result when they have one.
 */
export function ToolIntro({
  eyebrow,
  title,
  description,
  questionCount,
  minutes,
  bullets,
  previous,
  loadingPrevious,
  onStart,
  startLabel = "Start the assessment",
}: {
  eyebrow: string;
  title: string;
  description: string;
  questionCount: number;
  minutes: number;
  bullets: string[];
  /** Most recent saved run, if any. */
  previous?: { title: string; score?: number; takenAt: string } | null;
  loadingPrevious?: boolean;
  onStart: () => void;
  startLabel?: string;
}) {
  return (
    <div className="seq space-y-8">
      <div>
        <p className="eyebrow text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-3 text-2xl leading-[1.15] text-foreground sm:text-[1.75rem]">{title}</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" /> {questionCount} questions
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> about {minutes} min
        </span>
      </div>

      <ul className="space-y-2">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {/* Previous result: loading, present, or a first-run empty state. */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="eyebrow text-muted-foreground">Your last result</p>
        {loadingPrevious ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ) : previous ? (
          <div className="mt-2">
            <p className="text-[0.9375rem] font-semibold text-foreground">{previous.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {typeof previous.score === "number" ? `Score ${previous.score} · ` : ""}
              {previous.takenAt}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            You haven't run this one yet. Take it now and it becomes the baseline everything else is measured against.
          </p>
        )}
      </div>

      <button type="button" onClick={onStart} className="pressable w-full rounded-2xl bg-primary px-5 py-4 text-[0.9375rem] font-semibold text-primary-foreground">
        {startLabel}
      </button>
    </div>
  );
}

/** Compact, editable summary of the answers given so far. */
export function AnsweredSoFar({
  items,
  onEdit,
}: {
  items: { id: string; question: string; answer: string; index: number }[];
  onEdit: (index: number) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-8 border-t border-hairline pt-5">
      <p className="eyebrow text-muted-foreground">Answered so far</p>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onEdit(item.index)}
              className="tap grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-secondary"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs text-muted-foreground">{item.question}</span>
                <span className="block truncate text-sm font-semibold text-foreground">{item.answer}</span>
              </span>
              <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Circular score dial with an animated sweep. */
export function ScoreDial({
  score,
  max,
  label,
  size = 128,
}: {
  score: number;
  max: number;
  label: string;
  size?: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, score / max)) : 0;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-secondary"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-[1100ms] [transition-timing-function:var(--ease-out-soft)]"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="numeric text-3xl font-semibold text-foreground">
            <CountUp value={score} duration={1100} />
          </span>
          <span className="numeric text-[11px] text-muted-foreground">of {max}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="eyebrow text-muted-foreground">Your score</p>
        <p className="mt-1 text-[0.9375rem] font-semibold leading-snug text-foreground">{label}</p>
      </div>
    </div>
  );
}

/** Where this result sits against the tool's other bands. */
export function BandScale({
  bands,
  activeTitle,
}: {
  bands: { title: string; maxScore: number }[];
  activeTitle: string;
}) {
  return (
    <div className="mt-6">
      <p className="eyebrow text-muted-foreground">Where this sits</p>
      <div className="mt-3 space-y-1.5">
        {bands.map((band) => {
          const active = band.title === activeTitle;
          return (
            <div
              key={band.title}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition",
                active ? "border-primary bg-primary/[0.06] text-foreground" : "border-border bg-surface text-muted-foreground",
              )}
            >
              <span className={cn("truncate", active && "font-semibold")}>{band.title}</span>
              <span className="numeric shrink-0 text-xs">up to {band.maxScore}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Readable label/value recap of everything the user answered. */
export function AnswerRecap({ rows }: { rows: { question: string; answer: string }[] }) {
  if (!rows.length) return null;
  return (
    <div className="mt-8">
      <p className="eyebrow text-muted-foreground">What you answered</p>
      <dl className="mt-3 divide-y divide-hairline rounded-2xl border border-border bg-surface px-4">
        {rows.map((row) => (
          <div key={row.question} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4">
            <dt className="text-sm text-muted-foreground">{row.question}</dt>
            <dd className="text-sm font-semibold text-foreground sm:text-right">{row.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Section wrapper used inside tool results. */
export function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-8">
      <p className="eyebrow text-muted-foreground">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
