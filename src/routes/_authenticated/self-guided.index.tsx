import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck2, CalendarDays, Layers3, PlayCircle, Search, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Container } from "@/components/app-shell";
import { Section } from "@/components/page-kit";
import { MediaScrim } from "@/components/media";
import { ProgramPromo } from "@/components/program-promo";
import { buttonStyles } from "@/components/ui-kit";
import { courses, trainingDays } from "@/content/program";
import { cn } from "@/lib/utils";
import { listCourses } from "@/lib/courses.functions";
import { DatabaseProgramCard } from "@/components/database-program-card";

export const Route = createFileRoute("/_authenticated/self-guided/")({
  head: () => ({
    meta: [
      { title: "Self-Guided — Kettlebell Lifestyle" },
      {
        name: "description",
        content:
          "Every Kettlebell Lifestyle level, phase and day, open. Build your own schedule and train whatever you are ready for today.",
      },
      { property: "og:title", content: "Self-Guided — Kettlebell Lifestyle" },
      { property: "og:description", content: "The whole program, open. Go anywhere, any time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SelfGuidedPage,
});

function SelfGuidedPage() {
  const fetchCourses = useServerFn(listCourses);
  const { data: databaseCourses = [] } = useQuery({ queryKey: ["courses"], queryFn: () => fetchCourses() });
  const [query, setQuery] = useState("");
  const filteredCourses = useMemo(() => databaseCourses.filter((course) => !query || [course.name, course.summary, ...course.highlights].some((value) => value?.toLowerCase().includes(query.toLowerCase()))), [databaseCourses, query]);
  return (
    <AppShell>
      <div className="animate-page">
        {/* Hero ------------------------------------------------------- */}
        <Container className="section-tight">
          <div className="measure">
            <p className="eyebrow text-muted-foreground">Self-guided</p>
            <h1 className="title-page mt-3 text-foreground">Train it your way.</h1>
            <p className="lede mt-3">
              The same program as Immersion, without the fixed order. Open a level, go straight to any phase or
              day, and build a schedule that fits your week.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/schedule" className={buttonStyles.primary}>
                <CalendarCheck2 className="h-4 w-4" />
                Build a schedule
              </Link>
              <Link to="/library" className={buttonStyles.outline}>
                <PlayCircle className="h-4 w-4" />
                Browse the library
              </Link>
              <Link to="/self-guided/creator" className={buttonStyles.outline}>
                <Wand2 className="h-4 w-4" /> Create my plan
              </Link>
            </div>
          </div>
        </Container>

        {/* Levels ----------------------------------------------------- */}
        <Section>
          <h2 className="title-section text-foreground">Choose a level</h2>
          <div className="seq mt-4 grid gap-4 lg:grid-cols-2">
            {courses.map((course) => {
              const days = course.phases.reduce((n, p) => n + trainingDays(p.days).length, 0);
              const lessons = course.phases.reduce(
                (n, p) => n + p.days.reduce((m, d) => m + d.lessons.length, 0),
                0,
              );
              return (
                <Link
                  key={course.id}
                  to="/self-guided/$courseSlug"
                  params={{ courseSlug: course.slug }}
                  className="media-card group relative overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <div className="relative">
                    <img
                      src={course.image}
                      alt={`${course.title} training`}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[16/9] w-full object-cover"
                    />
                    <MediaScrim />
                    <span className="absolute bottom-4 left-4 right-4">
                      <span className="eyebrow block text-[0.625rem] leading-none text-white/75">{course.level}</span>
                      <span className="mt-1.5 block text-lg font-semibold tracking-tight text-white sm:text-xl">
                        {course.title}
                      </span>
                    </span>
                  </div>

                  <div className="p-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">{course.tagline}</p>

                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="numeric inline-flex items-center gap-1.5">
                        <Layers3 className="h-3.5 w-3.5" /> {course.phases.length} phases
                      </span>
                      <span className="numeric inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" /> {days} days
                      </span>
                      <span className="numeric inline-flex items-center gap-1.5">
                        <PlayCircle className="h-3.5 w-3.5" /> {lessons} lessons
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {course.phases.map((phase) => (
                        <span
                          key={phase.id}
                          className="flex min-w-0 flex-col justify-center rounded-xl bg-secondary px-2.5 py-2 ring-1 ring-inset ring-border transition-colors duration-300"
                        >
                          <span className="eyebrow block truncate text-[0.625rem] leading-none text-foreground">
                            {phase.label}
                          </span>
                          <span className="mt-1 block truncate text-[0.625rem] leading-none text-muted-foreground">
                            {phase.weeks}
                          </span>
                        </span>
                      ))}
                    </div>

                    <span
                      className={cn(
                        buttonStyles.outline,
                        "mt-5 w-full group-hover:border-foreground/30 group-hover:text-foreground",
                      )}
                    >
                      Open {course.level}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>

        <Section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow text-primary">Every program</p><h2 className="title-section mt-2 text-foreground">Browse your full library</h2></div>
            <label className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-input bg-surface px-4 py-3 sm:w-auto"><Search className="h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search programs" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredCourses.map((course) => <DatabaseProgramCard key={course.id} course={course} compact />)}</div>
        </Section>

        {/* How it works ------------------------------------------------ */}
        <Section>
          <h2 className="title-section text-foreground">How self-guided works</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Nothing is locked",
                body: "Every phase and day is open from the start. Train what suits your body today.",
              },
              {
                title: "Plans to download",
                body: "Each phase ships with a printable PDF plan you can take to the gym.",
              },
              {
                title: "Your own calendar",
                body: "Drop days onto a schedule, set reminders and choose what happens if you miss one.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-surface p-5">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <ProgramPromo slot="dashboard" />
        </Section>
      </div>
    </AppShell>
  );
}
