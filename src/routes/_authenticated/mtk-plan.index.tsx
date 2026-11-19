import { useMemo, useState } from "react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui-kit";
import { getMtkPlanState } from "@/lib/mtk-plan.functions";
import { MTK_LESSON_META } from "@/lib/mtk-plan";
import { resetProgramIntake } from "@/lib/program-intake.functions";
import { MTK_SLUG } from "@/lib/mtk-paths";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mtk-plan/")({
  head: () => ({
    meta: [
      { title: "My MTK Plan — Mike Salemi App" },
      { name: "description", content: "Your personalized Mastering the Kettlebell learning plan, built from your assessment." },
      { property: "og:title", content: "My MTK Plan — Mike Salemi App" },
      { property: "og:description", content: "A personalized day-by-day path through Mastering the Kettlebell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MtkPlanHome,
});

const titleOf = new Map(MTK_LESSON_META.map((m) => [m.id, m.title]));

export function PlanSwitch({ active }: { active: "plan" | "full" }) {
  const base = "flex-1 rounded-full px-4 py-1.5 text-center text-sm font-semibold transition-colors";
  return (
    <div className="flex w-full max-w-xs rounded-full bg-secondary p-1">
      {active === "plan" ? <span className={cn(base, "bg-background text-foreground shadow-sm")}>My Plan</span> : <Link to="/mtk-plan" className={cn(base, "text-muted-foreground hover:text-foreground")}>My Plan</Link>}
      <Link to="/courses/$courseSlug" params={{ courseSlug: MTK_SLUG }} search={{ mode: "full" }} className={cn(base, "text-muted-foreground hover:text-foreground")}>Full Curriculum</Link>
    </div>
  );
}

function MtkPlanHome() {
  const fetchState = useServerFn(getMtkPlanState);
  const resetIntake = useServerFn(resetProgramIntake);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["mtk-plan"], queryFn: () => fetchState() });
  const retake = useMutation({
    mutationFn: () => resetIntake({ data: { slug: MTK_SLUG } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["program-intake", MTK_SLUG] }); navigate({ to: "/programs/$programSlug/intake", params: { programSlug: MTK_SLUG } }); },
    onError: () => toast.error("Couldn't start a new assessment"),
  });

  const view = useMemo(() => {
    if (!data?.plan) return null;
    const done = new Set(data.completed);
    const ids = data.plan.result.lessonIds;
    const completed = ids.filter((id) => done.has(id)).length;
    const days = data.plan.days.map((d) => ({ ...d, done: d.lessonIds.filter((id) => done.has(id)).length }));
    const current = days.find((d) => d.done < d.lessonIds.length) ?? days[days.length - 1];
    const next = ids.find((id) => !done.has(id));
    return { done, completed, total: ids.length, days, current, next };
  }, [data]);

  if (isLoading || !data) return <AppShell><div className="grid min-h-[60vh] place-items-center"><Spinner /></div></AppShell>;

  // No plan yet: skip the teaser — finish the plan from results, or go straight to the assessment.
  if (!data.plan || !view) return data.assessmentDone ? <Navigate to="/mtk-plan/results" replace /> : <Navigate to="/programs/$programSlug/intake" params={{ programSlug: MTK_SLUG }} replace />;

  const pct = view.total ? Math.round((view.completed / view.total) * 100) : 0;
  const upcoming = showAll ? view.days : view.days.filter((d) => d.day >= view.current.day).slice(0, 6);
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <PlanSwitch active="plan" />
        <p className="eyebrow mt-8 text-primary">My MTK Plan · version {data.plan.version}</p>
        <h1 className="mt-2 text-3xl text-foreground">Day {view.current.day} of {view.days.length}</h1>
        <p className="mt-1 text-muted-foreground">{view.current.title}</p>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-baseline justify-between"><p className="text-sm font-medium text-foreground">Overall progress</p><p className="numeric text-sm text-muted-foreground"><span className="font-semibold text-foreground">{view.completed}</span> / {view.total} recommended lessons</p></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
          {view.next ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Next lesson</p><p className="truncate font-semibold text-foreground">{titleOf.get(view.next)}</p></div>
              <Button onClick={() => navigate({ to: "/courses/$courseSlug", params: { courseSlug: MTK_SLUG }, search: { lesson: view.next, mode: "plan" } })}><Play className="fill-current" /> Resume plan</Button>
            </div>
          ) : <p className="mt-5 font-semibold text-success">Plan complete — every recommended lesson is done.</p>}
        </section>

        <section className="mt-8">
          <div className="flex items-baseline justify-between"><h2 className="text-lg text-foreground">{showAll ? "All learning days" : "Upcoming learning"}</h2><button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm font-semibold text-primary hover:underline">{showAll ? "Show upcoming" : `All ${view.days.length} days`}</button></div>
          <ul className="mt-3 divide-y divide-border/60">
            {upcoming.map((d) => {
              const complete = d.done === d.lessonIds.length;
              return (
                <li key={d.day} className="py-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("numeric grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold", complete ? "bg-success/15 text-success" : d.day === view.current.day ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{complete ? <Check className="h-4 w-4" /> : d.day}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">Day {d.day} · {d.title}</p><p className="text-xs text-muted-foreground">Week {d.week} · {d.lessonIds.length} lessons · ~{d.minutes} min · {d.done}/{d.lessonIds.length} done</p></div>
                  </div>
                  {d.day === view.current.day && (
                    <ul className="ml-11 mt-2 space-y-1">
                      {d.lessonIds.map((id) => (
                        <li key={id}><Link to="/courses/$courseSlug" params={{ courseSlug: MTK_SLUG }} search={{ lesson: id, mode: "plan" }} className="flex items-center gap-2 text-sm text-foreground/85 hover:text-primary">{view.done.has(id) ? <Check className="h-3.5 w-3.5 text-success" /> : <Play className="h-3 w-3 text-muted-foreground" />}{titleOf.get(id)}</Link></li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-border/60 pt-6">
          <Button variant="outline" onClick={() => navigate({ to: "/mtk-plan/results" })}>Results & schedule</Button>
          <Button variant="ghost" disabled={retake.isPending} onClick={() => { if (window.confirm("Retake the assessment? Your completed lessons are kept and this plan is saved in your history.")) retake.mutate(); }}><RotateCcw /> Retake assessment</Button>
        </div>
        {data.archivedVersions > 0 && <p className="mt-4 text-xs text-muted-foreground">{data.archivedVersions} earlier plan version{data.archivedVersions > 1 ? "s" : ""} saved in your history.</p>}
      </div>
    </AppShell>
  );
}
