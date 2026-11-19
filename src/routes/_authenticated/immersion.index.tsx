import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Dumbbell,
  FileDown,
  LayoutGrid,
  Play,
  PlayCircle,
  Sparkles,
  Wind,
  Wand2,
  Search,
  type LucideIcon,
} from "lucide-react";
import { planDownloads } from "@/content/plans";
import { AppShell, Container } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { WeeklyRecap } from "@/components/weekly-recap";
import { Poster, SectionHeading } from "@/components/media";
import { CourseCard, dayVimeoCandidates } from "@/components/course";
import { ListSkeleton } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";

import { dayLabel, courseDays, courses, findDay, totalDays } from "@/content/program";
import { prefetchVimeoMeta } from "@/lib/vimeo-meta";
import { tools } from "@/content/tools";
import {
  cuesForDay,
  estimateMinutes,
  preSessionChecklist,
  postSessionPrompt,
} from "@/content/day-cues";
import { useProgress, summarise } from "@/hooks/use-progress";
import { currentMilestone } from "@/lib/milestones";
import { MilestoneCallout } from "@/components/milestones";
import { useSession } from "@/hooks/use-session";
import { GettingStartedChecklist } from "@/components/getting-started";
import { ResumeCard } from "@/components/resume-card";
import { CountUp } from "@/components/identity";
import { AnimatedProgress, Reveal } from "@/components/motion-kit";
import { computeStreakFromRows } from "@/lib/achievements";
import { dayOrder } from "@/content/program";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getIntake, getOnboardingStatus } from "@/lib/onboarding.functions";
import { bulkPlaceScheduleDays, createSchedule, getSchedule } from "@/lib/schedule.functions";
import { planScheduleDays } from "@/lib/schedule-sync";
import { toast } from "sonner";
import { listCourses } from "@/lib/courses.functions";
import { DatabaseProgramCard } from "@/components/database-program-card";
import { getSelfGuidedPlans } from "@/lib/self-guided-plan.functions";

