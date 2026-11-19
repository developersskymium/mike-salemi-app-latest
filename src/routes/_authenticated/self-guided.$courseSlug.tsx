import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CalendarCheck2, ChevronDown, Download, Search, X } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { ContextBar, Section } from "@/components/page-kit";
import { DayRow } from "@/components/course";
import { ProgramPromo } from "@/components/program-promo";
import { courses, trainingDays } from "@/content/program";
import { phasePlan, formatFileSize } from "@/content/plans";
import { buttonStyles } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/self-guided/$courseSlug")({
  loader: ({ params }) => {
    const course = courses.find((c) => c.slug === params.courseSlug);
    if (!course) throw notFound();
    return { title: course.title, level: course.level, tagline: course.tagline };
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.title} — Self-Guided`
      : "Self-Guided — Mike Salemi App";
    const description = loaderData
      ? `${loaderData.tagline}. Every phase and day open, in any order you like.`
      : "Every phase and day, open.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <AppShell>
      <Container className="py-24 text-center">
        <p className="text-lg text-foreground">That level does not exist.</p>
        <Link to="/self-guided" className={cn(buttonStyles.outline, "mt-5")}>
          Back to Self-Guided
        </Link>
      </Container>
    </AppShell>
  ),
  errorComponent: () => (
    <AppShell>
      <Container className="py-24 text-center">
        <p className="text-lg text-foreground">Something went wrong loading this level.</p>
        <Link to="/self-guided" className={cn(buttonStyles.outline, "mt-5")}>
          Back to Self-Guided
        </Link>
      </Container>
    </AppShell>
  ),
  component: SelfGuidedLevelPage,
});

function SelfGuidedLevelPage() {
  const { courseSlug } = Route.useParams();
  const course = courses.find((c) => c.slug === courseSlug)!;

  const [query, setQuery] = useState("");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const q = query.trim().toLowerCase();

  const searching = q.length > 0;

  const filtered = useMemo(
    () =>
      course.phases
        .map((phase) => ({
          phase,
          days: q
            ? phase.days.filter((day) =>
                [day.title, day.focus, day.type, day.intro].join(" ").toLowerCase().includes(q),
              )
            : phase.days,
        }))
        .filter((group) => group.days.length > 0),
    [course, q],
  );

  const matches = filtered.reduce((n, p) => n + p.days.length, 0);
  const totalDays = course.phases.reduce((n, p) => n + trainingDays(p.days).length, 0);
  const groups = searching
    ? filtered
    : [{ phase: course.phases[phaseIndex], days: course.phases[phaseIndex].days }];

  return (
    <AppShell>
      <div className="animate-page">
        <ContextBar
          backTo="/self-guided"
          backLabel="Back to Self-Guided"
          title={course.title}
          meta={`${course.phases.length} phases · ${totalDays} training days · overviews and preparation included`}
          action={
            <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
              {courses.map((c) => {
                const active = c.slug === course.slug;
                return (
                  <Link
                    key={c.id}
                    to="/self-guided/$courseSlug"
                    params={{ courseSlug: c.slug }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "tap flex min-h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.level.replace("Level ", "L")}
                  </Link>
                );
              })}
            </div>
          }
        />

        {/* Hero ------------------------------------------------------- */}
        <Container className="section-tight">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
            <div className="order-2 lg:order-1">
              <p className="eyebrow text-muted-foreground">{course.level} · Self-guided</p>
              <h1 className="title-page mt-3 text-foreground">{course.title}</h1>
              <p className="lede mt-3">{course.tagline}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/schedule" className={buttonStyles.primary}>
                  <CalendarCheck2 className="h-4 w-4" />
                  Schedule this level
                </Link>
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
        </Container>

        {/* Phase tabs + search ---------------------------------------- */}
        <div className="glass rule sticky top-[var(--bar-h)] z-20">
          <Container className="grid gap-2 py-2.5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
              <div className="flex w-max gap-1.5">
                {course.phases.map((p, i) => {
                  const active = !searching && i === phaseIndex;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setPhaseIndex(i);
                      }}
                      aria-pressed={active}
                      className={cn(
                        "tap min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p.name}
                      <span className="numeric ml-1.5 opacity-60">{p.days.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all days"
                aria-label="Search days"
                className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-9 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="tap absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </label>
          </Container>
        </div>

        {/* Days -------------------------------------------------------- */}
        <Section>
          {searching && matches === 0 ? (
            <div className="mx-auto max-w-md py-14 text-center">
              <p className="text-base text-foreground">No days match “{query}”</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className={cn(buttonStyles.outline, "mt-5")}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map(({ phase, days }) => {
                const plan = phasePlan(course.slug, phase.id);
                return (
                  <div key={phase.id} className="animate-step-in">
                    <div className="measure">
                      <p className="eyebrow text-muted-foreground">{phase.weeks}</p>
                      <h2 className="title-section mt-1.5 text-foreground">{phase.name}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {phase.blurb}
                      </p>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
                      {days.map((day) => (
                        <DayRow
                          key={day.id}
                          day={day}
                          done={0}
                          total={day.lessons.length}
                          mode="self-guided"
                          showProgress={false}
                        />
                      ))}
                    </div>

                    {plan && (
                      <a
                        href={plan.url}
                        download={plan.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="tap group mt-3 inline-flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-foreground/30"
                      >
                        <Download className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
                        Download {phase.name} plan
                        <span className="numeric text-xs font-normal text-muted-foreground">
                          PDF · {formatFileSize(plan.size)}
                        </span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* About ------------------------------------------------------- */}
        <Section>
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
        </Section>

        <Section>
          <ProgramPromo slot="phase-complete" title="Go deeper" />
        </Section>
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
