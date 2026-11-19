import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, Play, X } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { DayRow } from "@/components/course";
import { ContextBar } from "@/components/page-kit";
import { ProgramPromo } from "@/components/program-promo";
import { VimeoPlayer } from "@/components/VimeoPlayer";
import {
  dayLabel,
  courseDays,
  courses,
  findCourse,
  trainingDays,
  type Course,
} from "@/content/program";
import { useProgress, summarise, useCourseAttempts } from "@/hooks/use-progress";
import { currentMilestone } from "@/lib/milestones";
import { AttemptHistory, MilestoneCallout, RestartLevelButton } from "@/components/milestones";
import { useSession } from "@/hooks/use-session";
import { buttonStyles } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { getOnboardingStatus } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/immersion/$courseSlug")({
  beforeLoad: async () => {
    const status = await getOnboardingStatus();
    if (!status.completed) throw redirect({ to: "/onboarding" });
    return { programLevel: status.level };
  },
  loader: ({ params }) => {
    const course = findCourse(params.courseSlug);
    if (!course) throw notFound();
    return { title: course.title, tagline: course.tagline };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Course"} — Kettlebell Lifestyle` },
      {
        name: "description",
        content: loaderData?.tagline ?? "Kettlebell Lifestyle course curriculum.",
      },
      { property: "og:title", content: `${loaderData?.title ?? "Course"} — Kettlebell Lifestyle` },
      {
        property: "og:description",
        content: loaderData?.tagline ?? "Kettlebell Lifestyle course curriculum.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <AppShell>
      <Container className="py-24 text-center">
        <h1 className="text-xl text-foreground">We couldn't load this course</h1>
        <Link to="/immersion" className="mt-4 inline-block text-primary">
          Back to Immersion
        </Link>
      </Container>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <Container className="py-24 text-center">
        <h1 className="text-xl text-foreground">Course not found</h1>
        <Link to="/immersion" className="mt-4 inline-block text-primary">
          Back to Immersion
        </Link>
      </Container>
    </AppShell>
  ),
  component: CourseRoute,
});

function CourseRoute() {
  const { courseSlug } = Route.useParams();
  const course = findCourse(courseSlug);
  if (!course) return null;
  return <CourseView key={course.id} course={course} />;
}

