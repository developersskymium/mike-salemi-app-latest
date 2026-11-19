import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ChevronDown, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui-kit";
import { listCourses } from "@/lib/courses.functions";
import { generateSelfGuidedPlan, getSelfGuidedPlans, saveSelfGuidedPlan } from "@/lib/self-guided-plan.functions";

type PlanSession = { id: string; title: string; sectionTitle: string; programId: string; programSlug: string; programName: string; week: number; day: number; durationMinutes: number; rationale: string };
const today = () => new Date().toISOString().slice(0, 10);

export const Route = createFileRoute("/_authenticated/self-guided/creator")({
  head: () => ({ meta: [
    { title: "Self-Guided Plan Creator — Mike Salemi App" },
    { name: "description", content: "Build a personalised multi-week training path from programs you can access." },
    { property: "og:title", content: "Self-Guided Plan Creator — Mike Salemi App" },
    { property: "og:description", content: "Build a personalised multi-week training path from programs you can access." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SelfGuidedCreator,
});

function SelfGuidedCreator() {
  const fetchCourses = useServerFn(listCourses);
  const generate = useServerFn(generateSelfGuidedPlan);
  const save = useServerFn(saveSelfGuidedPlan);
  const fetchSaved = useServerFn(getSelfGuidedPlans);
  const queryClient = useQueryClient();
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: () => fetchCourses() });
  const { data: saved = [] } = useQuery({ queryKey: ["self-guided-plans"], queryFn: () => fetchSaved() });
  const [form, setForm] = useState({ goal: "Build consistent strength and movement practice", weeks: 4, daysPerWeek: 3, minutes: 35, experience: "intermediate" as const, equipment: ["One kettlebell"], programSlugs: [] as string[], recovery: "", constraints: "", startDate: today() });
  const [draft, setDraft] = useState<{ overview: string; sessions: PlanSession[] } | null>(null);
  const selected = form.programSlugs.length ? form.programSlugs : courses.filter((course) => course.included).slice(0, 2).map((course) => course.slug);
  const weeks = useMemo(() => Array.from({ length: form.weeks }, (_, index) => draft?.sessions.filter((session) => session.week === index + 1) ?? []), [draft, form.weeks]);
  const generateMutation = useMutation({ mutationFn: () => generate({ data: { ...form, programSlugs: selected } }), onSuccess: setDraft, onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't create a plan") });
  const saveMutation = useMutation({ mutationFn: () => draft ? save({ data: { name: `${form.weeks}-week ${form.goal}`, inputs: { ...form, programSlugs: selected }, overview: draft.overview, sessions: draft.sessions } }) : Promise.reject(), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["self-guided-plans"] }); toast.success("Plan saved to your calendar"); }, onError: () => toast.error("Couldn't save that plan") });

  return <AppShell><div className="animate-page">
    <PageHead eyebrow="Self-guided creator" title="Build a path around your life" lede="Choose the outcome, time and programs. Your plan uses only real lessons already available in your account." />
    <Section>
      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <Field label="Primary goal"><input value={form.goal} maxLength={200} onChange={(e) => setForm({ ...form, goal: e.target.value })} className="field" /></Field>
          <div className="grid grid-cols-3 gap-2"><NumberField label="Weeks" value={form.weeks} min={2} max={8} onChange={(weeks) => setForm({ ...form, weeks })} /><NumberField label="Days/week" value={form.daysPerWeek} min={2} max={6} onChange={(daysPerWeek) => setForm({ ...form, daysPerWeek })} /><NumberField label="Minutes" value={form.minutes} min={10} max={120} step={5} onChange={(minutes) => setForm({ ...form, minutes })} /></div>
          <Field label="Experience"><select value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value as typeof form.experience })} className="field"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></Field>
          <Field label="Programs"><div className="space-y-2 rounded-xl border border-border bg-surface p-2">{courses.map((course) => { const active = selected.includes(course.slug); return <label key={course.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary"><input type="checkbox" checked={active} onChange={() => setForm({ ...form, programSlugs: active ? selected.filter((slug) => slug !== course.slug) : [...selected, course.slug] })} className="accent-primary" /><span className="min-w-0 flex-1 truncate text-sm">{course.name}</span></label>; })}</div></Field>
          <Field label="Equipment"><input value={form.equipment.join(", ")} onChange={(e) => setForm({ ...form, equipment: e.target.value.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 10) })} className="field" /></Field>
          <Field label="Recovery needs"><textarea value={form.recovery} maxLength={500} onChange={(e) => setForm({ ...form, recovery: e.target.value })} rows={3} className="field resize-none" /></Field>
          <Field label="Constraints"><textarea value={form.constraints} maxLength={1000} onChange={(e) => setForm({ ...form, constraints: e.target.value })} rows={3} className="field resize-none" /></Field>
          <Field label="Start date"><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="field" /></Field>
          <Button className="w-full" disabled={generateMutation.isPending || selected.length === 0 || form.goal.trim().length < 2} onClick={() => generateMutation.mutate()}>{generateMutation.isPending ? <Spinner /> : <Wand2 />} {draft ? "Regenerate plan" : "Create my plan"}</Button>
        </div>
        <div>
          {!draft ? <div className="grid min-h-[28rem] place-items-center rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></span><h2 className="mt-4 text-xl text-foreground">Your pathway will appear here</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">It will include a weekly intention, real lesson links, session spacing and the reason each lesson belongs.</p></div></div> : <div><div className="rounded-2xl border border-border bg-surface p-5"><p className="eyebrow text-primary">Your {form.weeks}-week pathway</p><h2 className="mt-2 text-xl text-foreground">{form.goal}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{draft.overview}</p><Button className="mt-5" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? <Spinner /> : <CalendarDays />} Save and schedule</Button></div><div className="mt-4 space-y-3">{weeks.map((sessions, index) => <details key={index} open={index === 0} className="group overflow-hidden rounded-xl border border-border bg-surface"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4"><span><span className="font-semibold text-foreground">Week {index + 1}</span><span className="ml-2 text-xs text-muted-foreground">{sessions.length} sessions</span></span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><div className="border-t border-border p-2">{sessions.map((session) => <Link key={`${session.week}-${session.day}`} to="/courses/$courseSlug" params={{ courseSlug: session.programSlug }} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-3 rounded-lg p-3 hover:bg-secondary"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">{session.day}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{session.title}</span><span className="block truncate text-xs text-muted-foreground">{session.programName} · {session.rationale}</span></span><span className="text-xs text-muted-foreground">{session.durationMinutes}m</span></Link>)}</div></details>)}</div></div>}
          {saved.length > 0 && <div className="mt-8"><h2 className="text-lg text-foreground">Saved plans</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{saved.slice(0, 4).map((plan) => <div key={plan.id} className="rounded-xl border border-border bg-surface p-4"><p className="text-sm font-semibold text-foreground">{plan.name}</p><p className="mt-1 text-xs text-muted-foreground">{plan.self_guided_plan_sessions.length} scheduled sessions</p></div>)}</div></div>}
        </div>
      </div>
    </Section>
  </div></AppShell>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>; }
function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) { return <Field label={label}><input type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))} className="field" /></Field>; }