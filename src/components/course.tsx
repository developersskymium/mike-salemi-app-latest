import { dayBadge, dayLabel } from "@/content/program";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  Dot,
  Layers3,
  Lock,
  Play,
  Timer,
} from "lucide-react";
import {
  MediaProgress,
  MediaScrim,
  PhaseChip,
  Pill,
  Poster,
  ProgressRing,
} from "@/components/media";
import { cn } from "@/lib/utils";
import type { Course, Day, DayLocation, Phase } from "@/content/program";

/* ------------------------------------------------------------------ */
/* CourseCard — cinematic level card used on dashboard / immersion      */
/* ------------------------------------------------------------------ */

export function CourseCard({
  course,
  percent,
  doneDays,
  totalDays,
  locked,
  completedPhaseIds = new Set(),
}: {
  course: Course;
  percent: number;
  doneDays: number;
  totalDays: number;
  locked?: boolean;
  completedPhaseIds?: Set<string>;
}) {
  return (
    <Link
      to="/immersion/$courseSlug"
      params={{ courseSlug: course.slug }}
      className="media-card group steel-card relative block min-h-[23rem] overflow-hidden rounded-3xl sm:min-h-[24rem]"
    >
      <div className="relative">
        <Poster
          vimeoId={course.heroVimeoId}
          imageSrc={course.image}
          alt={course.title}
          size="lg"
          ratio="wide"
          state={locked ? "locked" : "default"}
          className="h-[23rem] rounded-none sm:h-[24rem] [&_.scrim]:opacity-0 [&_span.bottom-3]:hidden [&_img]:saturate-[1.1] [&_img]:contrast-[1.05]"
        />
        <MediaScrim />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 sm:p-5">
        <Pill tone="primary">{course.level}</Pill>
        <Pill>
          <Layers3 className="h-3 w-3" /> {course.phases.length} phases
        </Pill>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-white sm:text-[1.375rem] sm:leading-tight">
              {course.title}
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-snug text-white/75">{course.tagline}</p>
            <MediaProgress
              percent={percent}
              label={`${doneDays}/${totalDays} · ${percent}%`}
              className="mt-3"
            />
          </div>

          <span className="hidden sm:block">
            <ProgressRing percent={percent} size={72} stroke={7} onDark />
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {course.phases.map((phase) => (
            <PhaseChip
              key={phase.id}
              label={phase.label}
              meta={phase.weeks}
              complete={completedPhaseIds.has(phase.id)}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* ContinueCard — "pick up where you left off"                          */
/* ------------------------------------------------------------------ */

/** Vimeo's generic demo clip — never use it as a day thumbnail. */
const PLACEHOLDER_VIMEO_ID = "76979871";

/** Every usable vimeo id on a day, best first — lesson videos, then clips. */
export function dayVimeoCandidates(day: Pick<Day, "lessons">) {
  const lessons = day.lessons ?? [];
  const real = (id?: string): id is string => !!id && id !== PLACEHOLDER_VIMEO_ID;
  const ids = [
    ...lessons.map((l) => l.vimeoId).filter(real),
    ...lessons.flatMap((l) => (l.associatedVideos ?? []).map((v) => v.vimeoId)).filter(real),
  ];
  return Array.from(new Set(ids));
}

/** First real vimeo id available on a day (lesson video, then any clip). */
export function dayPosterVimeoId(day: Pick<Day, "lessons">) {
  return dayVimeoCandidates(day)[0] ?? day.lessons?.[0]?.vimeoId ?? "0";
}

export function ContinueCard({
  location,
  done,
  total,
}: {
  location: DayLocation;
  done: number;
  total: number;
}) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  const posterId = dayPosterVimeoId(location.day);
  return (
    <Link
      to="/immersion/day/$dayId"
      params={{ dayId: location.day.id }}
      className="lift zoom-parent group command-panel spotlight relative block overflow-hidden p-0"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <Poster
          vimeoId={posterId}
          candidates={dayVimeoCandidates(location.day)}
          alt={location.day.title}
          size="lg"
          className="min-h-[13rem] rounded-none sm:min-h-[16rem] lg:min-h-[20rem]"
        />
        <div className="flex flex-col justify-between p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="primary">Up next</Pill>
            <Pill>{location.course.level}</Pill>
            <Pill>{location.phase.label}</Pill>
          </div>

          <div className="my-6">
            <p className="eyebrow text-primary">{dayLabel(location.day)}</p>
            <h2 className="mt-2 text-2xl text-foreground sm:text-3xl">{location.day.title}</h2>
            <p className="mt-4 max-w-md text-base text-muted-foreground">{location.day.focus}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-[width] duration-700 [transition-timing-function:var(--ease-out-soft)]"
                style={{ width: `${percent}%`, background: "var(--gradient-primary)" }}
              />
            </div>
            <span className="numeric shrink-0 text-xs text-muted-foreground">
              {done}/{total} lessons
            </span>
          </div>

          <div className="mt-5 grid grid-cols-5 gap-1.5">
            {location.day.lessons.map((lesson, index) => (
              <span
                key={lesson.id}
                className="h-1.5 rounded-full bg-secondary"
                title={lesson.title}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: index < done ? "100%" : "0%",
                    background: "var(--gradient-primary)",
                  }}
                />
              </span>
            ))}
          </div>

          <span
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl px-5 py-3 text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Play className="h-4 w-4 fill-current" />
            <span className="text-[0.9375rem] font-semibold">
              {percent > 0 ? "Resume day" : "Start day"}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* DayRow — a single day inside a phase                                 */
/* ------------------------------------------------------------------ */

export function DayRow({
  day,
  done,
  total,
  locked,
  active,
  mode = "immersion",
  showProgress = true,
}: {
  day: Pick<Day, "id" | "number" | "title" | "focus"> & Partial<Pick<Day, "lessons" | "type">>;
  done: number;
  total: number;
  locked?: boolean;
  active?: boolean;
  mode?: "immersion" | "self-guided";
  showProgress?: boolean;
}) {
  const complete = showProgress && total > 0 && done === total;
  const content = (
    <>
      <span
        className={cn(
          "numeric grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-sm font-semibold",
          complete
            ? "border-transparent bg-success text-success-foreground"
            : active
              ? "border-transparent bg-primary text-primary-foreground"
              : locked
                ? "border-border bg-secondary text-muted-foreground"
                : "border-border bg-secondary text-foreground",
        )}
      >
        {complete ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : locked ? (
          <Lock className="h-4 w-4" />
        ) : (
          dayBadge(day)
        )}
      </span>

      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[0.9375rem] font-semibold text-foreground">
            {day.title}
          </span>
          {active && !complete && <Pill tone="primary">Current</Pill>}
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
          {day.type && day.type !== "On Ramp" && !day.title.includes(day.type)
            ? `${day.type} · `
            : ""}
          {day.focus}
        </span>
      </span>

      {showProgress ? (
        <span className="hidden shrink-0 items-center gap-3 sm:flex">
          <span className="numeric text-xs text-muted-foreground">
            {done}/{total}
          </span>
          <span className="h-1 w-16 overflow-hidden rounded-full bg-secondary">
            <span
              className="block h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </span>
        </span>
      ) : (
        <span className="numeric hidden shrink-0 text-xs text-muted-foreground sm:block">
          {total} lessons
        </span>
      )}

      <ArrowRight
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-300",
          locked
            ? "text-muted-foreground/50"
            : "text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary",
        )}
      />
    </>
  );

  const className = cn(
    "group grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-3 py-3 text-left last:border-b-0 transition-colors duration-200 sm:gap-4 sm:px-4",
    locked ? "cursor-not-allowed opacity-55" : "pressable hover:bg-secondary/60",
  );

  if (locked) return <div className={className}>{content}</div>;

  if (mode === "self-guided") {
    return (
      <Link to="/self-guided/day/$dayId" params={{ dayId: day.id }} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <Link to="/immersion/day/$dayId" params={{ dayId: day.id }} className={className}>
      {content}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* PhaseSection — collapsible phase with its days                       */
/* ------------------------------------------------------------------ */

export function PhaseSection({
  phase,
  defaultOpen,
  percent,
  locked,
  children,
}: {
  phase: Phase;
  defaultOpen?: boolean;
  percent: number;
  locked?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <section className={cn("steel-card overflow-hidden rounded-[1.75rem]", locked && "opacity-70")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="pressable grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-5 text-left sm:p-6"
      >
        <span className="shrink-0">
          <ProgressRing
            percent={percent}
            size={54}
            stroke={5}
            label={<span className="text-xs">{percent}%</span>}
          />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="eyebrow text-primary">{phase.weeks}</span>
            {locked && (
              <Pill>
                <Lock className="h-3 w-3" /> Locked
              </Pill>
            )}
          </span>
          <span className="mt-1 block truncate text-xl text-foreground sm:text-lg">
            {phase.name}
          </span>
          <span className="mt-1 line-clamp-1 block text-sm text-muted-foreground">
            {phase.blurb}
          </span>
          <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
              <Timer className="h-3 w-3 text-primary" /> {phase.days.length} pages
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
              <Play className="h-3 w-3 text-primary" />{" "}
              {phase.days.reduce((n, d) => n + d.lessons.length, 0)} lessons
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 [transition-timing-function:var(--ease-spring)]",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open && (
        <div className="animate-rise border-t border-hairline bg-background/30 p-4 sm:p-5">
          <div className="stagger space-y-2.5">{children}</div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Small bits                                                           */
/* ------------------------------------------------------------------ */

export function LessonDot({ done }: { done: boolean }) {
  return done ? (
    <Check className="h-4 w-4 text-success" strokeWidth={3} />
  ) : (
    <Circle className="h-4 w-4 text-muted-foreground/60" />
  );
}

export function MetaDot() {
  return <Dot className="h-4 w-4 shrink-0 text-muted-foreground/60" />;
}