export const Route = createFileRoute("/_authenticated/immersion/")({
  beforeLoad: async () => {
    const status = await getOnboardingStatus();
    if (!status.completed) throw redirect({ to: "/onboarding" });
    return { programLevel: status.level };
  },
  head: () => ({
    meta: [
      { title: "Immersion — Mike Salemi App" },
      {
        name: "description",
        content:
          "Follow Kettlebell Lifestyle day by day. Immersion keeps you on a linear path through every phase, level and lesson.",
      },
      { property: "og:title", content: "Immersion — Mike Salemi App" },
      {
        property: "og:description",
        content: "A guided, linear path through the Kettlebell Lifestyle program.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImmersionPage,
});

function IntakePrompt() {
  const { user } = useSession();
  const fetchIntake = useServerFn(getIntake);
  const { data, isLoading } = useQuery({
    queryKey: ["intake"],
    queryFn: () => fetchIntake(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  if (isLoading || data?.completed_at) return null;

  return (
    <Container className="pt-6">
      <Link
        to="/onboarding"
        className="pressable animate-rise flex flex-wrap items-center gap-4 rounded-2xl border border-primary/40 bg-elevated p-4 sm:p-5"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            Complete your intake questionnaire
          </span>
          <span className="block text-sm text-muted-foreground">
            13 quick steps to place you in the right level and personalise your lifestyle work.
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Start <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </Container>
  );
}

/** Today's session according to the user's own schedule (Self-Guided planner). */
function ScheduledToday() {
  const { user } = useSession();
  const fetchSchedule = useServerFn(getSchedule);
  const fetchCreatedPlans = useServerFn(getSelfGuidedPlans);
  const { data } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => fetchSchedule(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const { data: createdPlans = [] } = useQuery({
    queryKey: ["self-guided-plans"],
    queryFn: () => fetchCreatedPlans(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const rows = data?.days ?? [];
  const todays = rows.filter((d) => d.scheduled_on === today);
  const next = rows.find((d) => d.scheduled_on > today);
  const entry = todays[0] ?? next;
  const createdSessions = createdPlans
    .flatMap((plan) =>
      plan.status === "active"
        ? plan.self_guided_plan_sessions.map((session) => ({ ...session, planName: plan.name }))
        : [],
    )
    .filter((session) => session.status !== "done" && Boolean(session.scheduled_on))
    .sort((a, b) => (a.scheduled_on ?? "").localeCompare(b.scheduled_on ?? ""));
  const createdEntry =
    createdSessions.find((session) => session.scheduled_on === today) ??
    createdSessions.find((session) => (session.scheduled_on ?? "") > today);
  if (!entry && !createdEntry) return null;

  if (!entry || (createdEntry?.scheduled_on && createdEntry.scheduled_on <= entry.scheduled_on)) {
    const source = (createdEntry?.source ?? {}) as { programSlug?: string; programName?: string };
    if (!createdEntry || !source.programSlug) return null;
    return (
      <Link
        to="/courses/$courseSlug"
        params={{ courseSlug: source.programSlug }}
        className="pressable group flex min-h-[6.5rem] flex-col justify-between rounded-2xl bg-foreground p-4 text-background sm:min-h-[7.5rem] sm:p-5"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-background/50">
            {createdEntry.scheduled_on === today ? "Created for today" : "Next created session"}
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-background/20">
            <Sparkles className="h-4 w-4" />
          </span>
        </span>
        <span>
          <span className="block line-clamp-2 text-lg font-semibold leading-tight">
            {createdEntry.title}
          </span>
          <span className="mt-1 block truncate text-xs text-background/60">
            {source.programName} · {createdEntry.duration_minutes} min
          </span>
        </span>
      </Link>
    );
  }

  const location = findDay(entry.day_id);
  if (!location) return null;

  const isToday = entry.scheduled_on === today;
  const when = new Date(`${entry.scheduled_on}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      to="/self-guided/day/$dayId"
      params={{ dayId: location.day.id }}
      className="pressable group flex min-h-[6.5rem] flex-col justify-between rounded-2xl bg-foreground p-4 sm:min-h-[7.5rem] sm:p-5 text-background"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-background/50">
          {isToday ? "On the plan today" : "Next on your plan"}
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-background/20 transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover:scale-110">
          <CalendarDays className="h-4 w-4" />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-semibold leading-tight sm:text-xl">
          {when.split(",")[0]}
        </span>
        <span className="mt-0.5 block truncate text-xs text-background/60">
          {dayLabel(location.day)} · {location.course.level} · {location.phase.label}
        </span>
      </span>
    </Link>
  );
}

/** Horizontal rail of the current level's phases with quick jump links. */
function PhaseRail({ s }: { s: ReturnType<typeof summarise> }) {
  const course = s.currentCourse ?? courses[0];
  const current = s.currentDay;

  return (
    <section>
      <SectionHeading eyebrow="Where you're going" title={`${course.level} phases`} />
      <div className="scrollbar-none mt-4 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {course.phases.map((phase) => {
          const p = s.phaseCompletion(phase.id);
          const active = current?.phase.id === phase.id;
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <Link
              key={phase.id}
              to="/immersion/$courseSlug"
              params={{ courseSlug: course.slug }}
              hash={phase.id}
              className={cn(
                "lift group relative isolate min-w-[70%] shrink-0 overflow-hidden rounded-2xl border border-hairline bg-elevated p-4 sm:min-w-0",
                active && "border-primary",
              )}
            >
              {/* The fill itself is the graphic: a wash that grows with progress. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 bg-primary/10 transition-[width] duration-700 [transition-timing-function:var(--ease-spring)]"
                style={{ width: `${pct}%` }}
              />
              <span className="numeric pointer-events-none absolute -bottom-4 right-1 select-none text-6xl font-bold leading-none tracking-tighter text-foreground/[0.06]">
                {pct}
              </span>
              <div className="relative flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-foreground">
                  {phase.label}
                </span>
                {p.complete ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <span className="numeric shrink-0 text-[0.7rem] text-muted-foreground">
                    {pct}%
                  </span>
                )}
              </div>
              <AnimatedProgress
                className="relative mt-3 h-1.5"
                value={pct}
                label={`${phase.label} progress`}
              />
              <p className="relative mt-2 text-[0.7rem] text-muted-foreground">
                {p.done}/{p.total} days
                {active ? " · you're here" : ""}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** The next few days after today, so the path ahead is visible. */
function UpNext({ s }: { s: ReturnType<typeof summarise> }) {
  const current = s.currentDay;
  if (!current) return null;
  const from = dayOrder.findIndex((d) => d.day.id === current.day.id);
  const upcoming = dayOrder.slice(from + 1, from + 4);
  if (!upcoming.length) return null;

  return (
    <section>
      <SectionHeading eyebrow="Coming up" title="After today" />
      {/* Image-led rail: posters carry the preview, copy stays to one line. */}
      <div className="scrollbar-none mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {upcoming.map((d, i) => (
          <Reveal key={d.day.id} delay={i * 60} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <div className="group relative h-full overflow-hidden rounded-2xl border border-hairline bg-card">
              <div className="relative">
                <Poster
                  vimeoId={dayVimeoCandidates(d.day)[0] ?? "0"}
                  candidates={dayVimeoCandidates(d.day).slice(0, 3)}
                  alt={d.day.title}
                  ratio="video"
                  showAction={false}
                />
                <span className="numeric pointer-events-none absolute bottom-1 left-2.5 text-4xl font-bold leading-none tracking-tighter text-background/70 mix-blend-overlay">
                  {d.day.number}
                </span>
              </div>
              <div className="p-3.5">
                <p className="truncate text-sm font-semibold text-foreground">{d.day.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {d.phase.label} · {d.day.lessons.length} lessons
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Free pace (day after day) vs. a calendar schedule on chosen weekdays. */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function PaceToggle({ current }: { current: (typeof dayOrder)[number] | undefined }) {
  const [mode, setMode] = useState<"free" | "calendar">("free");
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createSchedule);
  const place = useServerFn(bulkPlaceScheduleDays);
  useEffect(() => {
    const saved = window.localStorage.getItem("kbl-pace");
    if (saved === "calendar" || saved === "free") setMode(saved);
  }, []);
  const pick = (m: "free" | "calendar") => {
    setMode(m);
    window.localStorage.setItem("kbl-pace", m);
  };
  const sync = async () => {
    if (!current || !weekdays.length) return;
    setBusy(true);
    try {
      const days = courseDays(current.course.id);
      const from = Math.max(
        0,
        days.findIndex((d) => d.day.id === current.day.id),
      );
      const dates = planScheduleDays(new Date(), weekdays, 4);
      const picked = days.slice(from, from + dates.length).map((d, i) => ({
        courseId: d.course.id,
        phaseId: d.phase.id,
        dayId: d.day.id,
        scheduledOn: dates[i],
      }));
      const row = await create({
        data: {
          name: `${current.course.title} — ${weekdays.length} days/week`,
          courseId: current.course.id,
          startDate: dates[0],
        },
      });
      await place({ data: { scheduleId: row.id, replace: true, days: picked } });
      toast.success(`${picked.length} sessions added to your schedule`);
    } catch {
      toast.error("Couldn't create your schedule");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Training pace"
          className="inline-flex rounded-xl bg-secondary p-1"
        >
          {(["free", "calendar"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => pick(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {m === "free" ? "Free schedule" : "Create schedule"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "free"
            ? "Train the next day whenever you're ready — no dates."
            : "Pick your training days and the next 4 weeks land on your calendar."}
        </p>
      </div>
      {mode === "calendar" && (
        <div className="flex flex-wrap items-center gap-2">
          {WEEKDAYS.map((label, i) => {
            const on = weekdays.includes(i);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setWeekdays(on ? weekdays.filter((d) => d !== i) : [...weekdays, i].sort())
                }
                className={`min-h-9 min-w-11 rounded-full border text-xs font-semibold ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            disabled={busy || !weekdays.length}
            onClick={sync}
            className="ml-auto rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Adding…" : "Sync to my calendar"}
          </button>
          <Link to="/schedule" className="text-sm font-semibold text-primary">
            View schedule →
          </Link>
        </div>
      )}
    </div>
  );
}

function ImmersionPage() {
  const { user } = useSession();
  const { data, isLoading } = useProgress(Boolean(user));
  const s = summarise(data);
  const streak = computeStreakFromRows(data);
  const current = s.currentDay;
  const [levelId, setLevelId] = useState<string | null>(null);
  const course = courses.find((c) => c.id === levelId) ?? current?.course ?? courses[0];

  useEffect(() => {
    if (!current) return;
    const days = courseDays(current.course.id);
    const from = days.findIndex((d) => d.day.id === current.day.id);
    prefetchVimeoMeta(
      days
        .slice(Math.max(0, from), Math.max(0, from) + 4)
        .flatMap((d) => dayVimeoCandidates(d.day).slice(0, 2)),
    );
  }, [current]);

  const days = courseDays(course.id);
  const doneDays = days.filter((d) => s.dayCompletion(d.day.id).complete).length;
  const pct = days.length ? Math.round((doneDays / days.length) * 100) : 0;
  const resume =
    current && current.course.id === course.id
      ? current
      : (days.find((d) => !s.dayCompletion(d.day.id).complete) ?? days[0]);
  const started = doneDays > 0 || (resume ? s.dayCompletion(resume.day.id).done > 0 : false);
  const plans = planDownloads[course.slug] ?? [];

  return (
    <AppShell>
      <IntakePrompt />
      <div className="animate-page">
        {/* Course hero */}
        <Container className="section-tight">
          <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-hairline bg-foreground">
            <img
              src={course.image}
              alt=""
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_92%,transparent)_0%,color-mix(in_oklab,var(--foreground)_60%,transparent)_55%,transparent_100%)]" />
            <div className="max-w-2xl p-6 text-background sm:p-10">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-background/70">
                Flagship program · with Mike Salemi
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                Kettlebell Lifestyle
              </h1>
              <p className="mt-3 max-w-[50ch] text-sm text-background/80 sm:text-base">
                {course.tagline}
              </p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-background/70">
                <span>{course.phases.length} phases</span>
                <span>{days.length} days</span>
                <span>{course.level}</span>
                {streak > 0 && <span>{streak} day streak</span>}
              </div>
              {resume && (
                <Link
                  to="/immersion/day/$dayId"
                  params={{ dayId: resume.day.id }}
                  className="pressable mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {started ? `Resume ${dayLabel(resume.day)}` : "Start Day 1"}
                  {!/^Day \d+$/.test(resume.day.title) && (
                    <span className="hidden font-normal text-primary-foreground/80 sm:inline">
                      · {resume.day.title}
                    </span>
                  )}
                </Link>
              )}
              <div className="mt-6 max-w-sm">
                <div className="flex justify-between text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-background/70">
                  <span>
                    {doneDays}/{days.length} days complete
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/20">
                  <div
                    className="h-full bg-primary transition-[width] duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        </Container>

        <Container className="pb-10">
          {/* Level switch */}
          <div
            role="tablist"
            aria-label="Level"
            className="glass-panel sticky top-2 z-10 mb-6 inline-flex rounded-full p-1"
          >
            {courses.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={c.id === course.id}
                onClick={() => setLevelId(c.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  c.id === course.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c.level}
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Curriculum */}
            <div className="space-y-3 lg:col-span-8">
              <h2 className="title-section text-foreground">Curriculum</h2>
              {isLoading ? (
                <ListSkeleton rows={4} />
              ) : (
                course.phases.map((phase) => {
                  const p = s.phaseCompletion(phase.id);
                  const isCurrent = resume?.phase.id === phase.id;
                  return (
                    <details
                      key={`${course.id}-${phase.id}`}
                      id={phase.id}
                      open={isCurrent}
                      className="group glass-panel overflow-hidden rounded-2xl"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-4 p-4 sm:p-5">
                        <span
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-semibold",
                            p.complete
                              ? "bg-success/15 text-success"
                              : isCurrent
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {p.complete ? <CheckCircle2 className="h-5 w-5" /> : p.done}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-foreground">
                            {phase.label}
                            {isCurrent && (
                              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary">
                                You're here
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {phase.blurb}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                          {p.done}/{p.total} days
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <ol className="border-t border-hairline">
                        {phase.days.map((day) => {
                          const c = s.dayCompletion(day.id);
                          const next = resume?.day.id === day.id;
                          return (
                            <li key={day.id}>
                              <Link
                                to="/immersion/day/$dayId"
                                params={{ dayId: day.id }}
                                className={cn(
                                  "flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-b-0 hover:bg-primary/[0.04] sm:px-5",
                                  next && "bg-primary/[0.06]",
                                )}
                              >
                                {c.complete ? (
                                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                                ) : (
                                  <Circle
                                    className={cn(
                                      "h-5 w-5 shrink-0",
                                      next ? "text-primary" : "text-border",
                                    )}
                                  />
                                )}
                                <span className="numeric w-14 shrink-0 text-xs font-semibold text-muted-foreground">
                                  {dayLabel(day)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-foreground">
                                    {day.title}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {day.type} · {estimateMinutes(day.lessons.length)} min ·{" "}
                                    {day.lessons.length} steps
                                  </span>
                                </span>
                                {next ? (
                                  <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                    {c.done > 0 ? "Resume" : "Up next"}
                                  </span>
                                ) : c.done > 0 && !c.complete ? (
                                  <span className="shrink-0 text-xs text-primary">
                                    {c.done}/{c.total}
                                  </span>
                                ) : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    </details>
                  );
                })
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-4 lg:col-span-4">
              <ScheduledToday />
              <PaceToggle current={resume ?? dayOrder[0]} />
              {plans.length > 0 && (
                <div className="glass-panel rounded-2xl p-4">
                  <p className="eyebrow text-muted-foreground">Phase guides</p>
                  <ul className="mt-3 space-y-2">
                    {plans.map((plan) => (
                      <li key={plan.id}>
                        <a
                          href={plan.url}
                          download={plan.filename}
                          className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3 hover:border-primary"
                        >
                          <FileDown className="h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {plan.title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {plan.duration}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="glass-panel rounded-2xl p-2">
                {[
                  {
                    to: "/self-guided",
                    icon: Search,
                    label: "Self-Guided mode",
                    copy: "Open any day, any order",
                  },
                  { to: "/hub", icon: LayoutGrid, label: "Program hub", copy: "Search every day" },
                  {
                    to: "/library",
                    icon: PlayCircle,
                    label: "Video library",
                    copy: "Every video in one place",
                  },
                  {
                    to: "/tools",
                    icon: Dumbbell,
                    label: "Tools",
                    copy: "Stretch test & bell selector",
                  },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 rounded-xl p-3 hover:bg-primary/[0.05]"
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {item.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.copy}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </Container>
      </div>
    </AppShell>
  );
}

function TodayHero({
  current,
  percent,
  done,
  total,
  streak,
}: {
  current: ReturnType<typeof summarise>["currentDay"];
  percent: number;
  done: number;
  total: number;
  streak: number;
}) {
  const started = percent > 0;
  const minutes = current ? estimateMinutes(current.day.lessons.length) : 0;
  const candidates = current ? dayVimeoCandidates(current.day).slice(0, 3) : [];

  const chips = current
    ? [
        `${minutes} min`,
        `${total} lesson${total === 1 ? "" : "s"}`,
        started ? `${done}/${total} done` : "Not started",
        streak > 0 ? `${streak} day streak` : null,
      ].filter(Boolean as unknown as (v: string | null) => v is string)
    : ["On Ramp", "No equipment yet"];

  return (
    <section className="animate-blur-in group relative isolate h-full min-h-[22rem] overflow-hidden rounded-3xl border border-hairline bg-foreground sm:min-h-[26rem]">
      {/* Cinematic frame — the image carries the page, not the copy. */}
      <span className="absolute inset-0">
        {current ? (
          <Poster
            vimeoId={candidates[0] ?? "0"}
            candidates={candidates}
            alt={current.day.title}
            ratio="video"
            showAction={false}
            className="h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center bg-surface text-muted-foreground">
            <Dumbbell className="h-10 w-10" />
          </span>
        )}
      </span>

      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_oklab,var(--foreground)_92%,transparent)_0%,color-mix(in_oklab,var(--foreground)_55%,transparent)_45%,transparent_78%)]" />

      {/* Oversized day numeral — visual weight instead of a paragraph. */}
      {current ? (
        <span className="numeric pointer-events-none absolute -top-6 right-2 select-none text-[9rem] font-bold leading-none tracking-tighter text-background/15 sm:text-[13rem]">
          {current.day.number}
        </span>
      ) : null}

      <div className="relative flex h-full flex-col justify-end gap-4 p-5 text-background sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
            {started ? "In progress" : "Today"}
          </span>
          <span className="rounded-full border border-background/30 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-background/80">
            {current ? `${current.course.level} · ${current.phase.label}` : "Level I"}
          </span>
        </div>

        <h1 className="max-w-[18ch] text-balance text-2xl font-semibold leading-[1.02] tracking-tight sm:text-4xl">
          {current ? current.day.title : "Start Level I"}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-background/70">
          {chips.map((chip) => (
            <span key={chip} className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {chip}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {current ? (
            <Link
              to="/immersion/day/$dayId"
              params={{ dayId: current.day.id }}
              className="pressable inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground"
            >
              <Play className="h-4 w-4 fill-current" />
              {started ? "Resume" : "Start"}
            </Link>
          ) : (
            <Link
              to="/immersion/$courseSlug"
              params={{ courseSlug: courses[0].slug }}
              className="pressable inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground"
            >
              <Play className="h-4 w-4 fill-current" /> Start day one
            </Link>
          )}
        </div>
      </div>

      {current && total ? (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-background/20">
          <div
            className="h-full bg-primary transition-[width] duration-700 [transition-timing-function:var(--ease-spring)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </section>
  );
}

/** Dense counter block: the three headline figures plus the program meter. */
function ProgressPanel({ s }: { s: ReturnType<typeof summarise> }) {
  const stats = [
    { value: <CountUp value={s.completedDays} />, sub: `of ${totalDays}`, label: "Days" },
    { value: <CountUp value={s.completedCount} />, sub: `of ${s.totalLessons}`, label: "Lessons" },
    { value: <CountUp value={s.percent} suffix="%" />, sub: "complete", label: "Program" },
  ];

  return (
    <div className="animate-rise flex flex-1 flex-col justify-between gap-4 rounded-2xl border border-hairline bg-elevated p-4 sm:gap-5 sm:p-5 [animation-delay:80ms]">
      <div className="grid grid-cols-3 divide-x divide-[color:var(--hairline,theme(colors.border))]">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={cn("min-w-0", i === 0 ? "pr-3" : "px-3", i === 2 && "pr-0")}
          >
            <p className="numeric truncate text-xl font-semibold leading-none tracking-tight text-foreground sm:text-2xl">
              {stat.value}
            </p>
            <p className="mt-1 truncate text-[0.65rem] text-muted-foreground">{stat.sub}</p>
            <p className="mt-2 truncate text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-foreground">
            Overall progress
          </span>
          <span className="numeric text-[0.65rem] text-muted-foreground">{s.percent}%</span>
        </div>
        <AnimatedProgress
          className="mt-2 h-1.5"
          value={s.percent}
          label="Overall program progress"
        />
      </div>
    </div>
  );
}

/** Big, image-free but graphic tile: colour wash + oversized glyph, little text. */
function MockCard({
  to,
  params,
  icon: Icon,
  title,
  copy,
}: {
  to: string;
  params?: Record<string, string>;
  icon: LucideIcon;
  title: string;
  copy: string;
}) {
  return (
    <Link
      to={to}
      params={params as never}
      activeOptions={{ exact: false }}
      activeProps={{ "aria-current": "page", className: "border-primary" }}
      className={cn(
        "lift group relative isolate flex h-full min-h-[9.5rem] flex-col justify-end overflow-hidden rounded-2xl border border-hairline bg-elevated p-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,color-mix(in_oklab,var(--primary)_22%,transparent)_0%,transparent_65%)] transition-opacity duration-300 group-hover:opacity-80" />
      <Icon
        aria-hidden
        className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 text-primary/15 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-110"
        strokeWidth={1.25}
      />
      <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover:scale-105">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="relative mt-3 flex items-center gap-1.5">
        <span className="truncate text-sm font-semibold text-foreground">{title}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
      <span className="relative truncate text-xs text-muted-foreground">{copy}</span>
    </Link>
  );
}

/**
 * Compact session cue strip: breathing, mobility and mindset in one row, with
 * the pre/post session prompts folded into the same card. Off by default so the
 * home screen stays visual — one toggle brings the coaching text back.
 */
function TodayCues({
  current,
}: {
  current: NonNullable<ReturnType<typeof summarise>["currentDay"]>;
}) {
  const cue = cuesForDay(current.phase.id.length, current.day.number);
  const [checked, setChecked] = useState<string[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(localStorage.getItem("kbl.session-cues") === "on");
  }, []);

  function toggle(next: boolean) {
    setShow(next);
    localStorage.setItem("kbl.session-cues", next ? "on" : "off");
  }

  const cards = [
    { icon: <Wind className="h-3.5 w-3.5" />, label: "Breathe", copy: cue.breath },
    { icon: <Dumbbell className="h-3.5 w-3.5" />, label: "Open up", copy: cue.mobility },
    { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Mindset", copy: cue.mindset },
  ];

  const readyCount = checked.length;

  return (
    <div
      className={
        "animate-rise mt-3 overflow-hidden rounded-2xl [animation-delay:80ms] " +
        (show ? "border border-hairline bg-elevated" : "")
      }
    >
      <div className={"flex items-center gap-3 " + (show ? "px-4 py-2.5" : "px-1 py-0.5")}>
        <p className="min-w-0 truncate text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Session cues
        </p>
        {show ? (
          <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold tabular-nums text-primary">
            {readyCount}/{preSessionChecklist.length} ready
          </span>
        ) : (
          <span className="ml-auto" />
        )}
        <Switch checked={show} onCheckedChange={toggle} aria-label="Show session cues" />
      </div>

      {show && (
        <div className="border-t border-hairline">
          {/* Mobile: one swipeable row so the cues never stack three deep. */}
          <div className="scrollbar-none flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 py-3 sm:hidden">
            {cards.map((c, i) => (
              <div
                key={c.label}
                className="relative w-[74%] min-w-0 shrink-0 snap-start overflow-hidden rounded-xl border border-hairline bg-background px-3.5 py-3"
              >
                <span className="pointer-events-none absolute -right-1 top-0 select-none font-display text-4xl italic leading-none text-primary/10">
                  {i + 1}
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  {c.icon}
                </span>
                <p className="mt-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {c.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[0.82rem] leading-snug text-foreground">
                  {c.copy}
                </p>
              </div>
            ))}
          </div>

          <div className="hidden sm:grid sm:grid-cols-3">
            {cards.map((c, i) => (
              <div
                key={c.label}
                className="group relative min-w-0 px-4 py-3.5 transition-colors hover:bg-primary/[0.04] sm:border-l sm:border-hairline sm:first:border-l-0"
              >
                <span className="pointer-events-none absolute right-2 top-1 select-none font-display text-5xl italic leading-none text-primary/[0.08] transition-colors group-hover:text-primary/15">
                  {i + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    {c.icon}
                  </span>
                  <p className="truncate text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {c.label}
                  </p>
                </div>
                <p className="mt-1.5 text-[0.84rem] leading-snug text-foreground">{c.copy}</p>
              </div>
            ))}
          </div>

          {/* Checklist as pill chips; scrolls sideways on phones. */}
          <div className="scrollbar-none flex items-center gap-2 overflow-x-auto border-t border-hairline px-4 py-2.5 sm:flex-wrap sm:overflow-visible">
            {preSessionChecklist.map((item) => {
              const on = checked.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setChecked((v) => (on ? v.filter((id) => id !== item.id) : [...v, item.id]))
                  }
                  className={
                    "tap flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.78rem] transition-all duration-200 active:scale-[0.97] " +
                    (on
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-hairline bg-background text-foreground hover:border-primary/30")
                  }
                >
                  <span
                    className={
                      on
                        ? "grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                        : "grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border text-transparent"
                    }
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  {item.label}
                </button>
              );
            })}
            <p className="ml-auto hidden max-w-[22rem] truncate text-[0.75rem] italic text-muted-foreground lg:block">
              {postSessionPrompt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
