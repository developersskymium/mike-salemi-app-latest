import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui-kit";
import { createMtkPlan, getMtkResults } from "@/lib/mtk-plan.functions";
import { groupIntoDays, weeksNeeded } from "@/lib/mtk-plan";
import { cn } from "@/lib/utils";
import { MTK_SLUG } from "@/lib/mtk-paths";

export const Route = createFileRoute("/_authenticated/mtk-plan/results")({
  head: () => ({
    meta: [
      { title: "Your MTK Results — Mike Salemi App" },
      { name: "description", content: "Your Mastering the Kettlebell assessment results and personalized curriculum." },
      { property: "og:title", content: "Your MTK Results — Mike Salemi App" },
      { property: "og:description", content: "Assessed level, strengths, focus areas and your recommended MTK lessons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MtkResultsPage,
});

const WEEKS = [2, 4, 6, 8, 12, 16, 24, 36, 52];
const DAYS = [2, 3, 4, 5, 6];
const MINUTES = [15, 20, 30, 45, 60];

function Choice({ value, options, onChange, suffix }: { value: number; options: number[]; onChange: (v: number) => void; suffix: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} aria-pressed={value === o} className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-colors", value === o ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground hover:border-primary/50")}>{o} {suffix}</button>
      ))}
    </div>
  );
}

function MtkResultsPage() {
  const fetchResults = useServerFn(getMtkResults);
  const navigate = useNavigate();
  const create = useServerFn(createMtkPlan);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["mtk-results"], queryFn: () => fetchResults(), staleTime: 60_000 });
  const [weeks, setWeeks] = useState(8);
  const [days, setDays] = useState(3);
  const [minutes, setMinutes] = useState(20);
  const preview = useMemo(() => {
    if (!data) return null;
    const grouped = groupIntoDays(data.lessonIds, minutes, days);
    return { count: grouped.length, needed: weeksNeeded(grouped.length, days), first: grouped.slice(0, 3) };
  }, [data, minutes, days]);
  const save = useMutation({
    mutationFn: () => create({ data: { daysPerWeek: days, minutes, weeks } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["mtk-plan"] }); toast.success("Your MTK plan is active"); navigate({ to: "/mtk-plan" }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't create your plan"),
  });

  if (isLoading) return <AppShell><div className="grid min-h-[60vh] place-items-center gap-3 text-center"><div><Spinner /><p className="mt-3 text-sm text-muted-foreground">Building your personalized curriculum…</p></div></div></AppShell>;
  if (!data) return (
    <AppShell><div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-muted-foreground">Complete the MTK assessment to see your results.</p>
      <Button className="mt-4" onClick={() => navigate({ to: "/programs/$programSlug/intake", params: { programSlug: MTK_SLUG } })}>Start assessment <ArrowRight /></Button>
    </div></AppShell>
  );

  const card = "rounded-2xl border border-border bg-surface p-5";
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="eyebrow text-primary">Mastering the Kettlebell · Your results</p>
        <h1 className="mt-3 text-4xl text-foreground"><span className="numeric">{data.recommended}</span> of <span className="numeric">{data.total}</span> lessons recommended</h1>
        <p className="mt-4 text-lg text-muted-foreground">{data.summary}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <section className={card}><p className="eyebrow text-muted-foreground">Your MTK level</p><p className="mt-2 text-2xl font-semibold text-foreground">{data.level}</p>{data.coach && <p className="mt-1 text-sm text-muted-foreground">Coaching track</p>}</section>
          <section className={card}><p className="eyebrow text-muted-foreground">Your strengths</p><p className="mt-2 text-sm text-foreground">{data.strengths.length ? data.strengths.join(", ") : "None reported yet — we'll build them"}</p></section>
          <section className={card}><p className="eyebrow text-muted-foreground">Focus areas / gaps</p><p className="mt-2 text-sm text-foreground">{data.gaps.length ? data.gaps.join(", ") : "Fundamentals"}</p></section>
        </div>

        <section className="mt-8">
          <h2 className="text-lg text-foreground">Your personalized curriculum</h2>
          <p className="text-sm text-muted-foreground">About {Math.round(data.minutes / 60)} hours of learning, in the original MTK order.</p>
          <ul className="mt-3 divide-y divide-border/60">
            {data.focusAreas.map((f) => (
              <li key={f.label} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{f.label}</p><p className="text-xs text-muted-foreground">{f.why}</p></div>
                <span className="numeric text-sm text-muted-foreground">{f.count} lessons</span>
              </li>
            ))}
          </ul>
        </section>

        {preview && (() => {
          const unrealistic = weeks < preview.needed;
          return (
            <section id="schedule" className="mt-12 border-t border-border/60 pt-10">
              <p className="eyebrow text-primary">Your schedule</p>
              <h2 className="mt-2 text-2xl text-foreground">How would you like to complete your {data.recommended} lessons?</h2>
              <div className="mt-6 space-y-6">
                <div><p className="font-semibold text-foreground">How quickly would you like to finish?</p><Choice value={weeks} options={WEEKS} onChange={setWeeks} suffix="weeks" /></div>
                <div><p className="font-semibold text-foreground">Learning days per week</p><Choice value={days} options={DAYS} onChange={setDays} suffix="days" /></div>
                <div><p className="font-semibold text-foreground">Time per learning session</p><Choice value={minutes} options={MINUTES} onChange={setMinutes} suffix="min" /></div>
              </div>
              <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
                <p className="text-sm text-muted-foreground">Your plan</p>
                <p className="mt-1 text-xl font-semibold text-foreground"><span className="numeric">{preview.count}</span> learning days · about <span className="numeric">{preview.needed}</span> weeks</p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{preview.first.map((d) => <li key={d.day}>Day {d.day}: {d.title} · {d.lessonIds.length} lessons · ~{d.minutes} min</li>)}</ul>
                {unrealistic && (
                  <div className="mt-4 flex gap-3 rounded-xl bg-warning/10 p-4 text-sm text-foreground">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                    <div>
                      <p>{weeks} weeks isn't realistic for {data.recommended} lessons at {days} days × {minutes} min. The recommended minimum is <strong>{preview.needed} weeks</strong>.</p>
                      <button type="button" onClick={() => setWeeks(preview.needed)} className="mt-2 font-semibold text-primary hover:underline">Use {preview.needed} weeks</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" disabled={unrealistic || save.isPending} onClick={() => save.mutate()}>{save.isPending ? <Spinner /> : null} Activate my plan <ArrowRight /></Button>
                <Button size="lg" variant="outline" onClick={() => navigate({ to: "/courses/$courseSlug", params: { courseSlug: MTK_SLUG }, search: { mode: "full" } })}>View full curriculum</Button>
              </div>
            </section>
          );
        })()}
        <p className="mt-6 text-xs text-muted-foreground">Want different results? <Link to="/mtk-plan" className="text-primary hover:underline">Retake the assessment</Link> from My Plan — completed lessons are always kept.</p>
      </div>
    </AppShell>
  );
}
