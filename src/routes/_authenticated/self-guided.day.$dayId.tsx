import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { ChipNav, ContextBar } from "@/components/page-kit";
import { VimeoPlayer } from "@/components/VimeoPlayer";
import { ReadinessAssessment, WorkoutCircuitPanel } from "@/components/readiness";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { courseDays, dayLabel, findDay, type DayLocation, type Lesson } from "@/content/program";
import { LessonNotes } from "@/components/lesson-notes";
import { useStructureOverlay } from "@/hooks/use-structure-overlay";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/self-guided/day/$dayId")({
  loader: ({ params }) => {
    const found = findDay(params.dayId);
    if (!found) throw notFound();
    return { title: found.day.title, focus: found.day.focus };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Day"} — Self-Guided — Mike Salemi App` },
      { name: "description", content: loaderData?.focus ?? "A Kettlebell Lifestyle training day." },
      { property: "og:title", content: `${loaderData?.title ?? "Day"} — Mike Salemi App` },
      {
        property: "og:description",
        content: loaderData?.focus ?? "A Kettlebell Lifestyle training day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => <DayFallback title="We couldn't load this day" />,
  notFoundComponent: () => <DayFallback title="Day not found" />,
  component: SelfGuidedDayRoute,
});

function DayFallback({ title }: { title: string }) {
  return (
    <AppShell>
      <Container className="py-24 text-center">
        <h1 className="title-section text-foreground">{title}</h1>
        <Link to="/self-guided" className="mt-4 inline-block text-primary">
          Back to Self-Guided
        </Link>
      </Container>
    </AppShell>
  );
}