function CourseView({ course }: { course: Course }) {
  const { user } = useSession();
  const { data } = useProgress(Boolean(user));
  const s = summarise(data);

  const days = courseDays(course.id);
  const lessonsTotal = days.reduce((n, d) => n + d.day.lessons.length, 0);
  const lessonsDone = days.reduce((n, d) => n + s.dayCompletion(d.day.id).done, 0);
  const percent = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;
  const attempts = useCourseAttempts(true);
  const courseDone = s.courseCompletion(course.id);
  const currentDayId =
    days.find((d) => !s.dayCompletion(d.day.id).complete)?.day.id ?? days.at(-1)?.day.id;

  const currentPhaseIndex = useMemo(() => {
    const i = course.phases.findIndex((p) => p.days.some((d) => d.id === currentDayId));
    return i >= 0 ? i : 0;
  }, [course.phases, currentDayId]);

  const [phaseIndex, setPhaseIndex] = useState(currentPhaseIndex);

  // Deep links from the Immersion hub (#phase-id) open that phase directly.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const i = course.phases.findIndex((p) => p.id === hash);
    if (i >= 0) setPhaseIndex(i);
  }, [course.phases]);
  const [introOpen, setIntroOpen] = useState(false);
  const phase = course.phases[phaseIndex];

  const resumeDayId = currentDayId ?? days[0]?.day.id;
  const resumeDay = days.find((d) => d.day.id === resumeDayId);

  return (
    <AppShell>
      <div className="animate-page">
        {/* Sticky context bar — level, progress, nothing else -------------- */}
        <ContextBar
          backTo="/immersion"
          backLabel="Back to Immersion"
          title={course.title}
          meta={`${course.level} · ${percent}% complete`}
          progress={percent}
          action={
            resumeDay ? (
              <Link
                to="/immersion/day/$dayId"
                params={{ dayId: resumeDay.day.id }}
                className="tap inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-semibold text-background"
              >
                {percent > 0 ? "Resume" : "Start"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null
          }
        />

        <Container className="pt-4">
          <div
            role="tablist"
            aria-label="Level"
            className="mb-3 inline-flex rounded-xl bg-secondary p-1"
          >
            {courses.map((c, i) => (
              <Link
                key={c.id}
                to="/immersion/$courseSlug"
                params={{ courseSlug: c.slug }}
                role="tab"
                aria-selected={c.id === course.id}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold",
                  c.id === course.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                Level {i + 1} · {i === 0 ? "Beginner" : "Intermediate"}
              </Link>
            ))}
          </div>
          <MilestoneCallout milestone={currentMilestone(s)} rows={data} />
          {courseDone.complete && (
            <div className="mt-3">
              <RestartLevelButton course={course} rows={data} />
            </div>
          )}
          <AttemptHistory
            attempts={(attempts.data ?? []).filter((a) => a.course_id === course.id)}
            className="mt-3"
          />
        </Container>

        {/* Hero — image beside the message, not stacked on top of it ------ */}
        <Container className="section-tight">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
            <div className="order-2 lg:order-1">
              <p className="eyebrow text-muted-foreground">
                {course.level} · {course.phases.length} phases ·{" "}
                {trainingDays(days.map((d) => d.day)).length} training days
              </p>
              <h1 className="title-page mt-3 text-foreground">{course.title}</h1>
              <p className="lede mt-3">{course.tagline}</p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {resumeDay && (
                  <Link
                    to="/immersion/day/$dayId"
                    params={{ dayId: resumeDay.day.id }}
                    className={buttonStyles.primary}
                  >
                    {percent > 0
                      ? `Resume ${dayLabel(resumeDay.day)}`
                      : `Start ${dayLabel(resumeDay.day)}`}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setIntroOpen((v) => !v)}
                  aria-expanded={introOpen}
                  className={buttonStyles.outline}
                >
                  {introOpen ? <X className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {introOpen ? "Close intro" : "Watch intro"}
                </button>
              </div>

              <div className="mt-6 max-w-sm">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                  <p className="numeric text-xs text-muted-foreground">
                    {lessonsDone} of {lessonsTotal} lessons complete
                  </p>
                  <p className="numeric shrink-0 text-xs text-foreground">{percent}%</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700 [transition-timing-function:var(--ease-out-soft)]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="order-1 overflow-hidden rounded-2xl border border-border lg:order-2">
              <img
                src={course.image}
                alt={`${course.title} training`}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          </div>

          {introOpen && (
            <div className="animate-step-in measure-wide mt-6 overflow-hidden rounded-2xl border border-border">
              <VimeoPlayer vimeoId={course.heroVimeoId} title={`${course.title} introduction`} />
            </div>
          )}
        </Container>

        {/* Curriculum — one phase at a time, phase copy above the list ----- */}
        <div className="rule">
          <Container className="section-tight">
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div className="flex w-max gap-1.5">
                {course.phases.map((p, i) => {
                  const total = p.days.reduce((n, d) => n + d.lessons.length, 0);
                  const done = p.days.reduce((n, d) => n + s.dayCompletion(d.id).done, 0);
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  const active = i === phaseIndex;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPhaseIndex(i)}
                      aria-pressed={active}
                      className={cn(
                        "tap min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p.label}
                      <span className={cn("numeric ml-1.5", active ? "opacity-70" : "opacity-60")}>
                        {pct}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div key={phase.id} className="animate-step-in mt-6">
              <div className="measure">
                <p className="eyebrow text-muted-foreground">{phase.weeks}</p>
                <h2 className="title-section mt-1.5 text-foreground">{phase.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{phase.blurb}</p>
                <p className="numeric mt-3 text-xs text-muted-foreground">
                  {trainingDays(phase.days).length} training days ·{" "}
                  {phase.days.length - trainingDays(phase.days).length} overview and preparation
                  pages · {phase.days.reduce((n, d) => n + d.lessons.length, 0)} lessons
                </p>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
                {phase.days.map((day) => {
                  const c = s.dayCompletion(day.id);
                  return (
                    <DayRow
                      key={day.id}
                      day={day}
                      done={c.done}
                      total={c.total}
                      locked={!s.dayUnlocked(day.id)}
                      active={day.id === currentDayId}
                    />
                  );
                })}
              </div>
            </div>
          </Container>
        </div>

        {/* About — tucked away, expandable ----------------------------------- */}
        <div className="rule">
          <Container className="section-tight">
            <h2 className="title-section text-foreground">About this level</h2>
            <div className="measure-wide mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
              <Disclosure title="What you'll be able to do" items={course.outcomes} defaultOpen />
              <Disclosure title="How it's delivered" items={course.format} />
              <Disclosure title="What you need" items={course.whatsNeeded} />
              <Disclosure
                title="Expert contributors"
                items={course.contributors.map((p) =>
                  p.credential ? `${p.name} — ${p.credential}` : p.name,
                )}
              />
            </div>
            <p className="measure-wide mt-6 text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
          </Container>
        </div>

        <div className="rule">
          <Container className="section-tight">
            <ProgramPromo slot="phase-complete" title="When you're ready for more" />
          </Container>
        </div>
      </div>
    </AppShell>
  );
}

function Disclosure({
  title,
  items,
  defaultOpen,
}: {
  title: string;
  items: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
      >
        <span className="text-[0.9375rem] font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 [transition-timing-function:var(--ease-ios)]",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <ul className="animate-step-in space-y-2.5 px-4 pb-5">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
