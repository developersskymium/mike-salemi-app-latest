import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Circle, Layers, Lock, Search, X } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { EmptyState, buttonStyles } from "@/components/ui-kit";
import { AnimatedProgress, Reveal } from "@/components/motion-kit";
import { CountUp } from "@/components/identity";
import { dayLabel, courses, dayOrder } from "@/content/program";
import { useProgress, summarise } from "@/hooks/use-progress";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/hub/")({
  head: () => ({
    meta: [
      { title: "Program Hub — Mike Salemi App" },
      {
        name: "description",
        content:
          "One place for every level, phase and day across your programs. Filter by level, phase or status, search any day and jump straight in.",
      },
      { property: "og:title", content: "Program Hub — Mike Salemi App" },
      {
        property: "og:description",
        content: "Every level, phase and day in one filterable hub with quick jump links.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HubPage,
});

type StatusFilter = "all" | "done" | "in-progress" | "not-started";

const STATUSES: [StatusFilter, string][] = [
  ["all", "All"],
  ["done", "Completed"],
  ["in-progress", "In progress"],
  ["not-started", "Not started"],
];

/* ------------------------------------------------------------------ */
/* Small, shared filter primitives — one visual language, less clutter */
/* ------------------------------------------------------------------ */

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div
        role="group"
        aria-label={label}
        className="scrollbar-none mt-1.5 flex gap-1 overflow-x-auto rounded-xl border border-hairline bg-secondary/60 p-1"
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              value === o.value
                ? "raise-soft bg-card text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PhaseSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (next: string) => void;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Phase
      </p>
      <div className="relative mt-1.5">
        <Layers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Filter by phase"
          className="w-full appearance-none rounded-xl border border-hairline bg-card py-2 pl-9 pr-8 text-xs font-semibold text-foreground outline-none focus:border-primary"
        >
          <option value="all">All phases</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function HubPage() {
  const { user } = useSession();
  const { data } = useProgress(Boolean(user));
  const s = summarise(data);

  const [level, setLevel] = useState<string>("all");
  const [phase, setPhase] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const phaseOptions = useMemo(
    () => courses.filter((c) => level === "all" || c.id === level).flatMap((c) => c.phases),
    [level],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dayOrder.filter((d) => {
      if (level !== "all" && d.course.id !== level) return false;
      if (phase !== "all" && d.phase.id !== phase) return false;
      const c = s.dayCompletion(d.day.id);
      if (status === "done" && !c.complete) return false;
      if (status === "in-progress" && !(c.done > 0 && !c.complete)) return false;
      if (status === "not-started" && c.done !== 0) return false;
      if (q) {
        const haystack =
          `${d.day.title} ${d.day.number} ${d.phase.label} ${d.course.level}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [level, phase, status, query, s]);

  const filtersActive =
    level !== "all" || phase !== "all" || status !== "all" || query.trim() !== "";
  const totalDays = dayOrder.length;

  function reset() {
    setLevel("all");
    setPhase("all");
    setStatus("all");
    setQuery("");
  }

  return (
    <AppShell>
      <Container className="section-tight">
        <Reveal>
          <div className="measure">
            <p className="eyebrow text-muted-foreground">Program hub</p>
            <h1 className="title-page mt-3 text-foreground">Every level, phase and day.</h1>
            <p className="lede mt-3">
              One index for the whole program. Pick a level, narrow to a phase, search any day by
              name and jump straight in.
            </p>
          </div>
        </Reveal>

        {/* Progress overview — same language as home ------------------ */}
        <Reveal delay={60}>
          <div className="mt-6 grid gap-4 rounded-2xl border border-hairline bg-elevated p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Program progress
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">
                {s.currentDay
                  ? `${s.currentDay.course.level} · ${s.currentDay.phase.label} · ${dayLabel(s.currentDay.day)}`
                  : "Everything complete — nice work"}
              </p>
              <AnimatedProgress className="mt-3 h-1.5" value={s.percent} label="Program progress" />
            </div>
            <div className="flex shrink-0 items-center gap-6">
              <div>
                <p className="numeric text-lg font-semibold leading-none text-foreground">
                  <CountUp value={s.completedDays} />
                  <span className="text-muted-foreground">/{totalDays}</span>
                </p>
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Days
                </p>
              </div>
              <div>
                <p className="numeric text-lg font-semibold leading-none text-foreground">
                  <CountUp value={s.completedCount} />
                  <span className="text-muted-foreground">/{s.totalLessons}</span>
                </p>
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Lessons
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Quick jump ------------------------------------------------- */}
        <Reveal delay={120}>
          <div className="mt-5 flex flex-wrap gap-3">
            {s.currentDay ? (
              <Link
                to="/immersion/day/$dayId"
                params={{ dayId: s.currentDay.day.id }}
                className={buttonStyles.primary}
              >
                Jump to today · {dayLabel(s.currentDay.day)}
              </Link>
            ) : null}
            {courses.map((c) => (
              <Link
                key={c.id}
                to="/self-guided/$courseSlug"
                params={{ courseSlug: c.slug }}
                className={buttonStyles.outline}
              >
                {c.level}
              </Link>
            ))}
          </div>
        </Reveal>
      </Container>

      <Container className="pb-10">
        {/* Filter bar — search, then level / phase / status ----------- */}
        <div className="sticky top-16 z-10 rounded-2xl border border-hairline bg-elevated/95 p-4 backdrop-blur">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search days by name, number or phase"
              aria-label="Search days"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Segmented
              label="Level"
              value={level}
              onChange={(next) => {
                setLevel(next);
                setPhase("all");
              }}
              options={[
                { value: "all", label: "All" },
                ...courses.map((c) => ({ value: c.id, label: c.level })),
              ]}
            />
            <PhaseSelect value={phase} options={phaseOptions} onChange={setPhase} />
            <Segmented
              label="Status"
              value={status}
              onChange={setStatus}
              options={STATUSES.map(([value, label]) => ({ value, label }))}
            />
          </div>

          {filtersActive ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={reset}
                className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {rows.length} {rows.length === 1 ? "day" : "days"}
        </p>

        {rows.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Search}
            title="No days match those filters"
            description="Try a different level or phase, or clear the search to see the whole program again."
            action={
              <button type="button" onClick={reset} className={buttonStyles.primary}>
                Reset filters
              </button>
            }
          />
        ) : (
          <div className="mt-4 space-y-2.5">
            {rows.map((d, i) => {
              const c = s.dayCompletion(d.day.id);
              const unlocked = s.dayUnlocked(d.day.id);
              const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
              return (
                <Reveal key={d.day.id} delay={Math.min(i, 8) * 45}>
                  <Link
                    to="/self-guided/day/$dayId"
                    params={{ dayId: d.day.id }}
                    className="lift panel flex items-center gap-4 p-3.5"
                  >
                    <span
                      className={cn(
                        "numeric grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-semibold transition-colors",
                        c.complete
                          ? "bg-success text-white"
                          : c.done > 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground",
                      )}
                    >
                      {c.complete ? (
                        <CheckCircle2 className="animate-check h-5 w-5" />
                      ) : (
                        d.day.number
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {d.day.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.course.level} · {d.phase.label} · {c.done}/{c.total} lessons
                      </span>
                      <AnimatedProgress
                        className="mt-2 h-1"
                        value={pct}
                        label={`${d.day.title} progress`}
                      />
                    </span>

                    <span className="hidden shrink-0 items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:flex">
                      {c.complete ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Done
                        </>
                      ) : unlocked ? (
                        <>
                          <Circle className="h-3.5 w-3.5" /> Open
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" /> Immersion locked
                        </>
                      )}
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </Container>
    </AppShell>
  );
}