function useLocalPosition(key: string) {
  const [state, setState] = useState<{ isLoading: boolean; activeLessonId: string | null }>({
    isLoading: true,
    activeLessonId: null,
  });
  useEffect(() => {
    let v: string | null = null;
    try {
      v = window.localStorage.getItem(key);
    } catch {
      /* ignore */
    }
    setState({ isLoading: false, activeLessonId: v });
  }, [key]);
  const autosave = useCallback(
    (input: { activeLessonId?: string | null }) => {
      try {
        if (input.activeLessonId) window.localStorage.setItem(key, input.activeLessonId);
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return { ...state, autosave };
}

function SelfGuidedDayRoute() {
  const { dayId } = Route.useParams();
  const location = findDay(dayId);
  if (!location) return null;
  return <DayView key={dayId} location={location} />;
}

/* The sticky stack here is the bar plus the chip row. */
const STACK_OFFSET = 100;

function DayView({ location }: { location: DayLocation }) {
  const { course, phase, day } = location;
  const { user } = useSession();
  const { lessonsFor } = useStructureOverlay();
  const lessons = lessonsFor(day);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const sectionIds = useMemo(() => lessons.map((l) => `lesson-${l.id}`), [lessons]);
  const { activeId, scrollToId } = useScrollSpy(sectionIds, STACK_OFFSET);

  const siblings = courseDays(course.id);
  const index = siblings.findIndex((d) => d.day.id === day.id);
  const prev = index > 0 ? siblings[index - 1] : undefined;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined;

  /* Position memory ------------------------------------------------- */
  // The same autosaved row that Immersion uses, so the level/phase/day and the
  // sub-lesson you were reading survive a refresh or a device switch.
  // Self-Guided keeps its own per-device reading position so it never moves
  // where Immersion resumes (Immersion owns day_state.active_lesson_id).
  const posKey = `sg-pos:${course.id}:${day.id}`;
  const dayState = useLocalPosition(posKey);
  const restored = useRef(false);

  useEffect(() => {
    restored.current = false;
  }, [day.id]);

  // New day = fresh page: start at the top and put focus on the heading so
  // keyboard and screen-reader users land in the right place.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    headingRef.current?.focus({ preventScroll: true });
  }, [day.id]);

  // …then, once the saved position arrives, jump to the sub-lesson they left on.
  useEffect(() => {
    if (restored.current || dayState.isLoading) return;
    restored.current = true;
    const savedId = dayState.activeLessonId;
    if (!savedId) return;
    const sectionId = `lesson-${savedId}`;
    if (!sectionIds.includes(sectionId)) return;
    if (sectionIds[0] === sectionId) return; // already at the top
    const timer = setTimeout(() => scrollToId(sectionId), 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayState.isLoading, dayState.activeLessonId, day.id]);

  // Reading down the page is the progress signal here — record it.
  useEffect(() => {
    if (!restored.current || !activeId) return;
    dayState.autosave({ activeLessonId: activeId.replace(/^lesson-/, "") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  return (
    <AppShell>
      <div className="animate-page" style={{ ["--stack-top" as string]: `${STACK_OFFSET}px` }}>
        <ContextBar
          backTo="/self-guided"
          backLabel="Back to Self-Guided"
          title={day.title}
          meta={`${course.level} · ${phase.label}`}
          action={
            <span className="numeric hidden text-xs text-muted-foreground sm:block">
              {lessons.length} lessons
            </span>
          }
        >
          <ChipNav
            label="Jump to a part of this day"
            items={lessons.map((l) => ({ id: `lesson-${l.id}`, label: l.title }))}
            activeId={activeId}
            onSelect={(id) => scrollToId(id)}
          />
        </ContextBar>

        {/* Day intro ------------------------------------------------------ */}
        <Container className="section-tight">
          <div className="measure">
            <p className="eyebrow text-muted-foreground">
              {course.level} · {phase.label} · {dayLabel(day)}
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="title-page mt-3 text-foreground outline-none"
            >
              {day.title}
            </h1>
            <p className="lede mt-3">{day.focus}</p>
            {day.letsBegin && <LetsBegin html={day.letsBegin.html} image={day.letsBegin.image} />}
          </div>
        </Container>

        {/* Stacked lessons ------------------------------------------------ */}
        <div>
          {lessons.map((lesson, i) => (
            <section
              key={lesson.id}
              id={`lesson-${lesson.id}`}
              aria-label={lesson.title}
              className="scroll-anchor rule"
            >
              <Container className="section-tight">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                  <div className="lg:sticky lg:top-[calc(var(--stack-top)+1.5rem)] lg:self-start">
                    <p className="eyebrow text-muted-foreground">
                      {i + 1} of {lessons.length} · {lesson.duration}
                    </p>
                    <h2 className="title-section mt-2 text-foreground">{lesson.title}</h2>
                    {!lesson.notes && (
                      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                        {lesson.description}
                      </p>
                    )}
                  </div>
                  {/* Every step keeps its video; assessment form, workout table and
                      exercise demos stack underneath it. */}
                  <div className="space-y-6">
                    {lesson.special !== "completion" && <LessonNotes lesson={lesson} />}
                    {lesson.vimeoId ? (
                      <VimeoPlayer
                        vimeoId={lesson.vimeoId}
                        title={lesson.title}
                        resumeKey={lesson.id}
                      />
                    ) : null}
                    {lesson.special === "readiness" && (
                      <ReadinessAssessment location={location} lessonId={lesson.id} />
                    )}
                    {lesson.special === "workout" && (
                      <WorkoutCircuitPanel location={location} lesson={lesson} />
                    )}
                    {lesson.special === "completion" && (
                      <CompletionStep note={lesson.notes} next={next} />
                    )}
                    <AssociatedClips lesson={lesson} />
                  </div>
                </div>
              </Container>
            </section>
          ))}
        </div>

        {/* Day-to-day navigation ------------------------------------------ */}
        <div className="rule">
          <Container className="section-tight">
            <nav aria-label="Day navigation" className="grid gap-3 sm:grid-cols-2">
              {prev ? <DayLink day={prev} dir="prev" /> : <span className="hidden sm:block" />}
              {next && <DayLink day={next} dir="next" />}
            </nav>
          </Container>
        </div>
      </div>
    </AppShell>
  );
}

/** Source "Let's Begin" content, shown as part of the day introduction. */
function LetsBegin({ html, image }: { html: string; image: string | null }) {
  return (
    <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
      {image && (
        <img
          src={image}
          alt=""
          className="h-14 w-14 shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
      )}
      <div
        className="text-sm leading-relaxed text-foreground [&_b]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_p]:mt-1 [&_p]:text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/** The source "Completion" step: its original message plus the finish action. */
function CompletionStep({ note, next }: { note?: string; next?: DayLocation }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
      <p className="mt-3 text-lg font-semibold text-foreground">
        {note || "You've Crushed Another Day"}
      </p>
      {next ? (
        <Link
          to="/self-guided/day/$dayId"
          params={{ dayId: next.day.id }}
          className="pressable mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Finish day · go to {next.day.title}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <Link
          to="/self-guided"
          className="pressable mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Finish level · back to Self-Guided
        </Link>
      )}
    </div>
  );
}

/** Exercise demo videos attached to a step, shown under its main video. */
function AssociatedClips({ lesson }: { lesson: Lesson }) {
  const clips = lesson.associatedVideos ?? [];
  if (clips.length === 0) return null;
  return (
    <div>
      <p className="eyebrow text-muted-foreground">Exercise demos</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {clips.map((clip) => (
          <div key={clip.vimeoId}>
            <VimeoPlayer
              vimeoId={clip.vimeoId}
              title={clip.title}
              resumeKey={`${lesson.id}-${clip.vimeoId}`}
            />
            <p className="mt-2 text-sm font-medium text-foreground">{clip.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayLink({ day, dir }: { day: DayLocation; dir: "prev" | "next" }) {
  const isNext = dir === "next";
  return (
    <Link
      to="/self-guided/day/$dayId"
      params={{ dayId: day.day.id }}
      className={
        "pressable tap group flex min-h-[4.25rem] flex-col justify-center rounded-2xl border border-border bg-surface px-4 py-3.5 hover:border-foreground/25 " +
        (isNext ? "text-right" : "")
      }
    >
      <span
        className={
          "eyebrow flex items-center gap-2 text-muted-foreground " + (isNext ? "justify-end" : "")
        }
      >
        {!isNext && (
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        )}
        {isNext ? "Next day" : "Previous day"}
        {isNext && (
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        )}
      </span>
      <span className="mt-1.5 block truncate text-[0.9375rem] font-semibold text-foreground">
        {day.day.title}
      </span>
    </Link>
  );
}
